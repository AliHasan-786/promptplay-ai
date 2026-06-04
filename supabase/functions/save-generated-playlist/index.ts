import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const allowedOrigin = Deno.env.get("CORS_ORIGIN") || "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_SOURCES = new Set(["ai_generate", "playlist_remix"]);

interface PlaylistVideoInput {
  youtube_id?: string | null;
  title?: string | null;
  creator?: string | null;
  thumbnail?: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let createdPlaylistId: string | null = null;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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

    const { prompt, videos, source = "ai_generate", semantic_topic = null } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!Array.isArray(videos) || videos.length === 0) {
      return new Response(
        JSON.stringify({ error: "At least one video is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!ALLOWED_SOURCES.has(source)) {
      return new Response(
        JSON.stringify({ error: "Invalid playlist source" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const deduped = new Map<string, { youtube_video_id: string; title: string; channel_name: string; thumbnail_url: string | null }>();
    for (const rawVideo of videos as PlaylistVideoInput[]) {
      if (!rawVideo.youtube_id) continue;
      if (deduped.has(rawVideo.youtube_id)) continue;

      deduped.set(rawVideo.youtube_id, {
        youtube_video_id: rawVideo.youtube_id,
        title: (rawVideo.title || "Unknown").trim() || "Unknown",
        channel_name: (rawVideo.creator || "Unknown").trim() || "Unknown",
        thumbnail_url: rawVideo.thumbnail?.trim() || null,
      });
    }

    const normalizedVideos = [...deduped.values()];
    if (normalizedVideos.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid YouTube videos were provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: playlist, error: playlistError } = await serviceClient
      .from("generated_playlists")
      .insert({
        user_id: user.id,
        prompt_text: prompt.trim(),
        source,
        semantic_topic: typeof semantic_topic === "string" && semantic_topic.trim() ? semantic_topic.trim() : null,
      })
      .select("id, prompt_text, source")
      .single();

    if (playlistError || !playlist) {
      throw playlistError || new Error("Failed to create playlist");
    }

    createdPlaylistId = playlist.id;

    const { error: videosError } = await serviceClient
      .from("videos")
      .upsert(
        normalizedVideos.map((video) => ({
          ...video,
          description: "",
          privacy_status: "public",
        })),
        { onConflict: "youtube_video_id" },
      );

    if (videosError) {
      throw videosError;
    }

    const { error: itemsError } = await serviceClient
      .from("playlist_items")
      .insert(
        normalizedVideos.map((video, index) => ({
          playlist_id: playlist.id,
          youtube_video_id: video.youtube_video_id,
          position: index,
          status: "active",
        })),
      );

    if (itemsError) {
      throw itemsError;
    }

    return new Response(
      JSON.stringify({
        playlist_id: playlist.id,
        prompt_text: playlist.prompt_text,
        source: playlist.source,
        saved_count: normalizedVideos.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("save-generated-playlist error:", error);

    if (createdPlaylistId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const cleanupClient = createClient(supabaseUrl, serviceRoleKey);
      await cleanupClient.from("generated_playlists").delete().eq("id", createdPlaylistId);
    }

    const message = error instanceof Error ? error.message : "An unexpected error occurred. Please try again.";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
