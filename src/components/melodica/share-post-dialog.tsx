import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Check, Copy, ExternalLink, Link2, Mail, Music2, Search, Send,
  Share2, UserRoundPlus, UsersRound,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { initials } from "@/lib/melodica";
import { fetchFollowingMusicians, sendMessage, type FeedPost } from "@/lib/posts";

const normalizeSearch = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");

export function SharePostDialog({
  post,
  open,
  onOpenChange,
  userId,
}: {
  post: FeedPost;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const url = typeof window !== "undefined" ? `${window.location.origin}/post/${post.id}` : `/post/${post.id}`;

  const {
    data: following = [],
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["messaging-following", userId],
    queryFn: fetchFollowingMusicians,
    enabled: open && !!userId,
    staleTime: 15_000,
  });

  const contacts = useMemo(() => {
    const term = normalizeSearch(search.trim().replace(/^@/, ""));
    return following.filter(person =>
      person.id !== userId &&
      (!term || normalizeSearch(`${person.display_name} ${person.username} ${person.primary_instrument ?? ""}`).includes(term)),
    );
  }, [following, search, userId]);

  const recipient = following.find(person => person.id === recipientId) ?? null;
  const send = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) => sendMessage(id, post.id, content),
    onSuccess: async (_, variables) => {
      setSentTo(variables.id);
      toast.success("Publicação enviada na conversa!");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["conversations"] }),
        queryClient.invalidateQueries({ queryKey: ["messages", variables.id] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      ]);
    },
    onError: (error: Error) => toast.error(error.message || "Não foi possível compartilhar a publicação."),
  });

  useEffect(() => {
    if (open) return;
    setSearch("");
    setRecipientId(null);
    setMessage("");
    setSentTo(null);
    send.reset();
  }, [open]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado!");
    } catch {
      toast.error("Não foi possível copiar automaticamente. Selecione o link abaixo.");
    }
  }

  const external = (destination: string) => window.open(destination, "_blank", "noopener,noreferrer");

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: post.title, url });
      } catch (error) {
        if ((error as Error)?.name !== "AbortError") toast.error("Não foi possível abrir o compartilhamento.");
      }
    } else {
      await copyLink();
      toast.info("Cole o link no aplicativo em que quiser compartilhar.");
    }
  }

  function choosePerson(id: string) {
    if (send.isPending) return;
    setRecipientId(id);
    setSentTo(null);
  }

  function handleSend() {
    if (!recipient || send.isPending || sentTo === recipient.id) return;
    send.mutate({ id: recipient.id, content: message.trim() });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,760px)] w-[calc(100%-1.5rem)] overflow-y-auto rounded-2xl border-border bg-card p-4 shadow-xl sm:max-w-[480px] sm:p-6">
        <DialogHeader className="pr-6 text-left">
          <DialogTitle className="text-xl font-semibold tracking-tight">Compartilhar publicação</DialogTitle>
          <DialogDescription>Envie este post para alguém que você segue.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Music2 className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{post.title}</p>
            <p className="truncate text-xs text-muted-foreground">por {post.author?.display_name || post.author?.username || "Músico da Melodica"}</p>
          </div>
          <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </div>

        <Tabs defaultValue="melodica" className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-xl bg-muted/70 p-1">
            <TabsTrigger value="melodica" className="rounded-lg text-xs sm:text-sm">Na Melodica</TabsTrigger>
            <TabsTrigger value="external" className="rounded-lg text-xs sm:text-sm">Outros aplicativos</TabsTrigger>
          </TabsList>

          <TabsContent value="melodica" className="mt-4 space-y-3">
            {sentTo && recipient ? (
              <div role="status" className="space-y-4 py-3 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"><Check className="h-6 w-6" /></div>
                <div>
                  <p className="font-semibold">Enviado para {recipient.display_name}!</p>
                  <p className="mt-1 text-sm text-muted-foreground">A publicação já está na conversa de vocês.</p>
                </div>
                <Button asChild className="w-full rounded-xl"><Link to="/messages" search={{ to: recipient.id }} onClick={() => onOpenChange(false)}>Ver conversa <ExternalLink className="ml-1 h-4 w-4" /></Link></Button>
                <Button variant="ghost" className="w-full" onClick={() => {setRecipientId(null); setSentTo(null); setMessage(""); setSearch("");}}>Enviar para outra pessoa</Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label htmlFor={`share-search-${post.id}`} className="flex items-center gap-2 text-sm font-semibold">
                    <UsersRound className="h-4 w-4 text-primary" aria-hidden /> Pessoas que você segue
                    {!isLoading && !isError && <span className="ml-auto text-xs font-normal text-muted-foreground">{following.length}</span>}
                  </label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                    <Input
                      id={`share-search-${post.id}`}
                      value={search}
                      onChange={event => setSearch(event.target.value)}
                      placeholder="Buscar nome ou @usuário"
                      className="h-10 rounded-xl pl-9"
                      autoComplete="off"
                    />
                  </div>
                </div>

                <div className="max-h-48 min-h-24 space-y-1 overflow-y-auto rounded-xl border border-border p-1.5" aria-label="Escolher destinatário">
                  {(isLoading || (isFetching && following.length === 0)) && <p className="px-3 py-7 text-center text-sm text-muted-foreground">Carregando seus contatos...</p>}
                  {isError && (
                    <div className="space-y-2 px-3 py-5 text-center">
                      <p className="text-sm text-destructive">Não foi possível carregar quem você segue.</p>
                      <Button variant="outline" size="sm" onClick={() => void refetch()}>Tentar novamente</Button>
                    </div>
                  )}
                  {!isLoading && !isError && contacts.length === 0 && (
                    <div className="flex flex-col items-center gap-2 px-4 py-5 text-center">
                      <UserRoundPlus className="h-6 w-6 text-muted-foreground" aria-hidden />
                      <p className="text-sm font-medium">{search.trim() ? "Ninguém encontrado" : "Você ainda não segue ninguém"}</p>
                      <p className="text-xs text-muted-foreground">{search.trim() ? "Tente buscar outro nome." : "Siga outros músicos para enviar publicações por mensagem."}</p>
                      {!search.trim() && <Button variant="outline" size="sm" asChild><Link to="/explore" onClick={() => onOpenChange(false)}>Explorar músicos</Link></Button>}
                    </div>
                  )}
                  {!isError && contacts.map(person => (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => choosePerson(person.id)}
                      aria-pressed={recipientId === person.id}
                      disabled={send.isPending}
                      className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${recipientId === person.id ? "bg-primary/10" : ""}`}
                    >
                      <Avatar className="h-10 w-10 shrink-0">
                        {person.avatar_url && <AvatarImage src={person.avatar_url} alt="" className="object-cover" />}
                        <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">{initials(person.display_name || person.username)}</AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{person.display_name}</span>
                        <span className="block truncate text-xs text-muted-foreground">@{person.username}{person.primary_instrument ? ` · ${person.primary_instrument}` : ""}</span>
                      </span>
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${recipientId === person.id ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"}`}>
                        {recipientId === person.id && <Check className="h-3 w-3" aria-hidden />}
                      </span>
                    </button>
                  ))}
                </div>

                {recipient && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor={`share-message-${post.id}`}>Mensagem (opcional)</label>
                    <Textarea
                      id={`share-message-${post.id}`}
                      rows={2}
                      maxLength={2000}
                      value={message}
                      onChange={event => setMessage(event.target.value)}
                      disabled={send.isPending}
                      placeholder={`Escreva algo para ${recipient.display_name}...`}
                      className="max-h-28 min-h-[68px] resize-none rounded-xl"
                    />
                  </div>
                )}
                <Button className="h-11 w-full rounded-xl" disabled={!recipient || isError || send.isPending} onClick={handleSend}>
                  <Send className="mr-1.5 h-4 w-4" aria-hidden /> {send.isPending ? "Enviando..." : recipient ? `Enviar para ${recipient.display_name}` : "Escolha alguém para enviar"}
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="external" className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Button variant="outline" onClick={() => external(`https://api.whatsapp.com/send?text=${encodeURIComponent(`${post.title} ${url}`)}`)}>WhatsApp <ExternalLink className="h-3 w-3" /></Button>
              <Button variant="outline" onClick={() => external(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(post.title)}`)}>Telegram <ExternalLink className="h-3 w-3" /></Button>
              <Button variant="outline" onClick={() => external(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`)}>Facebook <ExternalLink className="h-3 w-3" /></Button>
              <Button variant="outline" onClick={() => { window.location.href = `mailto:?subject=${encodeURIComponent(post.title)}&body=${encodeURIComponent(url)}`; }}><Mail className="h-4 w-4" /> E-mail</Button>
              <Button variant="outline" onClick={() => void nativeShare()}><Share2 className="h-4 w-4" /> Outros apps</Button>
              <Button variant="outline" onClick={() => void copyLink()}><Copy className="h-4 w-4" /> Copiar link</Button>
            </div>
            <Input value={url} readOnly aria-label="Link da publicação" onFocus={event => event.currentTarget.select()} />
            <p className="text-xs leading-relaxed text-muted-foreground">Você também pode copiar o link ou usar as opções de compartilhamento disponíveis no seu dispositivo.</p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
