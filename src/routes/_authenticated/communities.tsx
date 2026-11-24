import { createFileRoute, redirect } from "@tanstack/react-router";

 
export const Route = createFileRoute("/_authenticated/communities")({
  beforeLoad: () => {
    throw redirect({ to: "/explore", replace: true });
  },
});
