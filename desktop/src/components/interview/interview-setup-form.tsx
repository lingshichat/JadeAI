import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, BriefcaseBusiness, FileText, Loader2, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createInterviewSession, type DesktopDocumentListItem } from "../../lib/desktop-api";
import {
  getInterviewerColorClass,
  getPresetInterviewers,
} from "../../lib/interviewers";
import type { InterviewerConfig } from "../../types/interview";

interface InterviewSetupFormProps {
  resumes: DesktopDocumentListItem[];
  language: string;
  runtimeIsFallback: boolean;
}

function deriveJobTitle(title: string, jobDescription: string): string {
  const normalizedTitle = title.trim();
  if (normalizedTitle.length > 0) {
    return normalizedTitle;
  }

  const firstLine = jobDescription
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  return firstLine?.slice(0, 80) || "Interview Session";
}

export function InterviewSetupForm({
  resumes,
  language,
  runtimeIsFallback,
}: InterviewSetupFormProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const presetInterviewers = useMemo(
    () => getPresetInterviewers(language),
    [language],
  );
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [selectedResumeId, setSelectedResumeId] = useState<string>("none");
  const [selectedInterviewers, setSelectedInterviewers] = useState<InterviewerConfig[]>([
    presetInterviewers[0],
    presetInterviewers[1],
  ].filter(Boolean));
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const selectedIds = new Set(selectedInterviewers.map((item) => item.type));
  const canCreate =
    !runtimeIsFallback &&
    jobDescription.trim().length > 0 &&
    selectedInterviewers.length > 0 &&
    !isCreating;

  const toggleInterviewer = (interviewer: InterviewerConfig) => {
    setSelectedInterviewers((current) => {
      if (current.some((item) => item.type === interviewer.type)) {
        return current.filter((item) => item.type !== interviewer.type);
      }

      return [...current, interviewer];
    });
  };

  const moveInterviewer = (index: number, direction: -1 | 1) => {
    setSelectedInterviewers((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const copy = [...current];
      const [item] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, item);
      return copy;
    });
  };

  const handleCreate = async () => {
    if (!canCreate) {
      return;
    }

    setIsCreating(true);
    setError(null);
    try {
      const detail = await createInterviewSession({
        jobTitle: deriveJobTitle(jobTitle, jobDescription),
        jobDescription: jobDescription.trim(),
        resumeId: selectedResumeId === "none" ? null : selectedResumeId,
        interviewers: selectedInterviewers,
      });

      void navigate({
        to: "/interview/$sessionId",
        params: { sessionId: detail.id },
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : t("interview.setup.createError"),
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_360px]">
      <Card className="rounded-3xl border-zinc-200/80 shadow-sm dark:border-zinc-800">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">{t("interview.setup.title")}</CardTitle>
          <CardDescription className="text-sm leading-6">
            {t("interview.setup.subtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
              {t("interview.setup.jobTitleLabel")}
            </label>
            <Input
              value={jobTitle}
              onChange={(event) => setJobTitle(event.target.value)}
              placeholder={t("interview.setup.jobTitlePlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
              {t("interview.setup.jdLabel")}
            </label>
            <Textarea
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              placeholder={t("interview.setup.jdPlaceholder")}
              className="min-h-52"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t("interview.setup.jdHint")}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
              {t("interview.setup.resumeLabel")}
            </label>
            <Select value={selectedResumeId} onValueChange={setSelectedResumeId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("interview.setup.resumePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("interview.setup.resumeOptional")}</SelectItem>
                {resumes.map((resume) => (
                  <SelectItem key={resume.id} value={resume.id}>
                    {resume.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                {t("interview.setup.rolesLabel")}
              </h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {t("interview.setup.rolesHint")}
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {presetInterviewers.map((interviewer) => {
                const selected = selectedIds.has(interviewer.type);

                return (
                  <button
                    key={interviewer.type}
                    type="button"
                    onClick={() => toggleInterviewer(interviewer)}
                    className={`rounded-2xl border p-4 text-left transition-colors ${
                      selected
                        ? `${getInterviewerColorClass(interviewer.type)} shadow-sm`
                        : "border-zinc-200 bg-white hover:border-pink-200 hover:bg-pink-50/50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-pink-900 dark:hover:bg-pink-950/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                          {interviewer.name}
                        </div>
                        <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          {interviewer.title}
                        </div>
                      </div>
                      <span className="inline-flex rounded-full border px-2 py-1 text-[11px] font-medium">
                        {selected ? t("interview.setup.selected") : t("interview.setup.add")}
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                      {interviewer.style}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="sticky top-24 h-fit rounded-3xl border-zinc-200/80 shadow-sm dark:border-zinc-800">
        <CardHeader className="space-y-2">
          <CardTitle>{t("interview.setup.selectionTitle")}</CardTitle>
          <CardDescription>{t("interview.setup.selectionSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-2xl bg-zinc-50 px-4 py-3 dark:bg-zinc-900/70">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
              <BriefcaseBusiness className="h-4 w-4 text-pink-500" />
              {deriveJobTitle(jobTitle, jobDescription)}
            </div>
            <p className="mt-2 text-xs leading-6 text-zinc-500 dark:text-zinc-400">
              {jobDescription.trim().length > 0
                ? `${jobDescription.trim().slice(0, 120)}${jobDescription.trim().length > 120 ? "..." : ""}`
                : t("interview.setup.jdPending")}
            </p>
          </div>

          <div className="rounded-2xl bg-zinc-50 px-4 py-3 dark:bg-zinc-900/70">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
              <FileText className="h-4 w-4 text-pink-500" />
              {selectedResumeId === "none"
                ? t("interview.setup.resumeOptional")
                : resumes.find((resume) => resume.id === selectedResumeId)?.title ??
                  t("interview.setup.resumeOptional")}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                {t("interview.setup.orderLabel")}
              </h3>
              <Badge variant="outline" className="rounded-full">
                {selectedInterviewers.length}
              </Badge>
            </div>

            {selectedInterviewers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 px-4 py-6 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                {t("interview.setup.rolesEmpty")}
              </div>
            ) : (
              <div className="space-y-3">
                {selectedInterviewers.map((interviewer, index) => (
                  <div
                    key={`selected-${interviewer.type}`}
                    className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                          {index + 1}. {interviewer.name}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          {interviewer.title}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => moveInterviewer(index, -1)}
                          disabled={index === 0}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => moveInterviewer(index, 1)}
                          disabled={index === selectedInterviewers.length - 1}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => toggleInterviewer(interviewer)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
              {error}
            </div>
          ) : null}

          {runtimeIsFallback ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              {t("interview.fallback.body")}
            </div>
          ) : null}

          <Button
            type="button"
            onClick={handleCreate}
            disabled={!canCreate}
            className="w-full rounded-2xl"
            size="lg"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("interview.setup.creating")}
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                {t("interview.setup.start")}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
