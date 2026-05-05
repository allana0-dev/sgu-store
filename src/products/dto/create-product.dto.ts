import { Transform, Type } from "class-transformer";
import {
  ArrayMinSize,
  IsDefined,
  IsIn,
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

class ProductPricingDto {
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  currency: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  basePrice: number;

  @ValidateIf((_, value) => value !== null)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  salePrice: number | null;

  @ValidateIf((_, value) => value !== null)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  compareAtPrice: number | null;
}

class ProductVariantDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  label: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(80, { each: true })
  options: string[];
}

export class CreateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  id?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(180)
  name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(180)
  subtitle: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  tags?: string[];

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(2048, { each: true })
  images: string[];

  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  image: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  href: string;

  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => ProductPricingDto)
  pricing: ProductPricingDto;

  @IsString()
  @IsIn(["in_stock", "low_stock", "out_of_stock"])
  inventoryStatus: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  inventoryLabel: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  department: string;

  @IsString()
  @IsIn(["women", "men", "unisex"])
  gender: string;

  @ValidateIf((_, value) => value !== null)
  @IsArray()
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  dietary: string[] | null;

  @ValidateIf((_, value) => value !== null)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants: ProductVariantDto[] | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(5)
  rating?: number;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? value : Number(value)))
  @IsInt()
  @Min(0)
  reviewCount?: number;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? value : Number(value)))
  @IsInt()
  @Min(0)
  inventory?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
