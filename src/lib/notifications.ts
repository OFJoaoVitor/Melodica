import { apiGet, apiPost } from "@/integrations/supabase/client";

export type MelodicaNotification = {
  id: string;
  kind: "MESSAGE" | "MENTION";
  created_at: string;
  read_at: string | null;
  actor_id: string;
  actor_username: string;
  actor_name: string;
  actor_avatar: string | null;
  message_preview: string | null;
  comment_preview: string | null;
  message_id: string | null;
  comment_id: string | null;
  post_id: string | null;
};
export type NotificationInbox = {
  notifications: MelodicaNotification[];
  unread: number;
  unread_messages: number;
};
export const fetchNotifications = () => apiGet<NotificationInbox>("/notifications");
export const markNotificationRead = (id: string) => apiPost<{ok: boolean}>("/notifications/read", { id });
export const markAllNotificationsRead = () => apiPost<{ok: boolean}>("/notifications/read", { all: true });
