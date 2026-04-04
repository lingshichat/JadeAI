import { useEffect, useState } from "react";
import { Download, ExternalLink, Loader2, RefreshCw, Sparkles, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useTranslation } from "react-i18next";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { openExternalUrl } from "../../lib/desktop-api";
import { useAppUpdateStore } from "../../stores/app-update-store";

function formatReleaseDate(value: string | null, locale: string): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale.startsWith("zh") ? "zh-CN" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function UpdateDialog() {
  const { t, i18n } = useTranslation();
  const [isOpeningExternalUrl, setIsOpeningExternalUrl] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const {
    dialogOpen,
    pendingUpdate,
    currentVersion,
    latestVersion,
    releaseNotes,
    releaseDate,
    downloadUrl,
    hasChecked,
    isChecking,
    isDownloading,
    isInstalling,
    contentLength,
    downloadedBytes,
    error,
    checkForUpdates,
    downloadAndInstall,
    closeDialog,
    clearError,
  } = useAppUpdateStore();

  useEffect(() => {
    if (!dialogOpen) {
      setIsOpeningExternalUrl(false);
      setLinkError(null);
    }
  }, [dialogOpen]);

  if (!dialogOpen) {
    return null;
  }

  const releaseDateLabel = formatReleaseDate(releaseDate, i18n.language);
  const effectiveError = linkError ?? error;
  const progressPercent =
    contentLength && contentLength > 0
      ? Math.min(100, Math.round((downloadedBytes / contentLength) * 100))
      : null;
  const installActionLabel = isInstalling
    ? t("updaterInstalling")
    : isDownloading
      ? progressPercent !== null
        ? t("updaterDownloadingProgress", { progress: progressPercent })
        : t("updaterDownloading")
      : t("updaterDownloadAndInstall");
  const canClose = !isDownloading;

  async function handleRefresh() {
    setLinkError(null);
    clearError();
    await checkForUpdates();
  }

  async function handleOpenDownloadUrl() {
    if (!downloadUrl || isOpeningExternalUrl) {
      return;
    }

    setLinkError(null);
    setIsOpeningExternalUrl(true);

    try {
      await openExternalUrl(downloadUrl);
    } catch (openError) {
      console.error("Failed to open update download URL:", openError);
      setLinkError(t("updaterOpenDownloadUrlFailed"));
    } finally {
      setIsOpeningExternalUrl(false);
    }
  }

  return (
    <div
      className="dialog-backdrop"
      style={{ zIndex: 60 }}
      onClick={canClose ? closeDialog : undefined}
    >
      <div
        className="dialog-content dialog-content--lg max-h-[88vh] overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dialog-header border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="dialog-title">{t("updaterDialogTitle")}</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {pendingUpdate
                  ? t("updaterDialogAvailableBody")
                  : t("updaterDialogBody")}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="dialog-close"
            onClick={closeDialog}
            disabled={!canClose}
            aria-label={t("close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="dialog-body space-y-5">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-zinc-600 ring-1 ring-zinc-200 dark:bg-zinc-950/80 dark:text-zinc-300 dark:ring-zinc-800">
                {t("updaterCurrentVersionLabel")}: {currentVersion ?? t("notAvailable")}
              </span>
              <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white">
                {t("updaterLatestVersionLabel")}: {latestVersion ?? t("updaterNoUpdateAvailable")}
              </span>
              {releaseDateLabel ? (
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-zinc-600 ring-1 ring-zinc-200 dark:bg-zinc-950/80 dark:text-zinc-300 dark:ring-zinc-800">
                  {t("updaterReleaseDateLabel")}: {releaseDateLabel}
                </span>
              ) : null}
            </div>

            <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              {pendingUpdate
                ? t("updaterDialogReadySummary", { version: latestVersion ?? "" })
                : hasChecked
                  ? t("updaterNoUpdateAvailable")
                  : t("updaterDialogBody")}
            </p>
          </div>

          {effectiveError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              {effectiveError}
            </div>
          ) : null}

          {isDownloading || isInstalling ? (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/80">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                <span>{installActionLabel}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${progressPercent ?? 12}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                {isInstalling
                  ? t("updaterInstallingHint")
                  : progressPercent !== null
                    ? t("updaterDownloadingHint", { progress: progressPercent })
                    : t("updaterDownloading")}
              </p>
            </div>
          ) : null}

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/70">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                  {t("updaterReleaseNotesTitle")}
                </p>
                <h3 className="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  {t("updaterReleaseNotesHeading")}
                </h3>
              </div>
              {downloadUrl ? (
                <button
                  type="button"
                  onClick={() => void handleOpenDownloadUrl()}
                  disabled={isOpeningExternalUrl}
                  className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 transition hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
                >
                  {isOpeningExternalUrl ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ExternalLink className="h-3.5 w-3.5" />
                  )}
                  {t("updaterDownloadUrlLabel")}
                </button>
              ) : null}
            </div>

            {releaseNotes ? (
              <div className="mt-4 max-h-[42vh] overflow-y-auto pr-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300 [&_h1]:mt-4 [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:text-zinc-900 [&_h1:first-child]:mt-0 [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-zinc-900 [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-3 dark:[&_h1]:text-zinc-100 dark:[&_h2]:text-zinc-100">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {releaseNotes}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                {t("updaterReleaseNotesEmpty")}
              </p>
            )}
          </div>
        </div>

        <div className="dialog-footer border-t border-zinc-100 dark:border-zinc-800">
          <Button
            variant="secondary"
            onClick={closeDialog}
            disabled={!canClose}
          >
            {t("close")}
          </Button>
          <Button
            variant="outline"
            onClick={() => void handleRefresh()}
            disabled={isChecking || isDownloading}
          >
            {isChecking ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("updaterChecking")}
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                {t("updaterCheckAgainButton")}
              </>
            )}
          </Button>
          {pendingUpdate ? (
            <Button
              onClick={() => void downloadAndInstall()}
              disabled={isDownloading || isInstalling}
            >
              {isDownloading || isInstalling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {installActionLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
