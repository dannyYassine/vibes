type TodoProps = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
};

export class Todo {
  readonly id: string;
  readonly title: string;
  readonly completed: boolean;
  readonly createdAt: Date;

  constructor(props: TodoProps) {
    if (!props.id) throw new Error("Todo.id is required");
    if (!props.title.trim()) throw new Error("Todo.title cannot be empty");

    this.id = props.id;
    this.title = props.title;
    this.completed = props.completed;
    this.createdAt = props.createdAt;
  }

  isDone(): boolean {
    return this.completed;
  }
}