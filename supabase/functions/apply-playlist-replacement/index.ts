import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const allowedOrigin = Deno.env.get("CORS_ORIGIN") || "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ReplacementInput {
  youtube_id: string;
  title: string;
  channel_name: string | null;
  thumbnail_url: string | null;
  duration: string | null;
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

    const {
      playlist_id,
      item_id,
      replacement,
    }: {
      playlist_id?: string;
      item_id?: string;
      replacement?: ReplacementInput;
    } = await req.json();

    if (!playlist_id || !item_id || !replacement?.youtube_id || !replacement.title) {
      return new Response(
        JSON.stringify({ error: "playlist_id, item_id, and replacement are required" }),
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
      .select("id")
      .eq("id", playlist_id)
      .eq("user_id", user.id)
      .single();

    if (playlistError || !playlist) {
      return new Response(
        JSON.stringify({ error: "Playlist not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: playlistItem, error: playlistItemError } = await serviceClient
      .from("playlist_items")
      .select("id, youtube_video_id")
      .eq("id", item_id)
      .eq("playlist_id", playlist_id)
      .single();

    if (playlistItemError || !playlistItem) {
      return new Response(
        JSON.stringify({ error: "Playlist item not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { error: upsertVideoError } = await serviceClient
      .from("videos")
      .upsert({
        youtube_video_id: replacement.youtube_id,
        title: replacement.title,
        channel_name: replacement.channel_name,
        thumbnail_url: replacement.thumbnail_url,
        duration: replacement.duration,
        privacy_status: "public",
      }, { onConflict: "youtube_video_id" });

    if (upsertVideoError) throw upsertVideoError;

    const { error: updateItemError } = await serviceClient
      .from("playlist_items")
      .update({
        youtube_video_id: replacement.youtube_id,
        status: "active",
        watch_state: "not_started",
        started_at: null,
        completed_at: null,
      })
      .eq("id", item_id);

    if (updateItemError) throw updateItemError;

    const { data: learningPath } = await serviceClient
      .from("playlist_learning_paths")
      .select("modules")
      .eq("playlist_id", playlist_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (learningPath?.modules && Array.isArray(learningPath.modules)) {
      const updatedModules = learningPath.modules.map((rawModule) => {
        const module = rawModule as Record<string, unknown>;
        const videos = Array.isArray(module.videos)
          ? module.videos.map((rawVideo) => {
              const video = rawVideo as Record<string, unknown>;
              if (video.youtube_video_id !== playlistItem.youtube_video_id) {
                return rawVideo;
              }

              return {
                ...video,
                youtube_video_id: replacement.youtube_id,
                title: replacement.title,
                channel_name: replacement.channel_name,
              };
            })
          : [];

        return {
          ...module,
          videos,
        };
      });

      await serviceClient
        .from("playlist_learning_paths")
        .update({
          modules: updatedModules,
          updated_at: new Date().toISOString(),
        })
        .eq("playlist_id", playlist_id)
        .eq("user_id", user.id);
    }

    return new Response(
      JSON.stringify({
        playlist_id,
        item_id,
        replacement_applied: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("apply-playlist-replacement error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred. Please try again.";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
