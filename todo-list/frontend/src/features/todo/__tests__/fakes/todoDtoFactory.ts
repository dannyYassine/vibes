import type { TodoDto } from "../../data/TodoDto";

export function makeTodoDto(overrides: Partial<TodoDto> = {}): TodoDto {
  return {
    id: "todo-1",
    title: "Buy groceries",
    completed: false,
    created_at: "2026-05-28T10:00:00.000Z",
    ...overrides,
  };
}

export function makeCompletedTodoDto(overrides: Partial<TodoDto> = {}): TodoDto {
  return makeTodoDto({ id: "todo-2", title: "Walk the dog", completed: true, ...overrides });
}