export class Quote {
  readonly content: string;
  readonly author: string;

  constructor(params: { content: string; author: string }) {
    this.content = params.content;
    this.author = params.author;
  }
}