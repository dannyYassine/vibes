package com.example.todo.view.home;

import org.springframework.ui.Model;

public class HomeComponent {

    private final HomeViewModel vm;

    public HomeComponent(HomeViewModel vm) {
        this.vm = vm;
    }

    public HomeViewModel getVm() {
        return this.vm;
    }

    public String render(Model model) {
        model.addAttribute("vm", this.vm);
        return "components/home";
    }
}
