import { createFileRoute, redirect } from "@tanstack/react-router";

// Ao abrir a raiz do site, sempre encaminha o visitante para a página de login.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/login" });
  },
});
