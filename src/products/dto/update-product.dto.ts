import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from "class-validator";

class UpdateProductPricingDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  basePrice?: number;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  salePrice?: number | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  compareAtPrice?: number | null;
}

class UpdateProductVariantDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  label: string;

  @IsArray()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(80, { each: true })
  options: string[];
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  subtitle?: string;

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

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(2048, { each: true })
  images?: string[];

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  image?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  href?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateProductPricingDto)
  pricing?: UpdateProductPricingDto;

  @IsOptional()
  @IsString()
  @IsIn(["in_stock", "low_stock", "out_of_stock"])
  inventoryStatus?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  inventoryLabel?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  department?: string;

  @IsOptional()
  @IsString()
  @IsIn(["women", "men", "unisex"])
  gender?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsArray()
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  dietary?: string[] | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateProductVariantDto)
  variants?: UpdateProductVariantDto[] | null;

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
