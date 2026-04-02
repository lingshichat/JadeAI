import { create } from 'zustand';

const MAX_UNDO_STACK = 50;

export interface ResumeSnapshot {
  sections: Array<{
    id: string;
    title: string;
    visible: boolean;
    sortOrder: number;
  }>;
  timestamp: number;
}

interface EditorStore {
  selectedSectionId: string | null;
  showThemeEditor: boolean;
  showAiChat: boolean;
  isDragging: boolean;
  undoStack: ResumeSnapshot[];
  redoStack: ResumeSnapshot[];

  selectSection: (id: string | null) => void;
  toggleThemeEditor: () => void;
  setDragging: (dragging: boolean) => void;
  pushUndo: (snapshot: ResumeSnapshot) => void;
  undo: () => ResumeSnapshot | null;
  redo: () => ResumeSnapshot | null;
  reset: () => void;
  toggleAiChat: () => void;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  selectedSectionId: null,
  showThemeEditor: false,
  showAiChat: false,
  isDragging: false,
  undoStack: [],
  redoStack: [],

  selectSection: (id) => set({ selectedSectionId: id }),

  toggleThemeEditor: () => set((state) => ({ showThemeEditor: !state.showThemeEditor })),

  toggleAiChat: () =>
    set((state) => ({ showAiChat: !state.showAiChat })),

  setDragging: (dragging) => set({ isDragging: dragging }),

  pushUndo: (snapshot) => {
    set((state) => ({
      undoStack: [...state.undoStack.slice(-MAX_UNDO_STACK + 1), snapshot],
      redoStack: [],
    }));
  },

  undo: () => {
    const { undoStack, redoStack } = get();
    if (undoStack.length === 0) return null;

    const current = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);

    // Push current state to redo stack
    set({
      undoStack: newUndoStack,
      redoStack: [...redoStack, current],
    });

    return newUndoStack.length > 0 ? newUndoStack[newUndoStack.length - 1] : null;
  },

  redo: () => {
    const { redoStack } = get();
    if (redoStack.length === 0) return null;

    const snapshot = redoStack[redoStack.length - 1];
    set((state) => ({
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [...state.undoStack, snapshot],
    }));

    return snapshot;
  },

  reset: () =>
    set({
      selectedSectionId: null,
      showThemeEditor: false,
      isDragging: false,
      undoStack: [],
      redoStack: [],
    }),
}));
