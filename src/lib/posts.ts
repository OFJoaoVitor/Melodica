import { apiGet, apiPost, supabase } from "@/integrations/supabase/client";

export type FeedPost = {
  id: string;
  title: string;
  content: string | null;
  post_type: string;
  media_url: string | null;
  created_at: string;
  author_id: string;
  genres?: string;
  instruments?: string;
  artists?: string;
  topics?: string;
  author: {
    username: string;
    display_name: string;
    account_type: string;
    avatar_url: string | null;
  } | null;
  community: { name: string; slug: string } | null;
  post_votes: { user_id: string }[];
  comments: { count: number }[];
  saved_posts?: { user_id: string }[];
};

const SELECT =
  "id,title,content,post_type,media_url,created_at,author_id,genres,instruments,artists,topics," +
  "author:profiles!posts_author_id_fkey(username,display_name,account_type,avatar_url)," +
  "community:communities(name,slug)," +
  "post_votes(user_id),comments(count),saved_posts(user_id)";

export async function fetchFeed(options: {
  sort: "recent" | "popular";
  communityIds?: string[];
  authorIds?: string[];
  postIds?: string[];
  limit?: number;
  savedOnly?: boolean;
  userId?: string;
}) {
  let query = supabase.from("posts").select(SELECT).limit(options.limit ?? 30);

  if (options.postIds) {
    if (options.postIds.length === 0) return [];
    query = query.in("id", options.postIds);
  }

  if (options.communityIds) {
    if (options.communityIds.length === 0) return [];
    query = query.in("community_id", options.communityIds);
  }
  if (options.authorIds) {
    if (options.authorIds.length === 0) return [];
    query = query.in("author_id", options.authorIds);
  }

  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) throw error;

  let posts = (data ?? []) as unknown as FeedPost[];

  if (options.savedOnly && options.userId) {
    posts = posts.filter((post) => (post.saved_posts ?? []).some((s) => s.user_id === options.userId));
  }
  if (options.sort === "popular") {
    posts = [...posts].sort((a, b) => b.post_votes.length - a.post_votes.length);
  }
  return posts;
}

/**
 * Explorar: prioriza o engajamento recente sem inventar posts ou números.
 * Mostra primeiro publicações dos últimos 7 dias; se a rede ainda estiver
 * pouco movimentada, usa os últimos 30 dias ou as publicações existentes.
 */
export async function fetchTrendingPosts(communityId?: string): Promise<FeedPost[]> {
  const posts = await fetchFeed({
    sort: "recent",
    limit: 200,
    ...(communityId ? { communityIds: [communityId] } : {}),
  });
  const now = Date.now();
  const ageInDays = (post: FeedPost) => {
    const iso = post.created_at.includes("T")
      ? post.created_at
      : post.created_at.replace(" ", "T") + "Z";
    const timestamp = new Date(iso).getTime();
    return Number.isFinite(timestamp) ? Math.max(0, (now - timestamp) / 86_400_000) : 365;
  };
  const lastWeek = posts.filter((post) => ageInDays(post) <= 7);
  const lastMonth = posts.filter((post) => ageInDays(post) <= 30);
  const candidates = lastWeek.length ? lastWeek : lastMonth.length ? lastMonth : posts;
  const score = (post: FeedPost) => {
    const votes = post.post_votes?.length ?? 0;
    const comments = post.comments?.[0]?.count ?? 0;
    // Comentários e curtidas aumentam a relevância; a idade reduz seu peso.
    return (1 + votes * 3 + comments * 4) / (1 + ageInDays(post) / 2);
  };
  return [...candidates]
    .sort((a, b) => score(b) - score(a) || ageInDays(a) - ageInDays(b))
    .slice(0, 30);
}

export type Community = {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string | null;
  accent: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  creator_id: string | null;
  created_at: string;
  member_count: number;
  community_members: { user_id: string }[];
};

export async function fetchCommunities(): Promise<Community[]> {
  const { data, error } = await supabase
    .from("communities")
    .select("id,name,slug,description,category,accent,avatar_url,banner_url,creator_id,created_at,member_count,community_members(user_id)")
    .order("member_count", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Community[];
}

/** Retorna o perfil completo de uma comunidade pelo endereço público. */
export async function fetchCommunityBySlug(slug: string): Promise<Community | null> {
  const { data, error } = await supabase
    .from("communities")
    .select("id,name,slug,description,category,accent,avatar_url,banner_url,creator_id,created_at,member_count,community_members(user_id)")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as Community | null;
}

export type SuggestedProfile = {
  id: string;
  username: string;
  display_name: string;
  account_type: string;
  primary_instrument: string | null;
  avatar_url: string | null;
};

export async function fetchSuggestedProfiles(excludeId?: string): Promise<SuggestedProfile[]> {
  let query = supabase
    .from("profiles")
    .select("id,username,display_name,account_type,primary_instrument,avatar_url")
    .limit(5);
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as SuggestedProfile[];
}

export type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author: { username:string; display_name:string; avatar_url:string|null } | null;
  mentions?: { id:string; username:string }[];
};

export async function fetchComments(postId: string): Promise<Comment[]> {
  const { data, error } = await supabase.from("comments")
    .select("id,post_id,author_id,content,created_at,author:profiles!comments_author_id_fkey(username,display_name,avatar_url)")
    .eq("post_id",postId).order("created_at",{ascending:true});
  if (error) throw error;
  return (data ?? []) as Comment[];
}

export type SearchResults = {
  users: { id:string; username:string; display_name:string; avatar_url:string|null }[];
  posts: { id:string;title:string;content:string|null;created_at:string;author_id:string;username:string;display_name:string }[];
};

export async function searchMelodica(term:string): Promise<SearchResults> {
  return apiGet<SearchResults>(`/search?q=${encodeURIComponent(term.trim())}`);
}

export type FollowingMusician = {
  id:string;username:string;display_name:string;avatar_url:string|null;
  account_type:string;primary_instrument:string|null;followed_at:string;
};
export async function fetchFollowingMusicians():Promise<FollowingMusician[]> {
  const response=await apiGet<{following:FollowingMusician[]}>('/following');
  return response.following;
}

export type Message = {
  id:string; sender_id:string;recipient_id:string;post_id:string|null;content:string;created_at:string;
  post_title?:string|null;sender_username?:string;sender_name?:string;
};
export type Conversation = Message & {
  other_id:string;username:string;display_name:string;avatar_url:string|null;unread_count:number;
};
export async function fetchConversations() {
  const response=await apiGet<{conversations:Conversation[]}>("/conversations");
  return response.conversations;
}
export async function fetchMessages(otherId:string) {
  const response=await apiGet<{messages:Message[]}>(`/messages?with=${encodeURIComponent(otherId)}`);
  return response.messages;
}
export async function sendMessage(recipient_id:string, post_id:string|null,content="") {
  return apiPost<{message:Message}>("/messages",{recipient_id,post_id,content});
}

/** Feed “Para você”: ranking calculado pelo servidor com interesses e interações reais. */
export async function fetchPersonalizedFeed(sort: "recent" | "popular", limit = 30): Promise<FeedPost[]> {
  const response = await apiGet<{ posts: FeedPost[] }>(`/feed/recommendations?sort=${sort}&limit=${limit}`);
  return response.posts;
}
