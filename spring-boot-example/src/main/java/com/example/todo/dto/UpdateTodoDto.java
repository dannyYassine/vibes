package com.example.todo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateTodoDto(
        Long id,
        @NotBlank @Size(max = 255) String title,
        @NotNull Boolean completed
) {
}
