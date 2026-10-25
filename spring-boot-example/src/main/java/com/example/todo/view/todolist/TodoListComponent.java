package com.example.todo.view.todolist;

import org.springframework.ui.Model;

public class TodoListComponent {

    private final TodoListViewModel vm;

    public TodoListComponent(TodoListViewModel vm) {
        this.vm = vm;
    }

    public TodoListViewModel getVm() {
        return this.vm;
    }

    public String render(Model model) {
        model.addAttribute("vm", this.vm);
        return "components/todolist :: todolist";
    }
}
