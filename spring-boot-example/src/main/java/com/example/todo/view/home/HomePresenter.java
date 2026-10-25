package com.example.todo.view.home;

import com.example.todo.usecase.GetRoutesOutput;
import java.util.ArrayList;
import java.util.List;

public class HomePresenter {

    public HomeComponent present(GetRoutesOutput output) {
        List<RouteRowViewModel> routes = new ArrayList<>();
        int index = 1;
        for (GetRoutesOutput.RouteRow route : output.routes()) {
            routes.add(new RouteRowViewModel(
                    route.method(),
                    "method-" + route.method().toLowerCase(),
                    route.path(),
                    route.description(),
                    this.formFragment(route.method(), route.path()),
                    "r" + index
            ));
            index++;
        }
        return new HomeComponent(new HomeViewModel(routes));
    }

    private String formFragment(String method, String path) {
        boolean api = path.startsWith("/api/");
        boolean hasId = path.contains("{id}");

        if (path.equals("/")) {
            return "route-form-link";
        }
        return switch (method) {
            case "GET" -> hasId ? "route-form-get-id" : "route-form-get";
            case "POST" -> api ? "route-form-post-json" : "route-form-post-html";
            case "PUT" -> api ? "route-form-put-json" : "route-form-toggle";
            case "DELETE" -> "route-form-delete";
            default -> "route-form-link";
        };
    }
}
