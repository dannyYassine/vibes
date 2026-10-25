package com.example.todo.usecase;

import com.example.todo.dto.GetTodoDto;
import com.example.todo.model.Todo;
import com.example.todo.repository.TodoRepository;
import org.springframework.stereotype.Component;

@Component
public class GetTodoUseCase {

    private final TodoRepository todoRepository;

    public GetTodoUseCase(TodoRepository todoRepository) {
        this.todoRepository = todoRepository;
    }

    public Todo execute(GetTodoDto dto) {
        return this.todoRepository.findById(dto.id())
                .orElseThrow(() -> new TodoNotFoundException(dto.id()));
    }
}
