import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateReviewDto } from "./dto/create-review.dto";

export type ProductReview = {
  id: number;
  productId: string;
  displayName: string;
  rating: number;
  title: string | null;
  body: string;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async listByProductId(productId: string): Promise<ProductReview[]> {
    const normalizedProductId = productId.trim();

    return this.prisma.review.findMany({
      where: { productId: normalizedProductId },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(
    productId: string,
    dto: CreateReviewDto,
  ): Promise<ProductReview> {
    const normalizedProductId = productId.trim();

    const review = await this.prisma.review.create({
      data: {
        productId: normalizedProductId,
        displayName: dto.displayName.trim(),
        rating: dto.rating,
        title: dto.title?.trim() || null,
        body: dto.body.trim(),
      },
    });

    await this.updateProductRatingSummary(normalizedProductId);

    return review;
  }

  private async updateProductRatingSummary(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      return;
    }

    const summary = await this.prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const rating = summary._avg.rating
      ? Math.round((summary._avg.rating + Number.EPSILON) * 10) / 10
      : null;

    await this.prisma.product.update({
      where: { id: productId },
      data: {
        rating,
        reviewCount: summary._count.rating,
      },
    });
  }
}
