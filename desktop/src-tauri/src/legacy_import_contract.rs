use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum LegacySourceKind {
    SqliteDatabase,
    SecureSettings,
    WindowState,
    LocalStorageFallback,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum LegacyTableAction {
    ImportAsIs,
    ImportWithTransform,
    MergeIntoWorkspace,
    DropWithAudit,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LegacyTableMapping {
    pub source: String,
    pub target: String,
    pub action: LegacyTableAction,
    pub notes: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LegacyImportContract {
    pub source_priority: Vec<LegacySourceKind>,
    pub table_mappings: Vec<LegacyTableMapping>,
    pub dropped_surfaces: Vec<String>,
}

pub fn build_legacy_import_contract() -> LegacyImportContract {
    LegacyImportContract {
        source_priority: vec![
            LegacySourceKind::SecureSettings,
            LegacySourceKind::SqliteDatabase,
            LegacySourceKind::LocalStorageFallback,
            LegacySourceKind::WindowState,
        ],
        table_mappings: vec![
            LegacyTableMapping {
                source: "users".into(),
                target: "workspace metadata".into(),
                action: LegacyTableAction::MergeIntoWorkspace,
                notes: "Single-workspace migration; user identity is not retained at runtime."
                    .into(),
            },
            LegacyTableMapping {
                source: "auth_accounts".into(),
                target: "migration audit".into(),
                action: LegacyTableAction::DropWithAudit,
                notes: "Desktop runtime does not preserve OAuth account sessions.".into(),
            },
            LegacyTableMapping {
                source: "resumes".into(),
                target: "documents".into(),
                action: LegacyTableAction::ImportWithTransform,
                notes: "Drop share fields and normalize optional target fields.".into(),
            },
            LegacyTableMapping {
                source: "resume_sections".into(),
                target: "document_sections".into(),
                action: LegacyTableAction::ImportWithTransform,
                notes: "Repair malformed content JSON to empty object and emit warning.".into(),
            },
            LegacyTableMapping {
                source: "chat_sessions".into(),
                target: "ai_chat_sessions".into(),
                action: LegacyTableAction::ImportAsIs,
                notes: "Relink sessions to migrated document IDs.".into(),
            },
            LegacyTableMapping {
                source: "chat_messages".into(),
                target: "ai_chat_messages".into(),
                action: LegacyTableAction::ImportAsIs,
                notes: "Preserve role/content/metadata payloads.".into(),
            },
            LegacyTableMapping {
                source: "resume_shares".into(),
                target: "none".into(),
                action: LegacyTableAction::DropWithAudit,
                notes: "Public share surface is removed in desktop-first scope.".into(),
            },
            LegacyTableMapping {
                source: "jd_analyses".into(),
                target: "ai_analysis_records(type=jd)".into(),
                action: LegacyTableAction::ImportWithTransform,
                notes: "Preserve result payload and score fields.".into(),
            },
            LegacyTableMapping {
                source: "grammar_checks".into(),
                target: "ai_analysis_records(type=grammar)".into(),
                action: LegacyTableAction::ImportWithTransform,
                notes: "Preserve result payload and score fields.".into(),
            },
        ],
        dropped_surfaces: vec![
            "online share tokens".into(),
            "public share views".into(),
            "request fingerprint runtime identity".into(),
            "oauth session runtime records".into(),
        ],
    }
}
