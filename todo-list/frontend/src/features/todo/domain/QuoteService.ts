import type { QuoteRepository } from "./QuoteRepository";
import { Quote } from "./Quote";

export class QuoteService {
  constructor(private readonly repository: QuoteRepository) {}

  async getRandomQuote(): Promise<Quote> {
    return this.repository.getRandom();
  }
}