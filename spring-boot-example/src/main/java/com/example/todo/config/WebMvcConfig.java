package com.example.todo.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new HxTriggerInterceptor())
                .addPathPatterns(
                        "/todos",
                        "/todos/*/toggle",
                        "/api/todos",
                        "/api/todos/*"
                );
    }
}
