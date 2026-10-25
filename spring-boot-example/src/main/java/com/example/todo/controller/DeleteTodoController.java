package com.example.todo.controller;

import com.example.todo.dto.DeleteTodoDto;
import com.example.todo.usecase.DeleteTodoUseCase;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class DeleteTodoController {

    private final DeleteTodoUseCase deleteTodoUseCase;

    public DeleteTodoController(DeleteTodoUseCase deleteTodoUseCase) {
        this.deleteTodoUseCase = deleteTodoUseCase;
    }

    @DeleteMapping("/api/todos/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        this.deleteTodoUseCase.execute(new DeleteTodoDto(id));
        return ResponseEntity.noContent().build();
    }
}
