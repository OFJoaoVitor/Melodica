import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthShell } from "./login";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Recuperar senha — Melodica" },
      { name: "description", content: "Recuperação de senha administrativa na versão local." },
      { property: "og:title", content: "Recuperar senha — Melodica" },
      { property: "og:description", content: "Recupere o acesso à sua conta Melodica." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Recuperar senha (modo local)"
      subtitle="O Melodica local não envia emails automaticamente."
      footer={<Link to="/login" className="font-medium text-primary hover:underline">Voltar para entrar</Link>}
    >
      <p className="text-sm leading-6 text-muted-foreground">
        Se você esqueceu a senha, o administrador do computador pode executar
        <code className="mx-1 rounded bg-muted px-1">npm run reset-password</code>
        no terminal do VS Code, informar seu email e escolher uma senha nova.
      </p>
    </AuthShell>
  );
}
