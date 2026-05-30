import { describe, it, expect, beforeEach } from "vitest";
import {
  createTodoTestContainer,
  type TodoTestSetup,
} from "@/__tests__/shared/createTestContainer";
import { TodoService } from "../domain/TodoService";
import { TodoViewModel } from "../presentation/TodoViewModel";
import { makeTodoDto, makeCompletedTodoDto } from "./fakes/todoDtoFactory";

describe("Todo feature", () => {
  let setup: TodoTestSetup;
  let service: TodoService;

  beforeEach(() => {
    setup = createTodoTestContainer();
    service = setup.container.resolve(TodoService);
  });

  describe("getTodos", () => {
    it("returns mapped domain entities from the fake data source", async () => {
      setup.fakes.todo.seed([
        makeTodoDto({ id: "1", title: "Buy milk" }),
        makeCompletedTodoDto({ id: "2", title: "Clean desk" }),
      ]);

      const todos = await service.getTodos();

      expect(todos).toHaveLength(2);
      expect(todos[0].id).toBe("1");
      expect(todos[0].title).toBe("Buy milk");
      expect(todos[0].completed).toBe(false);
      expect(todos[0].createdAt).toBeInstanceOf(Date);
      expect(todos[1].isDone()).toBe(true);
    });

    it("returns empty array when no todos exist", async () => {
      const todos = await service.getTodos();
      expect(todos).toHaveLength(0);
    });
  });

  describe("createTodo", () => {
    it("creates a todo and returns the entity", async () => {
      const todo = await service.createTodo("Buy groceries");
      expect(todo.title).toBe("Buy groceries");
      expect(todo.completed).toBe(false);
      expect(todo.id).toBeTruthy();
    });

    it("trims whitespace from title", async () => {
      const todo = await service.createTodo("  Walk dog  ");
      expect(todo.title).toBe("Walk dog");
    });

    it("throws when title is empty", async () => {
      await expect(service.createTodo("")).rejects.toThrow("Title cannot be empty");
    });

    it("throws when title is only whitespace", async () => {
      await expect(service.createTodo("   ")).rejects.toThrow("Title cannot be empty");
    });

    it("persisted todo appears in getTodos", async () => {
      await service.createTodo("Task one");
      await service.createTodo("Task two");

      const todos = await service.getTodos();
      expect(todos).toHaveLength(2);
      expect(todos.map((t) => t.title)).toContain("Task one");
      expect(todos.map((t) => t.title)).toContain("Task two");
    });
  });

  describe("completeTodo", () => {
    it("marks a todo as completed", async () => {
      setup.fakes.todo.seed([makeTodoDto({ id: "a", title: "Test", completed: false })]);

      const completed = await service.completeTodo("a");
      expect(completed.completed).toBe(true);
      expect(completed.isDone()).toBe(true);
    });

    it("completed todo is reflected in getTodos", async () => {
      setup.fakes.todo.seed([makeTodoDto({ id: "b", title: "Test", completed: false })]);

      await service.completeTodo("b");
      const todos = await service.getTodos();
      expect(todos[0].completed).toBe(true);
    });
  });

  describe("deleteTodo", () => {
    it("removes a todo", async () => {
      setup.fakes.todo.seed([makeTodoDto({ id: "c", title: "Delete me" })]);

      await service.deleteTodo("c");
      const todos = await service.getTodos();
      expect(todos).toHaveLength(0);
    });
  });

  describe("ViewModel projection", () => {
    it("exposes display props for the view", async () => {
      setup.fakes.todo.seed([
        makeTodoDto({ id: "vm-1", title: "ViewModel test", completed: true, created_at: "2026-05-01T00:00:00.000Z" }),
      ]);

      const todos = await service.getTodos();
      const vm = new TodoViewModel(todos[0]);

      expect(vm.title).toBe("ViewModel test");
      expect(vm.isDone).toBe(true);
      expect(vm.completed).toBe(true);
      expect(vm.id).toBe("vm-1");
    });
  });
});