import { randomUUID } from "crypto";
import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "../generated/prisma";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { SearchProductsDto } from "./dto/search-products.dto";
import { UpdateProductDto } from "./dto/update-product.dto";

export type CatalogProduct = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[];
  imageUrl: string | null;
  price: number;
  rating: number | null;
  reviewCount: number;
  inStock: boolean;
  inventory: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto): Promise<CatalogProduct> {
    const id = dto.id?.trim() || randomUUID();
    const tags = this.normalizeTags(dto.tags);

    const product = await this.prisma.product.create({
      data: {
        id,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        category: dto.category?.trim() || null,
        tags: tags.length > 0 ? tags.join(", ") : null,
        imageUrl: dto.imageUrl || null,
        price: this.roundCurrency(dto.price),
        rating:
          dto.rating === undefined ? null : this.normalizeRating(dto.rating),
        reviewCount: dto.reviewCount ?? 0,
        inventory: dto.inventory ?? 0,
        inStock: dto.inStock ?? (dto.inventory ?? 0) > 0,
        isActive: dto.isActive ?? true,
      },
    });

    return this.toCatalogProduct(product);
  }

  async update(id: string, dto: UpdateProductDto): Promise<CatalogProduct> {
    const normalizedId = id.trim();
    const existing = await this.prisma.product.findUnique({
      where: { id: normalizedId },
    });

    if (!existing) {
      throw new NotFoundException("Product not found.");
    }

    const tags = dto.tags ? this.normalizeTags(dto.tags) : null;

    const product = await this.prisma.product.update({
      where: { id: normalizedId },
      data: {
        name: dto.name?.trim(),
        description: dto.description?.trim(),
        category: dto.category?.trim(),
        tags: tags ? (tags.length > 0 ? tags.join(", ") : null) : undefined,
        imageUrl: dto.imageUrl,
        price:
          dto.price === undefined ? undefined : this.roundCurrency(dto.price),
        rating:
          dto.rating === undefined
            ? undefined
            : this.normalizeRating(dto.rating),
        reviewCount: dto.reviewCount,
        inventory: dto.inventory,
        inStock: dto.inStock,
        isActive: dto.isActive,
      },
    });

    return this.toCatalogProduct(product);
  }

  async list(limit = 50): Promise<CatalogProduct[]> {
    const products = await this.prisma.product.findMany({
      orderBy: [{ inStock: "desc" }, { updatedAt: "desc" }],
      take: limit,
    });

    return products.map((product) => this.toCatalogProduct(product));
  }

  async findOne(id: string): Promise<CatalogProduct> {
    const product = await this.prisma.product.findFirst({
      where: {
        id: id.trim(),
        isActive: true,
      },
    });

    if (!product) {
      throw new NotFoundException("Product not found.");
    }

    return this.toCatalogProduct(product);
  }

  async search(dto: SearchProductsDto): Promise<CatalogProduct[]> {
    const limit = dto.limit ?? 20;
    const query = dto.query?.trim();
    const onlyInStock = dto.onlyInStock ?? false;

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      ...(onlyInStock ? { inStock: true } : {}),
      ...(query
        ? {
            OR: [
              { id: { contains: query } },
              { name: { contains: query } },
              { description: { contains: query } },
              { category: { contains: query } },
              { tags: { contains: query } },
            ],
          }
        : {}),
    };

    const products = await this.prisma.product.findMany({
      where,
      orderBy: [{ inStock: "desc" }, { updatedAt: "desc" }],
      take: limit,
    });

    return products.map((product) => this.toCatalogProduct(product));
  }

  async getActiveRecommendationCandidates(
    query: string,
    limit: number,
  ): Promise<CatalogProduct[]> {
    const trimmedQuery = query.trim();

    const directMatches = await this.search({
      query: trimmedQuery,
      limit,
      onlyInStock: true,
    });

    if (directMatches.length >= limit) {
      return directMatches;
    }

    const supplementalCount = limit - directMatches.length;
    const excludedIds = directMatches.map((product) => product.id);
    const supplementalWhere: Prisma.ProductWhereInput = {
      isActive: true,
      inStock: true,
      ...(excludedIds.length > 0 ? { id: { notIn: excludedIds } } : {}),
    };

    const supplementalProducts = await this.prisma.product.findMany({
      where: supplementalWhere,
      orderBy: [{ updatedAt: "desc" }],
      take: supplementalCount,
    });

    return [
      ...directMatches,
      ...supplementalProducts.map((product) => this.toCatalogProduct(product)),
    ];
  }

  private toCatalogProduct(product: {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    tags: string | null;
    imageUrl: string | null;
    price: number;
    rating: number | null;
    reviewCount: number;
    inStock: boolean;
    inventory: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): CatalogProduct {
    return {
      ...product,
      tags: this.deserializeTags(product.tags),
    };
  }

  private normalizeTags(tags?: string[]): string[] {
    if (!tags) {
      return [];
    }

    return tags
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
      .slice(0, 20);
  }

  private deserializeTags(tags: string | null): string[] {
    if (!tags) {
      return [];
    }

    return tags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
  }

  private roundCurrency(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private normalizeRating(value: number | null): number | null {
    if (value === null) {
      return null;
    }

    return Math.min(
      5,
      Math.max(0, Math.round((value + Number.EPSILON) * 10) / 10),
    );
  }
}
