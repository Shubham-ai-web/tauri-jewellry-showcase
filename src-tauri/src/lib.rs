

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn perform_gpu_task() -> String {
    // GPU processing logic using wgpu or other crates
    "GPU task completed".to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, perform_gpu_task])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
