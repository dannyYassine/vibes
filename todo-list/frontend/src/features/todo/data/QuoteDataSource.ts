import type { HttpClient } from "@/infra/http/HttpClient";
import type { QuoteDto } from "./QuoteDto";

export class QuoteDataSource {
  constructor(
    private readonly httpClient: HttpClient,
    private readonly baseUrl: string,
  ) {}

  async fetchQuote(): Promise<QuoteDto> {
    return this.httpClient.get<QuoteDto>(`${this.baseUrl}/quote`);
  }
}