import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2, Sparkles, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { generateInterviewReport, getInterviewReport } from "../../lib/desktop-api";
import { resolveInterviewLocale } from "../../lib/interviewers";
import type { InterviewReport, InterviewSessionDetail } from "../../types/interview";

interface InterviewReportSummaryProps {
  sessionId: string;
  initialSession: InterviewSessionDetail | null;
  initialReport: InterviewReport | null;
  runtimeIsFallback: boolean;
}

export function InterviewReportSummary({
  sessionId,
  initialSession,
  initialReport,
  runtimeIsFallback,
}: InterviewReportSummaryProps) {
  const { t, i18n } = useTranslation();
  const locale = resolveInterviewLocale(i18n.language);
  const [session] = useState(initialSession);
  const [report, setReport] = useState(initialReport);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (runtimeIsFallback || report || !session || session.status !== "completed") {
      return;
    }

    let isCancelled = false;

    const ensureReport = async () => {
      setIsGenerating(true);
      try {
        const generated = await generateInterviewReport({
          sessionId,
          locale,
        });
        if (!isCancelled) {
          setReport(generated);
        }
      } catch (caughtError) {
        if (!isCancelled) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : t("interview.report.generateError"),
          );
        }
      } finally {
        if (!isCancelled) {
          setIsGenerating(false);
        }
      }
    };

    void ensureReport();

    return () => {
      isCancelled = true;
    };
  }, [locale, report, runtimeIsFallback, session, sessionId, t]);

  const refreshReport = async () => {
    setIsGenerating(true);
    try {
      const next = await getInterviewReport(sessionId);
      if (next) {
        setReport(next);
        setError(null);
        return;
      }

      const generated = await generateInterviewReport({
        sessionId,
        locale,
      });
      setReport(generated);
      setError(null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : t("interview.report.generateError"),
      );
    } finally {
      setIsGenerating(false);
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

  if (!session) {
    return (
      <Card className="rounded-3xl border-zinc-200/80 dark:border-zinc-800">
        <CardHeader>
          <CardTitle>{t("interview.report.notFoundTitle")}</CardTitle>
          <CardDescription>{t("interview.report.notFoundBody")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/interview">
            <ArrowLeft className="h-4 w-4" />
            {t("interview.actions.backToLobby")}
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={() => void refreshReport()}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("interview.report.generating")}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {t("interview.actions.generateReport")}
              </>
            )}
          </Button>
          <Button asChild className="rounded-full">
            <Link to="/interview/$sessionId" params={{ sessionId }}>
              {t("interview.report.reviewTranscript")}
            </Link>
          </Button>
        </div>
      </div>

      <Card className="rounded-3xl border-zinc-200/80 shadow-sm dark:border-zinc-800">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <CardTitle className="text-2xl">{session.jobTitle}</CardTitle>
              <CardDescription>{t("interview.report.subtitle")}</CardDescription>
            </div>
            {report ? (
              <div className="rounded-2xl bg-pink-50 px-5 py-4 text-right dark:bg-pink-950/20">
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  {t("interview.report.score")}
                </div>
                <div className="mt-1 inline-flex items-center gap-2 text-3xl font-semibold text-zinc-950 dark:text-zinc-50">
                  <Trophy className="h-6 w-6 text-pink-500" />
                  {report.overallScore}
                </div>
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {session.selectedInterviewers.map((interviewer) => (
              <Badge key={`${session.id}-${interviewer.type}`} variant="outline" className="rounded-full">
                {interviewer.name}
              </Badge>
            ))}
            {session.resumeTitle ? (
              <Badge variant="secondary" className="rounded-full">
                {session.resumeTitle}
              </Badge>
            ) : null}
          </div>
        </CardHeader>
      </Card>

      {error ? (
        <Card className="rounded-3xl border-rose-200 bg-rose-50 shadow-none dark:border-rose-900 dark:bg-rose-950/40">
          <CardContent className="pt-6 text-sm text-rose-700 dark:text-rose-200">
            {error}
          </CardContent>
        </Card>
      ) : null}

      {!report ? (
        <Card className="rounded-3xl border-zinc-200/80 dark:border-zinc-800">
          <CardContent className="flex min-h-[220px] items-center justify-center pt-6">
            <div className="inline-flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("interview.report.generating")}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <Card className="rounded-3xl border-zinc-200/80 shadow-sm dark:border-zinc-800">
              <CardHeader>
                <CardTitle>{t("interview.report.summaryTitle")}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-7 text-zinc-700 dark:text-zinc-300">
                {report.summary}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-zinc-200/80 shadow-sm dark:border-zinc-800">
              <CardHeader>
                <CardTitle>{t("interview.report.feedbackTitle")}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-7 text-zinc-700 dark:text-zinc-300">
                <p className="whitespace-pre-wrap">{report.overallFeedback}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-3xl border-zinc-200/80 shadow-sm dark:border-zinc-800">
            <CardHeader>
              <CardTitle>{t("interview.report.improvementsTitle")}</CardTitle>
              <CardDescription>{t("interview.report.improvementsHint")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {report.improvementSuggestions.map((item, index) => (
                <div
                  key={`${report.id}-improvement-${index}`}
                  className="rounded-2xl bg-zinc-50 px-4 py-4 text-sm leading-7 text-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-300"
                >
                  <div className="font-medium text-zinc-950 dark:text-zinc-50">
                    {index + 1}. {item}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
