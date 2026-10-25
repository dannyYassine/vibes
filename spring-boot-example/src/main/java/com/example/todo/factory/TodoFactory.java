package com.example.todo.factory;

import com.example.todo.model.Todo;
import org.springframework.stereotype.Component;

@Component
public class TodoFactory {

    public Todo create(String title) {
        return new Todo(title);
    }
}
