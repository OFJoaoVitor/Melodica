import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ArrowUpRight, AudioLines, MessageCircle, Music2, Search, Send, UsersRound } from "lucide-react";
import { AppShell } from "@/components/melodica/app-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fetchConversations, fetchFollowingMusicians, fetchMessages, sendMessage } from "@/lib/posts";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { initials, timeAgo } from "@/lib/melodica";

export const Route = createFileRoute("/_authenticated/messages")({
  validateSearch: (search: Record<string, unknown>): {to?: string} =>
    typeof search.to === "string" && /^[0-9a-f-]{36}$/i.test(search.to) ? {to: search.to} : {},
  head: () => ({ meta: [{ title: "Mensagens diretas — Melodica" }] }),
  component: MessagesPage,
});

type Recipient = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  primary_instrument?: string | null;
};

function PersonAvatar({ person, size = "h-11 w-11" }: { person: Recipient; size?: string }) {
  return (
    <Avatar className={`${size} shrink-0 border-2 border-background shadow-sm`}>
      {person.avatar_url && <AvatarImage src={person.avatar_url} alt="" className="object-cover" />}
      <AvatarFallback className="bg-primary-soft text-sm font-semibold text-primary">{initials(person.display_name || person.username)}</AvatarFallback>
    </Avatar>
  );
}

