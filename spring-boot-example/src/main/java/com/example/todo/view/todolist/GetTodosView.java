package com.example.todo.view.todolist;

import com.example.todo.dto.GetTodosDto;
import com.example.todo.model.Todo;
import com.example.todo.usecase.GetTodosUseCase;
import java.util.List;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class GetTodosView {

    private final GetTodosUseCase getTodosUseCase;

    public GetTodosView(GetTodosUseCase getTodosUseCase) {
        this.getTodosUseCase = getTodosUseCase;
    }

    @GetMapping("/todos")
    public String list(Model model) {
        List<Todo> todos = this.getTodosUseCase.execute(new GetTodosDto());
        return new TodoListPresenter().present(todos).render(model);
    }
}
