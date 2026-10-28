import { useState } from "react";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { authErrorMessage, signInWithGoogle } from "@/lib/auth";
import { AuthShell } from "./login";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ACCOUNT_TYPES,
  EXPERIENCE_LEVELS,
  GENRES,
  INSTRUMENTS,
  type AccountType,
  type ExperienceLevel,
} from "@/lib/melodica";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Criar conta — Melodica" },
      {
        name: "description",
        content: "Crie seu perfil musical na Melodica e participe das comunidades de música.",
      },
      { property: "og:title", content: "Criar conta — Melodica" },
      { property: "og:description", content: "Crie seu perfil musical na Melodica." },
    ],
  }),
  component: RegisterPage,
});

const schema = z
  .object({
    username: z
      .string()
      .min(3, "Mínimo de 3 caracteres")
      .max(24, "Máximo de 24 caracteres")
      .regex(/^[a-z0-9_]+$/, "Use apenas letras minúsculas, números e _"),
    displayName: z.string().min(2, "Informe seu nome").max(60),
    email: z.string().email("Email inválido"),
    password: z.string().min(8, "Use pelo menos 8 caracteres"),
    confirm: z.string(),
    birthDate: z.string().min(1, "Informe a data de nascimento"),
    genre: z.string().min(1, "Escolha um gênero"),
    instrument: z.string().min(1, "Escolha um instrumento"),
    accountType: z.string().min(1),
    experience: z.string().min(1),
  })
  .refine((data) => data.password === data.confirm, {
    path: ["confirm"],
    message: "As senhas não conferem",
  });

function RegisterPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sentConfirmation, setSentConfirmation] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    username: "",
    displayName: "",
    email: "",
    password: "",
    confirm: "",
    birthDate: "",
    genre: "",
    instrument: "",
    accountType: "MUSICIAN" as AccountType,
    experience: "BEGINNER" as ExperienceLevel,
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[String(issue.path[0])] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      // No cadastro não existe sessão autenticada. A validação de nomes e emails
      // duplicados ocorre no endpoint POST /api/auth/register, com restrições
      // UNIQUE no SQLite. Nunca consulte /api/data/profiles antes do login.
      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: {
            username: form.username,
            display_name: form.displayName,
            account_type: form.accountType,
            experience_level: form.experience,
            primary_instrument: form.instrument,
            favorite_genre: form.genre,
            birth_date: form.birthDate,
          },
        },
      });
      if (error) throw error;

      if (!data.session) {
        setSentConfirmation(true);
        return;
      }
      await router.invalidate();
      await navigate({ to: "/feed", replace: true });
      toast.success("Conta criada. Bem-vindo à Melodica!");
    } catch (error) {
      console.error("Erro ao cadastrar:", error);
      const message = authErrorMessage(error, "Não foi possível criar a conta agora.");
      // Exibe no campo correspondente os conflitos identificados pelo backend.
      if (/nome de usuário já está em uso/i.test(message)) {
        setErrors({ username: message });
      } else if (/já existe uma conta com esse email/i.test(message)) {
        setErrors({ email: message });
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    if (loading) return;
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result.error) {
        toast.error(authErrorMessage(result.error, "Não foi possível continuar com o Google. Verifique a configuração do provedor."));
        return;
      }
      if (result.redirected) return;
      await router.invalidate();
      await navigate({ to: "/feed", replace: true });
    } catch (error) {
      console.error("Erro no cadastro Google:", error);
      toast.error(authErrorMessage(error, "Não foi possível continuar com o Google."));
    } finally {
      setLoading(false);
    }
  }

  if (sentConfirmation) {
    return (
      <AuthShell
        title="Confirme seu email"
        subtitle="Enviamos um link de confirmação para você."
        footer={
          <Link to="/login" className="font-medium text-primary hover:underline">
            Ir para a tela de entrar
          </Link>
        }
      >
        <p className="rounded-md border bg-surface p-4 text-sm text-muted-foreground">
          Abra o email enviado para <strong className="text-foreground">{form.email}</strong> e
          clique no link para ativar sua conta na Melodica.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Criar minha conta"
      subtitle="Monte seu perfil musical em menos de um minuto."
      footer={
        <>
          Já tem conta?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field label="Nome de usuário" error={errors["username"]} htmlFor="username">
          <Input
            id="username"
            value={form.username}
            onChange={(e) => update("username", e.target.value.toLowerCase().trim())}
            placeholder="ex: marina_v"
            required
          />
        </Field>
        <Field label="Nome" error={errors["displayName"]} htmlFor="displayName">
          <Input
            id="displayName"
            value={form.displayName}
            onChange={(e) => update("displayName", e.target.value)}
            required
          />
        </Field>
        <Field label="Email" error={errors["email"]} htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            required
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Senha" error={errors["password"]} htmlFor="password">
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              required
            />
          </Field>
          <Field label="Confirmar senha" error={errors["confirm"]} htmlFor="confirm">
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={form.confirm}
              onChange={(e) => update("confirm", e.target.value)}
              required
            />
          </Field>
        </div>
        <Field label="Data de nascimento" error={errors["birthDate"]} htmlFor="birthDate">
          <Input
            id="birthDate"
            type="date"
            value={form.birthDate}
            onChange={(e) => update("birthDate", e.target.value)}
            required
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Gênero musical principal" error={errors["genre"]} htmlFor="genre">
            <Select value={form.genre} onValueChange={(v) => update("genre", v)}>
              <SelectTrigger id="genre">
                <SelectValue placeholder="Escolha" />
              </SelectTrigger>
              <SelectContent>
                {GENRES.map((genre) => (
                  <SelectItem key={genre} value={genre}>
                    {genre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Instrumento" error={errors["instrument"]} htmlFor="instrument">
            <Select value={form.instrument} onValueChange={(v) => update("instrument", v)}>
              <SelectTrigger id="instrument">
                <SelectValue placeholder="Escolha" />
              </SelectTrigger>
              <SelectContent>
                {INSTRUMENTS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo de perfil" htmlFor="accountType">
            <Select
              value={form.accountType}
              onValueChange={(v) => update("accountType", v as AccountType)}
            >
              <SelectTrigger id="accountType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Nível de experiência" htmlFor="experience">
            <Select
              value={form.experience}
              onValueChange={(v) => update("experience", v as ExperienceLevel)}
            >
              <SelectTrigger id="experience">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPERIENCE_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Criando conta..." : "Criar conta"}
        </Button>
      </form>

      <p className="mt-5 text-center text-xs text-muted-foreground">
        Versão local: contas por email e senha, sem necessidade do Lovable.
      </p>
    </AuthShell>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
