import { Link, createRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getSecretVaultStatus,
  isBrowserFallbackRuntime,
  listenToAiStreamEvents,
  startAiPromptStream,
  updateAiProviderSettings,
  writeSecretValue,
  type DesktopAiStreamEvent,
} from "../lib/desktop-api";
import { loadSettingsRouteData } from "../lib/desktop-loaders";
import {
  buildProviderRuntimeReadModel,
  toSettingsSurfaceReadModel,
} from "../lib/desktop-read-models";
import { rootRoute } from "./root";

type SettingsTab = "providers" | "experience" | "workspace";
type NoticeTone = "success" | "warn" | "danger";

interface NoticeState {
  tone: NoticeTone;
  message: string;
}

interface StreamLogEntry {
  id: string;
  kind: DesktopAiStreamEvent["kind"];
  message: string;
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M5 5L15 15M15 5L5 15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SettingsRoute() {
  const { t } = useTranslation();
  const context = rootRoute.useLoaderData();
  const {
    workspace,
    settings,
    vault,
    secretInventory,
    domainContract,
  } = settingsRoute.useLoaderData();
  const runtimeIsFallback = isBrowserFallbackRuntime(context);
  const [activeTab, setActiveTab] = useState<SettingsTab>("providers");
  const [settingsState, setSettingsState] = useState(settings);
  const [vaultState, setVaultState] = useState(vault);
  const [secretInventoryState, setSecretInventoryState] = useState(secretInventory);
  const [selectedProvider, setSelectedProvider] = useState(settings.ai.defaultProvider);
  const [baseUrl, setBaseUrl] = useState("");
  const [modelValue, setModelValue] = useState("");
  const [setAsDefault, setSetAsDefault] = useState(true);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [prompt, setPrompt] = useState("");
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [streamLog, setStreamLog] = useState<StreamLogEntry[]>([]);
  const [streamOutput, setStreamOutput] = useState("");
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isSavingSecret, setIsSavingSecret] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const activeRequestIdRef = useRef<string | null>(null);

  useEffect(() => {
    setSettingsState(settings);
  }, [settings]);

  useEffect(() => {
    setVaultState(vault);
  }, [vault]);

  useEffect(() => {
    setSecretInventoryState(secretInventory);
  }, [secretInventory]);

  const surface = toSettingsSurfaceReadModel({
    workspace,
    settings: settingsState,
    vault: vaultState,
    domainContract,
    secretInventory: secretInventoryState,
  });
  const providerEntries = useMemo(
    () => buildProviderRuntimeReadModel(settingsState, domainContract),
    [domainContract, settingsState],
  );
  const selectedProviderEntry = useMemo(
    () =>
      providerEntries.find((provider) => provider.provider === selectedProvider)
      ?? providerEntries[0],
    [providerEntries, selectedProvider],
  );
  const selectedSecretEntry = useMemo(() => {
    if (!selectedProviderEntry?.secretKey) {
      return undefined;
    }

    return secretInventoryState.entries.find(
      (entry) => entry.key === selectedProviderEntry.secretKey,
    );
  }, [secretInventoryState.entries, selectedProviderEntry]);
  const providerSupportsNativeStreaming = selectedProvider === "openai";
  const secretConfigured = Boolean(selectedSecretEntry?.isConfigured);
  const vaultStatusLabel =
    vaultState.status === "ready"
      ? t("vaultStatusReady")
      : vaultState.status === "degraded"
        ? t("vaultStatusDegraded")
        : t("vaultStatusNeedsConfiguration");
  const settingsBodyKey = runtimeIsFallback ? "settingsBodyFallback" : "settingsBody";

  useEffect(() => {
    if (!providerEntries.some((entry) => entry.provider === selectedProvider) && providerEntries[0]) {
      setSelectedProvider(providerEntries[0].provider);
    }
  }, [providerEntries, selectedProvider]);

  useEffect(() => {
    if (!selectedProviderEntry) {
      return;
    }

    setBaseUrl(selectedProviderEntry.baseUrl || "");
    setModelValue(selectedProviderEntry.model || "");
    setSetAsDefault(settingsState.ai.defaultProvider === selectedProviderEntry.provider);
    setApiKeyInput("");
  }, [selectedProviderEntry, settingsState.ai.defaultProvider]);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;

