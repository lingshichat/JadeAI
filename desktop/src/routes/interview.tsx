import { Link, createRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InterviewSessionCard } from "../components/interview/interview-session-card";
import { loadInterviewLobbyRouteData } from "../lib/desktop-loaders";
import { isBrowserFallbackRuntime } from "../lib/desktop-api";
import { rootRoute } from "./root";

function InterviewLobbyRoute() {
  const { t, i18n } = useTranslation();
  const context = rootRoute.useLoaderData();
  const { sessions } = interviewRoute.useLoaderData();
  const runtimeIsFallback = isBrowserFallbackRuntime(context);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {t("interview.lobby.title")}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            {t("interview.lobby.subtitle")}
          </p>
        </div>

        <Button asChild className="rounded-full" size="lg" disabled={runtimeIsFallback}>
          <Link to="/interview/new">
            <Plus className="h-4 w-4" />
            {t("interview.lobby.newSession")}
          </Link>
        </Button>
      </div>

      {runtimeIsFallback ? (
        <Card className="rounded-3xl border-amber-200 bg-amber-50 shadow-none dark:border-amber-900 dark:bg-amber-950/40">
          <CardHeader>
            <CardTitle>{t("interview.fallback.title")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-amber-700 dark:text-amber-200">
            {t("interview.fallback.body")}
          </CardContent>
        </Card>
      ) : null}

      {sessions.length === 0 ? (
        <Card className="rounded-3xl border-dashed border-zinc-300 shadow-none dark:border-zinc-700">
          <CardContent className="flex min-h-[280px] flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-pink-50 text-pink-500 dark:bg-pink-950/20">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
                {t("interview.lobby.emptyTitle")}
              </h2>
              <p className="max-w-lg text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                {t("interview.lobby.emptyBody")}
              </p>
            </div>
            <Button asChild className="rounded-full" disabled={runtimeIsFallback}>
              <Link to="/interview/new">
                <Plus className="h-4 w-4" />
                {t("interview.lobby.newSession")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {sessions.map((session) => (
            <InterviewSessionCard
              key={session.id}
              session={session}
              locale={i18n.language}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export const interviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/interview",
  loader: loadInterviewLobbyRouteData,
  component: InterviewLobbyRoute,
});
