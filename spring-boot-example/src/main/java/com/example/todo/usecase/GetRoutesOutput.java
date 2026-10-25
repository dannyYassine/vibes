package com.example.todo.usecase;

import java.util.List;

public record GetRoutesOutput(List<RouteRow> routes) {

    public record RouteRow(String method, String path, String description) {
    }
}
