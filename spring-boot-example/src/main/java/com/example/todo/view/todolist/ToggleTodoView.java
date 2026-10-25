package com.example.todo.view.todolist;

import com.example.todo.dto.GetTodosDto;
import com.example.todo.dto.ToggleTodoDto;
import com.example.todo.model.Todo;
import com.example.todo.usecase.GetTodosUseCase;
import com.example.todo.usecase.ToggleTodoUseCase;
import java.util.List;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;

@Controller
public class ToggleTodoView {

    private final ToggleTodoUseCase toggleTodoUseCase;
    private final GetTodosUseCase getTodosUseCase;

    public ToggleTodoView(ToggleTodoUseCase toggleTodoUseCase, GetTodosUseCase getTodosUseCase) {
        this.toggleTodoUseCase = toggleTodoUseCase;
        this.getTodosUseCase = getTodosUseCase;
    }

    @PutMapping("/todos/{id}/toggle")
    public String toggle(@PathVariable Long id, Model model) {
        this.toggleTodoUseCase.execute(new ToggleTodoDto(id));
        List<Todo> todos = this.getTodosUseCase.execute(new GetTodosDto());
        return new TodoListPresenter().present(todos).render(model);
    }
}
