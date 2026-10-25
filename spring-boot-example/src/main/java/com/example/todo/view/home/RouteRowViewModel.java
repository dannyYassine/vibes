package com.example.todo.view.home;

public record RouteRowViewModel(
        String method,
        String methodClass,
        String path,
        String description,
        String formFragment,
        String resultId
) {
}
