import { createFileRoute } from "@tanstack/react-router";
import { ProfilePage } from "@/components/melodica/profile-page";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [
    { title: "Meu perfil — Melodica" },
    { name: "description", content: "Sua identidade, publicações e comunidades musicais." },
  ] }),
  component: () => <ProfilePage />,
});
