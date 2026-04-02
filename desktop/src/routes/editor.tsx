import { useEffect } from "react";
import { createRoute, useParams } from "@tanstack/react-router";
import { rootRoute } from "./root";
import { EditorSidebar } from "../components/editor/editor-sidebar";
import { EditorCanvas } from "../components/editor/editor-canvas";
import { EditorPreviewPanel } from "../components/editor/editor-preview-panel";
import { EditorToolbar } from "../components/editor/editor-toolbar";
import { ThemeEditor } from "../components/editor/theme-editor";
import { AIChatBubble } from "../components/ai/ai-chat-bubble";
import { useEditorStore } from "../stores/editor-store";
import {
  useResumeStore,
  generateId,
  type ResumeDocument,
} from "../stores/resume-store";
import { Skeleton } from "@/components/ui/skeleton";
import { getDocument, getTemplateValidationSnapshot } from "../lib/desktop-api";
import { toResumeDocument } from "../lib/desktop-document-mappers";

function createFallbackDocument(): ResumeDocument {
  return {
    metadata: {
      id: generateId(),
      title: "New Resume",
      template: "classic",
      language: "en",
      isDefault: true,
      createdAtEpochMs: Date.now(),
      updatedAtEpochMs: Date.now(),
    },
    theme: {
      primaryColor: "#1a1a1a",
      accentColor: "#3b82f6",
      fontFamily: "Inter",
      fontSize: "medium",
      lineSpacing: 1.5,
      margin: { top: 24, right: 24, bottom: 24, left: 24 },
      sectionSpacing: 16,
      avatarStyle: "circle",
    },
    sections: [
      {
        id: generateId(),
        documentId: "",
        sectionType: "personal_info",
        title: "Personal Info",
        sortOrder: 0,
        visible: true,
        content: {
          fullName: "",
          jobTitle: "",
          email: "",
          phone: "",
          location: "",
        },
        createdAtEpochMs: Date.now(),
        updatedAtEpochMs: Date.now(),
      },
    ],
  };
}

function EditorRoute() {
  const { id } = useParams({ from: "/editor/$id" });
  const { showThemeEditor } = useEditorStore();
  const {
    currentResume,
    sections,
    loadResume,
    updateSection,
    addSection,
    removeSection,
    reorderSections,
    reset,
  } = useResumeStore();

  // Load the requested document from native storage, with validation snapshot as a fallback.
  useEffect(() => {
    let isCancelled = false;

    const loadEditorDocument = async () => {
      try {
        const nativeDocument = await getDocument(id);
        if (nativeDocument) {
          if (!isCancelled) {
            loadResume(toResumeDocument(nativeDocument));
          }
          return;
        }
      } catch {
        // Fall through to template validation fallback.
      }

      try {
        const snapshot = await getTemplateValidationSnapshot();
        if (snapshot.documents.length > 0) {
          const doc = snapshot.documents[0];
          if (!isCancelled) {
            loadResume({
              metadata: {
                id: doc.metadata.id,
                title: doc.metadata.title,
                template: doc.metadata.template,
                language: doc.metadata.language,
                targetJobTitle: doc.metadata.targetJobTitle,
                targetCompany: doc.metadata.targetCompany,
                isDefault: doc.metadata.isDefault,
                createdAtEpochMs: doc.metadata.createdAtEpochMs,
                updatedAtEpochMs: doc.metadata.updatedAtEpochMs,
              },
              theme: {
                primaryColor: doc.theme.primaryColor || "#1a1a1a",
                accentColor: doc.theme.accentColor || "#3b82f6",
                fontFamily: doc.theme.fontFamily || "Inter",
                fontSize: doc.theme.fontSize || "medium",
                lineSpacing: doc.theme.lineSpacing || 1.5,
                margin: {
                  top: doc.theme.margin?.top ?? 24,
                  right: doc.theme.margin?.right ?? 24,
                  bottom: doc.theme.margin?.bottom ?? 24,
                  left: doc.theme.margin?.left ?? 24,
                },
                sectionSpacing: doc.theme.sectionSpacing || 16,
                avatarStyle: (doc.theme.avatarStyle as "circle" | "oneInch") || "circle",
              },
              sections: doc.sections.map((s, i) => ({
                id: s.id,
                documentId: s.documentId,
                sectionType: s.sectionType,
                title: s.title,
                sortOrder: s.sortOrder ?? i,
                visible: s.visible,
                content: s.content,
                createdAtEpochMs: s.createdAtEpochMs,
                updatedAtEpochMs: s.updatedAtEpochMs,
              })),
            });
            return;
          }
        }
      } catch {
        // Fall through to the local fallback document.
      }

      if (!isCancelled) {
        loadResume(createFallbackDocument());
      }
    };

    void loadEditorDocument();

    return () => {
      isCancelled = true;
    };
  }, [id, loadResume]);

  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  // Loading state
  if (!currentResume) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-64 space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <EditorToolbar />
      <div className="flex flex-1 overflow-hidden">
        <EditorSidebar
          sections={sections}
          onAddSection={addSection}
          onReorderSections={reorderSections}
        />
        <EditorCanvas
          sections={sections}
          onUpdateSection={updateSection}
          onRemoveSection={removeSection}
          onReorderSections={reorderSections}
        />
        {showThemeEditor && <ThemeEditor />}
        <EditorPreviewPanel />
      </div>

      {/* AI Chat Bubble */}
      <AIChatBubble resumeId={currentResume?.metadata?.id || ""} />
    </div>
  );
}

export const editorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/editor/$id",
  component: EditorRoute,
});
