import { supabase } from "@/integrations/supabase/client";

export type FeedPost = {
  id: string;
  title: string;
  content: string | null;
  post_type: string;
  media_url: string | null;
  created_at: string;
  author_id: string;
  author: {
    username: string;
    display_name: string;
    account_type: string;
  } | null;
  community: { name: string; slug: string } | null;
  post_votes: { user_id: string }[];
  comments: { count: number }[];
  saved_posts?: { user_id: string }[];
};

const SELECT =
  "id,title,content,post_type,media_url,created_at,author_id," +
  "author:profiles!posts_author_id_fkey(username,display_name,account_type)," +
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

export async function fetchCommunities() {
  const { data, error } = await supabase
    .from("communities")
    .select("id,name,slug,description,category,accent,member_count,community_members(user_id)")
    .order("member_count", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchSuggestedProfiles(excludeId?: string) {
  let query = supabase
    .from("profiles")
    .select("id,username,display_name,account_type,primary_instrument")
    .limit(5);
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
