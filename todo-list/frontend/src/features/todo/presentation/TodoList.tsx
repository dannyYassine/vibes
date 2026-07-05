import type { TodoViewModel } from "./TodoViewModel";
import { TodoItem } from "./TodoItem";

type Props = {
  todos: TodoViewModel[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
};

export function TodoList({ todos, onToggle, onDelete }: Props) {
  if (todos.length === 0) {
    return (
      <p className="text-center text-gray-400 text-sm py-8">
        No tasks yet. Add one above.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {todos.map((vm) => (
        <TodoItem
          key={vm.id}
          vm={vm}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
