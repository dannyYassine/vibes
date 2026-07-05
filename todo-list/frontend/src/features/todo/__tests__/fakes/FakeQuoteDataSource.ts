import type { QuoteDto } from "../../data/QuoteDto";

const DEFAULT_QUOTE: QuoteDto = {
  content: "Doing what you love is the cornerstone of having abundance in your life.",
  author: "Wayne Dyer",
};

export class FakeQuoteDataSource {
  private quote: QuoteDto = DEFAULT_QUOTE;

  async fetchQuote(): Promise<QuoteDto> {
    return { ...this.quote };
  }

  setQuote(quote: QuoteDto): this {
    this.quote = quote;
    return this;
  }
}