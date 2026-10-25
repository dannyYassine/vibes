package com.example.todo.usecase;

import com.example.todo.dto.CreateTodoDto;
import com.example.todo.factory.TodoFactory;
import com.example.todo.model.Todo;
import com.example.todo.repository.TodoRepository;
import org.springframework.stereotype.Component;

@Component
public class CreateTodoUseCase {

    private final TodoFactory todoFactory;
    private final TodoRepository todoRepository;

    public CreateTodoUseCase(TodoFactory todoFactory, TodoRepository todoRepository) {
        this.todoFactory = todoFactory;
        this.todoRepository = todoRepository;
    }

    public Todo execute(CreateTodoDto dto) {
        Todo todo = this.todoFactory.create(dto.title());
        return this.todoRepository.save(todo);
    }
}
