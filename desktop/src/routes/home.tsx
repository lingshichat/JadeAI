import { Navigate, createRoute } from "@tanstack/react-router";
import { rootRoute } from "./root";

function HomeRoute() {
  return <Navigate replace to="/dashboard" />;
}

export const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomeRoute,
});
