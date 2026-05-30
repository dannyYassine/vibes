export type TodoDto = {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
};

export type CreateTodoDto = {
  title: string;
};

export type CompleteTodoDto = {
  completed: boolean;
};