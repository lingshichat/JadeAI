#![allow(dead_code)]

use serde::{Deserialize, Serialize};
use std::{
    collections::BTreeMap,
    fs,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

const SETTINGS_DIR: &str = "settings";
const SETTINGS_FILE: &str = "workspace-settings.json";
const SECRETS_DIR: &str = "secrets";
const SECRETS_MANIFEST_FILE: &str = "secrets-manifest.json";
const VAULT_FILE_FALLBACK: &str = "vault-fallback.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSettingsDocument {
    pub schema_version: u32,
    pub locale: String,
    pub theme: String,
    pub ai: WorkspaceAiSettings,
    pub editor: WorkspaceEditorSettings,
    pub window: WorkspaceWindowSettings,
    pub updated_at_epoch_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceAiSettings {
    pub default_provider: String,
    pub provider_configs: BTreeMap<String, ProviderRuntimeSettings>,
    pub exa_pool_base_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderRuntimeSettings {
    pub base_url: String,
    pub model: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceEditorSettings {
    pub auto_save: bool,
    pub auto_save_interval_ms: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceWindowSettings {
    pub remember_window_state: bool,
    pub restore_last_workspace: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SecretKeyDescriptor {
    pub key: String,
    pub provider: Option<String>,
    pub purpose: String,
    pub updated_at_epoch_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SecretsManifestDocument {
    pub schema_version: u32,
    pub vault_backend: SecretVaultBackend,
    pub encrypted_at_rest: bool,
    pub key_descriptors: Vec<SecretKeyDescriptor>,
    pub warnings: Vec<String>,
    pub updated_at_epoch_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SecretVaultBackend {
    Unconfigured,
    OsKeyring,
    Stronghold,
    FileFallback,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SecretVaultStatus {
    pub backend: SecretVaultBackend,
    pub encrypted_at_rest: bool,
    pub status: SecretVaultReadiness,
    pub warnings: Vec<String>,
    pub manifest_path: String,
    pub fallback_path: String,
    pub registered_secret_count: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum SecretVaultReadiness {
    Ready,
    NeedsConfiguration,
    Degraded,
}

pub fn settings_file_path(workspace_root: &Path) -> PathBuf {
    workspace_root.join(SETTINGS_DIR).join(SETTINGS_FILE)
}

pub fn secrets_manifest_path(workspace_root: &Path) -> PathBuf {
    workspace_root.join(SECRETS_DIR).join(SECRETS_MANIFEST_FILE)
}

pub fn vault_fallback_path(workspace_root: &Path) -> PathBuf {
    workspace_root.join(SECRETS_DIR).join(VAULT_FILE_FALLBACK)
}

pub fn load_or_initialize_settings(
    workspace_root: &Path,
) -> Result<WorkspaceSettingsDocument, String> {
    let path = settings_file_path(workspace_root);
    if path.exists() {
        return read_json_file::<WorkspaceSettingsDocument>(&path);
    }

    let default_doc = default_settings_document()?;
    persist_settings(workspace_root, default_doc.clone())?;
    Ok(default_doc)
}

pub fn persist_settings(
    workspace_root: &Path,
    mut document: WorkspaceSettingsDocument,
) -> Result<(), String> {
    document.updated_at_epoch_ms = now_epoch_ms()?;
    let path = settings_file_path(workspace_root);
    ensure_parent(&path)?;
    write_json_file(&path, &document)
}

pub fn load_or_initialize_secrets_manifest(
    workspace_root: &Path,
) -> Result<SecretsManifestDocument, String> {
    let path = secrets_manifest_path(workspace_root);
    if path.exists() {
        return read_json_file::<SecretsManifestDocument>(&path);
    }

    let default_doc = default_secrets_manifest()?;
    persist_secrets_manifest(workspace_root, default_doc.clone())?;
    Ok(default_doc)
}

pub fn persist_secrets_manifest(
    workspace_root: &Path,
    mut document: SecretsManifestDocument,
) -> Result<(), String> {
    document.updated_at_epoch_ms = now_epoch_ms()?;
    let path = secrets_manifest_path(workspace_root);
    ensure_parent(&path)?;
    write_json_file(&path, &document)
}

pub fn inspect_vault_status(workspace_root: &Path) -> Result<SecretVaultStatus, String> {
    let manifest = load_or_initialize_secrets_manifest(workspace_root)?;
    let has_fallback_file = vault_fallback_path(workspace_root).exists();

    let mut warnings = manifest.warnings.clone();
    if has_fallback_file {
        warnings.push("vault-fallback.json detected; plaintext fallback path exists".into());
    }

    let status = match manifest.vault_backend {
        SecretVaultBackend::Unconfigured => SecretVaultReadiness::NeedsConfiguration,
        SecretVaultBackend::OsKeyring | SecretVaultBackend::Stronghold => {
            if manifest.encrypted_at_rest {
                SecretVaultReadiness::Ready
            } else {
                SecretVaultReadiness::Degraded
            }
        }
        SecretVaultBackend::FileFallback => SecretVaultReadiness::Degraded,
    };

    Ok(SecretVaultStatus {
        backend: manifest.vault_backend,
        encrypted_at_rest: manifest.encrypted_at_rest,
        status,
        warnings,
        manifest_path: path_to_string(&secrets_manifest_path(workspace_root)),
        fallback_path: path_to_string(&vault_fallback_path(workspace_root)),
        registered_secret_count: manifest.key_descriptors.len(),
    })
}

fn default_settings_document() -> Result<WorkspaceSettingsDocument, String> {
    let mut provider_configs = BTreeMap::new();
    provider_configs.insert(
        "openai".into(),
        ProviderRuntimeSettings {
            base_url: "https://api.openai.com/v1".into(),
            model: "gpt-4o".into(),
        },
    );
    provider_configs.insert(
        "anthropic".into(),
        ProviderRuntimeSettings {
            base_url: "https://api.anthropic.com".into(),
            model: "claude-sonnet-4-20250514".into(),
        },
    );
    provider_configs.insert(
        "gemini".into(),
        ProviderRuntimeSettings {
            base_url: "https://generativelanguage.googleapis.com/v1beta".into(),
            model: "gemini-2.0-flash".into(),
        },
    );

    Ok(WorkspaceSettingsDocument {
        schema_version: 1,
        locale: "zh".into(),
        theme: "system".into(),
        ai: WorkspaceAiSettings {
            default_provider: "openai".into(),
            provider_configs,
            exa_pool_base_url: String::new(),
        },
        editor: WorkspaceEditorSettings {
            auto_save: true,
            auto_save_interval_ms: 500,
        },
        window: WorkspaceWindowSettings {
            remember_window_state: true,
            restore_last_workspace: true,
        },
        updated_at_epoch_ms: now_epoch_ms()?,
    })
}

fn default_secrets_manifest() -> Result<SecretsManifestDocument, String> {
    Ok(SecretsManifestDocument {
        schema_version: 1,
        vault_backend: SecretVaultBackend::Unconfigured,
        encrypted_at_rest: false,
        key_descriptors: Vec::new(),
        warnings: vec![
            "Vault backend is not configured yet; secret persistence must be wired before production use."
                .into(),
            "No plaintext secret values are stored in this manifest.".into(),
        ],
        updated_at_epoch_ms: now_epoch_ms()?,
    })
}

fn ensure_parent(path: &Path) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| format!("path has no parent: {}", path.display()))?;
    fs::create_dir_all(parent)
        .map_err(|error| format!("failed to create directory {}: {error}", parent.display()))
}

fn read_json_file<T>(path: &Path) -> Result<T, String>
where
    T: for<'de> Deserialize<'de>,
{
    let raw = fs::read_to_string(path)
        .map_err(|error| format!("failed to read {}: {error}", path.display()))?;
    serde_json::from_str(&raw)
        .map_err(|error| format!("failed to parse {}: {error}", path.display()))
}

fn write_json_file<T>(path: &Path, value: &T) -> Result<(), String>
where
    T: Serialize,
{
    let payload = serde_json::to_string_pretty(value)
        .map_err(|error| format!("failed to serialize {}: {error}", path.display()))?;
    fs::write(path, payload).map_err(|error| format!("failed to write {}: {error}", path.display()))
}

fn now_epoch_ms() -> Result<u64, String> {
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("clock drift detected: {error}"))?;
    Ok(duration.as_millis() as u64)
}

fn path_to_string(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}
