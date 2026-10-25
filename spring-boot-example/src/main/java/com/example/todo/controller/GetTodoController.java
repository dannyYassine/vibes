package com.example.todo.controller;

import com.example.todo.dto.GetTodoDto;
import com.example.todo.model.Todo;
import com.example.todo.usecase.GetTodoUseCase;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class GetTodoController {

    private final GetTodoUseCase getTodoUseCase;

    public GetTodoController(GetTodoUseCase getTodoUseCase) {
        this.getTodoUseCase = getTodoUseCase;
    }

    @GetMapping("/api/todos/{id}")
    public Todo get(@PathVariable Long id) {
        return this.getTodoUseCase.execute(new GetTodoDto(id));
    }
}
