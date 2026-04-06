use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, PhysicalPosition, State, WebviewUrl, WebviewWindowBuilder,
};
use std::sync::Mutex;

struct TrayState(Mutex<tauri::tray::TrayIcon>);

#[tauri::command]
fn update_tray_title(state: State<TrayState>, title: String) {
    if let Ok(tray) = state.0.lock() {
        let _ = tray.set_title(Some(title));
    }
}

#[tauri::command]
fn hide_popup(app: tauri::AppHandle) {
    if let Some(popup) = app.get_webview_window("popup") {
        let _ = popup.hide();
    }
}

#[tauri::command]
fn open_main_window(app: tauri::AppHandle) {
    if let Some(popup) = app.get_webview_window("popup") {
        let _ = popup.hide();
    }
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.show();
        let _ = main.set_focus();
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

            WebviewWindowBuilder::new(app, "popup", WebviewUrl::App("".into()))
                .title("")
                .inner_size(320.0, 300.0)
                .decorations(false)
                .always_on_top(true)
                .skip_taskbar(true)
                .visible(false)
                .resizable(false)
                .shadow(true)
                .build()?;

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
                        rect,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(popup) = app.get_webview_window("popup") {
                            if popup.is_visible().unwrap_or(false) {
                                let _ = popup.hide();
                            } else {
                                let scale = popup.scale_factor().unwrap_or(1.0);
                                let (ix, iy) = match rect.position {
                                    tauri::Position::Physical(p) => (p.x as f64, p.y as f64),
                                    tauri::Position::Logical(p) => (p.x * scale, p.y * scale),
                                };
                                let (iw, ih) = match rect.size {
                                    tauri::Size::Physical(s) => (s.width as f64, s.height as f64),
                                    tauri::Size::Logical(s) => (s.width * scale, s.height * scale),
                                };
                                let popup_w = 320.0 * scale;
                                let x = ix + iw / 2.0 - popup_w / 2.0;
                                let y = iy + ih;
                                let _ = popup.set_position(PhysicalPosition::new(x, y));
                                let _ = popup.show();
                                let _ = popup.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            app.manage(TrayState(Mutex::new(tray)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![update_tray_title, hide_popup, open_main_window])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
