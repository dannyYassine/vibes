package com.example.todo.view.home;

import com.example.todo.dto.GetRoutesDto;
import com.example.todo.usecase.GetRoutesOutput;
import com.example.todo.usecase.GetRoutesUseCase;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HomeView {

    private final GetRoutesUseCase getRoutesUseCase;

    public HomeView(GetRoutesUseCase getRoutesUseCase) {
        this.getRoutesUseCase = getRoutesUseCase;
    }

    @GetMapping("/")
    public String home(Model model) {
        GetRoutesOutput output = this.getRoutesUseCase.execute(new GetRoutesDto());
        HomeComponent component = new HomePresenter().present(output);
        return component.render(model);
    }
}
