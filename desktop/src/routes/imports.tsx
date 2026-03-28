import { createRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  executeImporterStaging,
  executeImporterMigration,
  getImporterDryRun,
  getWorkspaceSnapshot,
  type AuditWriteStatus,
  type ImporterDryRunSnapshot,
  type MigrationExecutionResult,
  type StagingExecutionResult,
} from "../lib/desktop-api";
import { rootRoute } from "./root";

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown importer execution error.";
}

function importerStatusMeta(
  importer: ImporterDryRunSnapshot,
  t: (key: string) => string,
): { label: string; tone: "success" | "warn" | "danger" } {
  if (importer.result.state === "ready_for_execution") {
    return { label: t("importerStateReady"), tone: "success" };
  }

  if (importer.result.blockingIssues.length > 0) {
    return { label: t("importerStateFailed"), tone: "danger" };
  }

  return { label: t("importerStatePlanned"), tone: "warn" };
}

function executionStatusMeta(
  execution: StagingExecutionResult,
  t: (key: string) => string,
): { label: string; tone: "success" | "warn" | "danger" } {
  switch (execution.state) {
    case "success":
      return { label: t("importerExecutionStateSuccess"), tone: "success" };
    case "partial":
      return { label: t("importerExecutionStatePartial"), tone: "warn" };
    default:
      return { label: t("importerExecutionStateFailed"), tone: "danger" };
  }
}

function migrationStatusMeta(
  migration: MigrationExecutionResult,
  t: (key: string) => string,
): { label: string; tone: "success" | "danger" } {
  if (migration.state === "success") {
    return { label: t("importerMigrationStateSuccess"), tone: "success" };
  }

  return { label: t("importerMigrationStateFailed"), tone: "danger" };
}

function auditWriteStatusLabel(
  status: AuditWriteStatus,
  t: (key: string) => string,
): string {
  switch (status) {
    case "written":
      return t("importerAuditWriteWritten");
    case "skipped":
      return t("importerAuditWriteSkipped");
    default:
      return t("importerAuditWriteFailed");
  }
}

