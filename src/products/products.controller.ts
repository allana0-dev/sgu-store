import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { CreateProductDto } from "./dto/create-product.dto";
import { SearchProductsDto } from "./dto/search-products.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { ProductsService } from "./products.service";

@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  createProduct(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(":id")
  updateProduct(@Param("id") id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Get()
  listProducts(@Query("limit") limit?: string) {
    const parsedLimit = limit ? Number(limit) : 50;
    const safeLimit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 200)
      : 50;
    return this.productsService.list(safeLimit);
  }

  @Get("search")
  searchProducts(@Query() dto: SearchProductsDto) {
    return this.productsService.search(dto);
  }

  @Get(":id")
  getProduct(@Param("id") id: string) {
    return this.productsService.findOne(id);
  }
}
