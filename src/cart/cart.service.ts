import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FulfillmentMethod, OrderStatus, PaymentMethod } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

type CartItemWithLineTotal = {
  id: number;
  productId: string;
  productName: string;
  productImageUrl: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  createdAt: Date;
  updatedAt: Date;
};

const GUEST_CHECKOUT_EMAIL = 'guest.checkout@sgu.local';
const GUEST_CHECKOUT_NAME = 'Guest Checkout';
const GUEST_CHECKOUT_PASSWORD_HASH =
  '$2b$10$6DkuzuYkSyWyMdW.blHrmeLDmsdueROZKeqT.bHHp2MfHqM1Y609G';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCartByUserId(userId: number) {
    const items = await this.prisma.cartItem.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    const formattedItems: CartItemWithLineTotal[] = items.map((item) => ({
      ...item,
      lineTotal: this.roundCurrency(item.unitPrice * item.quantity),
    }));

    const totals = formattedItems.reduce(
      (acc, item) => ({
        itemCount: acc.itemCount + item.quantity,
        subtotal: this.roundCurrency(acc.subtotal + item.lineTotal),
      }),
      { itemCount: 0, subtotal: 0 },
    );

    return {
      items: formattedItems,
      summary: {
        itemTypes: formattedItems.length,
        itemCount: totals.itemCount,
        subtotal: totals.subtotal,
      },
    };
  }

  async addItem(userId: number, dto: AddCartItemDto) {
    const quantityToAdd = dto.quantity ?? 1;
    const productId = dto.productId.trim();

    await this.prisma.cartItem.upsert({
      where: { userId_productId: { userId, productId } },
      create: {
        userId,
        productId,
        productName: dto.productName,
        productImageUrl: dto.productImageUrl ?? null,
        unitPrice: dto.unitPrice,
        quantity: quantityToAdd,
      },
      update: {
        quantity: { increment: quantityToAdd },
        productName: dto.productName,
        productImageUrl: dto.productImageUrl ?? null,
        unitPrice: dto.unitPrice,
      },
    });

    return this.getCartByUserId(userId);
  }

  async updateItem(userId: number, productId: string, dto: UpdateCartItemDto) {
    const normalizedProductId = productId.trim();
    const existingItem = await this.prisma.cartItem.findUnique({
      where: { userId_productId: { userId, productId: normalizedProductId } },
    });

    if (!existingItem) {
      throw new NotFoundException('Cart item not found.');
    }

    if (dto.quantity === 0) {
      await this.prisma.cartItem.delete({
        where: { userId_productId: { userId, productId: normalizedProductId } },
      });
      return this.getCartByUserId(userId);
    }

    await this.prisma.cartItem.update({
      where: { userId_productId: { userId, productId: normalizedProductId } },
      data: {
        quantity: dto.quantity,
        productName: dto.productName,
        productImageUrl: dto.productImageUrl,
        unitPrice: dto.unitPrice,
      },
    });

    return this.getCartByUserId(userId);
  }

  async removeItem(userId: number, productId: string) {
    await this.prisma.cartItem.deleteMany({
      where: {
        userId,
        productId: productId.trim(),
      },
    });

    return this.getCartByUserId(userId);
  }

  async clearCart(userId: number) {
    await this.prisma.cartItem.deleteMany({ where: { userId } });
    return this.getCartByUserId(userId);
  }

  async guestCheckout(dto: CheckoutDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Guest checkout requires at least one item.');
    }

    const guestUserId = await this.getOrCreateGuestUserId();
    return this.checkout(guestUserId, dto);
  }

  async checkout(userId: number, dto: CheckoutDto) {
    return this.prisma.$transaction(async (tx) => {
      const storedCartItems = await tx.cartItem.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      });
      const cartItems =
        dto.items && dto.items.length > 0
          ? dto.items.map((item) => ({
              productId: item.productId.trim(),
              productName: item.productName,
              productImageUrl: item.productImageUrl ?? null,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
            }))
          : storedCartItems;

      if (cartItems.length === 0) {
        throw new BadRequestException('Cannot checkout an empty cart.');
      }

      if (dto.paymentMethod === 'CARD' && !dto.cardLast4) {
        throw new BadRequestException('Card payment requires card details.');
      }

      if (dto.fulfillmentMethod === 'DELIVERY' && !dto.deliveryAddress) {
        throw new BadRequestException('Delivery checkout requires a delivery address.');
      }

      const subtotal = this.roundCurrency(
        cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
      );

      const order = await tx.order.create({
        data: {
          userId,
          status: OrderStatus.SUBMITTED,
          subtotal,
          fulfillmentMethod: dto.fulfillmentMethod as FulfillmentMethod,
          paymentMethod: dto.paymentMethod as PaymentMethod,
          deliveryAddress: dto.fulfillmentMethod === 'DELIVERY' ? dto.deliveryAddress : null,
          pickupLocation: dto.fulfillmentMethod === 'PICKUP' ? dto.pickupLocation || 'Campus Store' : null,
          contactPhone: dto.contactPhone || null,
          notes: dto.notes || null,
          cardholderName: dto.paymentMethod === 'CARD' ? dto.cardholderName : null,
          cardLast4: dto.paymentMethod === 'CARD' ? dto.cardLast4 : null,
          items: {
            create: cartItems.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              productImageUrl: item.productImageUrl,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              lineTotal: this.roundCurrency(item.unitPrice * item.quantity),
            })),
          },
        },
        include: {
          items: true,
        },
      });

      await tx.cartItem.deleteMany({ where: { userId } });

      return {
        order,
        message: 'Checkout complete. Order created and cart cleared.',
      };
    });
  }

  private async getOrCreateGuestUserId(): Promise<number> {
    const guestUser = await this.prisma.user.upsert({
      where: { email: GUEST_CHECKOUT_EMAIL },
      update: {
        fullName: GUEST_CHECKOUT_NAME,
      },
      create: {
        fullName: GUEST_CHECKOUT_NAME,
        email: GUEST_CHECKOUT_EMAIL,
        passwordHash: GUEST_CHECKOUT_PASSWORD_HASH,
      },
    });

    return guestUser.id;
  }

  private roundCurrency(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
