import { create } from "zustand";
import { saveDocument } from "../lib/desktop-api";
import type { ThemeConfig } from "../types/resume";

const AUTOSAVE_DELAY = 500;

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

// Desktop-specific document type matching Tauri backend
export interface ResumeDocument {
  metadata: {
    id: string;
    title: string;
    template: string;
    language: string;
    targetJobTitle?: string | null;
    targetCompany?: string | null;
    isDefault: boolean;
    createdAtEpochMs: number;
    updatedAtEpochMs: number;
  };
  theme: ThemeConfig;
  sections: ResumeSectionWithContent[];
}

export interface ResumeSectionWithContent {
  id: string;
  documentId: string;
  sectionType: string;
  title: string;
  sortOrder: number;
  visible: boolean;
  content: Record<string, unknown>;
  createdAtEpochMs: number;
  updatedAtEpochMs: number;
}

interface ResumeStore {
  currentResume: ResumeDocument | null;
  sections: ResumeSectionWithContent[];
  isDirty: boolean;
  isSaving: boolean;
  _saveTimeout: ReturnType<typeof setTimeout> | null;

  loadResume: (document: ResumeDocument) => void;
  setResume: (resume: ResumeDocument, sections: ResumeSectionWithContent[]) => void;
  updateSection: (sectionId: string, content: Partial<Record<string, unknown>>) => void;
  updateSectionTitle: (sectionId: string, title: string) => void;
  addSection: (section: ResumeSectionWithContent) => void;
  removeSection: (sectionId: string) => void;
  reorderSections: (sections: ResumeSectionWithContent[]) => void;
  toggleSectionVisibility: (sectionId: string) => void;
  setTemplate: (template: string) => void;
  setTitle: (title: string) => void;
  updateTheme: (theme: Partial<ThemeConfig>) => void;
  save: () => Promise<void>;
  _scheduleSave: () => void;
  reset: () => void;
}

