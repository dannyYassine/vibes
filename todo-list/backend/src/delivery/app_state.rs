use std::sync::Arc;

use crate::usecases::get_todo_by_id::GetTodoByIdUseCase;
use crate::usecases::complete_todo::CompleteTodoUseCase;
use crate::usecases::create_todo::CreateTodoUseCase;
use crate::usecases::delete_todo::DeleteTodoUseCase;
use crate::usecases::get_all_todos::GetAllTodosUseCase;
use crate::usecases::get_quote::GetQuoteUseCase;

pub struct AppState {
    pub create_todo_usecase: Arc<CreateTodoUseCase>,
    pub get_all_todos_usecase: Arc<GetAllTodosUseCase>,
    pub get_todo_by_id_usecase: Arc<GetTodoByIdUseCase>,
    pub complete_todo_usecase: Arc<CompleteTodoUseCase>,
    pub delete_todo_usecase: Arc<DeleteTodoUseCase>,
    pub get_quote_usecase: Arc<GetQuoteUseCase>,
}