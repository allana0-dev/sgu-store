import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewsService } from './reviews.service';

@Controller('products/:productId/reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  listReviews(@Param('productId') productId: string) {
    return this.reviewsService.listByProductId(productId);
  }

  @Post()
  createReview(@Param('productId') productId: string, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(productId, dto);
  }
}
