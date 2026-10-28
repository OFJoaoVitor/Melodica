import { Heart, MessageCircle, Share2 } from "lucide-react";

const posts = [
  {
    author: "Marina Vieira",
    handle: "@marinav",
    community: "m/canto",
    title: "Aquecimento vocal que mudou meus ensaios",
    body: "Comecei a fazer 8 minutos de sirene antes de cantar e a resistência no agudo melhorou muito.",
    votes: 128,
    comments: 24,
  },
  {
    author: "Estúdio Nortes",
    handle: "@nortes",
    community: "m/producao-musical",
    title: "Mixagem: 3 erros que eu cometia no home studio",
    body: "Compressão em série sem ganho de referência era o pior deles.",
    votes: 342,
    comments: 61,
  },
];

export function MockFeed() {
  return (
    <div className="rounded-xl border bg-card p-3 shadow-[var(--shadow-card)] sm:p-4">
      <div className="mb-3 flex items-center gap-2 border-b pb-3">
        <div className="soundwave h-4">
          <span style={{ height: "60%" }} />
          <span style={{ height: "100%", animationDelay: "150ms" }} />
          <span style={{ height: "45%", animationDelay: "300ms" }} />
        </div>
        <div className="h-2 w-24 rounded-full bg-muted" />
        <div className="ml-auto h-6 w-20 rounded-md bg-primary-soft" />
      </div>

      <div className="space-y-3">
        {posts.map((post) => (
          <article key={post.handle} className="rounded-lg border bg-background p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-soft text-[11px] font-semibold text-accent-foreground">
                {post.author.slice(0, 2)}
              </span>
              <span className="font-medium text-foreground">{post.author}</span>
              <span aria-hidden>·</span>
              <span className="text-primary">{post.community}</span>
            </div>
            <h3 className="mt-2 text-sm font-semibold text-ink">{post.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{post.body}</p>
            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Heart className="h-3.5 w-3.5" /> {post.votes}
              </span>
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5" /> {post.comments}
              </span>
              <span className="inline-flex items-center gap-1">
                <Share2 className="h-3.5 w-3.5" /> Compartilhar
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
