import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, MessageSquare, AtSign } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { initials, timeAgo } from "@/lib/melodica";
import { markAllNotificationsRead, markNotificationRead, type NotificationInbox, type MelodicaNotification } from "@/lib/notifications";

export function NotificationsPopover({ inbox, loading, error }: { inbox?: NotificationInbox; loading: boolean; error: boolean }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const refresh = () => void queryClient.invalidateQueries({queryKey: ["notifications"]});
  const mark = useMutation({mutationFn: markNotificationRead, onSuccess: refresh, onError: () => toast.error("Não foi possível marcar a notificação como lida.")});
  const markAll = useMutation({mutationFn: markAllNotificationsRead, onSuccess: refresh, onError: () => toast.error("Não foi possível atualizar as notificações.")});

  async function openNotification(item: MelodicaNotification) {
    if (!item.read_at) {
      try { await mark.mutateAsync(item.id); }
      catch {   }
    }
    setOpen(false);
    if (item.kind === "MESSAGE") {
      await navigate({ to: "/messages", search: { to: item.actor_id } });
    } else if (item.post_id) {
      await navigate({ to: "/post/$postId", params: { postId: item.post_id } });
    }
  }

  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <Button type="button" size="icon" variant="ghost" aria-label={`Notificações${inbox?.unread ? `, ${inbox.unread} não lidas` : ""}`} title="Notificações" className="relative rounded-xl">
        <Bell className="h-5 w-5" />
        {!!inbox?.unread && <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground ring-2 ring-background">{inbox.unread > 99 ? "99+" : inbox.unread}</span>}
      </Button>
    </PopoverTrigger>
    <PopoverContent align="end" sideOffset={12} className="melodica-notification-box w-[min(92vw,390px)] overflow-hidden rounded-2xl p-0 shadow-xl">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div><h2 className="font-display text-sm font-bold text-ink">Notificações</h2><p className="mt-0.5 text-[11px] text-muted-foreground">{inbox?.unread ?? 0} não {inbox?.unread === 1 ? "lida" : "lidas"}</p></div>
        <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs" disabled={!inbox?.unread || markAll.isPending} onClick={() => markAll.mutate()}><CheckCheck className="h-4 w-4"/> Marcar todas como lidas</Button>
      </div>
      <div className="max-h-[420px] overflow-y-auto p-2" role="list" aria-label="Notificações recebidas">
        {loading && <p className="p-4 text-sm text-muted-foreground">Carregando notificações...</p>}
        {error && <p role="alert" className="p-4 text-sm text-destructive">Não foi possível carregar suas notificações. <button type="button" className="underline" onClick={refresh}>Tentar novamente</button></p>}
        {!loading && !error && !inbox?.notifications.length && <div className="px-5 py-12 text-center"><Bell className="mx-auto h-8 w-8 text-primary/40" /><p className="mt-3 text-sm font-semibold">Tudo em dia por aqui</p><p className="mt-1 text-xs text-muted-foreground">Novas mensagens e marcações aparecerão aqui.</p></div>}
        {inbox?.notifications.map(item => <button type="button" role="listitem" key={item.id} onClick={() => void openNotification(item)} className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-accent/60 ${!item.read_at ? "bg-primary-soft/50" : ""}`}>
          <Avatar className="mt-0.5 h-10 w-10 shrink-0"><AvatarImage src={item.actor_avatar || undefined} alt="" /><AvatarFallback className="bg-primary-soft text-xs text-primary">{initials(item.actor_name)}</AvatarFallback></Avatar>
          <span className="min-w-0 flex-1">
            <span className="block text-xs leading-5"><strong className="text-foreground">{item.actor_name}</strong> {item.kind === "MESSAGE" ? "enviou uma mensagem para você" : "marcou você em um comentário"}</span>
            <span className="mt-1 block truncate text-xs text-muted-foreground">{item.kind === "MESSAGE" ? (item.message_preview || "Compartilhou uma publicação") : item.comment_preview}</span>
            <span className="mt-1 flex items-center gap-1 text-[11px] text-primary">{item.kind === "MESSAGE" ? <MessageSquare className="h-3 w-3" /> : <AtSign className="h-3 w-3" />}{timeAgo(item.created_at)}</span>
          </span>
          {!item.read_at && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Não lida" />}
        </button>)}
      </div>
    </PopoverContent>
  </Popover>;
}