function MessagesPage() {
  const { user } = useSession();
  const { to } = Route.useSearch();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(to ?? null);
  const [pane, setPane] = useState<"conversations" | "following">("conversations");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (to) setSelected(to); }, [to]);
  useEffect(() => { setDraft(""); }, [selected]);

  const { data: conversations = [], isLoading: loadingConversations, error: conversationsError, refetch: reloadConversations } = useQuery({
    queryKey: ["conversations"], queryFn: fetchConversations, refetchInterval: 8_000,
  });
  const { data: following = [], isLoading: loadingFollowing, error: followingError, refetch: reloadFollowing } = useQuery({
    queryKey: ["messaging-following", user?.id], queryFn: fetchFollowingMusicians,
    enabled: !!user?.id, refetchInterval: 30_000,
  });
  const { data: recipientFromProfile } = useQuery<Recipient | null>({
    queryKey: ["messaging-recipient", selected], enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles")
        .select("id,username,display_name,avatar_url,primary_instrument").eq("id", selected!).maybeSingle();
      if (error) throw error;
      return data as Recipient | null;
    },
  });
  const person = (conversations.find(c => c.other_id === selected)
    ?? following.find(p => p.id === selected)
    ?? recipientFromProfile) as Recipient | null | undefined;

  const { data: messages = [], isLoading: loadingMessages, error: messagesError, refetch: reloadMessages } = useQuery({
    queryKey: ["messages", selected], queryFn: () => fetchMessages(selected!),
    enabled: !!selected && selected !== user?.id, refetchInterval: 5_000,
  });

  useEffect(() => {
    if (selected && !loadingMessages && !messagesError) {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    }
  }, [selected, loadingMessages, messagesError, messages, queryClient]);

  const send = useMutation({
    mutationFn: (content: string) => sendMessage(selected!, null, content),
    onSuccess: async () => {
      setDraft("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["messages", selected] }),
        queryClient.invalidateQueries({ queryKey: ["conversations"] }),
      ]);
      setPane("conversations");
    },
    onError: (error: Error) => toast.error(error.message || "Não foi possível enviar a mensagem."),
  });

  const filteredConversations = useMemo(() => conversations.filter(c =>
    `${c.display_name} ${c.username}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))
  ), [conversations, search]);
  const filteredFollowing = useMemo(() => following.filter(p =>
    `${p.display_name} ${p.username} ${p.primary_instrument || ""}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))
  ), [following, search]);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, selected]);

  function selectPerson(id: string) {
    if (id === user?.id) return;
    setSelected(id);
  }
  function handleSend() {
    const content = draft.trim();
    if (!content || !selected || send.isPending || content.length > 2000) return;
    send.mutate(content);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="melodica-page-heading py-1">
          <p className="melodica-kicker"><AudioLines className="h-3.5 w-3.5" /> CONEXÕES EM SINTONIA</p>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">Mensagens diretas<span className="text-primary">.</span></h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Encontre seus contatos e mantenha a conversa fluindo.</p>
        </header>

        <section aria-label="Caixa de mensagens" className="melodica-messenger grid overflow-hidden rounded-3xl border bg-card shadow-card md:grid-cols-[minmax(245px,320px)_minmax(0,1fr)]">
          <aside className={`min-w-0 border-border md:border-r ${selected ? "hidden md:block" : "block"}`}>
            <div className="border-b p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-base font-bold text-ink">Sua caixa de entrada</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">{conversations.length} {conversations.length === 1 ? "conversa" : "conversas"} · {following.length} seguindo</p>
                </div>
                <Button type="button" variant="outline" size="icon" className="rounded-xl" onClick={() => { setPane("following");setSearch(""); }} title="Nova mensagem" aria-label="Nova mensagem"><MessageCircle className="h-4 w-4" /></Button>
              </div>
              <div className="relative mt-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar músico..." aria-label="Buscar entre conversas e seguidos" className="rounded-xl bg-surface pl-9" />
              </div>
              <div role="tablist" aria-label="Contatos de mensagens" className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
                <button type="button" role="tab" aria-selected={pane === "conversations"} onClick={() => setPane("conversations")} className={`rounded-lg px-2 py-2 text-xs font-semibold transition ${pane === "conversations" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>Conversas</button>
                <button type="button" role="tab" aria-selected={pane === "following"} onClick={() => setPane("following")} className={`rounded-lg px-2 py-2 text-xs font-semibold transition ${pane === "following" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>Seguindo ({following.length})</button>
              </div>
            </div>

            <div className="melodica-contact-list max-h-[560px] min-h-[280px] overflow-y-auto p-2 sm:p-3" role="tabpanel">
              {pane === "conversations" ? <>
                {loadingConversations && <p className="p-3 text-sm text-muted-foreground">Carregando conversas...</p>}
                {conversationsError && <div className="p-3 text-sm text-destructive">Erro ao carregar conversas. <button type="button" className="underline" onClick={() => void reloadConversations()}>Tentar novamente</button></div>}
                {!loadingConversations && !conversationsError && filteredConversations.length === 0 && <div className="flex flex-col items-center gap-3 px-5 py-12 text-center"><MessageCircle className="h-8 w-8 text-primary/60" /><p className="text-sm font-medium text-ink">{search ? "Nenhuma conversa encontrada" : "Sua primeira conversa começa aqui"}</p><p className="text-xs leading-5 text-muted-foreground">{search ? "Experimente outro nome." : "Escolha alguém que você segue e envie um olá."}</p><Button size="sm" variant="outline" onClick={() => {setPane("following");setSearch("");}}>Ver quem sigo <ArrowUpRight className="h-3.5 w-3.5" /></Button></div>}
                {filteredConversations.map(c => <button key={c.other_id} type="button" onClick={() => selectPerson(c.other_id)} aria-pressed={selected === c.other_id} className={`melodica-contact flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${selected === c.other_id ? "bg-primary-soft text-foreground ring-1 ring-primary/20" : "hover:bg-muted"}`}>
                  <PersonAvatar person={c} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{c.display_name}</span><span className="block truncate text-xs text-muted-foreground">{c.sender_id === user?.id ? "Você: " : ""}{c.post_title ? `♫ ${c.post_title}` : c.content}</span></span><span className="flex flex-col items-end gap-2 self-start whitespace-nowrap pt-1 text-[10px] text-muted-foreground">{timeAgo(c.created_at)}{c.unread_count > 0 && <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground" aria-label={`${c.unread_count} mensagens não lidas`}>{c.unread_count}</span>}</span>
                </button>)}
              </> : <>
                <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Músicos que você acompanha</p>
                {loadingFollowing && <p className="p-3 text-sm text-muted-foreground">Buscando seus contatos...</p>}
                {followingError && <div className="p-3 text-sm text-destructive">Não foi possível carregar quem você segue. <button className="underline" onClick={() => void reloadFollowing()}>Tentar novamente</button></div>}
                {!loadingFollowing && !followingError && filteredFollowing.length === 0 && <div className="flex flex-col items-center gap-3 px-5 py-10 text-center"><UsersRound className="h-8 w-8 text-primary/60" /><p className="text-sm font-medium text-ink">{search ? "Nenhum músico encontrado" : "Você ainda não segue ninguém"}</p><p className="text-xs text-muted-foreground">{search ? "Tente outra busca." : "Siga artistas e músicos para encontrá-los aqui."}</p><Button asChild size="sm" variant="outline"><Link to="/explore">Explorar</Link></Button></div>}
                {filteredFollowing.map(p => <button key={p.id} type="button" onClick={() => selectPerson(p.id)} aria-pressed={selected === p.id} className={`melodica-contact flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${selected === p.id ? "bg-primary-soft ring-1 ring-primary/20" : "hover:bg-muted"}`}>
                  <PersonAvatar person={p} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{p.display_name}</span><span className="block truncate text-xs text-muted-foreground">@{p.username}{p.primary_instrument ? ` · ${p.primary_instrument}` : ""}</span></span><MessageCircle className="h-4 w-4 shrink-0 text-primary/60" />
                </button>)}
              </>}
            </div>
          </aside>

          <div className={`flex min-w-0 flex-col ${selected ? "flex" : "hidden md:flex"}`}>
            {!selected ? <div className="flex min-h-[520px] flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary-soft text-primary"><AudioLines className="h-10 w-10" /></div>
              <h2 className="font-display text-xl font-bold text-ink">Uma conversa pode virar um som incrível.</h2>
              <p className="max-w-sm text-sm leading-6 text-muted-foreground">Escolha uma conversa ou abra a lista de músicos que você segue para enviar uma DM.</p>
              <Button onClick={() => setPane("following")} variant="outline">Encontrar meus contatos <UsersRound className="h-4 w-4" /></Button>
            </div> : selected === user?.id || !person ? <div className="flex min-h-[440px] flex-col items-center justify-center gap-3 px-6 text-center"><p className="font-semibold">Não foi possível abrir este perfil.</p><Button variant="outline" onClick={() => setSelected(null)}>Voltar aos contatos</Button></div> : <>
              <header className="flex items-center justify-between gap-2 border-b bg-card/90 px-4 py-3 sm:px-5 sm:py-4">
                <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                  <button type="button" onClick={() => setSelected(null)} className="rounded-lg p-1.5 hover:bg-muted md:hidden" aria-label="Voltar aos contatos"><ArrowLeft className="h-5 w-5" /></button>
                  <PersonAvatar person={person} size="h-10 w-10" />
                  <div className="min-w-0"><Link to="/u/$username" params={{ username: person.username }} className="block truncate text-sm font-bold text-ink hover:text-primary">{person.display_name}</Link><p className="truncate text-xs text-muted-foreground">@{person.username} · Mensagem direta</p></div>
                </div>
                <Button asChild variant="ghost" size="icon" className="rounded-xl" title="Ver perfil"><Link to="/u/$username" params={{ username: person.username }} aria-label={`Abrir perfil de ${person.display_name}`}><ArrowUpRight className="h-4 w-4" /></Link></Button>
              </header>

              <div ref={scrollRef} className="melodica-message-list flex min-h-[360px] max-h-[540px] flex-1 flex-col gap-3 overflow-y-auto bg-surface/70 px-4 py-5 sm:px-6" aria-live="polite" aria-label={`Mensagens com ${person.display_name}`}>
                <div className="mb-3 flex flex-col items-center gap-2 pb-2 text-center"><PersonAvatar person={person} size="h-14 w-14" /><p className="text-sm font-bold">Conversa com {person.display_name}</p><p className="text-xs text-muted-foreground">Um espaço para ideias, parcerias e música.</p></div>
                {loadingMessages && <p className="text-center text-xs text-muted-foreground">Carregando mensagens...</p>}
                {messagesError && <div className="text-center text-sm text-destructive">Não foi possível carregar as mensagens. <button type="button" className="underline" onClick={() => void reloadMessages()}>Tentar novamente</button></div>}
                {!loadingMessages && !messagesError && messages.length === 0 && <p className="py-5 text-center text-xs text-muted-foreground">Ainda não há mensagens. Envie a primeira!</p>}
                {messages.map(m => {
                  const mine = m.sender_id === user?.id;
                  return <article key={m.id} className={`w-fit max-w-[90%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[78%] ${mine ? "ml-auto rounded-br-sm bg-primary text-primary-foreground" : "mr-auto rounded-bl-sm border bg-card text-card-foreground"}`}>
                    {m.content && <p className="whitespace-pre-wrap break-words text-[13px] leading-6">{m.content}</p>}
                    {m.post_id && <Link to="/post/$postId" params={{ postId: m.post_id }} className={`mt-2 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition hover:opacity-85 ${mine ? "border-white/30 bg-white/15 text-white" : "border-primary/20 bg-primary-soft text-primary"}`}><Music2 className="h-4 w-4 shrink-0" /><span className="truncate">{m.post_title || "Abrir publicação compartilhada"}</span><ArrowUpRight className="h-3.5 w-3.5 shrink-0" /></Link>}
                    <time dateTime={m.created_at} className={`mt-1.5 block text-right text-[10px] ${mine ? "text-white/75" : "text-muted-foreground"}`}>{timeAgo(m.created_at)}</time>
                  </article>;
                })}
              </div>

              <div className="border-t bg-card px-3 py-3 sm:px-5 sm:py-4">
                <form onSubmit={e => {e.preventDefault();handleSend();}} className="flex items-end gap-2">
                  <Textarea value={draft} onChange={e => setDraft(e.target.value)} maxLength={2000} rows={2} placeholder={`Escreva para ${person.display_name}...`} aria-label="Escrever mensagem direta" disabled={send.isPending} className="min-h-11 max-h-36 flex-1 resize-none rounded-xl border-border bg-surface" onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {e.preventDefault();handleSend();} }} />
                  <Button type="submit" size="icon" className="h-11 w-11 shrink-0 rounded-xl" disabled={!draft.trim() || send.isPending} aria-label="Enviar mensagem"><Send className="h-4 w-4" /></Button>
                </form>
                <p className="mt-2 flex justify-between gap-3 text-[10px] text-muted-foreground"><span>Enter para enviar · Shift + Enter para quebrar linha</span><span>{draft.length}/2000</span></p>
              </div>
            </>}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
