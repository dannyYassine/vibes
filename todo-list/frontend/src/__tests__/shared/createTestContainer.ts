import { Container } from "@/infra/container/Container";
import { FakeTodoDataSource } from "@/features/todo/__tests__/fakes/FakeTodoDataSource";
import { TodoDataSource } from "@/features/todo/data/TodoDataSource";
import { TodoRepository } from "@/features/todo/domain/TodoRepository";
import { TodoService } from "@/features/todo/domain/TodoService";

export type TodoTestSetup = {
  container: Container;
  fakes: {
    todo: FakeTodoDataSource;
  };
};

export function createTodoTestContainer(): TodoTestSetup {
  const container = new Container();
  const fakeTodoDataSource = new FakeTodoDataSource();

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

  return {
    container,
    fakes: {
      todo: fakeTodoDataSource,
    },
  };
}