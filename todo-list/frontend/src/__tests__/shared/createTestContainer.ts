import { Container } from "@/infra/container/Container";
import { FakeTodoDataSource } from "@/features/todo/__tests__/fakes/FakeTodoDataSource";
import { FakeQuoteDataSource } from "@/features/todo/__tests__/fakes/FakeQuoteDataSource";
import { TodoDataSource } from "@/features/todo/data/TodoDataSource";
import { TodoRepository } from "@/features/todo/domain/TodoRepository";
import { TodoService } from "@/features/todo/domain/TodoService";
import { QuoteDataSource } from "@/features/todo/data/QuoteDataSource";
import { QuoteRepository } from "@/features/todo/domain/QuoteRepository";
import { QuoteService } from "@/features/todo/domain/QuoteService";

export type TodoTestSetup = {
  container: Container;
  fakes: {
    todo: FakeTodoDataSource;
    quote: FakeQuoteDataSource;
  };
};

export function createTodoTestContainer(): TodoTestSetup {
  const container = new Container();
  const fakeTodoDataSource = new FakeTodoDataSource();
  const fakeQuoteDataSource = new FakeQuoteDataSource();

  container.register(TodoDataSource, () => fakeTodoDataSource as unknown as TodoDataSource, "singleton");

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

  container.register(QuoteDataSource, () => fakeQuoteDataSource as unknown as QuoteDataSource, "singleton");

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

  return {
    container,
    fakes: {
      todo: fakeTodoDataSource,
      quote: fakeQuoteDataSource,
    },
  };
}