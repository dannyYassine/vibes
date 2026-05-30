import type { HttpClient } from "@/infra/http/HttpClient";
import type { TodoDto, CreateTodoDto, CompleteTodoDto } from "./TodoDto";

export class TodoDataSource {
  constructor(
    private readonly httpClient: HttpClient,
    private readonly baseUrl: string,
  ) {}

  async fetchTodos(): Promise<TodoDto[]> {
    return this.httpClient.get<TodoDto[]>(`${this.baseUrl}/todos`);
  }

  async createTodo(payload: CreateTodoDto): Promise<TodoDto> {
    return this.httpClient.post<TodoDto>(`${this.baseUrl}/todos`, payload);
  }

  async completeTodo(id: string, payload: CompleteTodoDto): Promise<TodoDto> {
    return this.httpClient.patch<TodoDto>(`${this.baseUrl}/todos/${id}/complete`, payload);
  }

  async deleteTodo(id: string): Promise<void> {
    return this.httpClient.delete(`${this.baseUrl}/todos/${id}`);
  }
}