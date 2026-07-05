import { usePresenter } from "@/infra/presenter/react/usePresenter";
import { TodoPresenter } from "./TodoPresenter";
import { TodoForm } from "./TodoForm";
import { TodoList } from "./TodoList";
import { ErrorMessage } from "./ErrorMessage";

export function TodoView() {
  const { presenter, state } = usePresenter(TodoPresenter);

  if (state.status === "loading") {
    return (
      <div className="max-w-lg mx-auto mt-16 px-4 font-sans">
        <p className="text-center text-gray-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto mt-16 px-4 font-sans">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Todo List</h1>

      {state.errorMessage && (
        <ErrorMessage
          message={state.errorMessage}
          onDismiss={() => presenter.dismissError()}
        />
      )}

      <TodoForm
        onSubmit={(title) => presenter.createTodo(title)}
        disabled={state.isCreating}
      />

      {state.todos.length > 0 && (
        <p className="text-sm text-gray-500 mt-5 mb-3">
          {presenter.activeCount} items left
        </p>
      )}

      <TodoList
        todos={state.todos}
        onToggle={(id) => presenter.completeTodo(id)}
        onDelete={(id) => presenter.deleteTodo(id)}
      />

      {state.quote && (
        <p className="text-center text-gray-400 text-xs italic mt-4">
          &ldquo;{state.quote.content}&rdquo; — {state.quote.author}
        </p>
      )}
    </div>
  );
}
