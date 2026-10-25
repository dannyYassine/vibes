package com.example.todo.usecase;

import com.example.todo.dto.GetTodosDto;
import com.example.todo.model.Todo;
import com.example.todo.repository.TodoRepository;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class GetTodosUseCase {

    private final TodoRepository todoRepository;

    public GetTodosUseCase(TodoRepository todoRepository) {
        this.todoRepository = todoRepository;
    }

    public List<Todo> execute(GetTodosDto dto) {
        return this.todoRepository.findAll();
    }
}
