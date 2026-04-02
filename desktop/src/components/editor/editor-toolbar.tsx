import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Undo2,
  Redo2,
  Download,
  Settings,
  Palette,
  Save,
  FileSearch,
  Languages,
  FileText,
  SpellCheck,
} from "lucide-react";
import { useEditorStore } from "../../stores/editor-store";
import { useResumeStore } from "../../stores/resume-store";
import { Separator } from "@/components/ui/separator";
import { ExportDialog } from "./export-dialog";
import { SettingsDialog } from "./settings-dialog";
import { JdAnalysisDialog } from "./jd-analysis-dialog";
import { TranslateDialog } from "./translate-dialog";
import { CoverLetterDialog } from "./cover-letter-dialog";
import { GrammarCheckDialog } from "./grammar-check-dialog";
import { getWorkspaceSettingsSnapshot } from "../../lib/desktop-api";

export function EditorToolbar() {
  const { t } = useTranslation();
  const { toggleThemeEditor, showThemeEditor, undo, redo, undoStack, redoStack } =
    useEditorStore();
  const { isSaving, isDirty, currentResume, save } = useResumeStore();
  const [autoSave, setAutoSave] = useState(true);

  // Dialog states
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [jdAnalysisDialogOpen, setJdAnalysisDialogOpen] = useState(false);
  const [translateDialogOpen, setTranslateDialogOpen] = useState(false);
  const [coverLetterDialogOpen, setCoverLetterDialogOpen] = useState(false);
  const [grammarCheckDialogOpen, setGrammarCheckDialogOpen] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    void getWorkspaceSettingsSnapshot()
      .then((settings) => {
        if (!isCancelled) {
          setAutoSave(settings.editor?.autoSave ?? true);
        }
      })
      .catch(() => undefined);

    return () => {
      isCancelled = true;
    };
  }, []);

  const handleUndo = () => {
    const snapshot = undo();
    if (snapshot) {
      // Apply snapshot
    }
  };

  const handleRedo = () => {
    const snapshot = redo();
    if (snapshot) {
      // Apply snapshot
    }
  };

  const resumeId = currentResume?.metadata?.id || "";

  return (
    <>
      <div className="flex h-12 items-center justify-between border-b bg-white px-3 dark:bg-zinc-900 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Link
            to="/dashboard"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-zinc-600 hover:bg-zinc-50"
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path
                d="M15 15L10 10L15 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <Separator orientation="vertical" className="h-6" />
          <span className="max-w-48 truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {currentResume?.metadata?.title || t("editor.untitled")}
          </span>
          <span className="text-xs text-zinc-400">
            {isSaving
              ? t("editor.toolbar.saving")
              : isDirty
                ? autoSave
                  ? ""
                  : t("editor.toolbar.unsaved")
                : t("editor.toolbar.autoSaved")}
          </span>
          {!autoSave && isDirty && !isSaving && (
            <button
              type="button"
              onClick={() => save()}
              className="flex h-7 cursor-pointer items-center gap-1 rounded px-2 text-xs text-pink-600 hover:bg-pink-50"
            >
              <Save className="h-3.5 w-3.5" />
              {t("editor.toolbar.save")}
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
            title={t("editor.toolbar.undo")}
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
            title={t("editor.toolbar.redo")}
          >
            <Redo2 className="h-4 w-4" />
          </button>
          <Separator orientation="vertical" className="h-6 mx-1" />
          <button
            type="button"
            onClick={() => setExportDialogOpen(true)}
            className="flex h-8 cursor-pointer items-center gap-1 rounded px-2 text-zinc-600 hover:bg-zinc-50"
            title={t("editor.toolbar.exportPdf")}
          >
            <Download className="h-4 w-4" />
            <span className="ml-1 text-xs hidden sm:inline">
              {t("editor.toolbar.exportPdf")}
            </span>
          </button>
          <Separator orientation="vertical" className="h-6 mx-1" />
          <button
            type="button"
            onClick={() => setJdAnalysisDialogOpen(true)}
            className="flex h-8 cursor-pointer items-center gap-1 rounded px-2 text-zinc-600 hover:bg-zinc-50"
            title={t("editor.toolbar.jdAnalysis")}
          >
            <FileSearch className="h-4 w-4" />
            <span className="ml-1 text-xs hidden sm:inline">
              {t("editor.toolbar.jdAnalysis")}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTranslateDialogOpen(true)}
            className="flex h-8 cursor-pointer items-center gap-1 rounded px-2 text-zinc-600 hover:bg-zinc-50"
            title={t("editor.toolbar.translate")}
          >
            <Languages className="h-4 w-4" />
            <span className="ml-1 text-xs hidden sm:inline">
              {t("editor.toolbar.translate")}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setCoverLetterDialogOpen(true)}
            className="flex h-8 cursor-pointer items-center gap-1 rounded px-2 text-zinc-600 hover:bg-zinc-50"
            title={t("editor.toolbar.coverLetter")}
          >
            <FileText className="h-4 w-4" />
            <span className="ml-1 text-xs hidden sm:inline">
              {t("editor.toolbar.coverLetter")}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setGrammarCheckDialogOpen(true)}
            className="flex h-8 cursor-pointer items-center gap-1 rounded px-2 text-zinc-600 hover:bg-zinc-50"
            title={t("editor.toolbar.grammarCheck")}
          >
            <SpellCheck className="h-4 w-4" />
            <span className="ml-1 text-xs hidden sm:inline">
              {t("editor.toolbar.grammarCheck")}
            </span>
          </button>
          <Separator orientation="vertical" className="h-6 mx-1" />
          <button
            type="button"
            onClick={toggleThemeEditor}
            className={`flex h-8 cursor-pointer items-center gap-1 rounded px-2 hover:bg-zinc-50 ${
              showThemeEditor ? "bg-zinc-100 text-zinc-900" : "text-zinc-600"
            }`}
            title={t("editor.toolbar.theme")}
          >
            <Palette className="h-4 w-4" />
            <span className="ml-1 text-xs hidden sm:inline">
              {t("editor.toolbar.theme")}
            </span>
          </button>
          <Separator orientation="vertical" className="h-6 mx-1" />
          <button
            type="button"
            onClick={() => setSettingsDialogOpen(true)}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-zinc-600 hover:bg-zinc-50"
            title={t("editor.toolbar.settings")}
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Export Dialog */}
      <ExportDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        resumeId={resumeId}
      />

      {/* Settings Dialog */}
      <SettingsDialog
        open={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
      />

      {/* JD Analysis Dialog */}
      <JdAnalysisDialog
        open={jdAnalysisDialogOpen}
        onClose={() => setJdAnalysisDialogOpen(false)}
        resumeId={resumeId}
      />

      {/* Translate Dialog */}
      <TranslateDialog
        open={translateDialogOpen}
        onClose={() => setTranslateDialogOpen(false)}
        resumeId={resumeId}
      />

      {/* Cover Letter Dialog */}
      <CoverLetterDialog
        open={coverLetterDialogOpen}
        onClose={() => setCoverLetterDialogOpen(false)}
        resumeId={resumeId}
      />

      {/* Grammar Check Dialog */}
      <GrammarCheckDialog
        open={grammarCheckDialogOpen}
        onClose={() => setGrammarCheckDialogOpen(false)}
        resumeId={resumeId}
      />
    </>
  );
}