    void listenToAiStreamEvents((event) => {
      if (event.requestId !== activeRequestIdRef.current) {
        return;
      }

      const logMessage =
        event.kind === "started"
          ? t("aiRuntimeEventStarted", {
              provider: event.provider,
              model: event.model,
            })
          : event.kind === "delta"
            ? t("aiRuntimeEventDelta", {
                chunk: event.chunkIndex ?? 0,
                size: event.deltaText?.length ?? 0,
              })
            : event.kind === "completed"
              ? t("aiRuntimeEventCompleted", {
                  chunks: event.chunkIndex ?? 0,
                })
              : event.errorMessage || t("aiRuntimeEventError");

      setStreamLog((previous) => [
        ...previous,
        {
          id: `${event.requestId}-${event.kind}-${event.chunkIndex ?? event.emittedAtEpochMs}`,
          kind: event.kind,
          message: logMessage,
        },
      ]);

      if (typeof event.accumulatedText === "string") {
        setStreamOutput(event.accumulatedText);
      }

      if (event.kind === "started") {
        setIsStreaming(true);
        return;
      }

      if (event.kind === "completed") {
        activeRequestIdRef.current = null;
        setIsStreaming(false);
        setNotice({
          tone: "success",
          message: t("aiRuntimeStreamCompletedNotice"),
        });
        return;
      }

      if (event.kind === "error") {
        activeRequestIdRef.current = null;
        setIsStreaming(false);
        setNotice({
          tone: "danger",
          message: event.errorMessage || t("aiRuntimeEventError"),
        });
      }
    }).then((cleanup) => {
      if (disposed) {
        cleanup();
        return;
      }

      unlisten = cleanup;
    });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [t]);

  async function handleSaveProviderConfig() {
    if (!selectedProviderEntry) {
      return;
    }

    setIsSavingConfig(true);
    setNotice(null);

    try {
      const nextSettings = await updateAiProviderSettings({
        provider: selectedProviderEntry.provider,
        baseUrl,
        model: modelValue,
        setAsDefault,
      });
      setSettingsState(nextSettings);
      setNotice({
        tone: "success",
        message: t("aiRuntimeConfigSaved"),
      });
    } catch (error) {
      setNotice({
        tone: "danger",
        message:
          error instanceof Error ? error.message : t("aiRuntimeConfigSaveFailed"),
      });
    } finally {
      setIsSavingConfig(false);
    }
  }

  async function handleSaveSecret() {
    if (!selectedProviderEntry?.secretKey) {
      return;
    }

    setIsSavingSecret(true);
    setNotice(null);

    try {
      const nextInventory = await writeSecretValue({
        key: selectedProviderEntry.secretKey,
        provider: selectedProviderEntry.provider,
        purpose: `Desktop AI runtime credential for ${selectedProviderEntry.provider}.`,
        value: apiKeyInput,
      });
      const nextVaultState = await getSecretVaultStatus();
      setSecretInventoryState(nextInventory);
      setVaultState(nextVaultState);
      setApiKeyInput("");
      setNotice({
        tone: "success",
        message: t("aiRuntimeSecretSaved"),
      });
    } catch (error) {
      setNotice({
        tone: "danger",
        message:
          error instanceof Error ? error.message : t("aiRuntimeSecretSaveFailed"),
      });
    } finally {
      setIsSavingSecret(false);
    }
  }

  async function handleRunPrompt() {
    if (!selectedProviderEntry) {
      return;
    }

    setNotice(null);
    setStreamLog([]);
    setStreamOutput("");

    try {
      const requestId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `desktop-ai-${Date.now()}`;
      activeRequestIdRef.current = requestId;
      const receipt = await startAiPromptStream({
        provider: selectedProviderEntry.provider,
        prompt: prompt.trim(),
        model: modelValue,
        baseUrl,
        requestId,
      });
      setIsStreaming(true);
      setNotice({
        tone: "warn",
        message: t("aiRuntimeStreamStartedNotice", {
          provider: receipt.provider,
        }),
      });
    } catch (error) {
      activeRequestIdRef.current = null;
      setIsStreaming(false);
      setNotice({
        tone: "danger",
        message:
          error instanceof Error ? error.message : t("aiRuntimeStreamFailedNotice"),
      });
    }
  }

  function clearStreamState() {
    activeRequestIdRef.current = null;
    setStreamLog([]);
    setStreamOutput("");
    setIsStreaming(false);
    setNotice(null);
  }

  return (
    <div className="settings-modal-backdrop">
      <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header className="settings-modal__header">
          <div className="settings-modal__copy">
            <p className="page-header__eyebrow">{t("settingsLabel")}</p>
            <h1 id="settings-title" className="settings-modal__title">
              {t("settingsTitle")}
            </h1>
            <p className="settings-modal__body">{t(settingsBodyKey)}</p>
          </div>

          <Link className="settings-close" to="/library" aria-label={t("settingsClose")}>
            <CloseIcon />
          </Link>
        </header>

        <div className="settings-modal__summary">
          <span className={`status-badge status-badge--${runtimeIsFallback ? "warn" : "success"}`}>
            {t(runtimeIsFallback ? "runtimeFallbackBadge" : "runtimeNativeBadge")}
          </span>
          <span className="status-badge status-badge--muted">{context.platform}</span>
          <span
            className={`status-badge status-badge--${vaultState.status === "ready" ? "success" : vaultState.status === "degraded" ? "danger" : "warn"}`}
          >
            {vaultStatusLabel}
          </span>
        </div>

        <div className="settings-tabs" role="tablist" aria-label={t("settingsTitle")}>
          <button
            type="button"
            className={`settings-tab ${activeTab === "providers" ? "settings-tab--active" : ""}`}
            onClick={() => setActiveTab("providers")}
          >
            {t("settingsTabProviders")}
          </button>
          <button
            type="button"
            className={`settings-tab ${activeTab === "experience" ? "settings-tab--active" : ""}`}
            onClick={() => setActiveTab("experience")}
          >
            {t("settingsTabExperience")}
          </button>
          <button
            type="button"
            className={`settings-tab ${activeTab === "workspace" ? "settings-tab--active" : ""}`}
            onClick={() => setActiveTab("workspace")}
          >
            {t("settingsTabWorkspace")}
          </button>
        </div>

        <p className="settings-modal__hint">{t("settingsReadOnlyHint")}</p>

        <div className="settings-modal__content">
          {activeTab === "providers" ? (
            <>
              <div className="surface-grid surface-grid--two">
                <section className="subsurface">
                  <div className="subsurface__header">
                    <div>
                      <p className="collection-card__badge">{t("settingsProvidersTitle")}</p>
                      <h3>{t("settingsProvidersHeader")}</h3>
                    </div>
                    <span className="status-badge status-badge--muted">{settingsState.ai.defaultProvider}</span>
                  </div>
                  <p>{t("settingsProvidersBody")}</p>
                  <div className="subsurface-grid">
                    {providerEntries.map((provider) => (
                      <article key={provider.provider} className="subsurface">
                        <div className="subsurface__header">
                          <div>
                            <p className="collection-card__badge">{provider.provider}</p>
                            <h3>{provider.model}</h3>
                          </div>
                          {provider.isDefault ? (
                            <span className="status-badge status-badge--success">
                              {t("defaultProvider")}
                            </span>
                          ) : null}
                        </div>
                        <p>{provider.baseUrl || t("notAvailable")}</p>
                        {provider.secretKey ? (
                          <p>
                            {t("providerSecretKeyLabel")}: {provider.secretKey}
                          </p>
                        ) : null}
                      </article>
                    ))}
                  </div>
                </section>

                <section className="subsurface">
                  <div className="subsurface__header">
                    <div>
                      <p className="collection-card__badge">{t("settingsCurrentState")}</p>
                      <h3>{t("settingsLocaleHeader")}</h3>
                    </div>
                    <span className="status-badge status-badge--muted">{context.buildChannel}</span>
                  </div>
                  <dl className="setting-list">
                    <div className="setting-row">
                      <dt>{t("defaultProvider")}</dt>
                      <dd>{settingsState.ai.defaultProvider}</dd>
                    </div>
                    <div className="setting-row">
                      <dt>{t("providerConfigs")}</dt>
                      <dd>{surface.configuredProviderCount}</dd>
                    </div>
                    <div className="setting-row">
                      <dt>{t("providerRegistryTitle")}</dt>
                      <dd>{surface.contractProviderCount}</dd>
                    </div>
                    <div className="setting-row">
                      <dt>{t("vaultSecretsCount")}</dt>
                    <dd>{secretInventoryState.entries.filter((entry) => entry.isConfigured).length}</dd>
                  </div>
                    <div className="setting-row">
                      <dt>{t("baseUrlLabel")}</dt>
                      <dd>{settingsState.ai.exaPoolBaseUrl || t("notAvailable")}</dd>
                    </div>
                  </dl>
                </section>
              </div>

              <section className="subsurface settings-runtime">
                <div className="subsurface__header">
                  <div>
                    <p className="collection-card__badge">{t("aiRuntimeTitle")}</p>
                    <h3>{t("aiRuntimeHeader")}</h3>
                  </div>
                  <span className={`status-badge status-badge--${isStreaming ? "warn" : "muted"}`}>
                    {isStreaming ? t("aiRuntimeStreaming") : t("aiRuntimeIdle")}
                  </span>
                </div>
                <p>{t("aiRuntimeBody")}</p>

                {runtimeIsFallback ? (
                  <article className="subsurface subsurface--warn">
                    <p className="collection-card__badge">{t("runtimeFallbackBadge")}</p>
                    <h3>{t("aiRuntimeNeedsDesktopTitle")}</h3>
                    <p>{t("aiRuntimeNeedsDesktopBody")}</p>
                  </article>
                ) : null}

                <div className="settings-runtime__grid">
                  <label className="settings-field">
                    <span>{t("aiRuntimeProviderLabel")}</span>
                    <select
                      value={selectedProviderEntry?.provider ?? selectedProvider}
                      onChange={(event) => setSelectedProvider(event.target.value)}
                    >
                      {providerEntries.map((provider) => (
                        <option key={provider.provider} value={provider.provider}>
                          {provider.provider}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="settings-field">
                    <span>{t("baseUrlLabel")}</span>
                    <input
                      type="text"
                      value={baseUrl}
                      onChange={(event) => setBaseUrl(event.target.value)}
                      placeholder="https://api.openai.com/v1"
                    />
                  </label>

                  <label className="settings-field">
                    <span>{t("modelLabel")}</span>
                    <input
                      type="text"
                      value={modelValue}
                      onChange={(event) => setModelValue(event.target.value)}
                      placeholder="gpt-4o"
                    />
                  </label>

                  <label className="settings-field">
                    <span>{t("aiRuntimeApiKeyLabel")}</span>
                    <input
                      type="password"
                      value={apiKeyInput}
                      onChange={(event) => setApiKeyInput(event.target.value)}
                      placeholder={t("aiRuntimeApiKeyPlaceholder")}
                    />
                  </label>
                </div>

                <div className="settings-runtime__status">
                  <span className={`status-badge status-badge--${secretConfigured ? "success" : "warn"}`}>
                    {secretConfigured ? t("aiRuntimeSecretConfigured") : t("aiRuntimeSecretMissing")}
                  </span>
                  {selectedProviderEntry?.secretKey ? (
                    <span className="status-badge status-badge--muted">
                      {selectedProviderEntry.secretKey}
                    </span>
                  ) : null}
                  {!providerSupportsNativeStreaming ? (
                    <span className="status-badge status-badge--warn">
                      {t("aiRuntimeOpenAiFirst")}
                    </span>
                  ) : null}
                </div>

                <label className="settings-checkbox">
                  <input
                    type="checkbox"
                    checked={setAsDefault}
                    onChange={(event) => setSetAsDefault(event.target.checked)}
                  />
                  <span>{t("aiRuntimeSetAsDefault")}</span>
                </label>

                <div className="settings-runtime__actions">
                  <button
                    type="button"
                    className="action-button"
                    onClick={() => void handleSaveProviderConfig()}
                    disabled={runtimeIsFallback || isSavingConfig}
                  >
                    {isSavingConfig ? t("aiRuntimeSavingConfig") : t("aiRuntimeSaveConfig")}
                  </button>
                  <button
                    type="button"
                    className="action-button action-button--secondary"
                    onClick={() => void handleSaveSecret()}
                    disabled={runtimeIsFallback || isSavingSecret || apiKeyInput.trim().length === 0}
                  >
                    {isSavingSecret ? t("aiRuntimeSavingSecret") : t("aiRuntimeSaveSecret")}
                  </button>
                </div>

                <label className="settings-field settings-field--wide">
                  <span>{t("aiRuntimePromptLabel")}</span>
                  <textarea
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    placeholder={t("aiRuntimePromptPlaceholder")}
                    rows={6}
                  />
                </label>

                <div className="settings-runtime__actions">
                  <button
                    type="button"
                    className="action-button"
                    onClick={() => void handleRunPrompt()}
                    disabled={
                      runtimeIsFallback
                      || isStreaming
                      || prompt.trim().length === 0
                      || !secretConfigured
                      || !providerSupportsNativeStreaming
                    }
                  >
                    {isStreaming ? t("aiRuntimeStreaming") : t("aiRuntimeRunPrompt")}
                  </button>
                  <button
                    type="button"
                    className="action-button action-button--secondary"
                    onClick={clearStreamState}
                    disabled={isStreaming}
                  >
                    {t("aiRuntimeClear")}
                  </button>
                </div>

                {notice ? (
                  <p className={`form-note form-note--${notice.tone}`}>
                    {notice.message}
                  </p>
                ) : null}

                <div className="surface-grid surface-grid--two">
                  <section className="subsurface">
                    <div className="subsurface__header">
                      <div>
                        <p className="collection-card__badge">{t("aiRuntimeEventsTitle")}</p>
                        <h3>{t("aiRuntimeEventsHeader")}</h3>
                      </div>
                    </div>

                    {streamLog.length > 0 ? (
                      <div className="settings-log">
                        {streamLog.map((entry) => (
                          <div key={entry.id} className="settings-log__entry">
                            <span className={`status-badge status-badge--${entry.kind === "error" ? "danger" : entry.kind === "completed" ? "success" : "muted"}`}>
                              {entry.kind}
                            </span>
                            <p>{entry.message}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state empty-state--compact">
                        <h3>{t("aiRuntimeEventsEmptyTitle")}</h3>
                        <p>{t("aiRuntimeEventsEmptyBody")}</p>
                      </div>
                    )}
                  </section>

                  <section className="subsurface">
                    <div className="subsurface__header">
                      <div>
                        <p className="collection-card__badge">{t("aiRuntimeOutputTitle")}</p>
                        <h3>{t("aiRuntimeOutputHeader")}</h3>
                      </div>
                    </div>

                    {streamOutput ? (
                      <pre className="settings-output">{streamOutput}</pre>
                    ) : (
                      <div className="empty-state empty-state--compact">
                        <h3>{t("aiRuntimeOutputEmptyTitle")}</h3>
                        <p>{t("aiRuntimeOutputEmptyBody")}</p>
                      </div>
                    )}
                  </section>
                </div>
              </section>
            </>
          ) : null}

          {activeTab === "experience" ? (
            <div className="surface-grid surface-grid--two">
              <section className="subsurface">
                <div className="subsurface__header">
                  <div>
                    <p className="collection-card__badge">{t("settingsLocaleTitle")}</p>
                    <h3>{t("settingsLocaleHeader")}</h3>
                  </div>
                </div>
                <dl className="setting-list">
                  <div className="setting-row">
                    <dt>{t("localeLabel")}</dt>
                    <dd>{settingsState.locale}</dd>
                  </div>
                  <div className="setting-row">
                    <dt>{t("themeLabel")}</dt>
                    <dd>{settingsState.theme}</dd>
                  </div>
                  <div className="setting-row">
                    <dt>{t("autoSaveLabel")}</dt>
                    <dd>{settingsState.editor.autoSave ? t("yes") : t("no")}</dd>
                  </div>
                  <div className="setting-row">
                    <dt>{t("autoSaveIntervalLabel")}</dt>
                    <dd>{settingsState.editor.autoSaveIntervalMs}ms</dd>
                  </div>
                </dl>
              </section>

              <section className="subsurface">
                <div className="subsurface__header">
                  <div>
                    <p className="collection-card__badge">{t("workspace")}</p>
                    <h3>{t("settingsStorageHeader")}</h3>
                  </div>
                </div>
                <dl className="setting-list">
                  <div className="setting-row">
                    <dt>{t("rememberWindowState")}</dt>
                    <dd>{settingsState.window.rememberWindowState ? t("yes") : t("no")}</dd>
                  </div>
                  <div className="setting-row">
                    <dt>{t("restoreLastWorkspace")}</dt>
                    <dd>{settingsState.window.restoreLastWorkspace ? t("yes") : t("no")}</dd>
                  </div>
                  <div className="setting-row">
                    <dt>{t("runtime")}</dt>
                    <dd>{context.runtime}</dd>
                  </div>
                  <div className="setting-row">
                    <dt>{t("mode")}</dt>
                    <dd>{context.buildChannel}</dd>
                  </div>
                </dl>
              </section>
            </div>
          ) : null}

          {activeTab === "workspace" ? (
            <div className="surface-grid surface-grid--two">
              <section className="subsurface">
                <div className="subsurface__header">
                  <div>
                    <p className="collection-card__badge">{t("settingsStorageTitle")}</p>
                    <h3>{t("settingsStorageHeader")}</h3>
                  </div>
                  <span className="status-badge status-badge--muted">
                    {t("schemaVersion")}: {workspace.schemaVersion}
                  </span>
                </div>
                <p>{t("settingsStorageBody")}</p>
                <dl className="path-list">
                  <div className="path-row">
                    <dt>{t("storageRoot")}</dt>
                    <dd>{workspace.rootDir}</dd>
                  </div>
                  <div className="path-row">
                    <dt>{t("databasePath")}</dt>
                    <dd>{workspace.databasePath}</dd>
                  </div>
                  <div className="path-row">
                    <dt>{t("secureSettingsPath")}</dt>
                    <dd>{workspace.secureSettingsPath}</dd>
                  </div>
                  <div className="path-row">
                    <dt>{t("manifestPath")}</dt>
                    <dd>{workspace.manifestPath}</dd>
                  </div>
                </dl>
              </section>

              <section className="subsurface">
                <div className="subsurface__header">
                  <div>
                    <p className="collection-card__badge">{t("vaultLabel")}</p>
                    <h3>{t("vaultTitle")}</h3>
                  </div>
                  <span
                    className={`status-badge status-badge--${vaultState.status === "ready" ? "success" : vaultState.status === "degraded" ? "danger" : "warn"}`}
                  >
                    {vaultStatusLabel}
                  </span>
                </div>
                <p>{t("vaultBody")}</p>
                <dl className="setting-list">
                  <div className="setting-row">
                    <dt>{t("vaultBackend")}</dt>
                    <dd>{vaultState.backend}</dd>
                  </div>
                  <div className="setting-row">
                    <dt>{t("vaultEncryptedAtRest")}</dt>
                    <dd>{vaultState.encryptedAtRest ? t("yes") : t("no")}</dd>
                  </div>
                  <div className="setting-row">
                    <dt>{t("vaultSecretsCount")}</dt>
                    <dd>{vaultState.registeredSecretCount}</dd>
                  </div>
                  <div className="setting-row">
                    <dt>{t("providerRegistryTitle")}</dt>
                    <dd>{surface.supportsEncryptedVault ? t("yes") : t("no")}</dd>
                  </div>
                </dl>
                <dl className="path-list">
                  <div className="path-row">
                    <dt>{t("vaultManifestPath")}</dt>
                    <dd>{vaultState.manifestPath}</dd>
                  </div>
                  <div className="path-row">
                    <dt>{t("vaultFallbackPath")}</dt>
                    <dd>{vaultState.fallbackPath}</dd>
                  </div>
                </dl>
                {vaultState.warnings.length > 0 ? (
                  <div className="subsurface-grid">
                    {vaultState.warnings.map((warning) => (
                      <article key={warning} className="subsurface subsurface--warn">
                        <p className="collection-card__badge">{t("vaultWarning")}</p>
                        <h3>{t("vaultNeedsAttention")}</h3>
                        <p>{warning}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state empty-state--compact">
                    <h3>{t("noWarnings")}</h3>
                    <p>{t("vaultNoWarnings")}</p>
                  </div>
                )}
              </section>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  loader: loadSettingsRouteData,
  component: SettingsRoute,
});
