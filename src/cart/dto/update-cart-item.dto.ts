import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateCartItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity: number;

  @IsOptional()
  @IsString()
  productName?: string;

  @IsOptional()
  @IsString()
  productImageUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice?: number;
}
