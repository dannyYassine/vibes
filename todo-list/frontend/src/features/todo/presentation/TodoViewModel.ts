import type { Todo } from "../domain/Todo";

export class TodoViewModel {
  constructor(private readonly todo: Todo) {}

  get id(): string {
    return this.todo.id;
  }

  get title(): string {
    return this.todo.title;
  }

  get completed(): boolean {
    return this.todo.completed;
  }

  get createdAt(): Date {
    return this.todo.createdAt;
  }

  get formattedDate(): string {
    return this.todo.createdAt.toLocaleDateString();
  }

  get isDone(): boolean {
    return this.todo.completed;
  }
}