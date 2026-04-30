import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartService } from './cart.service';

type AuthenticatedRequest = Request & { user: { sub: number } };

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  getCart(@Req() request: AuthenticatedRequest) {
    return this.cartService.getCartByUserId(request.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('items')
  addItem(@Req() request: AuthenticatedRequest, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(request.user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('items/:productId')
  updateItem(
    @Req() request: AuthenticatedRequest,
    @Param('productId') productId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(request.user.sub, productId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('items/:productId')
  removeItem(@Req() request: AuthenticatedRequest, @Param('productId') productId: string) {
    return this.cartService.removeItem(request.user.sub, productId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete()
  clearCart(@Req() request: AuthenticatedRequest) {
    return this.cartService.clearCart(request.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('checkout')
  checkout(@Req() request: AuthenticatedRequest, @Body() dto: CheckoutDto) {
    return this.cartService.checkout(request.user.sub, dto);
  }

  @Post('guest-checkout')
  guestCheckout(@Body() dto: CheckoutDto) {
    return this.cartService.guestCheckout(dto);
  }
}
