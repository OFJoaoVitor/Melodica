import { createFileRoute, redirect } from "@tanstack/react-router";

// URL antiga permanece válida, mas comunidades agora fazem parte de Explorar.
export const Route = createFileRoute("/_authenticated/communities")({
  beforeLoad: () => {
    throw redirect({ to: "/explore", replace: true });
  },
});
