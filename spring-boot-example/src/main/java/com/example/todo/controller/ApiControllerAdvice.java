package com.example.todo.controller;

import com.example.todo.usecase.TodoNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiControllerAdvice {

    @ExceptionHandler(TodoNotFoundException.class)
    public ResponseEntity<Void> handleNotFound(TodoNotFoundException ex) {
        return ResponseEntity.notFound().build();
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Void> handleValidation(MethodArgumentNotValidException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
    }
}
