import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthShell } from "./login";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Recuperar senha — Melodica" },
      { name: "description", content: "Saiba como recuperar o acesso à sua conta Melodica." },
      { property: "og:title", content: "Recuperar senha — Melodica" },
      { property: "og:description", content: "Recupere o acesso à sua conta Melodica." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Recuperar senha"
      subtitle="Precisa de ajuda para acessar sua conta?"
      footer={<Link to="/login" className="font-medium text-primary hover:underline">Voltar para entrar</Link>}
    >
      <p className="text-sm leading-6 text-muted-foreground">
        A recuperação automática ainda não está disponível. Para redefinir sua senha,
        solicite ajuda à equipe responsável pela Melodica.
      </p>
    </AuthShell>
  );
}
