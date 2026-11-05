import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile, useSession } from "@/hooks/use-session";
import { AppShell } from "@/components/melodica/app-shell";
import { ImageFileField } from "@/components/melodica/image-file-field";
import { uploadImageFile } from "@/lib/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
  INSTRUMENTS,
  type AccountType,
  type ExperienceLevel,
} from "@/lib/melodica";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Configurações — Melodica" },
      { name: "description", content: "Ajuste seu perfil musical e sua conta na Melodica." },
      { property: "og:title", content: "Configurações — Melodica" },
      { property: "og:description", content: "Ajuste seu perfil musical e sua conta na Melodica." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useSession();
  const { data: profile, isLoading } = useMyProfile();
  const queryClient = useQueryClient();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    display_name: "",
    bio: "",
    location: "",
    avatar_url: "",
    banner_url: "",
    website_url: "",
    primary_instrument: "",
    account_type: "FAN" as AccountType,
    experience_level: "BEGINNER" as ExperienceLevel,
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      display_name: profile.display_name ?? "",
      bio: profile.bio ?? "",
      location: profile.location ?? "",
      avatar_url: profile.avatar_url ?? "",
      banner_url: profile.banner_url ?? "",
      website_url: profile.website_url ?? "",
      primary_instrument: profile.primary_instrument ?? "",
      account_type: (profile.account_type ?? "FAN") as AccountType,
      experience_level: (profile.experience_level ?? "BEGINNER") as ExperienceLevel,
    });
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const urlFields = [form.website_url];
      if (urlFields.some((value) => {
        if (!value.trim()) return false;
        try { return !["http:", "https:"].includes(new URL(value).protocol); }
        catch { return true; }
      })) throw new Error("Os links precisam começar com http:// ou https://.");
      // O backend armazena os arquivos e devolve links locais persistentes.
      const avatarUrl = avatarFile ? await uploadImageFile(avatarFile) : form.avatar_url;
      const bannerUrl = bannerFile ? await uploadImageFile(bannerFile) : form.banner_url;
      const { error } = await supabase
        .from("profiles")
        .update({ ...form, avatar_url: avatarUrl, banner_url: bannerUrl, updated_at: new Date().toISOString() })
        .eq("id", user!.id);
      if (error) throw error;
      return { avatarUrl, bannerUrl };
    },
    onSuccess: ({ avatarUrl, bannerUrl }) => {
      setForm((current) => ({ ...current, avatar_url: avatarUrl, banner_url: bannerUrl }));
      setAvatarFile(null);
      setBannerFile(null);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["public-profile"] });
      toast.success("Perfil atualizado.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível salvar agora."),
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-ink">Configurações</h1>
          <p className="mt-1 text-sm text-muted-foreground">Conta e perfil musical.</p>
          <Link to="/profile" className="mt-2 inline-flex text-sm font-medium text-primary hover:underline">Ver meu perfil →</Link>
        </div>

        {isLoading ? (
          <Skeleton className="h-96 w-full rounded-lg" />
        ) : (
          <>
            <section className="rounded-lg border bg-card p-5">
              <h2 className="text-sm font-semibold text-ink">Conta</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="truncate text-foreground">{user?.email}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Nome de usuário</dt>
                  <dd className="text-foreground">@{profile?.username}</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-lg border border-primary/20 bg-card p-5">
              <h2 className="text-sm font-semibold text-ink">Meus interesses musicais</h2>
              <p className="mt-2 text-sm text-muted-foreground">Atualize gêneros, instrumentos, artistas e assuntos que personalizam o feed “Para você”.</p>
              <Button asChild variant="outline" className="mt-4"><Link to="/interests">Editar meus interesses musicais</Link></Button>
            </section>

            <form
              className="space-y-4 rounded-lg border bg-card p-5"
              onSubmit={(event) => {
                event.preventDefault();
                save.mutate();
              }}
            >
              <h2 className="text-sm font-semibold text-ink">Perfil</h2>

              <div className="space-y-2">
                <Label htmlFor="display_name">Nome</Label>
                <Input
                  id="display_name"
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  rows={3}
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Localização</Label>
                <Input
                  id="location"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>

              <ImageFileField
                id="avatar_file"
                label="Foto do perfil"
                currentUrl={form.avatar_url}
                file={avatarFile}
                onFileChange={setAvatarFile}
                onClear={() => { setAvatarFile(null); setForm((current) => ({ ...current, avatar_url: "" })); }}
                disabled={save.isPending}
              />
              <ImageFileField
                id="banner_file"
                label="Capa do perfil"
                currentUrl={form.banner_url}
                file={bannerFile}
                onFileChange={setBannerFile}
                onClear={() => { setBannerFile(null); setForm((current) => ({ ...current, banner_url: "" })); }}
                disabled={save.isPending}
                helperText="Selecione uma imagem do computador (JPG, PNG, WebP ou GIF, até 5 MB). Ao remover, a capa azul padrão será exibida."
              />
              <div className="space-y-2">
                <Label htmlFor="website_url">Meu link (opcional)</Label>
                <Input id="website_url" type="url" placeholder="https://..." value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="instrument">Instrumento principal</Label>
                  <Select
                    value={form.primary_instrument}
                    onValueChange={(v) => setForm({ ...form, primary_instrument: v })}
                  >
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
                </div>
                <div className="space-y-2">
                  <Label htmlFor="level">Nível</Label>
                  <Select
                    value={form.experience_level}
                    onValueChange={(v) =>
                      setForm({ ...form, experience_level: v as ExperienceLevel })
                    }
                  >
                    <SelectTrigger id="level">
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
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_type">Tipo de perfil</Label>
                <Select
                  value={form.account_type}
                  onValueChange={(v) => setForm({ ...form, account_type: v as AccountType })}
                >
                  <SelectTrigger id="account_type">
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
              </div>

              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Salvando..." : "Salvar alterações"}
              </Button>
            </form>
          </>
        )}
      </div>
    </AppShell>
  );
}
