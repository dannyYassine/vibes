package com.example.todo.view.todolist;

import java.util.List;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;

import com.example.todo.dto.DeleteTodoDto;
import com.example.todo.dto.GetTodosDto;
import com.example.todo.model.Todo;
import com.example.todo.usecase.DeleteTodoUseCase;
import com.example.todo.usecase.GetTodosUseCase;

@Controller
public class DeleteTodoView {

    private final DeleteTodoUseCase deleteTodoUseCase;
    private final GetTodosUseCase getTodosUseCase;

    public DeleteTodoView(DeleteTodoUseCase deleteTodoUseCase, GetTodosUseCase getTodosUseCase) {
        this.deleteTodoUseCase = deleteTodoUseCase;
        this.getTodosUseCase = getTodosUseCase;
    }

    @DeleteMapping("/todos/{id}")
    public String delete(@PathVariable Long id, Model model) {
        this.deleteTodoUseCase.execute(new DeleteTodoDto(id));
        List<Todo> todos = this.getTodosUseCase.execute(new GetTodosDto());
        return new TodoListPresenter().present(todos).render(model);
    }
}
