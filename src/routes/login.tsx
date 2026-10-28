import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { authErrorMessage, signInWithGoogle } from "@/lib/auth";
import { MelodicaLogo } from "@/components/melodica/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Music2, AudioLines, Heart } from "lucide-react";

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
  const [googleLoading, setGoogleLoading] = useState(false);

  // Retornos de confirmação por email ou do OAuth do Google chegam em /login.
  // O Supabase processa a sessão antes de getUser() resolver.
  useEffect(() => {
    let active = true;
    async function resumeSession() {
      try {
        const params = new URLSearchParams(window.location.search);
        if (params.has("error")) {
          toast.error("O login com Google não está disponível na versão local. Entre com email e senha.");
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
  const [mascotOffset, setMascotOffset] = useState({ x: 0, y: 0, rotate: 0 });
  const mascotPanelRef = useRef<HTMLDivElement>(null);

  function handleMascotMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    setMascotOffset({ x: x * 22, y: y * 18, rotate: x * 7 });
  }

  function resetMascot() {
    setMascotOffset({ x: 0, y: 0, rotate: 0 });
  }

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

      // Atualiza o cache das rotas antes de abrir o feed protegido.
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

  async function handleGoogle() {
    if (googleLoading) return;
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result.error) {
        toast.error(authErrorMessage(result.error, "Não foi possível entrar com o Google. Verifique se o provedor está habilitado no Supabase."));
        return;
      }
      // Com OAuth por redirecionamento, /login retoma a sessão após o retorno.
      if (result.redirected) return;
      await router.invalidate();
      await navigate({ to: "/feed", replace: true });
    } catch (error) {
      console.error("Erro no login Google:", error);
      toast.error(authErrorMessage(error, "Não foi possível entrar com o Google."));
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-950 lg:grid lg:grid-cols-2">
      <aside className="relative hidden min-h-screen overflow-hidden bg-[#08090d] text-white lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div className="absolute -left-28 top-24 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -bottom-20 -right-16 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />
        <Link to="/" aria-label="Melodica início" className="relative z-10 w-fit rounded-full bg-white px-4 py-2">
          <MelodicaLogo />
        </Link>
        <div className="relative z-10 mx-auto flex w-full max-w-lg flex-col items-center text-center">
          <div
            ref={mascotPanelRef}
            onMouseMove={handleMascotMouseMove}
            onMouseLeave={resetMascot}
            className="relative mb-10 flex h-72 w-72 items-center justify-center rounded-[3rem] border border-white/10 bg-white/[0.04] shadow-2xl shadow-blue-950/40 sm:h-80 sm:w-80"
            aria-label="Mascote animada da Melodica; acompanha o movimento do cursor"
          >
            <div className="absolute inset-5 rounded-[2.4rem] border border-white/10" />
            <div className="absolute h-52 w-52 rounded-full bg-[#25b8f4]/10 blur-2xl" />
            <img
              src="/melodica-logo.png"
              alt="Mascote da Melodica"
              draggable={false}
              className="relative z-10 h-60 w-60 select-none object-contain drop-shadow-[0_0_34px_rgba(37,184,244,0.22)] sm:h-64 sm:w-64"
              style={{
                transform: `translate3d(${mascotOffset.x}px, ${mascotOffset.y}px, 0) rotate(${mascotOffset.rotate}deg)`,
                transition: "transform 140ms ease-out",
                willChange: "transform",
              }}
            />
            <AudioLines className="pointer-events-none absolute -right-7 top-8 h-16 w-16 text-[#25b8f4] animate-pulse" strokeWidth={1.6} />
            <AudioLines className="pointer-events-none absolute -left-7 bottom-8 h-14 w-14 -rotate-180 text-[#25b8f4] animate-pulse" strokeWidth={1.6} />
          </div>
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-[#25b8f4]">Sua comunidade musical</p>
          <h2 className="text-4xl font-bold leading-tight xl:text-5xl">A música conecta. <br />A comunidade aproxima.</h2>
          <p className="mt-5 max-w-md text-base leading-7 text-slate-400">Encontre pessoas que curtem os mesmos sons, compartilhe descobertas e evolua junto com outros músicos.</p>
        </div>
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500">
          <span>© 2026 Melodica</span><span>Feito para quem vive música.</span>
        </div>
      </aside>

      <main className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-12 xl:px-20">
        <header className="flex items-center justify-between lg:justify-end">
          <Link to="/" className="lg:hidden" aria-label="Início da Melodica"><MelodicaLogo /></Link>
          <p className="text-sm text-slate-500">Novo por aqui? <Link to="/register" className="ml-1 font-semibold text-blue-600 hover:underline">Criar conta</Link></p>
        </header>
        <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
          <div className="mb-8">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Music2 className="h-6 w-6" /></div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Bem-vindo de volta!</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">Entre na sua conta para continuar participando das suas comunidades musicais.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700">Email</Label>
              <Input id="email" type="email" autoComplete="email" placeholder="voce@exemplo.com" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-xl border-slate-200 bg-slate-50 px-4 shadow-sm focus-visible:bg-white" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between"><Label htmlFor="password" className="text-slate-700">Senha</Label><Link to="/forgot-password" className="text-xs font-medium text-blue-600 hover:underline">Esqueceu a senha?</Link></div>
              <Input id="password" type="password" autoComplete="current-password" placeholder="Digite sua senha" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-xl border-slate-200 bg-slate-50 px-4 shadow-sm focus-visible:bg-white" />
            </div>
            <Button type="submit" className="h-12 w-full rounded-xl bg-[#2563eb] text-sm font-semibold shadow-lg shadow-blue-600/20 hover:bg-blue-700" disabled={loading || googleLoading}>{loading ? "Entrando..." : "Entrar na Melodica"}</Button>
          </form>
          <p className="mt-5 text-center text-xs text-slate-500">Versão local: entre com email e senha. O login Google não está habilitado.</p>
          <p className="mt-8 text-center text-xs leading-5 text-slate-400">Ao entrar, você concorda com os termos de uso e a política de privacidade da Melodica.</p>
        </section>
        <footer className="pb-2 text-center text-xs text-slate-400 lg:text-left">Sua próxima descoberta musical começa aqui. <Heart className="inline h-3 w-3 text-blue-500" fill="currentColor" /></footer>
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
        <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
          <h1 className="text-xl font-semibold text-ink">{title}</h1>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">{subtitle}</p>
          {children}
          <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>
        </div>
      </main>
    </div>
  );
}