export const useResumeStore = create<ResumeStore>((set, get) => ({
  currentResume: null,
  sections: [],
  isDirty: false,
  isSaving: false,
  _saveTimeout: null,

  loadResume: (document) => {
    const { _saveTimeout } = get();
    if (_saveTimeout) clearTimeout(_saveTimeout);

    set({
      currentResume: document,
      sections: document.sections.map((s, i) => ({
        ...s,
        sortOrder: s.sortOrder ?? i,
        content:
          typeof s.content === "object" && s.content !== null
            ? (s.content as Record<string, unknown>)
            : {},
      })) as ResumeSectionWithContent[],
      isDirty: false,
      _saveTimeout: null,
    });
  },

  setResume: (resume, sections) => {
    const { _saveTimeout } = get();
    if (_saveTimeout) clearTimeout(_saveTimeout);

    set({
      currentResume: resume,
      sections,
      isDirty: false,
      _saveTimeout: null,
    });
  },

  updateSection: (sectionId, content) => {
    set((state) => {
      const sections = state.sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              content: {
                ...s.content,
                ...content,
              },
              updatedAtEpochMs: Date.now(),
            }
          : s
      );
      return {
        sections,
        currentResume: state.currentResume
          ? {
              ...state.currentResume,
              metadata: {
                ...state.currentResume.metadata,
                updatedAtEpochMs: Date.now(),
              },
            }
          : null,
        isDirty: true,
      };
    });
    get()._scheduleSave();
  },

  updateSectionTitle: (sectionId, title) => {
    set((state) => {
      const sections = state.sections.map((s) =>
        s.id === sectionId
          ? { ...s, title, updatedAtEpochMs: Date.now() }
          : s
      );
      return {
        sections,
        currentResume: state.currentResume
          ? {
              ...state.currentResume,
              metadata: {
                ...state.currentResume.metadata,
                updatedAtEpochMs: Date.now(),
              },
            }
          : null,
        isDirty: true,
      };
    });
    get()._scheduleSave();
  },

  addSection: (section) => {
    set((state) => {
      const sections = [...state.sections, section];
      return {
        sections,
        currentResume: state.currentResume
          ? {
              ...state.currentResume,
              metadata: {
                ...state.currentResume.metadata,
                updatedAtEpochMs: Date.now(),
              },
            }
          : null,
        isDirty: true,
      };
    });
    get()._scheduleSave();
  },

  removeSection: (sectionId) => {
    set((state) => {
      const sections = state.sections.filter((s) => s.id !== sectionId);
      return {
        sections,
        currentResume: state.currentResume
          ? {
              ...state.currentResume,
              metadata: {
                ...state.currentResume.metadata,
                updatedAtEpochMs: Date.now(),
              },
            }
          : null,
        isDirty: true,
      };
    });
    get()._scheduleSave();
  },

  reorderSections: (sections) => {
    set((state) => ({
      sections,
      currentResume: state.currentResume
        ? {
            ...state.currentResume,
            metadata: {
              ...state.currentResume.metadata,
              updatedAtEpochMs: Date.now(),
            },
          }
        : null,
      isDirty: true,
    }));
    get()._scheduleSave();
  },

  toggleSectionVisibility: (sectionId) => {
    set((state) => {
      const sections = state.sections.map((s) =>
        s.id === sectionId
          ? { ...s, visible: !s.visible, updatedAtEpochMs: Date.now() }
          : s
      );
      return {
        sections,
        currentResume: state.currentResume
          ? {
              ...state.currentResume,
              metadata: {
                ...state.currentResume.metadata,
                updatedAtEpochMs: Date.now(),
              },
            }
          : null,
        isDirty: true,
      };
    });
    get()._scheduleSave();
  },

  setTemplate: (template) => {
    set((state) => ({
      currentResume: state.currentResume
        ? {
            ...state.currentResume,
            metadata: {
              ...state.currentResume.metadata,
              template,
              updatedAtEpochMs: Date.now(),
            },
          }
        : null,
      isDirty: true,
    }));
    get()._scheduleSave();
  },

  setTitle: (title) => {
    set((state) => ({
      currentResume: state.currentResume
        ? {
            ...state.currentResume,
            metadata: {
              ...state.currentResume.metadata,
              title,
              updatedAtEpochMs: Date.now(),
            },
          }
        : null,
      isDirty: true,
    }));
    get()._scheduleSave();
  },

  updateTheme: (theme) => {
    set((state) => ({
      currentResume: state.currentResume
        ? {
            ...state.currentResume,
            theme: { ...state.currentResume.theme, ...theme },
            metadata: {
              ...state.currentResume.metadata,
              updatedAtEpochMs: Date.now(),
            },
          }
        : null,
      isDirty: true,
    }));
    get()._scheduleSave();
  },

  save: async () => {
    const { currentResume, sections, isDirty } = get();
    if (!currentResume || !isDirty) return;

    set({ isSaving: true });
    try {
      await saveDocument({
        id: currentResume.metadata.id,
        title: currentResume.metadata.title,
        template: currentResume.metadata.template,
        language: currentResume.metadata.language,
        themeJson: JSON.stringify(currentResume.theme),
        targetJobTitle: currentResume.metadata.targetJobTitle,
        targetCompany: currentResume.metadata.targetCompany,
        sections: sections.map((section) => ({
          id: section.id,
          documentId: section.documentId || currentResume.metadata.id,
          sectionType: section.sectionType,
          title: section.title,
          sortOrder: section.sortOrder,
          visible: section.visible,
          content: section.content,
          createdAtEpochMs: section.createdAtEpochMs,
          updatedAtEpochMs: section.updatedAtEpochMs,
        })),
      });

      set({ isDirty: false });
    } catch (error) {
      console.error("Failed to save resume:", error);
    } finally {
      set({ isSaving: false });
    }
  },

  _scheduleSave: () => {
    const { _saveTimeout } = get();
    if (_saveTimeout) clearTimeout(_saveTimeout);

    const timeout = setTimeout(() => {
      get().save();
    }, AUTOSAVE_DELAY);

    set({ _saveTimeout: timeout });
  },

  reset: () => {
    const { _saveTimeout } = get();
    if (_saveTimeout) clearTimeout(_saveTimeout);
    set({
      currentResume: null,
      sections: [],
      isDirty: false,
      isSaving: false,
      _saveTimeout: null,
    });
  },
}));

export { generateId };
