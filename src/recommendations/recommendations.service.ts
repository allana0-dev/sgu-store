import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CatalogProduct, ProductsService } from '../products/products.service';
import { RecommendProductsDto } from './dto/recommend-products.dto';

type RankedRecommendation = {
  productId: string;
  reason: string;
  score: number;
};

type RecommendationResult = {
  query: string;
  recommendations: Array<CatalogProduct & { score: number; reason: string }>;
  mode: 'ai' | 'fallback';
  summary: string;
};

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly productsService: ProductsService,
    private readonly prisma: PrismaService,
  ) {}

  async recommend(dto: RecommendProductsDto): Promise<RecommendationResult> {
    const query = dto.query.trim();
    const limit = dto.limit ?? 6;
    const candidateLimit = Math.min(Math.max(limit * 5, 20), 80);

    const candidates = await this.productsService.getActiveRecommendationCandidates(query, candidateLimit);

    if (candidates.length === 0) {
      return {
        query,
        recommendations: [],
        mode: 'fallback',
        summary: 'No active in-stock products were found in the catalog.',
      };
    }

    const fallbackRecommendations = this.buildFallbackRecommendations(candidates, limit);
    const openAiApiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!openAiApiKey) {
      return {
        query,
        recommendations: fallbackRecommendations,
        mode: 'fallback',
        summary: 'OpenAI key is not configured. Returned best DB matches only.',
      };
    }

    try {
      const ranked = await this.rankWithOpenAi({
        query,
        limit,
        candidates,
        userSignals: dto.userId ? await this.getUserSignals(dto.userId) : null,
        openAiApiKey,
      });

      const rankedItems = this.mapRankedRecommendations(ranked, candidates, limit);

      if (rankedItems.length === 0) {
        return {
          query,
          recommendations: fallbackRecommendations,
          mode: 'fallback',
          summary: 'OpenAI returned no usable ranking. Returned DB fallback ranking.',
        };
      }

      return {
        query,
        recommendations: rankedItems,
        mode: 'ai',
        summary: 'Recommendations ranked by OpenAI using your query and live catalog candidates.',
      };
    } catch (error) {
      this.logger.warn(
        `OpenAI ranking failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      return {
        query,
        recommendations: fallbackRecommendations,
        mode: 'fallback',
        summary: 'OpenAI request failed. Returned DB fallback ranking.',
      };
    }
  }

  private buildFallbackRecommendations(
    candidates: CatalogProduct[],
    limit: number,
  ): Array<CatalogProduct & { score: number; reason: string }> {
    return candidates.slice(0, limit).map((product, index) => ({
      ...product,
      score: Math.max(0.5, Number((1 - index / Math.max(limit, 1)).toFixed(2))),
      reason: 'Strong catalog match based on availability and recency.',
    }));
  }

  private async rankWithOpenAi(params: {
    query: string;
    limit: number;
    candidates: CatalogProduct[];
    userSignals: string[] | null;
    openAiApiKey: string;
  }): Promise<RankedRecommendation[]> {
    const model = this.configService.get<string>('OPENAI_MODEL') || 'gpt-5.2';

    const payload = {
      model,
      input: [
        {
          role: 'system',
          content:
            'You are a retail recommendation engine. Recommend only products from the candidate list. Do not invent products.',
        },
        {
          role: 'user',
          content: JSON.stringify(
            {
              task: 'Rank catalog candidates for the user intent.',
              query: params.query,
              limit: params.limit,
              userSignals: params.userSignals,
              candidates: params.candidates.map((product) => ({
                productId: product.id,
                name: product.name,
                description: product.description,
                category: product.category,
                tags: product.tags,
                price: product.price,
                inStock: product.inStock,
              })),
              outputRules: {
                onlyUseGivenProductIds: true,
                maxReasonLength: 180,
              },
            },
            null,
            2,
          ),
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'product_recommendations',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              recommendations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    productId: { type: 'string' },
                    score: { type: 'number' },
                    reason: { type: 'string' },
                  },
                  required: ['productId', 'score', 'reason'],
                  additionalProperties: false,
                },
              },
            },
            required: ['recommendations'],
            additionalProperties: false,
          },
        },
      },
    };

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.openAiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error?.message || 'OpenAI request failed.');
    }

    const rawOutput = this.extractResponseText(data);
    const parsedOutput = JSON.parse(rawOutput) as { recommendations?: RankedRecommendation[] };

    return Array.isArray(parsedOutput.recommendations) ? parsedOutput.recommendations : [];
  }

  private extractResponseText(responseData: unknown): string {
    if (
      typeof responseData === 'object' &&
      responseData !== null &&
      'output_text' in responseData &&
      typeof (responseData as { output_text?: unknown }).output_text === 'string'
    ) {
      const outputText = (responseData as { output_text: string }).output_text.trim();
      if (outputText.length > 0) {
        return outputText;
      }
    }

    if (typeof responseData === 'object' && responseData !== null && 'output' in responseData) {
      const output = (responseData as { output?: unknown }).output;
      if (Array.isArray(output)) {
        const combined = output
          .flatMap((item) => {
            if (!item || typeof item !== 'object' || !('content' in item)) {
              return [] as string[];
            }

            const content = (item as { content?: unknown }).content;
            if (!Array.isArray(content)) {
              return [] as string[];
            }

            return content
              .map((contentPart) => {
                if (!contentPart || typeof contentPart !== 'object' || !('text' in contentPart)) {
                  return null;
                }

                const text = (contentPart as { text?: unknown }).text;
                return typeof text === 'string' ? text : null;
              })
              .filter((text): text is string => Boolean(text));
          })
          .join('\n')
          .trim();

        if (combined.length > 0) {
          return combined;
        }
      }
    }

    throw new Error('OpenAI response did not include parseable text output.');
  }

  private mapRankedRecommendations(
    ranked: RankedRecommendation[],
    candidates: CatalogProduct[],
    limit: number,
  ): Array<CatalogProduct & { score: number; reason: string }> {
    const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));

    const mapped = ranked
      .map((item) => {
        const product = byId.get(item.productId);
        if (!product) {
          return null;
        }

        return {
          ...product,
          score: Math.max(0, Math.min(1, Number(item.score.toFixed(2)))),
          reason: item.reason,
        };
      })
      .filter((item): item is CatalogProduct & { score: number; reason: string } => Boolean(item));

    const deduped = new Map<string, CatalogProduct & { score: number; reason: string }>();
    for (const item of mapped) {
      if (!deduped.has(item.id)) {
        deduped.set(item.id, item);
      }
    }

    const ordered = Array.from(deduped.values());
    if (ordered.length >= limit) {
      return ordered.slice(0, limit);
    }

    const alreadyIncluded = new Set(ordered.map((item) => item.id));
    const fallbackFill = candidates
      .filter((candidate) => !alreadyIncluded.has(candidate.id))
      .slice(0, limit - ordered.length)
      .map((candidate, index) => ({
        ...candidate,
        score: Math.max(0.4, Number((0.7 - index * 0.05).toFixed(2))),
        reason: 'Supplemental catalog match selected from available inventory.',
      }));

    return [...ordered, ...fallbackFill].slice(0, limit);
  }

  private async getUserSignals(userId: number): Promise<string[]> {
    const recentItems = await this.prisma.orderItem.findMany({
      where: { order: { userId } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        productName: true,
        productId: true,
      },
    });

    return recentItems.map((item) => `${item.productName} (${item.productId})`);
  }
}
