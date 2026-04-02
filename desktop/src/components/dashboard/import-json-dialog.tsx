import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import {
  importDocument,
  type DesktopDocumentDetail,
} from "../../lib/desktop-api";

interface ImportJsonDialogProps {
  open: boolean;
  onClose: () => void;
  onImport?: (document?: DesktopDocumentDetail | null) => void | Promise<void>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function ImportJsonDialog({ open, onClose, onImport }: ImportJsonDialogProps) {
  const { t } = useTranslation();

  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetAndClose = () => {
    setFile(null);
    setError("");
    setIsDragging(false);
    onClose();
  };

  const handleFileSelect = (selectedFile: File) => {
    setError("");
    if (selectedFile.type !== "application/json" && !selectedFile.name.endsWith(".json")) {
      setError(t("importInvalidFormat"));
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError(t("importFileTooLarge"));
      return;
    }
    setFile(selectedFile);
  };

  const handleImport = async () => {
    if (!file) return;

    setIsImporting(true);
    setError("");

    try {
      const text = await file.text();
      const data = JSON.parse(text) as unknown;

      if (!isRecord(data)) {
        throw new Error(t("importInvalidFormat"));
      }

      const metadata = isRecord(data.metadata) ? data.metadata : {};
      const rawSections = Array.isArray(data.sections) ? data.sections : null;
      if (!rawSections) {
        throw new Error(t("importInvalidFormat"));
      }

      const sections = rawSections.map((section, index) => {
        if (!isRecord(section)) {
          throw new Error(t("importInvalidFormat"));
        }

        return {
          sectionType: readString(section.sectionType) ?? readString(section.type) ?? "custom",
          title: readString(section.title) ?? "custom",
          sortOrder: typeof section.sortOrder === "number" ? section.sortOrder : index,
          visible: typeof section.visible === "boolean" ? section.visible : true,
          content: isRecord(section.content) ? section.content : {},
        };
      });

      const themeSource = isRecord(data.theme)
        ? data.theme
        : isRecord(data.themeConfig)
          ? data.themeConfig
          : null;

      const document = await importDocument({
        title: readString(data.title) ?? readString(metadata.title) ?? "Imported Resume",
        template: readString(data.template) ?? readString(metadata.template),
        language: readString(data.language) ?? readString(metadata.language),
        targetJobTitle:
          readString(data.targetJobTitle) ?? readString(metadata.targetJobTitle) ?? null,
        targetCompany:
          readString(data.targetCompany) ?? readString(metadata.targetCompany) ?? null,
        themeJson:
          readString(data.themeJson) ??
          (themeSource ? JSON.stringify(themeSource) : undefined),
        sections,
      });

      await onImport?.(document);
      resetAndClose();
    } catch (err: any) {
      setError(err.message || t("importError"));
    } finally {
      setIsImporting(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, []);

  if (!open) return null;

  return (
    <div className="dialog-backdrop" onClick={resetAndClose}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="dialog-header">
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-pink-500" />
            <h2 className="dialog-title">{t("importTitle")}</h2>
          </div>
          <button type="button" className="dialog-close" onClick={resetAndClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="dialog-body">
          <p className="text-sm text-zinc-500 mb-4">{t("importDescription")}</p>

          {/* Upload area */}
          <div
            className={`upload-area ${isDragging ? "upload-area--dragging" : ""} ${file ? "upload-area--has-file" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            />
            {file ? (
              <div className="upload-file-info">
                <FileText className="h-8 w-8 text-pink-500" />
                <span className="upload-file-name">{file.name}</span>
                <button
                  type="button"
                  className="upload-file-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setError("");
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="h-12 w-12 text-zinc-400" />
                <p className="upload-hint">{t("importSelectFile")}</p>
                <p className="upload-subhint">{t("importDragHint")}</p>
              </>
            )}
          </div>

          {error && <p className="form-error mt-3">{error}</p>}
        </div>

        {/* Footer */}
        <div className="dialog-footer">
          <Button variant="secondary" onClick={resetAndClose} disabled={isImporting}>
            {t("commonCancel")}
          </Button>
          <Button onClick={() => void handleImport()} disabled={!file || isImporting}>
            {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isImporting ? t("importImporting") : t("importImportBtn")}
          </Button>
        </div>
      </div>
    </div>
  );
}
