import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithContainer } from "@/__tests__/shared/renderWithContainer";
import { Container } from "@/infra/container/Container";
import {
  FakePresenter,
  createFakePresenter,
} from "@/__tests__/shared/createFakePresenter";
import { TodoPresenter, type TodoState } from "../presentation/TodoPresenter";
import { TodoView } from "../presentation/TodoView";
import { Todo } from "../domain/Todo";
import { TodoViewModel } from "../presentation/TodoViewModel";

function makeTodoViewModel(id: string, title: string, completed = false): TodoViewModel {
  return new TodoViewModel(
    new Todo({ id, title, completed, createdAt: new Date("2026-05-01") }),
  );
}

type PresenterMethods = {
  loadTodos: TodoPresenter["loadTodos"];
  createTodo: TodoPresenter["createTodo"];
  completeTodo: TodoPresenter["completeTodo"];
  deleteTodo: TodoPresenter["deleteTodo"];
  dismissError: TodoPresenter["dismissError"];
};

describe("TodoView", () => {
  let container: Container;
  let presenter: FakePresenter<TodoState> & {
    loadTodos: ReturnType<typeof vi.fn>;
    createTodo: ReturnType<typeof vi.fn>;
    completeTodo: ReturnType<typeof vi.fn>;
    deleteTodo: ReturnType<typeof vi.fn>;
    dismissError: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    container = new Container();
    presenter = createFakePresenter<TodoState, PresenterMethods>(
      {
        status: "idle",
        todos: [],
        errorMessage: null,
        isCreating: false,
        quote: null,
      },
      ["loadTodos", "createTodo", "completeTodo", "deleteTodo", "dismissError"],
    );
    container.register(TodoPresenter, () => presenter as unknown as TodoPresenter, "transient");
  });

  it("shows loading text when status is loading", () => {
    presenter.setStateForTest({ status: "loading" });
    renderWithContainer(<TodoView />, container);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows empty state when no todos exist", () => {
    presenter.replaceStateForTest({
      status: "loaded",
      todos: [],
      errorMessage: null,
      isCreating: false,
      quote: null,
    });
    renderWithContainer(<TodoView />, container);
    expect(screen.getByText(/no tasks yet/i)).toBeInTheDocument();
  });

  it("renders a list of todos", () => {
    presenter.replaceStateForTest({
      status: "loaded",
      todos: [
        makeTodoViewModel("1", "Buy milk"),
        makeTodoViewModel("2", "Clean desk", true),
      ],
      errorMessage: null,
      isCreating: false,
      quote: null,
    });
    renderWithContainer(<TodoView />, container);

    expect(screen.getByText("Buy milk")).toBeInTheDocument();
    expect(screen.getByText("Clean desk")).toBeInTheDocument();
  });

  it("shows error message with dismiss button", () => {
    presenter.setStateForTest({
      status: "error",
      errorMessage: "Something went wrong",
    });
    renderWithContainer(<TodoView />, container);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Dismiss"));
    expect(presenter.dismissError).toHaveBeenCalledTimes(1);
  });

  it("calls createTodo when form is submitted", () => {
    presenter.replaceStateForTest({
      status: "loaded",
      todos: [],
      errorMessage: null,
      isCreating: false,
      quote: null,
    });
    renderWithContainer(<TodoView />, container);

    const input = screen.getByPlaceholderText("Add new task");
    fireEvent.change(input, { target: { value: "New task" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(presenter.createTodo).toHaveBeenCalledWith("New task");
  });

  it("does not call createTodo with empty title", () => {
    presenter.replaceStateForTest({
      status: "loaded",
      todos: [],
      errorMessage: null,
      isCreating: false,
      quote: null,
    });
    renderWithContainer(<TodoView />, container);

    const addButton = screen.getByRole("button", { name: "Add" });
    expect(addButton).toBeDisabled();
  });

  it("calls completeTodo when checkbox is clicked", () => {
    presenter.replaceStateForTest({
      status: "loaded",
      todos: [makeTodoViewModel("a1", "Task one")],
      errorMessage: null,
      isCreating: false,
      quote: null,
    });
    renderWithContainer(<TodoView />, container);

    const toggle = screen.getByRole("button", { name: "Complete" });
    fireEvent.click(toggle);
    expect(presenter.completeTodo).toHaveBeenCalledWith("a1");
  });

  it("calls deleteTodo when delete button is clicked", () => {
    presenter.replaceStateForTest({
      status: "loaded",
      todos: [makeTodoViewModel("d1", "Delete me")],
      errorMessage: null,
      isCreating: false,
      quote: null,
    });
    renderWithContainer(<TodoView />, container);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(presenter.deleteTodo).toHaveBeenCalledWith("d1");
  });

  it("shows completed todos as struck through", () => {
    presenter.replaceStateForTest({
      status: "loaded",
      todos: [makeTodoViewModel("c1", "Done task", true)],
      errorMessage: null,
      isCreating: false,
      quote: null,
    });
    renderWithContainer(<TodoView />, container);

    const span = screen.getByText("Done task");
    expect(span).toHaveClass("line-through");
  });

  it("shows active todo count", () => {
    presenter.replaceStateForTest({
      status: "loaded",
      todos: [
        makeTodoViewModel("1", "Buy milk"),
        makeTodoViewModel("2", "Clean desk", true),
        makeTodoViewModel("3", "Walk dog"),
      ],
      errorMessage: null,
      isCreating: false,
      quote: null,
    });
    renderWithContainer(<TodoView />, container);

    expect(screen.getByText("2 items left")).toBeInTheDocument();
  });

  it("renders the quote when present", () => {
    presenter.replaceStateForTest({
      status: "loaded",
      todos: [],
      errorMessage: null,
      isCreating: false,
      quote: { content: "Do it.", author: "Someone" },
    });
    renderWithContainer(<TodoView />, container);

    expect(screen.getByText(/Do it\./)).toBeInTheDocument();
    expect(screen.getByText(/Someone/)).toBeInTheDocument();
  });
});