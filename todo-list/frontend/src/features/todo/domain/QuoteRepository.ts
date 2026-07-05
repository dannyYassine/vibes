import { Quote } from "./Quote";
import type { QuoteDataSource } from "../data/QuoteDataSource";
import type { QuoteDto } from "../data/QuoteDto";

export class QuoteRepository {
  constructor(private readonly dataSource: QuoteDataSource) {}

  async getRandom(): Promise<Quote> {
    const dto = await this.dataSource.fetchQuote();
    return this.toEntity(dto);
  }

  private toEntity(dto: QuoteDto): Quote {
    return new Quote({
      content: dto.content,
      author: dto.author,
    });
  }
}