import { Body, Controller, Post } from '@nestjs/common';
import { RecommendProductsDto } from './dto/recommend-products.dto';
import { RecommendationsService } from './recommendations.service';

@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Post()
  recommendProducts(@Body() dto: RecommendProductsDto) {
    return this.recommendationsService.recommend(dto);
  }
}
