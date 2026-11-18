import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadImageFile } from "@/lib/image-upload";
import type { Community } from "@/lib/posts";
import { ImageFileField } from "@/components/melodica/image-file-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CATEGORIES = ["Geral", "Gênero", "Instrumento", "Produção", "Artista / Banda", "Outros"];

function slugify(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48).replace(/-+$/g, "");
}

export function CommunityFormDialog({ open, onOpenChange, community, onCreated }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  community?: Community;
  onCreated?: (slug: string) => void;
}) {
  const edit = !!community;
  const queryClient = useQueryClient();
  const [name, setName] = useState(community?.name ?? "");
  const [slug, setSlug] = useState(community?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState(community?.description ?? "");
  const [category, setCategory] = useState(community?.category ?? "Geral");
  const [accent, setAccent] = useState(community?.accent ?? "#2563eb");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [bannerRemoved, setBannerRemoved] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(community?.name ?? "");
    setSlug(community?.slug ?? "");
    setSlugEdited(false);
    setDescription(community?.description ?? "");
    setCategory(community?.category ?? "Geral");
    setAccent(community?.accent ?? "#2563eb");
    setAvatarFile(null);
    setBannerFile(null);
    setAvatarRemoved(false);
    setBannerRemoved(false);
  }, [open, community?.id]);

  const save = useMutation({
    mutationFn: async () => {
      const title = name.trim();
      const handle = slugify(slug);
      if (title.length < 3 || title.length > 60) throw new Error("Informe um nome de 3 a 60 caracteres.");
      if (handle.length < 3) throw new Error("O identificador deve ter pelo menos 3 caracteres.");
      if (description.trim().length > 500) throw new Error("A descrição deve ter no máximo 500 caracteres.");
      // Só o criador pode editar: permissão validada novamente no backend.
      const avatar_url = avatarFile ? await uploadImageFile(avatarFile) : avatarRemoved ? null : community?.avatar_url ?? null;
      const banner_url = bannerFile ? await uploadImageFile(bannerFile) : bannerRemoved ? null : community?.banner_url ?? null;
      const fields = { name: title, description: description.trim(), category, accent, avatar_url, banner_url };
      const result = edit
        ? await supabase.from("communities").update(fields).eq("id", community!.id)
        : await supabase.from("communities").insert({ ...fields, slug: handle });
      if (result.error) throw result.error;
      return edit ? community!.slug : handle;
    },
    onSuccess: (savedSlug) => {
      void queryClient.invalidateQueries({ queryKey: ["communities"] });
      void queryClient.invalidateQueries({ queryKey: ["community", savedSlug] });
      void queryClient.invalidateQueries({ queryKey: ["my-communities"] });
      toast.success(edit ? "Perfil da comunidade atualizado!" : "Comunidade criada com sucesso!");
      onOpenChange(false);
      if (!edit) onCreated?.(savedSlug);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível salvar a comunidade."),
  });

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!save.isPending) onOpenChange(value); }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{edit ? "Editar perfil da comunidade" : "Criar comunidade"}</DialogTitle>
          <DialogDescription>
            {edit ? "Personalize a identidade da sua comunidade. Somente o criador pode salvar alterações." : "Crie um espaço para reunir músicos com os mesmos interesses."}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
          <div className="space-y-2">
            <Label htmlFor="community-name">Nome da comunidade *</Label>
            <Input id="community-name" maxLength={60} required minLength={3} value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (!edit && !slugEdited) setSlug(slugify(event.target.value));
              }} placeholder="Ex.: Baixistas do Brasil" disabled={save.isPending} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="community-slug">Identificador público *</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">m/</span>
              <Input id="community-slug" maxLength={48} required minLength={3} value={slug} disabled={edit || save.isPending}
                onChange={(event) => { setSlug(slugify(event.target.value)); setSlugEdited(true); }} placeholder="baixistas-do-brasil" />
            </div>
            <p className="text-xs text-muted-foreground">Usado no endereço da comunidade. Não pode ser alterado depois de criada.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="community-description">Descrição</Label>
            <Textarea id="community-description" rows={4} maxLength={500} value={description} disabled={save.isPending}
              onChange={(event) => setDescription(event.target.value)} placeholder="Sobre o que os músicos vão conversar aqui?" />
            <p className="text-right text-xs text-muted-foreground">{description.length}/500</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="community-category">Categoria</Label>
              <Select value={category} onValueChange={setCategory} disabled={save.isPending}>
                <SelectTrigger id="community-category"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="community-accent">Cor de destaque</Label>
              <div className="flex h-10 items-center gap-3 rounded-md border bg-background px-3">
                <input type="color" id="community-accent" value={accent} disabled={save.isPending}
                  onChange={(event) => setAccent(event.target.value)} className="h-7 w-12 cursor-pointer rounded border-0 bg-transparent" />
                <span className="text-xs text-muted-foreground">{accent.toUpperCase()}</span>
              </div>
            </div>
          </div>
          <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
            <ImageFileField id="community-avatar" label="Foto de perfil (redonda na página)" currentUrl={avatarRemoved ? null : (community?.avatar_url ?? null)}
              file={avatarFile} onFileChange={(file) => { setAvatarFile(file); setAvatarRemoved(false); }}
              onClear={() => { setAvatarFile(null); setAvatarRemoved(true); }} disabled={save.isPending} />
            <ImageFileField id="community-banner" label="Imagem de capa" currentUrl={bannerRemoved ? null : (community?.banner_url ?? null)}
              file={bannerFile} onFileChange={(file) => { setBannerFile(file); setBannerRemoved(false); }}
              onClear={() => { setBannerFile(null); setBannerRemoved(true); }} disabled={save.isPending} />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" disabled={save.isPending} onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={save.isPending}>
              {edit ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {save.isPending ? "Salvando..." : edit ? "Salvar alterações" : "Criar comunidade"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
