import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Home, Compass, Users, Bookmark, Settings, LogOut, Search, PenLine, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/hooks/use-session";
import { MelodicaLogo, MelodicaMark } from "./logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { accountTypeLabel, initials } from "@/lib/melodica";

const navItems = [
  { to: "/feed", label: "Início", icon: Home },
  { to: "/explore", label: "Explorar", icon: Compass },
  { to: "/communities", label: "Comunidades", icon: Users },
  { to: "/saved", label: "Salvos", icon: Bookmark },
  { to: "/profile", label: "Meu perfil", icon: UserRound },
  { to: "/settings", label: "Configurações", icon: Settings },
] as const;

const mobileItems = navItems.slice(0, 5);

export function AppShell({
  children,
  aside,
  onCreatePost,
}: {
  children: React.ReactNode;
  aside?: React.ReactNode;
  onCreatePost?: () => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useMyProfile();

  async function signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      await queryClient.cancelQueries();
      queryClient.clear();
      await navigate({ to: "/login", replace: true });
    } catch (error) {
      console.error("Erro ao sair:", error);
      toast.error("Não foi possível encerrar a sessão. Tente novamente.");
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Link to="/feed" aria-label="Feed da Melodica" className="shrink-0">
            <span className="hidden sm:inline-flex">
              <MelodicaLogo />
            </span>
            <span className="sm:hidden">
              <MelodicaMark />
            </span>
          </Link>
          <div className="relative mx-auto w-full max-w-md">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              placeholder="Buscar músicos, comunidades, publicações"
              aria-label="Buscar na Melodica"
              className="bg-surface pl-9"
            />
          </div>
          {onCreatePost ? (
            <Button size="sm" onClick={onCreatePost} className="hidden sm:inline-flex">
              <PenLine className="h-4 w-4" />
              Publicar
            </Button>
          ) : null}
          <Link to="/profile" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-primary-soft transition hover:ring-2 hover:ring-primary/30" title="Meu perfil" aria-label="Abrir meu perfil">
            <Avatar className="h-8 w-8">
              {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="" className="object-cover" />}
              <AvatarFallback className="bg-primary-soft text-xs font-semibold text-primary">{profile ? initials(profile.display_name || profile.username) : <UserRound className="h-4 w-4" />}</AvatarFallback>
            </Avatar>
          </Link>
          <Button size="icon" variant="ghost" onClick={signOut} aria-label="Sair da conta">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 pt-6 pb-24 sm:px-6 lg:pb-10">
        <aside className="sticky top-20 hidden h-fit w-56 shrink-0 lg:block">
          <nav className="space-y-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                activeProps={{ className: "bg-primary-soft text-accent-foreground" }}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </Link>
            ))}
          </nav>
          {profile ? (
            <Link to="/profile" className="mt-6 flex items-center gap-3 rounded-lg border bg-card p-3 transition hover:border-primary/40 hover:bg-primary-soft/40">
              <Avatar className="h-9 w-9">
                {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt="" className="object-cover" />}
                <AvatarFallback className="bg-primary-soft text-xs text-accent-foreground">
                  {initials(profile.display_name || profile.username)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{profile.display_name}</p>
                <p className="truncate text-xs text-muted-foreground">@{profile.username}</p>
              </div>
            </Link>
          ) : null}
        </aside>

        <main className="min-w-0 flex-1">{children}</main>

        {aside ? (
          <aside className="sticky top-20 hidden h-fit w-72 shrink-0 space-y-4 xl:block">{aside}</aside>
        ) : null}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur lg:hidden">
        <ul className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
          {mobileItems.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Link
                to={to}
                className="flex flex-col items-center gap-1 rounded-md px-3 py-1 text-[11px] text-muted-foreground"
                activeProps={{ className: "text-primary" }}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {label}
              </Link>
            </li>
          ))}
          {onCreatePost ? (
            <li>
              <button
                type="button"
                onClick={onCreatePost}
                className="flex flex-col items-center gap-1 rounded-md px-3 py-1 text-[11px] text-primary"
              >
                <PenLine className="h-5 w-5" aria-hidden />
                Publicar
              </button>
            </li>
          ) : null}
        </ul>
      </nav>

      {profile ? (
        <span className="sr-only">
          Conectado como {profile.display_name}, {accountTypeLabel(profile.account_type)}
        </span>
      ) : null}
    </div>
  );
}
