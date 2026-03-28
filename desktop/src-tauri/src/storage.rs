use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;
use std::{
    fs,
    path::PathBuf,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Manager};
use uuid::Uuid;

const STORAGE_SCHEMA_VERSION: u32 = 1;
const WORKSPACE_ROOT_DIR: &str = "workspace";
const DATABASE_FILE: &str = "rolerover.db";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TableCountSnapshot {
    table: String,
    row_count: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageSnapshot {
    schema_version: u32,
    bootstrap_status: String,
    workspace_root: String,
    database_path: String,
    workspace_id: String,
    initialized: bool,
    sqlite_version: String,
    table_counts: Vec<TableCountSnapshot>,
}

struct StoragePaths {
    workspace_root: PathBuf,
    database_path: PathBuf,
}

pub fn get_storage_snapshot(app: &AppHandle) -> Result<StorageSnapshot, String> {
    let paths = resolve_storage_paths(app)?;
    ensure_storage_directory(&paths.workspace_root)?;

    let already_existed = paths.database_path.exists();
    let app_version = app.package_info().version.to_string();

    let connection = Connection::open(&paths.database_path).map_err(|error| {
        format!(
            "failed to open sqlite database {}: {error}",
            paths.database_path.display()
        )
    })?;

    configure_connection(&connection)?;
    bootstrap_schema(&connection)?;
    let workspace_id = seed_workspace_defaults(&connection, &app_version)?;

    let sqlite_version = connection
        .query_row("SELECT sqlite_version()", [], |row| row.get::<_, String>(0))
        .map_err(|error| format!("failed to query sqlite version: {error}"))?;

    let table_counts = collect_table_counts(&connection)?;

    Ok(StorageSnapshot {
        schema_version: STORAGE_SCHEMA_VERSION,
        bootstrap_status: if already_existed {
            "reused".into()
        } else {
            "created".into()
        },
        workspace_root: path_to_string(&paths.workspace_root),
        database_path: path_to_string(&paths.database_path),
        workspace_id,
        initialized: true,
        sqlite_version,
        table_counts,
    })
}

fn resolve_storage_paths(app: &AppHandle) -> Result<StoragePaths, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("failed to resolve app data dir: {error}"))?;

    let workspace_root = app_data_dir.join(WORKSPACE_ROOT_DIR);
    let database_path = workspace_root.join(DATABASE_FILE);

    Ok(StoragePaths {
        workspace_root,
        database_path,
    })
}

fn ensure_storage_directory(path: &PathBuf) -> Result<(), String> {
    fs::create_dir_all(path).map_err(|error| {
        format!(
            "failed to create storage directory {}: {error}",
            path.display()
        )
    })
}

fn configure_connection(connection: &Connection) -> Result<(), String> {
    connection
        .execute_batch(
            r#"
            PRAGMA journal_mode = WAL;
            PRAGMA foreign_keys = ON;
            PRAGMA synchronous = NORMAL;
            "#,
        )
        .map_err(|error| format!("failed to configure sqlite connection: {error}"))
}

