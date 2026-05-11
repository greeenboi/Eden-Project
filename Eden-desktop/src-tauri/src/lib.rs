use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Listener, Manager, WebviewUrl, WebviewWindowBuilder};

const MAIN_WINDOW_LABEL: &str = "main";
const SPLASH_WINDOW_LABEL: &str = "eden-splash";
const MINI_WINDOW_LABEL: &str = "mini-player";

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn hide_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        let _ = window.hide();
    }
}

fn create_or_focus_mini_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(MINI_WINDOW_LABEL) {
        let _ = window.show();
        let _ = window.set_focus();
        return;
    }

    let builder = WebviewWindowBuilder::new(
        app,
        MINI_WINDOW_LABEL,
        WebviewUrl::App("index.html#/mini-player".into()),
    )
    .title("Eden Mini Player")
    .always_on_top(true)
    .resizable(true)
    .inner_size(460.0, 240.0)
    .min_inner_size(380.0, 180.0)
    .visible(true);

    let _ = builder.build();
}

fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let play_pause = MenuItemBuilder::with_id("play_pause", "Play/Pause").build(app)?;
    let next = MenuItemBuilder::with_id("next", "Next").build(app)?;
    let previous = MenuItemBuilder::with_id("previous", "Previous").build(app)?;
    let show = MenuItemBuilder::with_id("show", "Show").build(app)?;
    let hide = MenuItemBuilder::with_id("hide", "Hide").build(app)?;
    let mini_player = MenuItemBuilder::with_id("mini", "Open Mini Player").build(app)?;
    let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;

    let menu = MenuBuilder::new(app)
        .items(&[
            &play_pause,
            &next,
            &previous,
            &show,
            &hide,
            &mini_player,
            &quit,
        ])
        .build()?;

    TrayIconBuilder::new()
        .menu(&menu)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "play_pause" => {
                let _ = app.emit("tray-play-pause", ());
            }
            "next" => {
                let _ = app.emit("tray-next", ());
            }
            "previous" => {
                let _ = app.emit("tray-previous", ());
            }
            "show" => {
                show_main_window(app);
            }
            "hide" => {
                hide_main_window(app);
            }
            "mini" => {
                create_or_focus_mini_window(app);
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                show_main_window(&app);
            }
        })
        .build(app)?;

    Ok(())
}

fn setup_splash_window(app: &AppHandle) {
    let builder = WebviewWindowBuilder::new(
        app,
        SPLASH_WINDOW_LABEL,
        WebviewUrl::App("index.html#/splash".into()),
    )
    .title("Eden")
    .decorations(false)
    .resizable(false)
    .inner_size(540.0, 360.0)
    .always_on_top(true)
    .visible(true);

    let _ = builder.build();
    hide_main_window(app);
}

fn wire_app_ready_listener(app: &AppHandle) {
    let app_handle = app.clone();
    app.listen("eden-app-ready", move |_| {
        if let Some(splash) = app_handle.get_webview_window(SPLASH_WINDOW_LABEL) {
            let _ = splash.close();
        }
        show_main_window(&app_handle);
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle().clone();
            setup_tray(&handle)?;
            setup_splash_window(&handle);
            wire_app_ready_listener(&handle);
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
