package com.example.todo.usecase;

public class TodoNotFoundException extends RuntimeException {

    public TodoNotFoundException(Long id) {
        super("Todo %d not found".formatted(id));
    }
}