fn bootstrap_schema(connection: &Connection) -> Result<(), String> {
    connection
        .execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS workspace_metadata (
              id INTEGER PRIMARY KEY CHECK (id = 1),
              workspace_id TEXT NOT NULL,
              schema_version INTEGER NOT NULL,
              created_at_epoch_ms INTEGER NOT NULL,
              updated_at_epoch_ms INTEGER NOT NULL,
              app_version TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS workspace_settings (
              id INTEGER PRIMARY KEY CHECK (id = 1),
              language TEXT NOT NULL DEFAULT 'zh',
              theme TEXT NOT NULL DEFAULT 'system',
              ai_provider TEXT NOT NULL DEFAULT 'openai',
              ai_base_url TEXT NOT NULL DEFAULT 'https://api.openai.com/v1',
              ai_model TEXT NOT NULL DEFAULT 'gpt-4o',
              auto_save INTEGER NOT NULL DEFAULT 1,
              auto_save_interval_ms INTEGER NOT NULL DEFAULT 500,
              window_state_json TEXT NOT NULL DEFAULT '{}',
              updated_at_epoch_ms INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS documents (
              id TEXT PRIMARY KEY,
              title TEXT NOT NULL,
              template TEXT NOT NULL,
              language TEXT NOT NULL,
              theme_json TEXT NOT NULL DEFAULT '{}',
              is_default INTEGER NOT NULL DEFAULT 0,
              target_job_title TEXT,
              target_company TEXT,
              created_at_epoch_ms INTEGER NOT NULL,
              updated_at_epoch_ms INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS document_sections (
              id TEXT PRIMARY KEY,
              document_id TEXT NOT NULL,
              section_type TEXT NOT NULL,
              title TEXT NOT NULL,
              sort_order INTEGER NOT NULL DEFAULT 0,
              visible INTEGER NOT NULL DEFAULT 1,
              content_json TEXT NOT NULL DEFAULT '{}',
              created_at_epoch_ms INTEGER NOT NULL,
              updated_at_epoch_ms INTEGER NOT NULL,
              FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS ai_chat_sessions (
              id TEXT PRIMARY KEY,
              document_id TEXT,
              title TEXT NOT NULL,
              created_at_epoch_ms INTEGER NOT NULL,
              updated_at_epoch_ms INTEGER NOT NULL,
              FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS ai_chat_messages (
              id TEXT PRIMARY KEY,
              session_id TEXT NOT NULL,
              role TEXT NOT NULL,
              content TEXT NOT NULL,
              metadata_json TEXT NOT NULL DEFAULT '{}',
              created_at_epoch_ms INTEGER NOT NULL,
              FOREIGN KEY(session_id) REFERENCES ai_chat_sessions(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS ai_analysis_records (
              id TEXT PRIMARY KEY,
              document_id TEXT NOT NULL,
              analysis_type TEXT NOT NULL,
              payload_json TEXT NOT NULL,
              score INTEGER,
              issue_count INTEGER,
              target_job_title TEXT,
              target_company TEXT,
              created_at_epoch_ms INTEGER NOT NULL,
              FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS migration_audit (
              id TEXT PRIMARY KEY,
              run_id TEXT NOT NULL,
              source_kind TEXT NOT NULL,
              source_path TEXT NOT NULL,
              status TEXT NOT NULL,
              imported_count INTEGER NOT NULL DEFAULT 0,
              dropped_count INTEGER NOT NULL DEFAULT 0,
              warning_count INTEGER NOT NULL DEFAULT 0,
              details_json TEXT NOT NULL DEFAULT '{}',
              created_at_epoch_ms INTEGER NOT NULL
            );
            "#,
        )
        .map_err(|error| format!("failed to bootstrap storage schema: {error}"))
}

fn seed_workspace_defaults(connection: &Connection, app_version: &str) -> Result<String, String> {
    let now = now_epoch_ms()? as i64;
    let workspace_id = connection
        .query_row(
            "SELECT workspace_id FROM workspace_metadata WHERE id = 1",
            [],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| format!("failed to load workspace metadata: {error}"))?
        .unwrap_or_else(|| Uuid::new_v4().to_string());

    connection
        .execute(
            r#"
            INSERT OR IGNORE INTO workspace_metadata (
              id, workspace_id, schema_version, created_at_epoch_ms, updated_at_epoch_ms, app_version
            ) VALUES (1, ?, ?, ?, ?, ?)
            "#,
            params![
                workspace_id,
                STORAGE_SCHEMA_VERSION as i64,
                now,
                now,
                app_version
            ],
        )
        .map_err(|error| format!("failed to seed workspace metadata: {error}"))?;

    connection
        .execute(
            r#"
            UPDATE workspace_metadata
            SET schema_version = ?, updated_at_epoch_ms = ?, app_version = ?
            WHERE id = 1
            "#,
            params![STORAGE_SCHEMA_VERSION as i64, now, app_version],
        )
        .map_err(|error| format!("failed to update workspace metadata: {error}"))?;

    connection
        .execute(
            r#"
            INSERT OR IGNORE INTO workspace_settings (
              id, language, theme, ai_provider, ai_base_url, ai_model, auto_save, auto_save_interval_ms,
              window_state_json, updated_at_epoch_ms
            ) VALUES (
              1, 'zh', 'system', 'openai', 'https://api.openai.com/v1', 'gpt-4o', 1, 500, '{}', ?
            )
            "#,
            params![now],
        )
        .map_err(|error| format!("failed to seed workspace settings: {error}"))?;

    Ok(workspace_id)
}

fn collect_table_counts(connection: &Connection) -> Result<Vec<TableCountSnapshot>, String> {
    let tables = [
        "workspace_metadata",
        "workspace_settings",
        "documents",
        "document_sections",
        "ai_chat_sessions",
        "ai_chat_messages",
        "ai_analysis_records",
        "migration_audit",
    ];

    tables
        .iter()
        .map(|table| {
            let query = format!("SELECT COUNT(*) FROM {table}");
            let row_count = connection
                .query_row(&query, [], |row| row.get::<_, i64>(0))
                .map_err(|error| format!("failed to count table {table}: {error}"))?;
            Ok(TableCountSnapshot {
                table: (*table).into(),
                row_count,
            })
        })
        .collect()
}

fn now_epoch_ms() -> Result<u64, String> {
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("clock drift detected: {error}"))?;
    Ok(duration.as_millis() as u64)
}

fn path_to_string(path: &PathBuf) -> String {
    path.to_string_lossy().replace('\\', "/")
}
