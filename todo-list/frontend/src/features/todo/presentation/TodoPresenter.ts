import { Presenter } from "@/infra/presenter/Presenter";
import type { TodoService } from "../domain/TodoService";
import type { QuoteService } from "../domain/QuoteService";
import { TodoViewModel } from "./TodoViewModel";

export type TodoState = {
  status: "idle" | "loading" | "loaded" | "error";
  todos: TodoViewModel[];
  errorMessage: string | null;
  isCreating: boolean;
  quote: { content: string; author: string } | null;
};

export class TodoPresenter extends Presenter<TodoState> {
  constructor(
    private readonly todoService: TodoService,
    private readonly quoteService: QuoteService,
  ) {
    super({
      status: "idle",
      todos: [],
      errorMessage: null,
      isCreating: false,
      quote: null,
    });
  }

  override async onMounted(): Promise<void> {
    await Promise.all([this.loadTodos(), this.loadQuote()]);
  }

  async loadTodos(): Promise<void> {
    this.setState({ status: "loading", errorMessage: null });
    try {
      const todos = await this.todoService.getTodos();
      this.setState({
        status: "loaded",
        todos: todos.map((t) => new TodoViewModel(t)),
        errorMessage: null,
      });
    } catch (error) {
      this.setState({
        status: "error",
        errorMessage: this.formatError(error),
      });
    }
  }

  async loadQuote(): Promise<void> {
    try {
      const q = await this.quoteService.getRandomQuote();
      this.setState({ quote: { content: q.content, author: q.author } });
    } catch {
      this.setState({ quote: null });
    }
  }

  async createTodo(title: string): Promise<void> {
    if (!title.trim()) return;

    this.setState({ isCreating: true, errorMessage: null });
    try {
      await this.todoService.createTodo(title.trim());
      await this.loadTodos();
      this.setState({ isCreating: false });
    } catch (error) {
      this.setState({
        isCreating: false,
        errorMessage: this.formatError(error),
      });
    }
  }

  async completeTodo(id: string): Promise<void> {
    this.setState({ errorMessage: null });
    try {
      await this.todoService.completeTodo(id);
      await this.loadTodos();
    } catch (error) {
      this.setState({ errorMessage: this.formatError(error) });
    }
  }

  async deleteTodo(id: string): Promise<void> {
    this.setState({ errorMessage: null });
    try {
      await this.todoService.deleteTodo(id);
      await this.loadTodos();
    } catch (error) {
      this.setState({ errorMessage: this.formatError(error) });
    }
  }

  dismissError(): void {
    this.setState({ errorMessage: null });
  }

  get activeCount(): number {
    return this.getState().todos.filter((t) => !t.completed).length;
  }

  private formatError(error: unknown): string {
    if (error instanceof Error) return error.message;
    return "An unexpected error occurred";
  }
}