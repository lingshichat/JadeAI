import { createRoute, useParams } from "@tanstack/react-router";
import { InterviewRoom } from "../components/interview/interview-room";
import { loadInterviewSessionRouteData } from "../lib/desktop-loaders";
import { isBrowserFallbackRuntime } from "../lib/desktop-api";
import { rootRoute } from "./root";

function InterviewSessionRoute() {
  const { sessionId } = useParams({ from: "/interview/$sessionId" });
  const context = rootRoute.useLoaderData();
  const { session } = interviewSessionRoute.useLoaderData();

  return (
    <InterviewRoom
      sessionId={sessionId}
      initialSession={session}
      runtimeIsFallback={isBrowserFallbackRuntime(context)}
    />
  );
}

export const interviewSessionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/interview/$sessionId",
  loader: ({ params }) => loadInterviewSessionRouteData(params.sessionId),
  component: InterviewSessionRoute,
});
