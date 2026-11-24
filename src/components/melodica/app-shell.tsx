import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Home, Compass, Bookmark, Settings, LogOut, PenLine, UserRound,
  MessageSquare, Headphones, ArrowUpRight,
} from "lucide-react";
import { fetchNotifications } from "@/lib/notifications";
import { NotificationsPopover } from "./notifications-popover";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/hooks/use-session";
import { MelodicaLogo, MelodicaMark } from "./logo";
import { Button } from "@/components/ui/button";
import { SearchBox } from "./search-box";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { accountTypeLabel, initials } from "@/lib/melodica";

const navItems = [
  { to: "/feed", label: "Início", icon: Home },
  { to: "/explore", label: "Explorar", icon: Compass },
  { to: "/saved", label: "Salvos", icon: Bookmark },
  { to: "/messages", label: "Mensagens", icon: MessageSquare },
  { to: "/profile", label: "Meu perfil", icon: UserRound },
  { to: "/settings", label: "Configurações", icon: Settings },
] as const;

const mobileItems = navItems.filter((item) => ["/feed", "/explore", "/messages", "/profile"].includes(item.to));

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
  const { data: inbox, isLoading: notificationsLoading, isError: notificationsError } = useQuery({
    queryKey: ["notifications", profile?.id],
    queryFn: fetchNotifications,
    enabled: !!profile?.id,
    refetchInterval: 7_000,
  });

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
    <div className="melodica-shell min-h-screen lg:flex">
      <aside className="melodica-sidebar sticky top-0 hidden h-screen w-[242px] shrink-0 flex-col border-r bg-card px-4 pb-5 pt-7 lg:flex xl:w-[262px] xl:px-5">
        <Link to="/feed" aria-label="Melodica — início" className="mb-11 inline-flex w-fit items-center px-2">
          <MelodicaLogo />
        </Link>

        <div className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.10em] text-muted-foreground">Menu</div>
        <nav className="space-y-1" aria-label="Navegação principal">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="melodica-nav-link flex items-center gap-3 rounded-xl px-3 py-3 text-[14px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              activeProps={{ className: "melodica-nav-active bg-primary-soft font-semibold text-primary" }}
            >
              <Icon className="h-[19px] w-[19px] shrink-0" strokeWidth={1.8} aria-hidden />
              <span className="flex-1">{label}</span>
              {to === "/messages" && !!inbox?.unread_messages && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground" aria-label={`${inbox.unread_messages} mensagens não lidas`}>
                  {inbox.unread_messages > 99 ? "99+" : inbox.unread_messages}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="mt-8 px-2">
          {onCreatePost ? (
            <Button type="button" onClick={onCreatePost} className="melodica-create-button h-11 w-full justify-center rounded-xl text-sm font-semibold">
              <PenLine className="h-4 w-4" /> Nova publicação
            </Button>
          ) : (
            <Link to="/feed" className="flex items-center justify-between rounded-xl border px-3 py-3 text-sm font-medium text-muted-foreground transition hover:border-primary/30 hover:text-primary">
              Ir para o feed <ArrowUpRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        <div className="mt-auto px-1">
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-surface px-3 py-3 text-xs text-muted-foreground">
            <Headphones className="h-4 w-4 shrink-0 text-primary" />
            Um lugar para quem vive música.
          </div>
          {profile && (
            <Link to="/profile" className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-muted">
              <Avatar className="h-10 w-10 shrink-0">
                {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt="" className="object-cover" />}
                <AvatarFallback className="bg-primary-soft text-xs font-semibold text-primary">{initials(profile.display_name || profile.username)}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-foreground">{profile.display_name}</span>
                <span className="block truncate text-xs text-muted-foreground">@{profile.username}</span>
              </span>
            </Link>
          )}
          <button type="button" onClick={signOut} className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground">
            <LogOut className="h-4 w-4" /> Sair da conta
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="melodica-topbar sticky top-0 z-40 border-b bg-background/95 backdrop-blur-lg">
          <div className="mx-auto flex h-[70px] max-w-[1230px] items-center gap-3 px-4 sm:px-6 xl:px-10">
            <Link to="/feed" aria-label="Melodica — início" className="mr-1 shrink-0 lg:hidden">
              <span className="sm:hidden"><MelodicaMark className="!h-9 !w-9" /></span>
              <span className="hidden sm:inline-flex"><MelodicaLogo /></span>
            </Link>
            <div className="hidden shrink-0 text-sm font-medium text-foreground/80 xl:block">Descubra. Compartilhe. Conecte.</div>
            <SearchBox />
            <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
              {onCreatePost && (
                <Button type="button" onClick={onCreatePost} size="sm" className="hidden h-9 rounded-lg px-4 font-semibold sm:inline-flex lg:hidden">
                  <PenLine className="h-4 w-4" /> Publicar
                </Button>
              )}
              <NotificationsPopover inbox={inbox} loading={notificationsLoading} error={notificationsError} />
              <Link to="/profile" className="rounded-full p-0.5 transition hover:ring-2 hover:ring-primary/20" title="Meu perfil" aria-label="Abrir meu perfil">
                <Avatar className="h-9 w-9">
                  {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="" className="object-cover" />}
                  <AvatarFallback className="bg-primary-soft text-xs font-semibold text-primary">{profile ? initials(profile.display_name || profile.username) : <UserRound className="h-4 w-4" />}</AvatarFallback>
                </Avatar>
              </Link>
            </div>
          </div>
        </header>

        <div className="mx-auto flex max-w-[1230px] items-start gap-7 px-4 pb-24 pt-7 sm:px-6 lg:pb-12 xl:gap-9 xl:px-10">
          <main className="min-w-0 flex-1">{children}</main>
          {aside && <aside className="melodica-right-rail sticky top-[98px] hidden w-[272px] shrink-0 space-y-4 xl:block">{aside}</aside>}
        </div>
      </div>

      <nav className="melodica-mobile-nav fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden" aria-label="Navegação mobile">
        <ul className="mx-auto flex h-[64px] max-w-[550px] items-center justify-around">
          {mobileItems.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Link to={to} className="flex min-w-[54px] flex-col items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-muted-foreground" activeProps={{ className: "text-primary" }}>
                <span className="relative"><Icon className="h-[21px] w-[21px]" strokeWidth={1.9} aria-hidden />{to === "/messages" && !!inbox?.unread_messages && <span className="absolute -right-1.5 -top-1 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card" aria-label="Novas mensagens" />}</span>
                {label}
              </Link>
            </li>
          ))}
          {onCreatePost && (
            <li>
              <button type="button" onClick={onCreatePost} className="flex min-w-[54px] flex-col items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-primary">
                <PenLine className="h-[21px] w-[21px]" strokeWidth={1.9} aria-hidden /> Publicar
              </button>
            </li>
          )}
        </ul>
      </nav>
      {profile && <span className="sr-only">Conectado como {profile.display_name}, {accountTypeLabel(profile.account_type)}</span>}
    </div>
  );
}
