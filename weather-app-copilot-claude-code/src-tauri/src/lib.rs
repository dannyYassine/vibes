use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, State,
};
use std::sync::Mutex;

struct TrayState(Mutex<tauri::tray::TrayIcon>);

#[tauri::command]
fn update_tray_title(state: State<TrayState>, title: String) {
    if let Ok(tray) = state.0.lock() {
        let _ = tray.set_title(Some(title));
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let icon = tauri::image::Image::new_owned(vec![0u8; 4], 1, 1);

            let tray = TrayIconBuilder::new()
                .icon(icon)
                .icon_as_template(true)
                .title("--°")
                .tooltip("Weather")
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            app.manage(TrayState(Mutex::new(tray)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![update_tray_title])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
