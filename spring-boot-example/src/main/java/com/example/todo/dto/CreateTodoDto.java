package com.example.todo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateTodoDto(
        @NotBlank @Size(max = 255) String title
) {
}
