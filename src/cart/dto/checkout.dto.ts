import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

class CheckoutItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsNotEmpty()
  productName: string;

  @IsOptional()
  @IsString()
  productImageUrl?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}

const normalizeEnumInput = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class CheckoutDto {
  @Transform(normalizeEnumInput)
  @IsIn(['PICKUP', 'DELIVERY'])
  fulfillmentMethod: 'PICKUP' | 'DELIVERY';

  @Transform(normalizeEnumInput)
  @IsIn(['CARD', 'PAY_ON_ARRIVAL'])
  paymentMethod: 'CARD' | 'PAY_ON_ARRIVAL';

  @IsOptional()
  @IsEmail()
  email?: string;

  @ValidateIf((dto: CheckoutDto) => dto.fulfillmentMethod === 'DELIVERY')
  @IsString()
  @IsNotEmpty()
  deliveryAddress?: string;

  @IsOptional()
  @IsString()
  pickupLocation?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @ValidateIf((dto: CheckoutDto) => dto.paymentMethod === 'CARD')
  @IsString()
  @IsNotEmpty()
  cardholderName?: string;

  @ValidateIf((dto: CheckoutDto) => dto.paymentMethod === 'CARD')
  @IsString()
  @IsNotEmpty()
  cardLast4?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items?: CheckoutItemDto[];
}
