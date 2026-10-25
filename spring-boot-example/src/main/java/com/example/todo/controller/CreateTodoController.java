package com.example.todo.controller;

import com.example.todo.dto.CreateTodoDto;
import com.example.todo.model.Todo;
import com.example.todo.usecase.CreateTodoUseCase;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CreateTodoController {

    private final CreateTodoUseCase createTodoUseCase;

    public CreateTodoController(CreateTodoUseCase createTodoUseCase) {
        this.createTodoUseCase = createTodoUseCase;
    }

    @PostMapping("/api/todos")
    public ResponseEntity<Todo> create(@Valid @RequestBody CreateTodoDto dto) {
        Todo todo = this.createTodoUseCase.execute(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(todo);
    }
}
