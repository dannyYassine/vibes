package com.example.todo.controller;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateTodoBody(
        @NotBlank @Size(max = 255) String title,
        @NotNull Boolean completed
) {
}
