import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const allowedOrigin = Deno.env.get("CORS_ORIGIN") || "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_SOURCES = new Set(["ai_generate", "playlist_remix", "import"]);
const ALLOWED_DIFFICULTIES = new Set(["beginner", "intermediate", "advanced", "mixed"]);

interface PlaylistVideoInput {
  youtube_id?: string | null;
  title?: string | null;
  creator?: string | null;
  thumbnail?: string | null;
}

interface NormalizedVideo {
  youtube_video_id: string;
  title: string;
  channel_name: string;
  thumbnail_url: string | null;
}

async function fetchVideoDurations(
  youtubeApiKey: string,
  videoIds: string[],
): Promise<Map<string, string>> {
  const durations = new Map<string, string>();

  for (let index = 0; index < videoIds.length; index += 50) {
    const chunk = videoIds.slice(index, index + 50);
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "contentDetails");
    url.searchParams.set("id", chunk.join(","));
    url.searchParams.set("maxResults", String(chunk.length));
    url.searchParams.set("key", youtubeApiKey);

    const response = await fetch(url.toString());
    if (!response.ok) {
      console.warn("save-generated-playlist duration fetch failed:", response.status);
      continue;
    }

    const data = await response.json();
    for (const item of data.items || []) {
      if (item.id && item.contentDetails?.duration) {
        durations.set(item.id, item.contentDetails.duration);
      }
    }
  }

  return durations;
}

function normalizeLearningPath(
  rawLearningPath: unknown,
  normalizedVideos: NormalizedVideo[],
  fallbackTitle: string,
) {
  if (!rawLearningPath || typeof rawLearningPath !== "object") {
    return null;
  }

  const learningPath = rawLearningPath as Record<string, unknown>;
  const knownVideos = new Map(normalizedVideos.map((video) => [video.youtube_video_id, video]));
  const seenVideoIds = new Set<string>();

  const modules = Array.isArray(learningPath.modules)
    ? learningPath.modules.map((rawModule) => {
        const module = rawModule as Record<string, unknown>;
        const videos = Array.isArray(module.videos)
          ? module.videos.map((rawVideo) => {
              const video = rawVideo as Record<string, unknown>;
              const youtubeVideoId = typeof video.youtube_video_id === "string" ? video.youtube_video_id : null;
              if (!youtubeVideoId || seenVideoIds.has(youtubeVideoId)) return null;

              const originalVideo = knownVideos.get(youtubeVideoId);
              if (!originalVideo) return null;

              seenVideoIds.add(youtubeVideoId);
              return {
                youtube_video_id: youtubeVideoId,
                title: originalVideo.title,
                channel_name: originalVideo.channel_name,
                reason: typeof video.reason === "string" && video.reason.trim()
                  ? video.reason.trim()
                  : "Fits this stage of the path.",
              };
            }).filter((video): video is {
              youtube_video_id: string;
              title: string;
              channel_name: string;
              reason: string;
            } => Boolean(video))
          : [];

        if (videos.length === 0) return null;

        return {
          title: typeof module.title === "string" && module.title.trim() ? module.title.trim() : "Learning Module",
          goal: typeof module.goal === "string" && module.goal.trim() ? module.goal.trim() : "Build understanding for this stage.",
          outcome: typeof module.outcome === "string" && module.outcome.trim() ? module.outcome.trim() : "Leave this stage with stronger context and confidence.",
          checkpoint_questions: Array.isArray(module.checkpoint_questions)
            ? module.checkpoint_questions.filter((question): question is string =>
              typeof question === "string" && question.trim().length > 0
            ).slice(0, 4)
            : [],
          practice_task: typeof module.practice_task === "string" && module.practice_task.trim()
            ? module.practice_task.trim()
            : null,
          videos,
        };
      }).filter((module): module is {
        title: string;
        goal: string;
        outcome: string;
        checkpoint_questions: string[];
        practice_task: string | null;
        videos: {
          youtube_video_id: string;
          title: string;
          channel_name: string;
          reason: string;
        }[];
      } => Boolean(module))
    : [];

  const missingVideos = normalizedVideos.filter((video) => !seenVideoIds.has(video.youtube_video_id));
  if (missingVideos.length > 0) {
    modules.push({
      title: "Additional Study",
      goal: "Cover the remaining useful material in the collection.",
      outcome: "Round out the path with supporting videos and examples.",
      videos: missingVideos.map((video) => ({
        youtube_video_id: video.youtube_video_id,
        title: video.title,
        channel_name: video.channel_name,
        reason: "Rounds out the path with supporting context and reinforcement.",
      })),
    });
  }

  if (modules.length === 0) {
    return null;
  }

  return {
    title: typeof learningPath.title === "string" && learningPath.title.trim()
      ? learningPath.title.trim()
      : fallbackTitle,
    summary: typeof learningPath.summary === "string" && learningPath.summary.trim()
      ? learningPath.summary.trim()
      : `A guided path built from ${normalizedVideos.length} videos.`,
    estimated_minutes: typeof learningPath.estimated_minutes === "number" && Number.isFinite(learningPath.estimated_minutes)
      ? Math.max(10, Math.round(learningPath.estimated_minutes))
      : normalizedVideos.length * 18,
    difficulty: typeof learningPath.difficulty === "string" && ALLOWED_DIFFICULTIES.has(learningPath.difficulty)
      ? learningPath.difficulty
      : null,
    learning_objectives: Array.isArray(learningPath.learning_objectives)
      ? learningPath.learning_objectives.filter((objective): objective is string =>
        typeof objective === "string" && objective.trim().length > 0,
      ).slice(0, 6)
      : [],
    modules,
  };
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

    const { prompt, videos, source = "ai_generate", semantic_topic = null, learning_path = null } = await req.json();

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

    const deduped = new Map<string, NormalizedVideo>();
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

    const youtubeApiKey = Deno.env.get("YOUTUBE_API_KEY");
    const durationsByVideoId = youtubeApiKey
      ? await fetchVideoDurations(youtubeApiKey, normalizedVideos.map((video) => video.youtube_video_id))
      : new Map<string, string>();

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

    const normalizedLearningPath = normalizeLearningPath(learning_path, normalizedVideos, prompt.trim());

    const { error: videosError } = await serviceClient
      .from("videos")
      .upsert(
        normalizedVideos.map((video) => ({
          ...video,
          description: "",
          privacy_status: "public",
          duration: durationsByVideoId.get(video.youtube_video_id) || null,
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

    if (normalizedLearningPath) {
      const { error: learningPathError } = await serviceClient
        .from("playlist_learning_paths")
        .upsert({
          playlist_id: playlist.id,
          user_id: user.id,
          title: normalizedLearningPath.title,
          summary: normalizedLearningPath.summary,
          estimated_minutes: normalizedLearningPath.estimated_minutes,
          difficulty: normalizedLearningPath.difficulty,
          learning_objectives: normalizedLearningPath.learning_objectives,
          modules: normalizedLearningPath.modules,
        }, { onConflict: "playlist_id" });

      if (learningPathError) {
        throw learningPathError;
      }
    }

    return new Response(
      JSON.stringify({
        playlist_id: playlist.id,
        prompt_text: playlist.prompt_text,
        source: playlist.source,
        saved_count: normalizedVideos.length,
        learning_path_saved: Boolean(normalizedLearningPath),
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
