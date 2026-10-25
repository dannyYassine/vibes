package com.example.todo.controller;

import com.example.todo.dto.GetTodosDto;
import com.example.todo.model.Todo;
import com.example.todo.usecase.GetTodosUseCase;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class GetTodosController {

    private final GetTodosUseCase getTodosUseCase;

    public GetTodosController(GetTodosUseCase getTodosUseCase) {
        this.getTodosUseCase = getTodosUseCase;
    }

    @GetMapping("/api/todos")
    public List<Todo> list() {
        return this.getTodosUseCase.execute(new GetTodosDto());
    }
}
