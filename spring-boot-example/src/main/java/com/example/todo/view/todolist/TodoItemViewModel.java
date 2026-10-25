package com.example.todo.view.todolist;

public record TodoItemViewModel(
        Long id,
        String title,
        boolean done,
        String titleClass,
        String toggleLabel,
        String toggleClass
) {
}
