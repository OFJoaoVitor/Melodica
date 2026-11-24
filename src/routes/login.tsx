import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { authErrorMessage } from "@/lib/auth";
import { MelodicaLogo } from "@/components/melodica/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — Melodica" },
      { name: "description", content: "Acesse sua conta Melodica e volte para as suas comunidades musicais." },
      { property: "og:title", content: "Entrar — Melodica" },
      { property: "og:description", content: "Acesse sua conta Melodica." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const router = useRouter();

   
   
  useEffect(() => {
    let active = true;
    async function resumeSession() {
      try {
        const params = new URLSearchParams(window.location.search);
        if (params.has("error")) {
          toast.error("Não foi possível concluir o acesso. Tente novamente.");
          window.history.replaceState(window.history.state, "", window.location.pathname);
          return;
        }
        const { data, error } = await supabase.auth.getUser();
        if (active && !error && data.user) {
          await router.invalidate();
          if (active) await navigate({ to: "/feed", replace: true });
        }
      } catch (error) {
        console.error("Não foi possível recuperar a sessão:", error);
      }
    }
    void resumeSession();
    return () => { active = false; };
  }, [navigate, router]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) {
        toast.error(authErrorMessage(error));
        return;
      }
      if (!data.session || !data.user) {
        toast.error("Não foi possível iniciar sua sessão. Tente novamente.");
        return;
      }

       
      await router.invalidate();
      await navigate({ to: "/feed", replace: true });
      toast.success("Bem-vindo de volta!");
    } catch (error) {
      console.error("Erro ao entrar:", error);
      toast.error(authErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="melodica-auth-panel min-h-screen lg:grid lg:grid-cols-[minmax(380px,0.95fr)_minmax(480px,1.05fr)]">
      <aside className="melodica-auth-aside relative hidden min-h-screen flex-col justify-between overflow-hidden px-10 py-9 text-white lg:flex xl:px-16 xl:py-12">
        <Link to="/" aria-label="Melodica — início" className="inline-flex w-fit items-center gap-3 text-[22px] font-bold tracking-tight">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10"><img src="/melodica-logo.png" alt="" className="h-9 w-9 object-contain" /></span>
          Melodica
        </Link>
        <div className="mx-auto w-full max-w-[450px] py-8">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.14em] text-[#89d1ed]">SUA COMUNIDADE MUSICAL</p>
          <h2 className="max-w-[440px] text-[42px] font-semibold leading-[1.13] tracking-[-0.055em] xl:text-[52px]">Música boa é melhor quando a gente compartilha.</h2>
          <p className="mt-6 max-w-[360px] text-[15px] leading-7 text-slate-300">Descubra novos artistas, conheça outros músicos e troque ideias sobre o que você mais gosta de ouvir.</p>
          <div className="melodica-auth-paper mt-12 flex max-w-[400px] items-center gap-4 rounded-[18px] p-4">
            <div className="melodica-record relative flex h-[86px] w-[86px] shrink-0 items-center justify-center rounded-full border border-white/10 shadow-[0_8px_20px_rgba(0,0,0,.14)]">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#60bde2]"><span className="h-2 w-2 rounded-full bg-[#193042]" /></span>
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#89d1ed]">Agora é sua vez</span>
              <p className="mt-1 text-[17px] font-semibold">Faça parte da conversa.</p>
              <p className="mt-1 text-xs leading-5 text-slate-300">O próximo som favorito pode aparecer por aqui.</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-400">© 2026 Melodica · Feito para quem vive música.</p>
      </aside>

      <main className="flex min-h-screen flex-col px-6 py-7 sm:px-10 lg:px-12 xl:px-20">
        <header className="flex items-center justify-between gap-3 lg:justify-end">
          <Link to="/" className="lg:hidden" aria-label="Melodica — início"><MelodicaLogo /></Link>
          <p className="text-sm text-muted-foreground">Ainda não tem conta? <Link to="/register" className="ml-1 font-semibold text-primary hover:underline">Cadastre-se</Link></p>
        </header>
        <section className="mx-auto flex w-full max-w-[404px] flex-1 flex-col justify-center py-12">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-primary">BOAS-VINDAS</p>
          <h1 className="text-[32px] font-bold leading-tight text-ink sm:text-[36px]">Que bom ter você de volta.</h1>
          <p className="mt-3 text-[14px] leading-6 text-muted-foreground">Entre para continuar de onde a música parou.</p>
          <form onSubmit={handleSubmit} className="mt-9 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-semibold text-foreground">Email</Label>
              <Input id="email" type="email" autoComplete="email" placeholder="seuemail@exemplo.com" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-lg border-input bg-card px-4 text-sm" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2"><Label htmlFor="password" className="font-semibold text-foreground">Senha</Label><Link to="/forgot-password" className="text-xs font-semibold text-primary hover:underline">Esqueceu a senha?</Link></div>
              <Input id="password" type="password" autoComplete="current-password" placeholder="Digite sua senha" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-lg border-input bg-card px-4 text-sm" />
            </div>
            <Button type="submit" className="h-12 w-full rounded-lg text-sm font-semibold" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</Button>
          </form>
          <p className="mt-8 text-center text-xs leading-5 text-muted-foreground">Um espaço para descobrir, aprender e compartilhar música.</p>
        </section>
        <footer className="pb-2 text-center text-[11px] text-muted-foreground lg:text-right">Melodica © 2026</footer>
      </main>
    </div>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="px-4 py-6 sm:px-8">
        <Link to="/" aria-label="Início da Melodica">
          <MelodicaLogo />
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16">
        <div className="w-full max-w-lg rounded-[18px] border bg-card p-6 sm:p-9">
          <h1 className="text-2xl font-semibold text-ink">{title}</h1>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">{subtitle}</p>
          {children}
          <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>
        </div>
      </main>
    </div>
  );
}
