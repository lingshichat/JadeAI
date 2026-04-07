import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  BadgeHelp,
  CheckCircle2,
  ChevronRight,
  Loader2,
  MessageSquareText,
  Sparkles,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  generateInterviewReport,
  getInterviewSession,
  listenToAiStreamEvents,
  startInterviewTurnStream,
  updateInterviewMessageMetadata,
} from "../../lib/desktop-api";
import {
  getInterviewerColorClass,
  getInterviewerInitials,
  resolveInterviewLocale,
} from "../../lib/interviewers";
import type {
  InterviewMessage,
  InterviewSessionDetail,
  InterviewTurnKind,
} from "../../types/interview";

interface InterviewRoomProps {
  sessionId: string;
  initialSession: InterviewSessionDetail | null;
  runtimeIsFallback: boolean;
}

function createRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `interview-${crypto.randomUUID()}`;
  }

  return `interview-${Date.now()}`;
}

function cleanAssistantMessage(content: string): string {
  return content.replace(/\s*\[ROUND_COMPLETE\]\s*$/g, "").trim();
}

function formatTime(value: number, language: string): string {
  return new Intl.DateTimeFormat(language.startsWith("zh") ? "zh-CN" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function InterviewRoom({
  sessionId,
  initialSession,
  runtimeIsFallback,
}: InterviewRoomProps) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const locale = resolveInterviewLocale(i18n.language);
  const [session, setSession] = useState<InterviewSessionDetail | null>(initialSession);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [liveAssistantText, setLiveAssistantText] = useState("");
  const [pendingCandidateText, setPendingCandidateText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(!initialSession);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [autoStartedRoundId, setAutoStartedRoundId] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const next = await getInterviewSession(sessionId);
      setSession(next);
      setError(null);
      return next;
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : t("interview.room.loadError"),
      );
      return null;
    } finally {
      setIsRefreshing(false);
    }
  }, [sessionId, t]);

  useEffect(() => {
    setSession(initialSession);
  }, [initialSession]);

  useEffect(() => {
    if (!initialSession) {
      void refreshSession();
    }
  }, [initialSession, refreshSession]);

  const currentRoundIndex = useMemo(() => {
    if (!session || session.rounds.length === 0) {
      return 0;
    }

    return Math.min(
      Math.max(session.currentRound, 0),
      Math.max(session.rounds.length - 1, 0),
    );
  }, [session]);

  const currentRound = session?.rounds[currentRoundIndex] ?? null;
  const lastCandidateMessage = useMemo(() => {
    return currentRound?.messages
      .slice()
      .reverse()
      .find((message) => message.role === "candidate") ?? null;
  }, [currentRound]);

  const displayMessages = useMemo(() => {
    const baseMessages = currentRound?.messages ?? [];
    const items: Array<InterviewMessage & { pending?: boolean; key: string }> =
      baseMessages.map((message) => ({ ...message, key: message.id }));

    if (pendingCandidateText.trim().length > 0) {
      items.push({
        id: "pending-candidate",
        key: "pending-candidate",
        roundId: currentRound?.id ?? "pending-round",
        role: "candidate",
        content: pendingCandidateText,
        metadata: {},
        createdAtEpochMs: Date.now(),
        pending: true,
      });
    }

    if (liveAssistantText.trim().length > 0) {
      items.push({
        id: "pending-interviewer",
        key: "pending-interviewer",
        roundId: currentRound?.id ?? "pending-round",
        role: "interviewer",
        content: cleanAssistantMessage(liveAssistantText),
        metadata: {},
        createdAtEpochMs: Date.now(),
        pending: true,
      });
    }

    return items;
  }, [currentRound, liveAssistantText, pendingCandidateText]);

  const ensureReportAndNavigate = useCallback(async () => {
    setIsGeneratingReport(true);
    try {
      await generateInterviewReport({
        sessionId,
        locale,
      });
      void navigate({
        to: "/interview/$sessionId/report",
        params: { sessionId },
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : t("interview.report.generateError"),
      );
    } finally {
      setIsGeneratingReport(false);
    }
  }, [locale, navigate, sessionId, t]);

  const runTurn = useCallback(
    async (kind: InterviewTurnKind, prompt?: string) => {
      if (!currentRound || runtimeIsFallback) {
        return;
      }

      const requestId = createRequestId();
      setIsStreaming(true);
      setError(null);
      setLiveAssistantText("");
      setPendingCandidateText(kind === "answer" ? prompt ?? "" : "");

      try {
        await new Promise<string>((resolve, reject) => {
          let settled = false;
          let unlisten: (() => void) | null = null;

          const cleanup = () => {
            if (unlisten) {
              unlisten();
              unlisten = null;
            }
          };

          const settleResolve = (value: string) => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve(value);
          };

          const settleReject = (reason: unknown) => {
            if (settled) return;
            settled = true;
            cleanup();
            reject(reason instanceof Error ? reason : new Error(String(reason)));
          };

          void (async () => {
            try {
              unlisten = await listenToAiStreamEvents((event) => {
                if (event.requestId !== requestId) {
                  return;
                }

                if (typeof event.accumulatedText === "string") {
                  setLiveAssistantText(event.accumulatedText);
                } else if (event.kind === "delta" && event.deltaText) {
                  setLiveAssistantText((current) => current + event.deltaText);
                }

                if (event.kind === "completed") {
                  settleResolve(event.accumulatedText ?? "");
                  return;
                }

                if (event.kind === "error") {
                  settleReject(new Error(event.errorMessage || t("interview.room.streamError")));
                }
              });

              await startInterviewTurnStream({
                sessionId,
                roundId: currentRound.id,
                kind,
                locale,
                prompt,
                requestId,
              });
            } catch (caughtError) {
              settleReject(caughtError);
            }
          })();
        });

        setInput("");
        setPendingCandidateText("");
        setLiveAssistantText("");

        const next = await refreshSession();
        if (next?.status === "completed") {
          await ensureReportAndNavigate();
        }
      } catch (caughtError) {
        setPendingCandidateText("");
        setLiveAssistantText("");
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : t("interview.room.streamError"),
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [currentRound, ensureReportAndNavigate, locale, refreshSession, runtimeIsFallback, sessionId, t],
  );

  useEffect(() => {
    if (
      !session ||
      !currentRound ||
      runtimeIsFallback ||
      isStreaming ||
      isGeneratingReport ||
      session.status === "completed"
    ) {
      return;
    }

    const hasInterviewerMessage = currentRound.messages.some(
      (message) => message.role === "interviewer",
    );
    if (hasInterviewerMessage || autoStartedRoundId === currentRound.id) {
      return;
    }

    setAutoStartedRoundId(currentRound.id);
    void runTurn("start");
  }, [
    autoStartedRoundId,
    currentRound,
    isGeneratingReport,
    isStreaming,
    runTurn,
    runtimeIsFallback,
    session,
  ]);

  const handleSend = async () => {
    const nextInput = input.trim();
    if (nextInput.length === 0 || isStreaming) {
      return;
    }

    await runTurn("answer", nextInput);
  };

  const handleMarkLastAnswer = async () => {
    if (!lastCandidateMessage) {
      return;
    }

    try {
      await updateInterviewMessageMetadata({
        messageId: lastCandidateMessage.id,
        marked: !lastCandidateMessage.metadata.marked,
      });
      await refreshSession();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : t("interview.room.markError"),
      );
    }
  };

  if (runtimeIsFallback) {
    return (
      <Card className="rounded-3xl border-amber-200 bg-amber-50 shadow-none dark:border-amber-900 dark:bg-amber-950/40">
        <CardHeader>
          <CardTitle>{t("interview.fallback.title")}</CardTitle>
          <CardDescription>{t("interview.fallback.body")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isRefreshing && !session) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="inline-flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("interview.room.loading")}
        </div>
      </div>
    );
  }

  if (!session || !currentRound) {
    return (
      <Card className="rounded-3xl border-zinc-200/80 dark:border-zinc-800">
        <CardHeader>
          <CardTitle>{t("interview.room.notFoundTitle")}</CardTitle>
          <CardDescription>{t("interview.room.notFoundBody")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to="/interview">{t("interview.actions.backToLobby")}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <Card className="rounded-3xl border-zinc-200/80 shadow-sm dark:border-zinc-800">
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="rounded-full">
                    {t("interview.room.roundTitle", {
                      current: currentRoundIndex + 1,
                      total: session.rounds.length,
                    })}
                  </Badge>
                  <Badge variant="secondary" className="rounded-full">
                    {t("interview.room.questionProgress", {
                      current: currentRound.questionCount,
                      total: currentRound.maxQuestions,
                    })}
                  </Badge>
                </div>
                <div>
                  <CardTitle className="text-2xl text-zinc-950 dark:text-zinc-50">
                    {currentRound.interviewerConfig.name}
                  </CardTitle>
                  <CardDescription className="mt-1 text-sm">
                    {currentRound.interviewerConfig.title}
                  </CardDescription>
                </div>
              </div>

              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${getInterviewerColorClass(
                  currentRound.interviewerType,
                )}`}
              >
                <div className="font-medium">
                  {t("interview.room.focusAreas")}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {currentRound.interviewerConfig.focusAreas.map((focusArea) => (
                    <span
                      key={focusArea}
                      className="rounded-full bg-white/70 px-2 py-1 text-xs dark:bg-zinc-950/40"
                    >
                      {focusArea}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="rounded-3xl border-zinc-200/80 shadow-sm dark:border-zinc-800">
          <CardContent className="px-0 py-0">
            <ScrollArea className="h-[520px] px-6 py-6">
              <div className="space-y-4">
                {displayMessages.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-zinc-300 px-6 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                    {t("interview.room.waiting")}
                  </div>
                ) : null}

                {displayMessages.map((message) => {
                  const isCandidate = message.role === "candidate";
                  const isSystem = message.role === "system";
                  const alignment = isCandidate ? "items-end" : "items-start";
                  const bubbleClass = isSystem
                    ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
                    : isCandidate
                      ? "border-pink-200 bg-pink-50 text-zinc-900 dark:border-pink-900 dark:bg-pink-950/30 dark:text-zinc-50"
                      : "border-zinc-200 bg-white text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50";

                  return (
                    <div key={message.key} className={`flex flex-col gap-2 ${alignment}`}>
                      <div className="flex max-w-[85%] gap-3">
                        {!isCandidate ? (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
                            {getInterviewerInitials(currentRound.interviewerConfig)}
                          </div>
                        ) : null}
                        <div className={`rounded-2xl border px-4 py-3 text-sm leading-7 ${bubbleClass}`}>
                          <div className="mb-2 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                            <span>
                              {isCandidate
                                ? t("interview.room.candidate")
                                : isSystem
                                  ? t("interview.room.system")
                                  : currentRound.interviewerConfig.name}
                            </span>
                            <span>{formatTime(message.createdAtEpochMs, i18n.language)}</span>
                            {message.metadata.marked ? (
                              <Badge variant="outline" className="rounded-full border-pink-300 text-pink-700 dark:border-pink-900 dark:text-pink-200">
                                {t("interview.room.marked")}
                              </Badge>
                            ) : null}
                            {message.pending ? (
                              <Badge variant="outline" className="rounded-full">
                                {t("interview.room.streaming")}
                              </Badge>
                            ) : null}
                          </div>
                          <p className="whitespace-pre-wrap">{cleanAssistantMessage(message.content)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-zinc-200/80 shadow-sm dark:border-zinc-800">
          <CardContent className="space-y-4 pt-6">
            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
                {error}
              </div>
            ) : null}

            {isGeneratingReport ? (
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300">
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("interview.report.generating")}
                </span>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => void runTurn("hint")}
                disabled={isStreaming || isGeneratingReport}
              >
                <BadgeHelp className="h-4 w-4" />
                {t("interview.room.hint")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void runTurn("skip")}
                disabled={isStreaming || isGeneratingReport}
              >
                <ChevronRight className="h-4 w-4" />
                {t("interview.room.skip")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleMarkLastAnswer}
                disabled={!lastCandidateMessage || isStreaming || isGeneratingReport}
              >
                <Target className="h-4 w-4" />
                {t("interview.room.mark")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void runTurn("end_round")}
                disabled={isStreaming || isGeneratingReport}
              >
                <CheckCircle2 className="h-4 w-4" />
                {t("interview.room.endRound")}
              </Button>
            </div>

            <div className="space-y-3">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={t("interview.room.inputPlaceholder")}
                className="min-h-24"
                disabled={isStreaming || isGeneratingReport}
              />
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {t("interview.room.autosaveHint")}
                </span>
                <Button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={isStreaming || isGeneratingReport || input.trim().length === 0}
                >
                  {isStreaming ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("interview.room.streaming")}
                    </>
                  ) : (
                    <>
                      <MessageSquareText className="h-4 w-4" />
                      {t("interview.room.send")}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="rounded-3xl border-zinc-200/80 shadow-sm dark:border-zinc-800">
          <CardHeader>
            <CardTitle>{t("interview.room.sidebarTitle")}</CardTitle>
            <CardDescription>{session.jobTitle}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm dark:bg-zinc-900/70">
              <div className="font-medium text-zinc-900 dark:text-zinc-100">
                {t("interview.room.jdLabel")}
              </div>
              <p className="mt-2 line-clamp-6 leading-6 text-zinc-600 dark:text-zinc-300">
                {session.jobDescription}
              </p>
            </div>

            {session.resumeTitle ? (
              <div className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm dark:bg-zinc-900/70">
                <div className="font-medium text-zinc-900 dark:text-zinc-100">
                  {t("interview.room.resumeLabel")}
                </div>
                <p className="mt-2 text-zinc-600 dark:text-zinc-300">
                  {session.resumeTitle}
                </p>
              </div>
            ) : null}

            <div className="space-y-3">
              <div className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                {t("interview.room.roundsLabel")}
              </div>
              <div className="space-y-2">
                {session.rounds.map((round, index) => (
                  <div
                    key={round.id}
                    className={`rounded-2xl border px-4 py-3 ${
                      index === currentRoundIndex
                        ? "border-pink-200 bg-pink-50 dark:border-pink-900 dark:bg-pink-950/20"
                        : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
                          {index + 1}. {round.interviewerConfig.name}
                        </div>
                        <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          {round.interviewerConfig.title}
                        </div>
                      </div>
                      <Badge variant={index === currentRoundIndex ? "default" : "outline"}>
                        {round.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-zinc-200/80 shadow-sm dark:border-zinc-800">
          <CardHeader>
            <CardTitle>{t("interview.actions.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild variant="outline" className="w-full justify-start rounded-2xl">
              <Link to="/interview">
                <AlertCircle className="h-4 w-4" />
                {t("interview.actions.backToLobby")}
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start rounded-2xl"
              onClick={() => void ensureReportAndNavigate()}
              disabled={
                isGeneratingReport || isStreaming || session.status !== "completed"
              }
            >
              <Sparkles className="h-4 w-4" />
              {t("interview.actions.generateReport")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
