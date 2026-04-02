import { createRouter } from "@tanstack/react-router";
import { rootRoute } from "./routes/root";
import { homeRoute } from "./routes/home";
import { settingsRoute } from "./routes/settings";
import { dashboardRoute } from "./routes/dashboard";
import { editorRoute } from "./routes/editor";
import { templatesRoute } from "./routes/templates";

const routeTree = rootRoute.addChildren([
  homeRoute,
  settingsRoute,
  dashboardRoute,
  editorRoute,
  templatesRoute,
]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
