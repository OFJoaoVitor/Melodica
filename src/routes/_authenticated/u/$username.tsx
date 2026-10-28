import { createFileRoute } from "@tanstack/react-router";
import { ProfilePage } from "@/components/melodica/profile-page";

export const Route = createFileRoute("/_authenticated/u/$username")({
  head: () => ({ meta: [
    { title: "Perfil musical — Melodica" },
    { name: "description", content: "Conheça músicos e compartilhe música na Melodica." },
  ] }),
  component: PublicProfilePage,
});

function PublicProfilePage() {
  const { username } = Route.useParams();
  return <ProfilePage username={username} />;
}
