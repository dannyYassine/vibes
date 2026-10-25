package com.example.todo.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "todos")
public class Todo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private boolean completed = false;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    protected Todo() {
    }

    public Todo(String title) {
        this.title = title;
        this.completed = false;
        this.createdAt = Instant.now();
    }

    public void rename(String newTitle) {
        this.title = newTitle;
    }

    public void markCompleted() {
        this.completed = true;
    }

    public void markIncomplete() {
        this.completed = false;
    }

    public static Todo fromDatabase(Long id, String title, boolean completed, Instant createdAt) {
        Todo todo = new Todo(title);
        todo.id = id;
        todo.completed = completed;
        todo.createdAt = createdAt;
        return todo;
    }

    public Long getId() {
        return this.id;
    }

    public String getTitle() {
        return this.title;
    }

    public boolean isCompleted() {
        return this.completed;
    }

    public Instant getCreatedAt() {
        return this.createdAt;
    }
}
