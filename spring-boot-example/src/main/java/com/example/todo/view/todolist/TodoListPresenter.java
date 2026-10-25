package com.example.todo.view.todolist;

import com.example.todo.model.Todo;
import java.util.List;

public class TodoListPresenter {

    public TodoListComponent present(List<Todo> todos) {
        List<TodoItemViewModel> items = todos.stream()
                .map(todo -> new TodoItemViewModel(
                        todo.getId(),
                        todo.getTitle(),
                        todo.isCompleted(),
                        todo.isCompleted() ? "todo-done" : "",
                        todo.isCompleted() ? "Undo" : "Done",
                        todo.isCompleted() ? "btn-undo" : "btn-done"
                ))
                .toList();

        long remaining = todos.stream().filter(todo -> !todo.isCompleted()).count();
        return new TodoListComponent(new TodoListViewModel(items, (int) remaining));
    }
}
