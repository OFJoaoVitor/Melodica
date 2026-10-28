import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchCommunities } from "@/lib/posts";
import type { PostType } from "@/lib/melodica";
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
  const [mediaUrl, setMediaUrl] = useState("");
  const [communityId, setCommunityId] = useState(defaultCommunityId ?? "none");

  const { data: communities } = useQuery({ queryKey: ["communities"], queryFn: fetchCommunities });

  const createPost = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("posts").insert({
        author_id: userId,
        community_id: communityId === "none" ? null : communityId,
        title: title.trim(),
        content: content.trim() || null,
        post_type: postType,
        media_url: postType === "TEXT" ? null : mediaUrl.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["profile-post-count"] });
      toast.success("Publicação criada.");
      setTitle("");
      setContent("");
      setMediaUrl("");
      setPostType("TEXT");
      onOpenChange(false);
    },
    onError: () => toast.error("Não foi possível publicar agora."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
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
            <Select value={postType} onValueChange={(v) => setPostType(v as PostType)}>
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

          {postType !== "TEXT" ? (
            <div className="space-y-2">
              <Label htmlFor="media">Link da mídia</Label>
              <Input
                id="media"
                type="url"
                placeholder="https://..."
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
              />
            </div>
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
