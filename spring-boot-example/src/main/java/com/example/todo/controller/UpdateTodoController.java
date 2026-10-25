package com.example.todo.controller;

import com.example.todo.dto.UpdateTodoDto;
import com.example.todo.model.Todo;
import com.example.todo.usecase.UpdateTodoUseCase;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class UpdateTodoController {

    private final UpdateTodoUseCase updateTodoUseCase;

    public UpdateTodoController(UpdateTodoUseCase updateTodoUseCase) {
        this.updateTodoUseCase = updateTodoUseCase;
    }

    @PutMapping("/api/todos/{id}")
    public Todo update(@PathVariable Long id, @Valid @RequestBody UpdateTodoBody body) {
        return this.updateTodoUseCase.execute(new UpdateTodoDto(id, body.title(), body.completed()));
    }
}
