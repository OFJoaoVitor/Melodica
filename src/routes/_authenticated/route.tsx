import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { apiGet, supabase } from "@/integrations/supabase/client";
import type { MusicInterests } from "@/lib/music-interests";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
     
     
    if (location.pathname !== "/interests") {
      const { interests } = await apiGet<{ interests: MusicInterests }>("/interests");
      if (!interests.completed) throw redirect({ to: "/interests" });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
