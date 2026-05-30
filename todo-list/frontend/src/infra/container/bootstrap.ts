import { Container } from "./Container";
import { HttpClient } from "@/infra/http/HttpClient";
import { registerTodoModule } from "@/features/todo/todoModule";

export function bootstrapContainer(): Container {
  const container = new Container();

  container.register(
    HttpClient,
    () => new HttpClient(import.meta.env.VITE_API_URL || "http://localhost:3000"),
  );

  registerTodoModule(container);

  return container;
}