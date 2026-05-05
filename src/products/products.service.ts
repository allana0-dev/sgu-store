import { randomUUID } from "crypto";
import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "../generated/prisma";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { SearchProductsDto } from "./dto/search-products.dto";
import { UpdateProductDto } from "./dto/update-product.dto";

type ProductPricing = {
  currency: string;
  basePrice: number;
  salePrice: number | null;
  compareAtPrice: number | null;
};

type ProductVariant = {
  label: string;
  options: string[];
};

export type CatalogProduct = {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  images: string[];
  image: string;
  href: string;
  pricing: ProductPricing;
  inventoryStatus: "in_stock" | "low_stock" | "out_of_stock";
  inventoryLabel: string;
  category: string;
  department: string;
  tags: string[];
  gender: "women" | "men" | "unisex";
  dietary: string[] | null;
  variants: ProductVariant[] | null;
  rating: number | null;
  reviewCount: number;
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
        subtitle: dto.subtitle.trim(),
        description: dto.description?.trim() || "",
        images: this.serializeStringArray(dto.images),
        image: dto.image.trim(),
        href: dto.href.trim(),
        currency: dto.pricing.currency.trim().toUpperCase(),
        basePrice: this.roundCurrency(dto.pricing.basePrice),
        salePrice:
          dto.pricing.salePrice === null
            ? null
            : this.roundCurrency(dto.pricing.salePrice),
        compareAtPrice:
          dto.pricing.compareAtPrice === null
            ? null
            : this.roundCurrency(dto.pricing.compareAtPrice),
        inventoryStatus: this.normalizeInventoryStatus(dto.inventoryStatus),
        inventoryLabel: dto.inventoryLabel.trim(),
        category: dto.category?.trim() || null,
        department: dto.department.trim(),
        tags: tags.length > 0 ? tags.join(", ") : null,
        gender: dto.gender.trim().toLowerCase(),
        dietary: dto.dietary === null ? null : this.serializeStringArray(dto.dietary),
        variants: dto.variants === null ? null : this.serializeVariants(dto.variants),
        rating:
          dto.rating === undefined ? null : this.normalizeRating(dto.rating),
        reviewCount: dto.reviewCount ?? 0,
        inventory: dto.inventory ?? 0,
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
        subtitle: dto.subtitle?.trim(),
        description: dto.description === undefined ? undefined : dto.description.trim(),
        images:
          dto.images === undefined
            ? undefined
            : this.serializeStringArray(dto.images),
        image: dto.image?.trim(),
        href: dto.href?.trim(),
        currency: dto.pricing?.currency?.trim().toUpperCase(),
        basePrice:
          dto.pricing?.basePrice === undefined
            ? undefined
            : this.roundCurrency(dto.pricing.basePrice),
        salePrice:
          dto.pricing?.salePrice === undefined
            ? undefined
            : dto.pricing.salePrice === null
              ? null
              : this.roundCurrency(dto.pricing.salePrice),
        compareAtPrice:
          dto.pricing?.compareAtPrice === undefined
            ? undefined
            : dto.pricing.compareAtPrice === null
              ? null
              : this.roundCurrency(dto.pricing.compareAtPrice),
        inventoryStatus:
          dto.inventoryStatus === undefined
            ? undefined
            : this.normalizeInventoryStatus(dto.inventoryStatus),
        inventoryLabel: dto.inventoryLabel?.trim(),
        category:
          dto.category === undefined
            ? undefined
            : dto.category.trim(),
        department: dto.department?.trim(),
        tags: tags ? (tags.length > 0 ? tags.join(", ") : null) : undefined,
        gender: dto.gender?.trim().toLowerCase(),
        dietary:
          dto.dietary === undefined
            ? undefined
            : dto.dietary === null
              ? null
              : this.serializeStringArray(dto.dietary),
        variants:
          dto.variants === undefined
            ? undefined
            : dto.variants === null
              ? null
              : this.serializeVariants(dto.variants),
        rating:
          dto.rating === undefined
            ? undefined
            : this.normalizeRating(dto.rating),
        reviewCount: dto.reviewCount,
        inventory: dto.inventory,
        isActive: dto.isActive,
      },
    });

    return this.toCatalogProduct(product);
  }

  async list(limit = 50): Promise<CatalogProduct[]> {
    const products = await this.prisma.product.findMany({
      orderBy: [{ updatedAt: "desc" }],
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
      ...(onlyInStock ? { inventoryStatus: { not: "out_of_stock" } } : {}),
      ...(query
        ? {
            OR: [
              { id: { contains: query } },
              { name: { contains: query } },
              { subtitle: { contains: query } },
              { description: { contains: query } },
              { category: { contains: query } },
              { department: { contains: query } },
              { tags: { contains: query } },
              { dietary: { contains: query } },
            ],
          }
        : {}),
    };

    const products = await this.prisma.product.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
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
      inventoryStatus: { not: "out_of_stock" },
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
    subtitle: string;
    description: string | null;
    images: string;
    image: string;
    href: string;
    currency: string;
    basePrice: number;
    salePrice: number | null;
    compareAtPrice: number | null;
    inventoryStatus: string;
    inventoryLabel: string;
    category: string | null;
    department: string;
    tags: string | null;
    gender: string;
    dietary: string | null;
    variants: string | null;
    rating: number | null;
    reviewCount: number;
    inventory: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): CatalogProduct {
    return {
      id: product.id,
      name: product.name,
      subtitle: product.subtitle,
      description: product.description ?? "",
      images: this.deserializeStringArray(product.images),
      image: product.image,
      href: product.href,
      pricing: {
        currency: product.currency,
        basePrice: this.roundCurrency(product.basePrice),
        salePrice:
          product.salePrice === null ? null : this.roundCurrency(product.salePrice),
        compareAtPrice:
          product.compareAtPrice === null
            ? null
            : this.roundCurrency(product.compareAtPrice),
      },
      inventoryStatus: this.normalizeInventoryStatus(product.inventoryStatus),
      inventoryLabel: product.inventoryLabel,
      category: product.category ?? "",
      department: product.department,
      tags: this.deserializeTags(product.tags),
      gender: this.normalizeGender(product.gender),
      dietary:
        product.dietary === null
          ? null
          : this.deserializeStringArray(product.dietary),
      variants: this.deserializeVariants(product.variants),
      rating: product.rating,
      reviewCount: product.reviewCount,
      inventory: product.inventory,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
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

  private serializeStringArray(values: string[]): string {
    return values
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
      .join(", ");
  }

  private deserializeStringArray(values: string | null): string[] {
    if (!values) {
      return [];
    }

    return values
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }

  private serializeVariants(variants: Array<{ label: string; options: string[] }>): string {
    return JSON.stringify(
      variants.map((variant) => ({
        label: variant.label.trim(),
        options: variant.options
          .map((option) => option.trim())
          .filter((option) => option.length > 0),
      })),
    );
  }

  private deserializeVariants(variants: string | null): ProductVariant[] | null {
    if (!variants) {
      return null;
    }

    try {
      const parsed = JSON.parse(variants) as Array<{ label?: string; options?: string[] }>;
      if (!Array.isArray(parsed)) {
        return null;
      }

      const normalized = parsed
        .filter((variant) => typeof variant?.label === "string" && Array.isArray(variant?.options))
        .map((variant) => ({
          label: (variant.label as string).trim(),
          options: (variant.options as string[])
            .map((option) => option.trim())
            .filter((option) => option.length > 0),
        }))
        .filter((variant) => variant.label.length > 0 && variant.options.length > 0);

      return normalized.length > 0 ? normalized : null;
    } catch {
      return null;
    }
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

  private normalizeInventoryStatus(value: string): "in_stock" | "low_stock" | "out_of_stock" {
    const normalized = value.trim().toLowerCase();

    if (normalized === "low_stock" || normalized === "out_of_stock") {
      return normalized;
    }

    return "in_stock";
  }

  private normalizeGender(value: string): "women" | "men" | "unisex" {
    const normalized = value.trim().toLowerCase();

    if (normalized === "women" || normalized === "men") {
      return normalized;
    }

    return "unisex";
  }
}
