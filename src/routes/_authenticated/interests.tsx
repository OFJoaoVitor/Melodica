import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate, useRouter, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Headphones, Music2, Search, Sparkles, X } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { MelodicaLogo } from "@/components/melodica/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchMusicInterests, saveMusicInterests } from "@/lib/interests-api";
import { MUSIC_ARTISTS, MUSIC_GENRES, MUSIC_INSTRUMENTS, MUSIC_TOPICS, type MusicInterests, type InterestKey, selectedCount } from "@/lib/music-interests";

export const Route = createFileRoute("/_authenticated/interests")({
  component: InterestsPage,
  head: () => ({ meta: [ { title: "Seus interesses musicais — Melodica" }, { name: "description", content: "Personalize as recomendações de música e músicos da Melodica." } ] }),
});

const steps = [
  { label: "Gêneros", title: "Qual é a sua vibe musical?", description: "Selecione os gêneros que fazem parte da sua playlist. Você pode escolher quantos quiser." },
  { label: "Instrumentos", title: "Sua relação com os instrumentos", description: "Conte o que você já toca e o que pretende aprender. Cada instrumento pode ficar em uma categoria." },
  { label: "Artistas", title: "Quem inspira você?", description: "Escolha seus artistas e bandas favoritas. Se não encontrar algum, adicione pelo nome." },
  { label: "Assuntos", title: "O que você quer descobrir?", description: "Esses assuntos ajudarão a aproximar você de tutoriais, debates e pessoas que compartilham suas curiosidades." },
  { label: "Revisão", title: "Sua Melodica, do seu jeito!", description: "Confira suas escolhas. Você poderá alterá-las nas configurações quando quiser." },
];
function normalize(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
function OptionChip({ text, selected, onClick }: { text: string; selected: boolean; onClick: () => void }) {
  return <button type="button" aria-pressed={selected} onClick={onClick} className={`flex min-h-10 items-center justify-between gap-2 rounded-xl border px-4 py-2 text-left text-sm font-medium transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${selected ? "border-primary bg-primary-soft text-primary shadow-sm" : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary-soft/30"}`}>
    <span>{text}</span>{selected ? <Check size={15} className="shrink-0" /> : null}
  </button>;
}

function InterestsPage() {
  const { user } = useSession();
  const userId = user?.id;
  const navigate = useNavigate();
  const router = useRouter();
  const client = useQueryClient();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<MusicInterests | null>(null);
  const [artistQuery, setArtistQuery] = useState("");
  const [errorText, setErrorText] = useState("");
  const { data: stored, isLoading, error } = useQuery({ queryKey: ["music-interests", userId], queryFn: fetchMusicInterests, enabled: !!userId, staleTime: 0 });
  const key = userId ? `melodica-interests-draft-${userId}` : "";

  useEffect(() => {
    if (!stored || !userId || draft) return;
    let initial = stored;
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (["genres", "instruments_played", "instruments_learning", "artists", "topics"].every(field => Array.isArray(parsed[field]))) {
          initial = { ...stored, ...parsed, completed: stored.completed };
        }
      }
    } catch {  }
    setDraft(initial);
  }, [stored, userId, key, draft]);
  useEffect(() => {
    if (!draft || !key) return;
    try { localStorage.setItem(key, JSON.stringify(draft)); }
    catch {  }
  }, [draft, key]);

  const save = useMutation({
    mutationFn: async () => {
      if (!draft || selectedCount(draft) < 1) throw new Error("Escolha pelo menos um interesse para concluir.");
      return saveMusicInterests(draft);
    },
    onSuccess: async () => {
      try { localStorage.removeItem(key); } catch {  }
      await client.invalidateQueries({ queryKey: ["music-interests"] });
      await client.invalidateQueries({ queryKey: ["feed"] });
      await router.invalidate();
      toast.success("Seus interesses foram salvos! Seu feed já está personalizado.");
      await navigate({ to: stored?.completed ? "/settings" : "/feed", replace: true });
    },
    onError: (reason) => {
      const message = reason instanceof Error ? reason.message : "Não foi possível salvar seus interesses.";
      setErrorText(message);
      toast.error(message);
    },
  });

  function toggle(field: InterestKey, option: string) {
    const max = field === "artists" ? 40 : field === "genres" ? 24 : field === "topics" ? 17 : 15;
    if (draft && !draft[field].some(v => normalize(v) === normalize(option)) && draft[field].length >= max) {
      setErrorText(`Limite de ${max} opções nesta categoria.`);
      return;
    }
    setErrorText("");
    setDraft(current => {
      if (!current) return null;
      const exists = current[field].some(v => normalize(v) === normalize(option));
      const updated = exists ? current[field].filter(v => normalize(v) !== normalize(option)) : [...current[field], option];
      if (field === "instruments_played" && !exists) return { ...current, instruments_played: updated, instruments_learning: current.instruments_learning.filter(v => v !== option) };
      if (field === "instruments_learning" && !exists) return { ...current, instruments_learning: updated, instruments_played: current.instruments_played.filter(v => v !== option) };
      return { ...current, [field]: updated };
    });
  }
  const artistChoices = useMemo(() => {
    if (!draft) return [];
    const all = [...MUSIC_ARTISTS, ...draft.artists.filter(v => !MUSIC_ARTISTS.some(a => normalize(a) === normalize(v)))];
    return all.filter(v => normalize(v).includes(normalize(artistQuery)));
  }, [draft, artistQuery]);
  function addArtist() {
    if (!draft) return;
    const name = artistQuery.replace(/\s+/g, " ").trim();
    if (!name || name.length > 80 || /[<>\r\n]/.test(name)) { setErrorText("Informe um nome válido de até 80 caracteres."); return; }
    if (draft.artists.length >= 40 && !draft.artists.some(v => normalize(v) === normalize(name))) { setErrorText("Limite de 40 artistas."); return; }
    if (!draft.artists.some(v => normalize(v) === normalize(name))) toggle("artists", name);
    setArtistQuery("");
    setErrorText("");
  }
  const selected = (field: InterestKey, value: string) => !!draft?.[field].some(v => normalize(v) === normalize(value));
  const next = () => { setErrorText(""); setStep(s => Math.min(s + 1, steps.length - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const back = () => { setErrorText(""); setStep(s => Math.max(0, s - 1)); };

  return (
    <div className="min-h-screen bg-surface text-foreground">
      <header className="border-b bg-background/90">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-8">
          {stored?.completed ? <Link to="/settings"><MelodicaLogo /></Link> : <MelodicaLogo />}
          <span className="rounded-full border border-primary/20 bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary"><Sparkles className="mr-1 inline h-3.5 w-3.5" /> Seus interesses musicais</span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8 sm:py-12">
        <div className="mb-8 overflow-hidden rounded-[18px] bg-[#193446] px-6 py-7 text-white sm:px-10 sm:py-9">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-white/10 p-3 text-[#8ed4f0]"><Headphones className="h-7 w-7" /></div>
            <div className="min-w-0"><p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#8ed4f0]">A música conecta</p>
              <h1 className="font-display text-2xl font-bold sm:text-4xl">Descubra sua Melodica!</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">Conte um pouco sobre seus gostos musicais para personalizarmos sua experiência. Selecione seus estilos, instrumentos e artistas favoritos para descobrir conteúdos e músicos que combinam com você.</p>
            </div>
          </div>
        </div>
        <section className="rounded-[18px] border bg-card p-5 sm:p-8" aria-label="Personalização musical">
          <div className="mb-8">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold text-foreground">Etapa {step + 1} de 5</span><span className="text-xs text-muted-foreground">{Math.round(((step + 1) / 5) * 100)}% · {draft ? selectedCount(draft) : 0} interesses selecionados</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Progresso da personalização" aria-valuenow={step + 1} aria-valuemin={0} aria-valuemax={5}><div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${((step + 1) / 5) * 100}%` }} /></div>
            <div className="mt-4 grid grid-cols-5 gap-1.5">{steps.map((s, i) => <button type="button" key={s.label} disabled={!draft} onClick={() => { setErrorText(""); setStep(i); }} className={`rounded-md px-1 py-2 text-center text-[10px] sm:text-xs ${i === step ? "bg-primary-soft font-bold text-primary" : i < step ? "font-medium text-foreground" : "text-muted-foreground"}`}>{s.label}</button>)}</div>
          </div>
          {isLoading || !draft ? <div className="py-12 text-center text-sm text-muted-foreground">{error ? "Não foi possível carregar as preferências. Recarregue a página." : "Carregando seus interesses..."}</div> : <>
            <div className="mb-6"><h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">{steps[step].title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{steps[step].description}</p></div>
            {step === 0 && <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">{MUSIC_GENRES.map(v => <OptionChip key={v} text={v} selected={selected("genres", v)} onClick={() => toggle("genres", v)} />)}</div>}
            {step === 1 && <div className="space-y-4"><div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-2 gap-y-3 border-b pb-3 text-xs font-semibold text-muted-foreground sm:gap-x-5"><span>Instrumento</span><span className="text-center">Já toco</span><span className="text-center">Quero aprender</span></div>{MUSIC_INSTRUMENTS.map(v => <div key={v} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-2 rounded-lg border px-3 py-2.5 sm:gap-x-5"><span className="min-w-0 text-sm font-medium">{v}</span>{(["instruments_played", "instruments_learning"] as const).map(field => <button key={field} type="button" aria-label={`${field === "instruments_played" ? "Já toco" : "Quero aprender"}: ${v}`} aria-pressed={selected(field, v)} onClick={() => toggle(field, v)} className={`flex h-9 w-12 items-center justify-center rounded-lg border text-xs transition-colors sm:w-24 ${selected(field,v) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface text-muted-foreground hover:border-primary"}`}>{selected(field,v) ? <Check size={16} /> : <span className="sm:hidden">—</span>}<span className="hidden sm:inline">{selected(field,v) ? " Marcado" : "Selecionar"}</span></button>)}</div>)}</div>}
            {step === 2 && <div className="space-y-5"><div className="flex flex-col gap-2 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={artistQuery} maxLength={80} onChange={e => setArtistQuery(e.target.value)} onKeyDown={e => {if(e.key === "Enter"){e.preventDefault();addArtist();}}} placeholder="Pesquise artistas e bandas..." className="pl-10" aria-label="Pesquisar artistas e bandas" /></div><Button variant="outline" onClick={addArtist} disabled={!artistQuery.trim()}>Adicionar artista</Button></div>
              {draft.artists.length ? <div className="flex flex-wrap gap-2 rounded-xl bg-primary-soft/50 p-3">{draft.artists.map(v => <button type="button" onClick={() => toggle("artists",v)} key={v} className="flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-1.5 text-xs font-medium text-primary">{v}<X size={13} /></button>)}</div> : null}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">{artistChoices.map(v => <OptionChip key={v} text={v} selected={selected("artists",v)} onClick={() => toggle("artists",v)} />)}</div>
              {!artistChoices.length ? <p className="text-sm text-muted-foreground">Nenhum artista da lista corresponde à busca. Use “Adicionar artista” para incluir esse nome.</p> : null}</div>}
            {step === 3 && <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">{MUSIC_TOPICS.map(v => <OptionChip key={v} text={v} selected={selected("topics",v)} onClick={() => toggle("topics",v)} />)}</div>}
            {step === 4 && <div className="space-y-3">{([
              ["Gêneros musicais",draft.genres],["Instrumentos que toco",draft.instruments_played],
              ["Instrumentos que quero aprender",draft.instruments_learning],["Artistas e bandas",draft.artists],["Assuntos musicais",draft.topics]
            ] as [string,string[]][]).map(([label, items]) => <div key={label} className="rounded-xl border px-4 py-3"><h3 className="text-sm font-semibold text-foreground">{label}</h3><p className="mt-1.5 text-sm leading-6 text-muted-foreground">{items.length ? items.join(" · ") : "Nenhum selecionado (opcional)"}</p></div>)}
              <div className="flex items-start gap-2 rounded-lg bg-primary-soft p-4 text-sm text-primary"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><span>Suas escolhas vão influenciar o feed “Para você”. Você também verá postagens variadas para conhecer novos sons e músicos.</span></div></div>}
            {errorText ? <p role="alert" className="mt-5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{errorText}</p> : null}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-6"><Button type="button" variant="outline" onClick={back} disabled={step===0 || save.isPending}><ArrowLeft size={16}/> Voltar</Button>
              <div className="flex items-center gap-3"><span className="hidden text-xs text-muted-foreground sm:block">{step < 4 ? "Todas as categorias são opcionais" : "Pelo menos 1 interesse obrigatório"}</span>{step < 4 ? <><Button variant="ghost" onClick={next} className="hidden sm:inline-flex">Pular etapa</Button><Button onClick={next}>Continuar <ArrowRight size={16}/></Button></> : <Button disabled={save.isPending} onClick={() => {if(selectedCount(draft)<1){setErrorText("Selecione pelo menos um interesse musical antes de concluir.");return;}save.mutate();}}><Check size={16}/>{save.isPending ? "Salvando..." : stored?.completed ? "Salvar alterações" : "Concluir personalização"}</Button>}</div>
            </div>
          </>}
        </section>
        <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground"><Music2 size={14} /> Seu progresso é salvo neste navegador. As escolhas finais ficam guardadas na sua conta.</p>
      </main>
    </div>
  );
}
