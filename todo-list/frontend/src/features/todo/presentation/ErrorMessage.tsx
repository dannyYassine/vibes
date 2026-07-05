type Props = {
  message: string;
  onDismiss: () => void;
};

export function ErrorMessage({ message, onDismiss }: Props) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 mb-4 rounded-md bg-red-50 text-red-700 text-sm">
      <span>{message}</span>
      <button
        onClick={onDismiss}
        className="ml-3 text-red-400 hover:text-red-600 transition-colors text-xs font-medium"
      >
        Dismiss
      </button>
    </div>
  );
}
