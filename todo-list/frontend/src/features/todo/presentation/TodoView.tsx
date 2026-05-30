import { useState } from "react";
import { usePresenter } from "@/infra/presenter/react/usePresenter";
import { TodoPresenter } from "./TodoPresenter";

export function TodoView() {
  const { presenter, state } = usePresenter(TodoPresenter);
  const [title, setTitle] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    presenter.createTodo(title);
    setTitle("");
  };

  if (state.status === "loading") return <p>Loading…</p>;

  return (
    <div style={{ maxWidth: 480, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h1>Todo List</h1>

      {state.errorMessage && (
        <div style={{ color: "red", marginBottom: 12 }}>
          <span>{state.errorMessage}</span>
          <button onClick={() => presenter.dismissError()} style={{ marginLeft: 8 }}>
            Dismiss
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done?"
          style={{ flex: 1, padding: 8 }}
          disabled={state.isCreating}
        />
        <button type="submit" disabled={state.isCreating || !title.trim()}>
          Add
        </button>
      </form>

      {state.todos.length === 0 ? (
        <p style={{ color: "#888" }}>No todos yet. Add one above!</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {state.todos.map((vm) => (
            <li
              key={vm.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 0",
                borderBottom: "1px solid #eee",
              }}
            >
              <input
                type="checkbox"
                checked={vm.completed}
                onChange={() => presenter.completeTodo(vm.id)}
                disabled={vm.completed}
              />
              <span
                style={{
                  flex: 1,
                  textDecoration: vm.isDone ? "line-through" : "none",
                  color: vm.isDone ? "#aaa" : "#000",
                }}
              >
                {vm.title}
              </span>
              <span style={{ fontSize: 12, color: "#888" }}>
                {vm.formattedDate}
              </span>
              <button
                onClick={() => presenter.deleteTodo(vm.id)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}