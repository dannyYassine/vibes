import type { TodoViewModel } from "./TodoViewModel";

type Props = {
  vm: TodoViewModel;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
};

export function TodoItem({ vm, onToggle, onDelete }: Props) {
  return (
    <li className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 group hover:bg-gray-50 transition-colors">
      <button
        onClick={() => onToggle(vm.id)}
        disabled={vm.completed}
        className={`w-5 h-5 border rounded flex items-center justify-center flex-shrink-0 transition-colors ${
          vm.completed
            ? "bg-gray-400 border-gray-400"
            : "border-gray-300 hover:border-gray-400"
        }`}
        aria-label={vm.completed ? "Completed" : "Complete"}
      >
        {vm.completed && (
          <svg
            className="w-3 h-3 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>
      <span
        className={`flex-1 text-sm ${
          vm.isDone ? "line-through text-gray-400" : "text-gray-800"
        }`}
      >
        {vm.title}
      </span>
      <button
        onClick={() => onDelete(vm.id)}
        className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0 text-lg leading-none"
        aria-label="Delete"
      >
        ×
      </button>
    </li>
  );
}
