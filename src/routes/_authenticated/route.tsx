import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { apiGet, supabase } from "@/integrations/supabase/client";
import type { MusicInterests } from "@/lib/music-interests";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
    // O onboarding é obrigatório, inclusive para contas criadas antes da atualização.
    // A própria página /interests é a única rota autenticada que não depende da conclusão.
    if (location.pathname !== "/interests") {
      const { interests } = await apiGet<{ interests: MusicInterests }>("/interests");
      if (!interests.completed) throw redirect({ to: "/interests" });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
