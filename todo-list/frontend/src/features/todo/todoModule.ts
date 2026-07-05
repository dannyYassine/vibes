import type { Container } from "@/infra/container/Container";
import { HttpClient } from "@/infra/http/HttpClient";
import { TodoDataSource } from "./data/TodoDataSource";
import { TodoRepository } from "./domain/TodoRepository";
import { TodoService } from "./domain/TodoService";
import { QuoteDataSource } from "./data/QuoteDataSource";
import { QuoteRepository } from "./domain/QuoteRepository";
import { QuoteService } from "./domain/QuoteService";
import { TodoPresenter } from "./presentation/TodoPresenter";

export function registerTodoModule(container: Container): void {
  container.register(
    TodoDataSource,
    (c) => new TodoDataSource(c.resolve(HttpClient), "/api"),
    "singleton",
  );

  container.register(
    TodoRepository,
    (c) => new TodoRepository(c.resolve(TodoDataSource)),
    "singleton",
  );

  container.register(
    TodoService,
    (c) => new TodoService(c.resolve(TodoRepository)),
    "singleton",
  );

  container.register(
    QuoteDataSource,
    (c) => new QuoteDataSource(c.resolve(HttpClient)),
    "singleton",
  );

  container.register(
    QuoteRepository,
    (c) => new QuoteRepository(c.resolve(QuoteDataSource)),
    "singleton",
  );

  container.register(
    QuoteService,
    (c) => new QuoteService(c.resolve(QuoteRepository)),
    "singleton",
  );

  container.register(
    TodoPresenter,
    (c) => new TodoPresenter(c.resolve(TodoService), c.resolve(QuoteService)),
    "transient",
  );
}