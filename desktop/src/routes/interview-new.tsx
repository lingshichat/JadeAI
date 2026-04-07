import { createRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { InterviewSetupForm } from "../components/interview/interview-setup-form";
import { loadInterviewSetupRouteData } from "../lib/desktop-loaders";
import { isBrowserFallbackRuntime } from "../lib/desktop-api";
import { rootRoute } from "./root";

function InterviewNewRoute() {
  const { t, i18n } = useTranslation();
  const context = rootRoute.useLoaderData();
  const { resumes } = interviewNewRoute.useLoaderData();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          {t("interview.setup.pageTitle")}
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          {t("interview.setup.pageSubtitle")}
        </p>
      </div>

      <InterviewSetupForm
        resumes={resumes}
        language={i18n.language}
        runtimeIsFallback={isBrowserFallbackRuntime(context)}
      />
    </div>
  );
}

export const interviewNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/interview/new",
  loader: loadInterviewSetupRouteData,
  component: InterviewNewRoute,
});
