import { useState, useMemo, useEffect, useCallback } from "react";
import { createRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Plus, Search, LayoutGrid, List, Sparkles, Upload, Camera } from "lucide-react";
import { rootRoute } from "./root";
import { ResumeGrid } from "../components/resume-grid";
import { ResumeListItem } from "../components/resume-list-item";
import { Skeleton } from "../components/skeleton";
import { CreateResumeDialog } from "../components/dashboard/create-resume-dialog";
import { GenerateResumeDialog } from "../components/dashboard/generate-resume-dialog";
import { ImportJsonDialog } from "../components/dashboard/import-json-dialog";
import type { Resume } from "../types/resume";
import {
  listDocuments,
  deleteDocument,
  duplicateDocument,
  renameDocument,
  createDocument,
} from "../lib/desktop-api";
import { toResume } from "../lib/desktop-document-mappers";
import type { DesktopDocumentDetail } from "../lib/desktop-api";

type SortOption = "lastEdited" | "created" | "nameAsc" | "nameDesc";
type ViewMode = "grid" | "list";

const VIEW_PREF_KEY = "jade_dashboard_view";

function getInitialView(): ViewMode {
  if (typeof window === "undefined") return "grid";
  const stored = localStorage.getItem(VIEW_PREF_KEY);
  return stored === "list" ? "list" : "grid";
}

function sortResumes(resumes: Resume[], sort: SortOption): Resume[] {
  const sorted = [...resumes];
  switch (sort) {
    case "lastEdited":
      return sorted.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    case "created":
      return sorted.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    case "nameAsc":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "nameDesc":
      return sorted.sort((a, b) => b.title.localeCompare(a.title));
    default:
      return sorted;
  }
}

function DashboardRoute() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("lastEdited");
  const [viewMode, setViewMode] = useState<ViewMode>(() => getInitialView());

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const refreshResumes = useCallback(async () => {
    setIsLoading(true);
    try {
      const documents = await listDocuments();
      setResumes(documents.map(toResume));
    } catch (error) {
      console.error("Failed to load documents:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load resumes on mount
  useEffect(() => {
    void refreshResumes();
  }, [refreshResumes]);

  // Persist view preference
  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(VIEW_PREF_KEY, mode);
  };

  // Filter and sort resumes
  const filteredResumes = useMemo(() => {
    let result = resumes;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter((resume) => {
        const targetLabel = `${resume.targetJobTitle ?? ""} ${resume.targetCompany ?? ""}`;
        return `${resume.title} ${targetLabel}`.toLowerCase().includes(query);
      });
    }

    // Sort
    result = sortResumes(result, sortOption);

    return result;
  }, [resumes, searchQuery, sortOption]);

  const hasResumes = resumes.length > 0;
  const hasResults = filteredResumes.length > 0;

  // CRUD operations
  const handleDelete = async (id: string) => {
    try {
      const deleted = await deleteDocument(id);
      return deleted;
    } catch (error) {
      console.error("Failed to delete document:", error);
      return false;
    } finally {
      await refreshResumes();
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const document = await duplicateDocument(id);
      return toResume(document);
    } catch (error) {
      console.error("Failed to duplicate document:", error);
      return null;
    } finally {
      await refreshResumes();
    }
  };

  const handleRename = async (id: string, title: string) => {
    try {
      await renameDocument(id, title);
    } catch (error) {
      console.error("Failed to rename document:", error);
    } finally {
      await refreshResumes();
    }
    return true;
  };

  const handleCreateFromDialog = async (data: {
    title?: string;
    template?: string;
    language?: string;
  }) => {
    return createDocument({
      title: data.title,
      template: data.template,
      language: data.language,
    });
  };

  const handleImportSuccess = async (document?: DesktopDocumentDetail | null) => {
    await refreshResumes();
    if (document) {
      navigate({ to: "/editor/$id", params: { id: document.id } });
    }
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-foreground">
            {t("dashboardTitle")}
          </h1>
          {hasResumes && (
            <p className="mt-1 text-sm text-zinc-500">
              {t("dashboardResumeCount", { count: resumes.length })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="button button--secondary cursor-pointer gap-2"
            onClick={() => navigate({ to: "/dashboard" })}
          >
            <Camera className="h-4 w-4" />
            <span className="hidden sm:inline">{t("dashboardLinkedinPhoto")}</span>
          </button>
          <button
            type="button"
            className="button button--secondary cursor-pointer gap-2"
            onClick={() => setGenerateDialogOpen(true)}
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">{t("dashboardAiGenerate")}</span>
          </button>
          <button
            type="button"
            className="button button--secondary cursor-pointer gap-2"
            onClick={() => setImportDialogOpen(true)}
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">{t("dashboardImportJson")}</span>
          </button>
          <button
            type="button"
            className="button button--primary cursor-pointer gap-2"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t("dashboardCreateResume")}</span>
          </button>
        </div>
      </div>

      {/* Toolbar: Search + Sort + View toggle */}
      {hasResumes && (
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("dashboardSearchPlaceholder")}
              className="search-input pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Sort */}
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="select-input"
            >
              <option value="lastEdited">{t("dashboardSortLastEdited")}</option>
              <option value="created">{t("dashboardSortCreated")}</option>
              <option value="nameAsc">{t("dashboardSortNameAsc")}</option>
              <option value="nameDesc">{t("dashboardSortNameDesc")}</option>
            </select>

            {/* View toggle */}
            <div className="flex items-center rounded-md border border-zinc-200 dark:border-zinc-700">
              <button
                type="button"
                onClick={() => handleViewChange("grid")}
                className={`cursor-pointer rounded-l-md p-1.5 transition-colors ${
                  viewMode === "grid"
                    ? "bg-pink-500 text-white"
                    : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                }`}
                title={t("dashboardViewGrid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleViewChange("list")}
                className={`cursor-pointer rounded-r-md p-1.5 transition-colors ${
                  viewMode === "list"
                    ? "bg-pink-500 text-white"
                    : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                }`}
                title={t("dashboardViewList")}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : !hasResumes ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-700 py-16">
          <p className="text-zinc-500 dark:text-zinc-400">{t("dashboardNoResumes")}</p>
        </div>
      ) : !hasResults ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-700 py-16">
          <p className="text-zinc-500 dark:text-zinc-400">{t("dashboardNoSearchResults")}</p>
        </div>
      ) : viewMode === "grid" ? (
        <ResumeGrid
          resumes={filteredResumes}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          onRename={handleRename}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filteredResumes.map((resume) => (
            <ResumeListItem
              key={resume.id}
              resume={resume}
              onDelete={() => handleDelete(resume.id)}
              onDuplicate={() => handleDuplicate(resume.id)}
              onRename={(title) => handleRename(resume.id, title)}
            />
          ))}
        </div>
      )}

      {/* Create Resume Dialog */}
      <CreateResumeDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreate={handleCreateFromDialog}
        onCreated={(document) => {
          void refreshResumes();
          navigate({ to: "/editor/$id", params: { id: document.id } });
        }}
      />

      {/* Generate Resume Dialog */}
      <GenerateResumeDialog
        open={generateDialogOpen}
        onClose={() => setGenerateDialogOpen(false)}
      />

      {/* Import JSON Dialog */}
      <ImportJsonDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImport={handleImportSuccess}
      />
    </div>
  );
}

export const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: DashboardRoute,
});
