import { createRouter } from "@tanstack/react-router";
import { rootRoute } from "./routes/root";
import { homeRoute } from "./routes/home";
import { libraryRoute } from "./routes/library";
import { importsRoute } from "./routes/imports";
import { settingsRoute } from "./routes/settings";

const routeTree = rootRoute.addChildren([
  homeRoute,
  libraryRoute,
  importsRoute,
  settingsRoute,
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
