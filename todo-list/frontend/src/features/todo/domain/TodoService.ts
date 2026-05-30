import type { Todo } from "./Todo";
import type { TodoRepository } from "./TodoRepository";

export class TodoService {
  constructor(private readonly todoRepository: TodoRepository) {}

  async getTodos(): Promise<Todo[]> {
    return this.todoRepository.findAll();
  }

  async createTodo(title: string): Promise<Todo> {
    if (!title.trim()) {
      throw new Error("Title cannot be empty");
    }
    return this.todoRepository.create(title.trim());
  }

  async completeTodo(id: string): Promise<Todo> {
    return this.todoRepository.complete(id);
  }

  async deleteTodo(id: string): Promise<void> {
    return this.todoRepository.delete(id);
  }
}