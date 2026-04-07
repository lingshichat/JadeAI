import { createRoute, useParams } from "@tanstack/react-router";
import { InterviewReportSummary } from "../components/interview/interview-report-summary";
import { loadInterviewReportRouteData } from "../lib/desktop-loaders";
import { isBrowserFallbackRuntime } from "../lib/desktop-api";
import { rootRoute } from "./root";

function InterviewReportRoute() {
  const { sessionId } = useParams({ from: "/interview/$sessionId/report" });
  const context = rootRoute.useLoaderData();
  const { session, report } = interviewReportRoute.useLoaderData();

  return (
    <InterviewReportSummary
      sessionId={sessionId}
      initialSession={session}
      initialReport={report}
      runtimeIsFallback={isBrowserFallbackRuntime(context)}
    />
  );
}

export const interviewReportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/interview/$sessionId/report",
  loader: ({ params }) => loadInterviewReportRouteData(params.sessionId),
  component: InterviewReportRoute,
});
