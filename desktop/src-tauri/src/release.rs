use crate::settings;
use serde::Serialize;
use tauri::{utils::config::Updater as BundleUpdater, AppHandle, Manager};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReleaseReadinessSnapshot {
    pub bundle_active: bool,
    pub updater_plugin_wired: bool,
    pub updater_config_declared: bool,
    pub updater_configured: bool,
    pub updater_artifacts_enabled: bool,
    pub updater_artifacts_mode: String,
    pub updater_endpoint_count: usize,
    pub updater_pubkey_configured: bool,
    pub updater_dangerous_insecure_transport: bool,
    pub updater_uses_localhost: bool,
    pub updater_windows_install_mode: Option<String>,
    pub tray_icon_ready: bool,
    pub remember_window_state_enabled: bool,
    pub blockers: Vec<String>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppUpdateCheckResult {
    pub checked_at_epoch_ms: u64,
    pub update_available: bool,
    pub current_version: String,
    pub latest_version: Option<String>,
    pub target: Option<String>,
    pub download_url: Option<String>,
    pub notes: Option<String>,
    pub pub_date: Option<String>,
}

pub fn get_release_readiness_snapshot(app: &AppHandle) -> Result<ReleaseReadinessSnapshot, String> {
    let workspace_root = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("failed to resolve app data dir: {error}"))?
        .join("workspace");
    let settings = settings::load_or_initialize_settings(&workspace_root)?;

    let updater_config = app.config().plugins.0.get("updater");
    let updater_config_declared = updater_config.is_some();
    let updater_endpoint_count = updater_config
        .and_then(|value| value.get("endpoints"))
        .and_then(|value| value.as_array())
        .map(|values| {
            values
                .iter()
                .filter_map(|value| value.as_str())
                .filter(|value| !value.trim().is_empty())
                .count()
        })
        .unwrap_or(0);
    let updater_pubkey_configured = updater_config
        .and_then(|value| value.get("pubkey"))
        .and_then(|value| value.as_str())
        .map(|value| !value.trim().is_empty())
        .unwrap_or(false);
    let updater_windows_install_mode = updater_config
        .and_then(|value| value.get("windows"))
        .and_then(|value| value.get("installMode"))
        .and_then(|value| value.as_str())
        .map(|value| value.to_string());
    let updater_dangerous_insecure_transport = updater_config
        .and_then(|value| value.get("dangerousInsecureTransportProtocol"))
        .and_then(|value| value.as_bool())
        .unwrap_or(false);
    let updater_uses_localhost = updater_config
        .and_then(|value| value.get("endpoints"))
        .and_then(|value| value.as_array())
        .map(|values| {
            values
                .iter()
                .filter_map(|value| value.as_str())
                .any(|value| {
                    let normalized = value.to_ascii_lowercase();
                    normalized.contains("127.0.0.1") || normalized.contains("localhost")
                })
        })
        .unwrap_or(false);
    let updater_artifacts_mode = match &app.config().bundle.create_updater_artifacts {
        BundleUpdater::Bool(false) => "disabled",
        BundleUpdater::Bool(true) => "current",
        BundleUpdater::String(_) => "v1_compatible",
    }
    .to_string();
    let updater_artifacts_enabled = updater_artifacts_mode != "disabled";
    let tray_icon_ready = false;
    let remember_window_state_enabled = settings.window.remember_window_state;
    let updater_plugin_wired = false;
    let updater_configured = updater_endpoint_count > 0 && updater_pubkey_configured;

    let mut blockers = Vec::new();
    blockers.push("Updater runtime is deferred to PR6 and is not active in this desktop parity slice.".into());
    if !app.config().bundle.active {
        blockers.push("Tauri bundling is not active in tauri.conf.json.".into());
    }
    if !updater_artifacts_enabled {
        blockers.push("Updater artifacts are not enabled in bundle.createUpdaterArtifacts.".into());
    }
    if !updater_config_declared {
        blockers.push("Updater plugin config is missing from tauri.conf.json.".into());
    }
    if updater_endpoint_count == 0 {
        blockers.push("Updater endpoints are not configured yet.".into());
    }
    if !updater_pubkey_configured {
        blockers.push("Updater pubkey is not configured yet.".into());
    }

    let mut warnings = Vec::new();
    warnings.push(
        "Tray integration is deferred to PR6 and is not active in this desktop parity slice."
            .into(),
    );
    if updater_dangerous_insecure_transport {
        warnings.push(
            "Updater config allows insecure transport so the local smoke feed can run over HTTP."
                .into(),
        );
    }
    if updater_uses_localhost {
        warnings.push(
            "Updater endpoint currently targets localhost, which is suitable for local smoke only."
                .into(),
        );
    }
    if !tray_icon_ready {
        warnings.push(
            "The default window icon is unavailable, so tray readiness cannot be proven.".into(),
        );
    }
    if !remember_window_state_enabled {
        warnings.push("rememberWindowState is currently disabled in workspace settings.".into());
    }
    if updater_config_declared && !updater_configured {
        warnings.push(
            "Updater config is declared, but the feed/signing chain is still incomplete.".into(),
        );
    }

    Ok(ReleaseReadinessSnapshot {
        bundle_active: app.config().bundle.active,
        updater_plugin_wired,
        updater_config_declared,
        updater_configured,
        updater_artifacts_enabled,
        updater_artifacts_mode,
        updater_endpoint_count,
        updater_pubkey_configured,
        updater_dangerous_insecure_transport,
        updater_uses_localhost,
        updater_windows_install_mode,
        tray_icon_ready,
        remember_window_state_enabled,
        blockers,
        warnings,
    })
}

pub async fn check_for_app_update(app: &AppHandle) -> Result<AppUpdateCheckResult, String> {
    let _ = app;
    Err("Updater checks are deferred to PR6 and are unavailable in the current desktop parity slice.".into())
}
