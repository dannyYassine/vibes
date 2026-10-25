package com.example.todo.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Set;
import org.springframework.lang.Nullable;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.ModelAndView;

public class HxTriggerInterceptor implements HandlerInterceptor {

    public static final String HX_TRIGGER = "HX-Trigger";
    public static final String TODOS_CHANGED = "todosChanged";

    private static final Set<String> MUTATION_METHODS = Set.of("POST", "PUT", "PATCH", "DELETE");

    @Override
    public void postHandle(HttpServletRequest request, HttpServletResponse response, Object handler,
                           @Nullable ModelAndView modelAndView) {
        boolean mutation = MUTATION_METHODS.contains(request.getMethod());
        int status = response.getStatus();
        if (mutation && status >= 200 && status < 300) {
            response.setHeader(HX_TRIGGER, TODOS_CHANGED);
        }
    }
}
