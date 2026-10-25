package com.example.todo.usecase;

import com.example.todo.dto.ToggleTodoDto;
import com.example.todo.model.Todo;
import com.example.todo.repository.TodoRepository;
import org.springframework.stereotype.Component;

@Component
public class ToggleTodoUseCase {

    private final TodoRepository todoRepository;

    public ToggleTodoUseCase(TodoRepository todoRepository) {
        this.todoRepository = todoRepository;
    }

    public Todo execute(ToggleTodoDto dto) {
        Todo todo = this.todoRepository.findById(dto.id())
                .orElseThrow(() -> new TodoNotFoundException(dto.id()));

        if (todo.isCompleted()) {
            todo.markIncomplete();
        } else {
            todo.markCompleted();
        }
        return this.todoRepository.save(todo);
    }
}
