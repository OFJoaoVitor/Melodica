import { apiGet, apiPut } from "@/integrations/supabase/client";
import type { MusicInterests } from "@/lib/music-interests";

export async function fetchMusicInterests(): Promise<MusicInterests> {
  const { interests } = await apiGet<{ interests: MusicInterests }>("/interests");
  return interests;
}

export async function saveMusicInterests(data: MusicInterests): Promise<MusicInterests> {
  const { interests } = await apiPut<{ interests: MusicInterests }>("/interests", data);
  return interests;
}
