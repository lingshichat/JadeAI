import { useMemo, useState } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ResumePreview } from "@/components/preview/resume-preview";
import type {
  Resume as SharedResume,
  SectionContent as SharedSectionContent,
} from "@/types/resume";
import { useResumeStore } from "../../stores/resume-store";
import { Button } from "@/components/ui/button";

const A4_WIDTH = 794;

export function EditorPreviewPanel() {
  const { t } = useTranslation();
  const { currentResume, sections } = useResumeStore();
  const [zoom, setZoom] = useState(80);

  const liveResume = useMemo<SharedResume | null>(() => {
    if (!currentResume) return null;

    return {
      id: currentResume.metadata.id,
      userId: "desktop-workspace",
      title: currentResume.metadata.title,
      template: currentResume.metadata.template,
      themeConfig: currentResume.theme,
      isDefault: currentResume.metadata.isDefault,
      language: currentResume.metadata.language,
      targetJobTitle: currentResume.metadata.targetJobTitle,
      targetCompany: currentResume.metadata.targetCompany,
      sections: sections.map((section) => ({
        id: section.id,
        resumeId: currentResume.metadata.id,
        type: section.sectionType,
        title: section.title,
        sortOrder: section.sortOrder,
        visible: section.visible,
        content: section.content as unknown as SharedSectionContent,
        createdAt: new Date(section.createdAtEpochMs),
        updatedAt: new Date(section.updatedAtEpochMs),
      })),
      createdAt: new Date(currentResume.metadata.createdAtEpochMs),
      updatedAt: new Date(currentResume.metadata.updatedAtEpochMs),
    };
  }, [currentResume, sections]);

  if (!liveResume) return null;

  const scale = zoom / 100;

  return (
    <div
      data-tour="preview"
      className="flex min-w-0 flex-[6] flex-col border-l bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800"
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b bg-white px-4 py-2 dark:bg-zinc-900 dark:border-zinc-800">
        <span className="text-xs font-medium text-zinc-500">
          {t("editor.toolbar.preview")}
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="w-7 text-zinc-400 hover:bg-zinc-50"
            onClick={() => setZoom((z) => Math.max(30, z - 10))}
            disabled={zoom <= 30}
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="w-10 text-center text-xs text-zinc-500">{zoom}%</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="w-7 text-zinc-400 hover:bg-zinc-50"
            onClick={() => setZoom((z) => Math.min(150, z + 10))}
            disabled={zoom >= 150}
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Preview body */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex min-h-full justify-center p-4">
          <div
            className="bg-white shadow-md"
            style={{
              width: A4_WIDTH,
              zoom: scale,
            }}
          >
            <ResumePreview resume={liveResume} />
          </div>
        </div>
      </div>
    </div>
  );
}
