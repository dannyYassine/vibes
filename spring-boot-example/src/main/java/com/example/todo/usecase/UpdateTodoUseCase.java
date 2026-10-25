package com.example.todo.usecase;

import com.example.todo.dto.UpdateTodoDto;
import com.example.todo.model.Todo;
import com.example.todo.repository.TodoRepository;
import org.springframework.stereotype.Component;

@Component
public class UpdateTodoUseCase {

    private final TodoRepository todoRepository;

    public UpdateTodoUseCase(TodoRepository todoRepository) {
        this.todoRepository = todoRepository;
    }

    public Todo execute(UpdateTodoDto dto) {
        Todo todo = this.todoRepository.findById(dto.id())
                .orElseThrow(() -> new TodoNotFoundException(dto.id()));

        todo.rename(dto.title());
        if (dto.completed()) {
            todo.markCompleted();
        } else {
            todo.markIncomplete();
        }
        return this.todoRepository.save(todo);
    }
}
