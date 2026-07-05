import { useState } from "react";

type Props = {
  onSubmit: (title: string) => void;
  disabled: boolean;
};

export function TodoForm({ onSubmit, disabled }: Props) {
  const [title, setTitle] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit(title.trim());
    setTitle("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <div className="flex-1">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add new task"
          disabled={disabled}
          className="w-full bg-transparent border-0 border-b border-gray-300 px-0 py-2 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-gray-500 transition-colors"
        />
      </div>
      <button
        type="submit"
        disabled={disabled || !title.trim()}
        className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-800 text-white font-medium text-lg leading-none disabled:opacity-40 transition-opacity hover:bg-gray-700 flex-shrink-0"
        aria-label="Add"
      >
        +
      </button>
    </form>
  );
}
