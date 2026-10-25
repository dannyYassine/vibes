package com.example.todo.usecase;

import com.example.todo.dto.GetRoutesDto;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class GetRoutesUseCase {

    public GetRoutesOutput execute(GetRoutesDto dto) {
        List<GetRoutesOutput.RouteRow> routes = List.of(
                new GetRoutesOutput.RouteRow("GET", "/", "This page"),
                new GetRoutesOutput.RouteRow("GET", "/api/todos", "List all todos"),
                new GetRoutesOutput.RouteRow("GET", "/api/todos/{id}", "Get a single todo"),
                new GetRoutesOutput.RouteRow("POST", "/api/todos", "Create a todo"),
                new GetRoutesOutput.RouteRow("PUT", "/api/todos/{id}", "Update a todo"),
                new GetRoutesOutput.RouteRow("DELETE", "/api/todos/{id}", "Delete a todo"),
                new GetRoutesOutput.RouteRow("GET", "/todos", "Todo list fragment (HTMX)"),
                new GetRoutesOutput.RouteRow("POST", "/todos", "Create todo (HTMX fragment)"),
                new GetRoutesOutput.RouteRow("PUT", "/todos/{id}/toggle", "Toggle todo (HTMX fragment)"),
                new GetRoutesOutput.RouteRow("DELETE", "/todos/{id}", "Delete todo (HTMX fragment)")
        );
        return new GetRoutesOutput(routes);
    }
}
