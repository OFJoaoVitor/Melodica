import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchCommunities } from "@/lib/posts";
import { uploadPostMedia } from "@/lib/media-upload";
import { PostMediaField } from "@/components/melodica/post-media-field";
import type { PostType } from "@/lib/melodica";
import { MUSIC_GENRES, MUSIC_INSTRUMENTS, MUSIC_TOPICS } from "@/lib/music-interests";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const POST_TYPES: { value: PostType; label: string }[] = [
  { value: "TEXT", label: "Texto" },
  { value: "IMAGE", label: "Imagem" },
  { value: "VIDEO", label: "Vídeo" },
  { value: "AUDIO", label: "Música/Áudio" },
];

export function CreatePostDialog({
  open,
  onOpenChange,
  userId,
  defaultCommunityId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  defaultCommunityId?: string;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<PostType>("TEXT");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [communityId, setCommunityId] = useState(defaultCommunityId ?? "none");
  const [genres, setGenres] = useState<string[]>([]);
  const [instruments, setInstruments] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [artists, setArtists] = useState("");
  function toggleCategory(value: string, list: string[], setter: (value: string[]) => void) {
    if (list.includes(value)) setter(list.filter(v => v !== value));
    else if (list.length >= 8) toast.error("Selecione no máximo 8 opções por categoria.");
    else setter([...list, value]);
  }
  const categoryButton = (label: string, selected: boolean, onClick: () => void) => (
    <button type="button" key={label} onClick={onClick} aria-pressed={selected} className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/50"}`}>{label}</button>
  );

  const { data: communities } = useQuery({ queryKey: ["communities"], queryFn: fetchCommunities });

  const createPost = useMutation({
    mutationFn: async () => {
      if (postType !== "TEXT" && !mediaFile) throw new Error("Selecione um arquivo do computador antes de publicar.");
      const mediaUrl = postType === "TEXT" ? null : await uploadPostMedia(mediaFile!, postType);
      const { error } = await supabase.from("posts").insert({
        author_id: userId,
        community_id: communityId === "none" ? null : communityId,
        title: title.trim(),
        content: content.trim() || null,
        post_type: postType,
        media_url: mediaUrl,
        genres,
        instruments,
        topics,
        artists: [...new Map(artists.split(",").map(v => v.replace(/\s+/g, " ").trim()).filter(Boolean).map(v => [v.toLocaleLowerCase("pt-BR"), v] as const)).values()],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["profile-post-count"] });
      toast.success("Publicação criada.");
      setTitle("");
      setContent("");
      setMediaFile(null);
      setGenres([]);
      setInstruments([]);
      setTopics([]);
      setArtists("");
      setPostType("TEXT");
      onOpenChange(false);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível publicar agora."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Criar publicação</DialogTitle>
          <DialogDescription>Compartilhe algo com a sua comunidade musical.</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (title.trim().length < 3) {
              toast.error("Dê um título com pelo menos 3 caracteres.");
              return;
            }
            const artistValues = artists.split(",").map(v => v.trim()).filter(Boolean);
            if (artistValues.length > 8 || artistValues.some(v => v.length > 80 || /[<>\r\n]/.test(v))) {
              toast.error("Informe até 8 artistas, com no máximo 80 caracteres cada.");
              return;
            }
            createPost.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="community">Comunidade</Label>
            <Select value={communityId} onValueChange={setCommunityId}>
              <SelectTrigger id="community">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Publicação geral (sem comunidade)</SelectItem>
                {(communities ?? []).map((community) => (
                  <SelectItem key={community.id} value={community.id}>
                    m/{community.slug}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <Select value={postType} onValueChange={(v) => { setPostType(v as PostType); setMediaFile(null); }}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POST_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Conteúdo</Label>
            <Textarea
              id="content"
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          <details className="rounded-xl border bg-surface/50 p-4" open>
            <summary className="cursor-pointer text-sm font-semibold text-ink">Classifique sua publicação para alcançar quem gosta desse som</summary>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">Esses campos são opcionais e ajudam o algoritmo a recomendar seu conteúdo. Se não preencher, o texto e a comunidade da postagem ainda poderão ser considerados.</p>
            <div className="mt-4 space-y-4">
              <div><Label>Gêneros</Label><div className="mt-2 flex flex-wrap gap-1.5">{MUSIC_GENRES.map(v => categoryButton(v, genres.includes(v), () => toggleCategory(v, genres, setGenres)))}</div></div>
              <div><Label>Instrumentos</Label><div className="mt-2 flex flex-wrap gap-1.5">{MUSIC_INSTRUMENTS.map(v => categoryButton(v, instruments.includes(v), () => toggleCategory(v, instruments, setInstruments)))}</div></div>
              <div><Label>Assuntos musicais</Label><div className="mt-2 flex flex-wrap gap-1.5">{MUSIC_TOPICS.map(v => categoryButton(v, topics.includes(v), () => toggleCategory(v, topics, setTopics)))}</div></div>
              <div className="space-y-2"><Label htmlFor="post-artists">Artistas e bandas (opcional)</Label>
                <Input id="post-artists" value={artists} onChange={event => setArtists(event.target.value)} placeholder="Ex.: Kirk Franklin, Bruno Mars" maxLength={450} />
                <p className="text-xs text-muted-foreground">Separe os nomes por vírgula (máximo 8).</p></div>
            </div>
          </details>

          {postType !== "TEXT" ? (
            <PostMediaField type={postType} file={mediaFile} onChange={setMediaFile} disabled={createPost.isPending}/>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createPost.isPending}>
              {createPost.isPending ? "Publicando..." : "Publicar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
