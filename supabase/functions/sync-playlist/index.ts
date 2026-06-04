import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const allowedOrigin = Deno.env.get("CORS_ORIGIN") || "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-youtube-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function decodeHtml(value: string): string {
  return value
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const accessToken = req.headers.get("X-YouTube-Token");

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "YouTube access token required" }),
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
      .select("id, youtube_playlist_id")
      .eq("id", playlist_id)
      .eq("user_id", user.id)
      .single();

    if (playlistError || !playlist?.youtube_playlist_id) {
      return new Response(
        JSON.stringify({ error: "This playlist is not connected to a YouTube playlist yet." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: storedItems, error: storedItemsError } = await serviceClient
      .from("playlist_items")
      .select("id, youtube_video_id")
      .eq("playlist_id", playlist_id)
      .order("position", { ascending: true });

    if (storedItemsError) throw storedItemsError;

    const fetchedItems: any[] = [];
    let nextPageToken: string | undefined = undefined;

    do {
      const itemsUrl = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
      itemsUrl.searchParams.set("part", "snippet,status");
      itemsUrl.searchParams.set("playlistId", playlist.youtube_playlist_id);
      itemsUrl.searchParams.set("maxResults", "50");
      if (nextPageToken) itemsUrl.searchParams.set("pageToken", nextPageToken);

      const response = await fetch(itemsUrl.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message || "Failed to sync playlist from YouTube");
      }

      fetchedItems.push(...(data.items || []));
      nextPageToken = data.nextPageToken;
    } while (nextPageToken);

    const liveVideoMap = new Map<string, { status: "active" | "private" | "deleted"; title: string; channel_name: string; thumbnail_url: string | null }>();

    for (const item of fetchedItems) {
      const videoId = item.snippet?.resourceId?.videoId;
      if (!videoId) continue;

      const privacyStatus = item.status?.privacyStatus;
      const status = privacyStatus === "private"
        ? "private"
        : privacyStatus === "privacyStatusUnspecified"
          ? "deleted"
          : "active";

      liveVideoMap.set(videoId, {
        status,
        title: decodeHtml(item.snippet?.title || "Unknown"),
        channel_name: decodeHtml(item.snippet?.videoOwnerChannelTitle || item.snippet?.channelTitle || "Unknown"),
        thumbnail_url: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || null,
      });
    }

    if (liveVideoMap.size > 0) {
      const { error: videosError } = await serviceClient
        .from("videos")
        .upsert(
          [...liveVideoMap.entries()].map(([youtube_video_id, video]) => ({
            youtube_video_id,
            title: video.title,
            channel_name: video.channel_name,
            thumbnail_url: video.thumbnail_url,
            privacy_status: video.status === "active" ? "public" : video.status,
          })),
          { onConflict: "youtube_video_id" },
        );

      if (videosError) throw videosError;
    }

    const ghostVideos: Array<{ youtube_video_id: string; original_title: string; original_channel: string | null; status: "deleted" | "private" }> = [];
    let activeVideos = 0;

    await Promise.all((storedItems || []).map(async (item) => {
      const liveVideo = liveVideoMap.get(item.youtube_video_id);
      const nextStatus = liveVideo?.status || "deleted";

      if (nextStatus === "active") {
        activeVideos += 1;
      } else {
        ghostVideos.push({
          youtube_video_id: item.youtube_video_id,
          original_title: liveVideo?.title || item.youtube_video_id,
          original_channel: liveVideo?.channel_name || null,
          status: nextStatus,
        });
      }

      await serviceClient
        .from("playlist_items")
        .update({ status: nextStatus })
        .eq("id", item.id);
    }));

    const lastSyncedAt = new Date().toISOString();
    await serviceClient
      .from("generated_playlists")
      .update({ last_synced_at: lastSyncedAt })
      .eq("id", playlist_id);

    return new Response(
      JSON.stringify({
        playlist_id,
        total_videos: storedItems?.length || 0,
        active_videos: activeVideos,
        ghost_videos: ghostVideos,
        last_synced_at: lastSyncedAt,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("sync-playlist error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred. Please try again.";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
