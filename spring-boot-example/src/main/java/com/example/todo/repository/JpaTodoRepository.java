package com.example.todo.repository;

import com.example.todo.model.Todo;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Component;

@Component
public class JpaTodoRepository implements TodoRepository {

    private final TodoJpaRepository todoJpaRepository;

    public JpaTodoRepository(TodoJpaRepository todoJpaRepository) {
        this.todoJpaRepository = todoJpaRepository;
    }

    @Override
    public List<Todo> findAll() {
        return this.todoJpaRepository.findAll();
    }

    @Override
    public Optional<Todo> findById(Long id) {
        return this.todoJpaRepository.findById(id);
    }

    @Override
    public Todo save(Todo todo) {
        return this.todoJpaRepository.save(todo);
    }

    @Override
    public void deleteById(Long id) {
        this.todoJpaRepository.deleteById(id);
    }
}
