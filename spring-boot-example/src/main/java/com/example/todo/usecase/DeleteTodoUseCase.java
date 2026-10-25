package com.example.todo.usecase;

import com.example.todo.dto.DeleteTodoDto;
import com.example.todo.repository.TodoRepository;
import org.springframework.stereotype.Component;

@Component
public class DeleteTodoUseCase {

    private final TodoRepository todoRepository;

    public DeleteTodoUseCase(TodoRepository todoRepository) {
        this.todoRepository = todoRepository;
    }

    public void execute(DeleteTodoDto dto) {
        this.todoRepository.findById(dto.id())
                .orElseThrow(() -> new TodoNotFoundException(dto.id()));
        this.todoRepository.deleteById(dto.id());
    }
}
