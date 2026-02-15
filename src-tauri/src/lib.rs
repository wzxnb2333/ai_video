use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::process::Command;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to AI Video Processing Assistant.", name)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SystemGpuInfo {
    name: String,
    vram_mb: Option<u64>,
}

#[cfg(target_os = "windows")]
fn parse_system_gpu_json(stdout: &str) -> Result<Vec<SystemGpuInfo>, String> {
    let value: Value = serde_json::from_str(stdout).map_err(|error| error.to_string())?;

    let entries: Vec<Value> = if let Some(array) = value.as_array() {
        array.clone()
    } else {
        vec![value]
    };

    let gpus = entries
        .into_iter()
        .filter_map(|entry| {
            let name = entry.get("Name")?.as_str()?.trim().to_string();
            if name.is_empty() {
                return None;
            }

            let adapter_bytes = entry.get("AdapterRAM").and_then(|raw| match raw {
                Value::Number(number) => number.as_u64(),
                Value::String(text) => text.parse::<u64>().ok(),
                _ => None,
            });

            let vram_mb = adapter_bytes.map(|bytes| bytes / (1024 * 1024));
            Some(SystemGpuInfo { name, vram_mb })
        })
        .collect::<Vec<_>>();

    Ok(gpus)
}

#[tauri::command]
fn list_system_gpus() -> Result<Vec<SystemGpuInfo>, String> {
    #[cfg(target_os = "windows")]
    {
        let output = Command::new("powershell")
            .args([
                "-NoProfile",
                "-Command",
                "Get-CimInstance Win32_VideoController | Select-Object Name,AdapterRAM | ConvertTo-Json -Compress",
            ])
            .output()
            .map_err(|error| error.to_string())?;

        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
        }

        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if stdout.is_empty() {
            return Ok(vec![]);
        }

        return parse_system_gpu_json(&stdout);
    }

    #[cfg(not(target_os = "windows"))]
    {
        Ok(vec![])
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![greet, list_system_gpus])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
