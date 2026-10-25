package com.example.todo.view.todolist;

import java.util.List;

public record TodoListViewModel(List<TodoItemViewModel> items, int remainingLabel) {
}
