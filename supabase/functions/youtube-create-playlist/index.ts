import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const allowedOrigin = Deno.env.get("CORS_ORIGIN") || "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-youtube-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_VIDEOS_PER_REQUEST = 200;

async function createPlaylist(accessToken: string, title: string, description: string): Promise<string> {
  const response = await fetch("https://www.googleapis.com/youtube/v3/playlists?part=snippet,status", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      snippet: { title, description },
      status: { privacyStatus: "private" },
    }),
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message || "Failed to create playlist");
  return data.id;
}

async function addVideoToPlaylist(accessToken: string, playlistId: string, videoId: string): Promise<boolean> {
  const response = await fetch("https://www.googleapis.com/youtube/v3/playlistItems?part=snippet", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      snippet: {
        playlistId,
        resourceId: { kind: "youtube#video", videoId },
      },
    }),
  });

  const data = await response.json();
  return !data.error;
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

    const accessToken = req.headers.get("X-YouTube-Token");
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "YouTube access token required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { playlist_id, playlist_name } = await req.json();
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
      .select("youtube_video_id, position")
      .eq("playlist_id", playlist_id)
      .eq("status", "active")
      .order("position", { ascending: true });

    if (itemsError) throw itemsError;
    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "This playlist does not have any exportable videos." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const uniqueVideoIds = [...new Set(items.map((item) => item.youtube_video_id))].slice(0, MAX_VIDEOS_PER_REQUEST);
    const wasLimited = uniqueVideoIds.length < items.length;

    const title = typeof playlist_name === "string" && playlist_name.trim()
      ? playlist_name.trim()
      : playlist.prompt_text;
    const description = `Created in PromptPlay • ${new Date().toLocaleDateString()}`;
    const youtubePlaylistId = await createPlaylist(accessToken, title, description);

    let videosAdded = 0;
    for (const videoId of uniqueVideoIds) {
      const added = await addVideoToPlaylist(accessToken, youtubePlaylistId, videoId);
      if (added) videosAdded++;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    await serviceClient
      .from("generated_playlists")
      .update({
        youtube_playlist_id: youtubePlaylistId,
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", playlist_id);

    return new Response(
      JSON.stringify({
        playlistId: youtubePlaylistId,
        playlistUrl: `https://www.youtube.com/playlist?list=${youtubePlaylistId}`,
        videosAdded,
        wasLimited,
        originalCount: items.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("youtube-create-playlist error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
