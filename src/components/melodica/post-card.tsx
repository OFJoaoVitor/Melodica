import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowBigUp, Bookmark, MessageCircle, Share2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { FeedPost } from "@/lib/posts";
import { initials, timeAgo } from "@/lib/melodica";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function PostCard({ post, userId }: { post: FeedPost; userId: string }) {
  const queryClient = useQueryClient();
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");

  const liked = post.post_votes.some((vote) => vote.user_id === userId);
  const saved = (post.saved_posts ?? []).some((item) => item.user_id === userId);
  const commentCount = post.comments?.[0]?.count ?? 0;

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (liked) {
        const { error } = await supabase
          .from("post_votes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("post_votes")
          .insert({ post_id: post.id, user_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["profile-liked-ids"] });
    },
    onError: () => toast.error("Não foi possível registrar sua curtida."),
  });

  const toggleSave = useMutation({
    mutationFn: async () => {
      if (saved) {
        const { error } = await supabase
          .from("saved_posts")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("saved_posts")
          .insert({ post_id: post.id, user_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      toast.success(saved ? "Removido dos salvos" : "Salvo para depois");
    },
    onError: () => toast.error("Não foi possível salvar agora."),
  });

  const sendComment = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("comments")
        .insert({ post_id: post.id, author_id: userId, content: comment.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      setComment("");
      setShowComment(false);
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      toast.success("Comentário publicado.");
    },
    onError: () => toast.error("Não foi possível comentar agora."),
  });

  const authorName = post.author?.display_name || post.author?.username || "Usuário";

  return (
    <article className="rounded-lg border bg-card p-4 transition-shadow hover:shadow-[var(--shadow-soft)] sm:p-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {post.author?.username ? (
          <Link to="/u/$username" params={{ username: post.author.username }} className="inline-flex min-w-0 items-center gap-2 rounded-md hover:text-primary" title={`Ver perfil de @${post.author.username}`}>
            <Avatar className="h-7 w-7"><AvatarFallback className="bg-primary-soft text-[10px] text-accent-foreground">{initials(authorName)}</AvatarFallback></Avatar>
            <span className="truncate font-medium text-foreground hover:text-primary">{authorName}</span>
            <span className="hidden text-muted-foreground sm:inline">@{post.author.username}</span>
          </Link>
        ) : (
          <><Avatar className="h-7 w-7"><AvatarFallback className="bg-primary-soft text-[10px] text-accent-foreground">{initials(authorName)}</AvatarFallback></Avatar><span className="font-medium text-foreground">{authorName}</span></>
        )}
        {post.community ? (
          <>
            <span aria-hidden>·</span>
            <span className="text-primary">m/{post.community.slug}</span>
          </>
        ) : null}
        <span aria-hidden>·</span>
        <time dateTime={post.created_at}>{timeAgo(post.created_at)}</time>
      </div>

      <h2 className="mt-3 font-display text-base font-semibold text-ink">{post.title}</h2>
      {post.content ? (
        <p className="mt-1.5 text-sm whitespace-pre-line text-muted-foreground">{post.content}</p>
      ) : null}

      {post.media_url && post.post_type === "IMAGE" ? (
        <img
          src={post.media_url}
          alt={post.title}
          loading="lazy"
          className="mt-3 max-h-96 w-full rounded-md border object-cover"
        />
      ) : null}
      {post.media_url && post.post_type === "AUDIO" ? (
        <audio controls src={post.media_url} className="mt-3 w-full">
          Seu navegador não suporta áudio.
        </audio>
      ) : null}
      {post.media_url && post.post_type === "VIDEO" ? (
        <a
          href={post.media_url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-sm text-primary hover:underline"
        >
          Assistir ao vídeo
        </a>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleLike.mutate()}
          disabled={toggleLike.isPending}
          aria-pressed={liked}
          className={cn("gap-1.5 text-muted-foreground", liked && "bg-primary-soft text-accent-foreground")}
        >
          <ArrowBigUp className="h-4 w-4" />
          {post.post_votes.length}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowComment((v) => !v)}
          className="gap-1.5 text-muted-foreground"
        >
          <MessageCircle className="h-4 w-4" />
          {commentCount}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleSave.mutate()}
          aria-pressed={saved}
          className={cn("gap-1.5 text-muted-foreground", saved && "text-primary")}
        >
          <Bookmark className="h-4 w-4" />
          Salvar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          onClick={() => {
            void navigator.clipboard?.writeText(`${window.location.origin}/feed#${post.id}`);
            toast.success("Link copiado.");
          }}
        >
          <Share2 className="h-4 w-4" />
          Compartilhar
        </Button>
      </div>

      {showComment ? (
        <form
          className="mt-3 space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (comment.trim().length < 2) return;
            sendComment.mutate();
          }}
        >
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Escreva um comentário"
            aria-label="Comentário"
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowComment(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={sendComment.isPending}>
              Comentar
            </Button>
          </div>
        </form>
      ) : null}
    </article>
  );
}
