import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const allowedOrigin = Deno.env.get("CORS_ORIGIN") || "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SearchCandidate {
  youtube_id: string;
  title: string;
  channel_name: string;
  thumbnail_url: string | null;
}

function decodeHtml(value: string): string {
  return value
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function tokenize(value: string | null | undefined): string[] {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function overlapScore(left: string[], right: string[]): number {
  if (left.length === 0 || right.length === 0) return 0;

  const rightTokens = new Set(right);
  return left.reduce((score, token) => score + (rightTokens.has(token) ? 1 : 0), 0);
}

function candidateScore(
  originalTitle: string,
  originalChannel: string | null,
  playlistPrompt: string,
  candidate: SearchCandidate,
): number {
  const titleTokens = tokenize(originalTitle);
  const channelTokens = tokenize(originalChannel);
  const promptTokens = tokenize(playlistPrompt);
  const candidateTitleTokens = tokenize(candidate.title);
  const candidateChannelTokens = tokenize(candidate.channel_name);

  return (
    overlapScore(titleTokens, candidateTitleTokens) * 3 +
    overlapScore(channelTokens, candidateChannelTokens) * 2 +
    overlapScore(promptTokens, candidateTitleTokens)
  );
}

async function searchYouTubeCandidates(
  apiKey: string,
  queries: string[],
  excludedVideoIds: Set<string>,
): Promise<SearchCandidate[]> {
  const deduped = new Map<string, SearchCandidate>();

  for (const query of queries) {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("q", query);
    url.searchParams.set("type", "video");
    url.searchParams.set("maxResults", "4");
    url.searchParams.set("key", apiKey);

    const response = await fetch(url.toString());
    if (!response.ok) continue;

    const data = await response.json();
    for (const item of data.items || []) {
      const youtubeId = item.id?.videoId;
      if (!youtubeId || excludedVideoIds.has(youtubeId) || deduped.has(youtubeId)) continue;

      deduped.set(youtubeId, {
        youtube_id: youtubeId,
        title: decodeHtml(item.snippet?.title || "Unknown"),
        channel_name: decodeHtml(item.snippet?.channelTitle || "Unknown"),
        thumbnail_url: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || null,
      });
    }
  }

  return [...deduped.values()];
}

async function fetchVideoDurations(
  apiKey: string,
  videoIds: string[],
): Promise<Map<string, string>> {
  const durations = new Map<string, string>();

  for (let index = 0; index < videoIds.length; index += 50) {
    const chunk = videoIds.slice(index, index + 50);
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "contentDetails");
    url.searchParams.set("id", chunk.join(","));
    url.searchParams.set("key", apiKey);

    const response = await fetch(url.toString());
    if (!response.ok) continue;

    const data = await response.json();
    for (const item of data.items || []) {
      if (item.id && item.contentDetails?.duration) {
        durations.set(item.id, item.contentDetails.duration);
      }
    }
  }

  return durations;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { playlist_id } = await req.json();
    if (!playlist_id || typeof playlist_id !== "string") {
      return new Response(
        JSON.stringify({ error: "playlist_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const youtubeApiKey = Deno.env.get("YOUTUBE_API_KEY");
    if (!youtubeApiKey) {
      return new Response(
        JSON.stringify({ error: "YouTube API not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: playlist, error: playlistError } = await serviceClient
      .from("generated_playlists")
      .select("id, prompt_text")
      .eq("id", playlist_id)
      .eq("user_id", user.id)
      .single();

    if (playlistError || !playlist) {
      return new Response(
        JSON.stringify({ error: "Playlist not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: items, error: itemsError } = await serviceClient
      .from("playlist_items")
      .select("id, youtube_video_id, position, status")
      .eq("playlist_id", playlist_id)
      .order("position", { ascending: true });

    if (itemsError) throw itemsError;

    const ghostItems = (items || []).filter((item) => item.status !== "active");
    if (ghostItems.length === 0) {
      return new Response(
        JSON.stringify({ playlist_id, suggestions: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: storedVideos, error: storedVideosError } = await serviceClient
      .from("videos")
      .select("youtube_video_id, title, channel_name")
      .in("youtube_video_id", (items || []).map((item) => item.youtube_video_id));

    if (storedVideosError) throw storedVideosError;

    const storedVideoMap = new Map(
      (storedVideos || []).map((video) => [video.youtube_video_id, video]),
    );
    const activeVideoIds = new Set(
      (items || [])
        .filter((item) => item.status === "active")
        .map((item) => item.youtube_video_id),
    );

    const rawSuggestions = await Promise.all(ghostItems.map(async (item) => {
      const originalVideo = storedVideoMap.get(item.youtube_video_id);
      const originalTitle = originalVideo?.title || item.youtube_video_id;
      const originalChannel = originalVideo?.channel_name || null;
      const queries = [
        [originalChannel, originalTitle].filter(Boolean).join(" "),
        `${originalTitle} ${playlist.prompt_text}`,
        originalChannel ? `${playlist.prompt_text} ${originalChannel}` : playlist.prompt_text,
      ].filter((query, index, all) => query.trim().length > 0 && all.indexOf(query) === index);

      const candidates = await searchYouTubeCandidates(
        youtubeApiKey,
        queries,
        new Set([...activeVideoIds, item.youtube_video_id]),
      );
      const ranked = candidates
        .map((candidate) => ({
          ...candidate,
          score: candidateScore(originalTitle, originalChannel, playlist.prompt_text, candidate),
        }))
        .sort((left, right) => right.score - left.score)
        .slice(0, 3);

      return {
        item_id: item.id,
        position: item.position,
        status: item.status,
        original_youtube_id: item.youtube_video_id,
        original_title: originalTitle,
        original_channel: originalChannel,
        candidates: ranked,
      };
    }));

    const candidateIds = [...new Set(rawSuggestions.flatMap((suggestion) =>
      suggestion.candidates.map((candidate) => candidate.youtube_id),
    ))];
    const durationsByVideoId = candidateIds.length > 0
      ? await fetchVideoDurations(youtubeApiKey, candidateIds)
      : new Map<string, string>();

    return new Response(
      JSON.stringify({
        playlist_id,
        suggestions: rawSuggestions.map((suggestion) => ({
          ...suggestion,
          candidates: suggestion.candidates.map((candidate) => ({
            youtube_id: candidate.youtube_id,
            title: candidate.title,
            channel_name: candidate.channel_name,
            thumbnail_url: candidate.thumbnail_url,
            duration: durationsByVideoId.get(candidate.youtube_id) || null,
          })),
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("suggest-playlist-replacements error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred. Please try again.";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