function ImportsRoute() {
  const { t } = useTranslation();
  const { workspace, importer } = importsRoute.useLoaderData();
  const [snapshot, setSnapshot] = useState(importer);
  const [isRunning, setIsRunning] = useState(false);
  const [activeAction, setActiveAction] = useState<"staging" | "migration" | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const legacyCount = workspace.legacySources.filter((source) => source.exists).length;
  const status = importerStatusMeta(snapshot, t);
  const hasSqliteCandidate = snapshot.plan.discovery.sources.some(
    (source) => source.exists && source.sourceKind === "sqlite_database",
  );
  const execution = snapshot.stagingExecution ?? null;
  const executionStatus = execution ? executionStatusMeta(execution, t) : null;
  const migration = snapshot.migrationExecution ?? null;
  const migrationStatus = migration ? migrationStatusMeta(migration, t) : null;
  const canRunStaging = snapshot.result.state === "ready_for_execution" && !isRunning;
  const canRunMigration =
    snapshot.result.state === "ready_for_execution" && hasSqliteCandidate && !isRunning;

  async function handleRunStaging(): Promise<void> {
    if (!canRunStaging) {
      return;
    }

    setIsRunning(true);
    setActiveAction("staging");
    setRunError(null);

    try {
      const nextSnapshot = await executeImporterStaging();
      setSnapshot(nextSnapshot);
    } catch (error) {
      setRunError(toErrorMessage(error));
    } finally {
      setIsRunning(false);
      setActiveAction(null);
    }
  }

  async function handleRunMigration(): Promise<void> {
    if (!canRunMigration) {
      return;
    }

    setIsRunning(true);
    setActiveAction("migration");
    setRunError(null);

    try {
      const nextSnapshot = await executeImporterMigration();
      setSnapshot(nextSnapshot);
    } catch (error) {
      setRunError(toErrorMessage(error));
    } finally {
      setIsRunning(false);
      setActiveAction(null);
    }
  }

  return (
    <>
      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="panel__label">{t("importsLabel")}</p>
            <h2>{t("importsTitle")}</h2>
          </div>
          <span className="pill pill--soft">{legacyCount}</span>
        </div>
        <p className="panel__body">{t("importsBody")}</p>
        <dl className="path-list">
          <div className="path-row">
            <dt>{t("importsQueuePath")}</dt>
            <dd>{workspace.importsDir}</dd>
          </div>
          <div className="path-row">
            <dt>{t("cachePath")}</dt>
            <dd>{workspace.cacheDir}</dd>
          </div>
          <div className="path-row">
            <dt>{t("manifestPath")}</dt>
            <dd>{workspace.manifestPath}</dd>
          </div>
        </dl>
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="panel__label">{t("importerLabel")}</p>
            <h2>{t("importerTitle")}</h2>
          </div>
          <div className="panel__actions">
            <span className={`pill pill--${status.tone}`}>{status.label}</span>
            <button
              type="button"
              className="button button--primary"
              disabled={!canRunStaging}
              onClick={() => {
                void handleRunStaging();
              }}
            >
              {isRunning && activeAction === "staging"
                ? t("importerRunningStaging")
                : t("importerRunStaging")}
            </button>
            <button
              type="button"
              className="button button--primary"
              disabled={!canRunMigration}
              onClick={() => {
                void handleRunMigration();
              }}
            >
              {isRunning && activeAction === "migration"
                ? t("importerRunningMigration")
                : t("importerRunMigration")}
            </button>
          </div>
        </div>
        <p className="panel__body">{t("importerBody")}</p>
        <p className="panel__hint">
          {snapshot.result.state === "ready_for_execution"
            ? t("importerReadyHint")
            : t("importerBlockedHint")}
        </p>
        {!hasSqliteCandidate ? (
          <article className="issue-card">
            <p className="workstream-card__badge">{t("importerExecutionWarning")}</p>
            <h3>{t("importerMigrationRequiresSqliteTitle")}</h3>
            <p>{t("importerMigrationRequiresSqliteBody")}</p>
          </article>
        ) : null}
        <div className="stub-grid">
          <article className="stub-card">
            <p className="workstream-card__badge">{t("importerSummary")}</p>
            <h3>{snapshot.result.summary}</h3>
            <p>{t("importerStagingDir")}</p>
            <span className="mini-kv">{snapshot.plan.config.stagingRoot}</span>
          </article>
          <article className="stub-card">
            <p className="workstream-card__badge">{t("importerValidation")}</p>
            <h3>
              {t("importerBlockingIssues")}: {snapshot.plan.validation.totals.blockingIssues}
            </h3>
            <p>{t("importerWarnings")}: {snapshot.plan.validation.totals.warningIssues}</p>
            <span className="mini-kv">
              {t("importsDetectedSources")}: {snapshot.plan.validation.totals.discoveredSources}
            </span>
          </article>
          <article className="stub-card">
            <p className="workstream-card__badge">{t("importerCommitBoundary")}</p>
            <h3>{t("importerTransactionScope")}</h3>
            <p>{snapshot.plan.commitBoundary.transactionScope}</p>
            <span className="mini-kv">{snapshot.plan.commitBoundary.rollbackStrategy}</span>
          </article>
        </div>
        <div className="detail-grid">
          <article className="detail-card">
            <p className="workstream-card__badge">{t("importerCheckpointWrites")}</p>
            <ul className="stack-list">
              {snapshot.plan.commitBoundary.checkpointWrites.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
          <article className="detail-card">
            <p className="workstream-card__badge">{t("importerDroppedSurfaces")}</p>
            <ul className="stack-list">
              {snapshot.plan.transform.droppedSurfaces.map((item) => (
                <li key={item.name}>
                  <strong>{item.name}</strong>: {item.reason}
                </li>
              ))}
            </ul>
          </article>
        </div>

        <div className="issue-list">
          {runError ? (
            <article className="issue-card">
              <p className="workstream-card__badge">{t("importerExecutionError")}</p>
              <h3>{t("importerExecutionFailedTitle")}</h3>
              <p>{runError}</p>
            </article>
          ) : null}
          {snapshot.plan.validation.issues.length === 0 ? (
            <article className="issue-card issue-card--neutral">
              <h3>{t("importerNoIssues")}</h3>
              <p>{t("importerNoIssuesBody")}</p>
            </article>
          ) : (
            snapshot.plan.validation.issues.map((issue) => (
              <article key={`${issue.code}-${issue.sourceId ?? "global"}`} className="issue-card">
                <p className="workstream-card__badge">{issue.severity}</p>
                <h3>{issue.code}</h3>
                <p>{issue.message}</p>
              </article>
            ))
          )}
        </div>

        {execution ? (
          <>
            <div className="detail-grid">
              <article className="detail-card">
                <p className="workstream-card__badge">{t("importerExecutionTitle")}</p>
                <ul className="stack-list">
                  <li>
                    {t("importerExecutionStateLabel")}: {executionStatus?.label}
                  </li>
                  <li>
                    {t("importerStagedFileCount")}: {execution.stagedFileCount}
                  </li>
                  <li>
                    {t("importerCopiedBytes")}: {execution.copiedBytes.toLocaleString()} B
                  </li>
                </ul>
              </article>
              <article className="detail-card">
                <p className="workstream-card__badge">{t("importerAuditArtifact")}</p>
                <ul className="stack-list">
                  <li>
                    {t("importerAuditWriteStatus")}:{" "}
                    {auditWriteStatusLabel(execution.auditWriteStatus, t)}
                  </li>
                  <li>
                    {t("importerExecutionWarnings")}: {execution.warnings.length}
                  </li>
                  <li>
                    {t("runId")}: {execution.runId}
                  </li>
                </ul>
              </article>
            </div>

            <dl className="path-list path-list--compact">
              <div className="path-row">
                <dt>{t("importerManifestPath")}</dt>
                <dd>{execution.manifestPath}</dd>
              </div>
              <div className="path-row">
                <dt>{t("importerAuditArtifactPath")}</dt>
                <dd>{execution.auditArtifactPath}</dd>
              </div>
            </dl>

            <div className="issue-list">
              {execution.warnings.length === 0 ? (
                <article className="issue-card issue-card--neutral">
                  <h3>{t("noWarnings")}</h3>
                  <p>{t("importerExecutionNoWarnings")}</p>
                </article>
              ) : (
                execution.warnings.map((warning) => (
                  <article key={warning} className="issue-card">
                    <p className="workstream-card__badge">{t("importerExecutionWarning")}</p>
                    <h3>{t("importerExecutionWarnings")}</h3>
                    <p>{warning}</p>
                  </article>
                ))
              )}
            </div>
          </>
        ) : null}

        {migration ? (
          <>
            <div className="detail-grid">
              <article className="detail-card">
                <p className="workstream-card__badge">{t("importerMigrationTitle")}</p>
                <ul className="stack-list">
                  <li>
                    {t("importerMigrationStateLabel")}: {migrationStatus?.label}
                  </li>
                  <li>
                    {t("importerAuditRowsWritten")}: {migration.auditRowsWritten}
                  </li>
                  <li>
                    {t("importerExecutionWarnings")}: {migration.warningCount}
                  </li>
                </ul>
              </article>
              <article className="detail-card">
                <p className="workstream-card__badge">{t("importerMigrationSummary")}</p>
                <h3>{migration.summary}</h3>
                <p>{t("runId")}</p>
                <span className="mini-kv">{migration.runId}</span>
              </article>
            </div>

            <div className="detail-grid">
              <article className="detail-card">
                <p className="workstream-card__badge">{t("importerMigrationImported")}</p>
                {migration.importedCounts.length === 0 ? (
                  <p>{t("importerMigrationNoImports")}</p>
                ) : (
                  <ul className="stack-list">
                    {migration.importedCounts.map((item) => (
                      <li key={item.entity}>
                        {item.entity}: {item.count}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
              <article className="detail-card">
                <p className="workstream-card__badge">{t("importerMigrationDropped")}</p>
                {migration.droppedCounts.length === 0 ? (
                  <p>{t("importerMigrationNoDropped")}</p>
                ) : (
                  <ul className="stack-list">
                    {migration.droppedCounts.map((item) => (
                      <li key={item.entity}>
                        {item.entity}: {item.count} ({item.reason})
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </div>

            <dl className="path-list path-list--compact">
              {migration.sourceDatabasePath ? (
                <div className="path-row">
                  <dt>{t("importerMigrationSourcePath")}</dt>
                  <dd>{migration.sourceDatabasePath}</dd>
                </div>
              ) : null}
              {migration.backupPath ? (
                <div className="path-row">
                  <dt>{t("importerBackupPath")}</dt>
                  <dd>{migration.backupPath}</dd>
                </div>
              ) : null}
            </dl>

            <div className="issue-list">
              {migration.warnings.length === 0 ? (
                <article className="issue-card issue-card--neutral">
                  <h3>{t("noWarnings")}</h3>
                  <p>{t("importerMigrationNoWarnings")}</p>
                </article>
              ) : (
                migration.warnings.map((warning) => (
                  <article key={warning} className="issue-card">
                    <p className="workstream-card__badge">{t("importerExecutionWarning")}</p>
                    <h3>{t("importerMigrationWarnings")}</h3>
                    <p>{warning}</p>
                  </article>
                ))
              )}
            </div>
          </>
        ) : null}
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="panel__label">{t("legacyInventory")}</p>
            <h2>{t("importsDetectedSources")}</h2>
          </div>
        </div>
        <div className="legacy-grid">
          {workspace.legacySources.map((source) => (
            <article key={source.id} className="legacy-card">
              <div className="legacy-card__header">
                <div>
                  <p className="workstream-card__badge">{source.kind}</p>
                  <h3>{source.label}</h3>
                </div>
                <span className="status-pill" data-found={source.exists}>
                  {source.exists ? t("found") : t("missing")}
                </span>
              </div>
              <p className="legacy-card__path">{source.path}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

export const importsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/imports",
  loader: async () => {
    const [workspace, importer] = await Promise.all([
      getWorkspaceSnapshot(),
      getImporterDryRun(),
    ]);
    return { workspace, importer };
  },
  component: ImportsRoute,
});
