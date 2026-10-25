package com.example.todo.view.todolist;

import com.example.todo.dto.CreateTodoDto;
import com.example.todo.dto.GetTodosDto;
import com.example.todo.model.Todo;
import com.example.todo.usecase.CreateTodoUseCase;
import com.example.todo.usecase.GetTodosUseCase;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletResponse;
import java.util.List;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
public class CreateTodoView {

    private final CreateTodoUseCase createTodoUseCase;
    private final GetTodosUseCase getTodosUseCase;

    public CreateTodoView(CreateTodoUseCase createTodoUseCase, GetTodosUseCase getTodosUseCase) {
        this.createTodoUseCase = createTodoUseCase;
        this.getTodosUseCase = getTodosUseCase;
    }

    @PostMapping("/todos")
    public String create(@RequestParam("title") String title, Model model, HttpServletResponse response) {
        if (title == null || title.isBlank()) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            return null;
        }
        this.createTodoUseCase.execute(new CreateTodoDto(title.trim()));
        List<Todo> todos = this.getTodosUseCase.execute(new GetTodosDto());
        return new TodoListPresenter().present(todos).render(model);
    }
}
