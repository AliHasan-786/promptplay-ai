import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const allowedOrigin = Deno.env.get("CORS_ORIGIN") || "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface PlaylistVideo {
  youtube_video_id: string;
  title: string;
  channel_name: string | null;
  position: number | null;
}

interface LearningPathVideo {
  youtube_video_id: string;
  reason: string;
  title: string;
  channel_name: string | null;
}

interface LearningPathModule {
  title: string;
  goal: string;
  outcome: string;
  videos: LearningPathVideo[];
}

function extractJsonBlock(content: string): string {
  const trimmed = content.trim();
  const match = trimmed.match(/\{.*\}/s);
  return match ? match[0] : trimmed;
}

function fallbackLearningPath(playlistTitle: string, videos: PlaylistVideo[]) {
  const midpoint = Math.max(1, Math.ceil(videos.length / 2));
  const modules = [
    {
      title: "Foundation",
      goal: `Start with the core concepts behind ${playlistTitle}.`,
      outcome: "You understand the vocabulary, context, and setup.",
      videos: videos.slice(0, midpoint).map((video) => ({
        youtube_video_id: video.youtube_video_id,
        title: video.title,
        channel_name: video.channel_name,
        reason: "Builds the baseline context before moving deeper.",
      })),
    },
    {
      title: "Applied Depth",
      goal: `Use the remaining videos to go deeper on ${playlistTitle}.`,
      outcome: "You can connect the main ideas and act on them.",
      videos: videos.slice(midpoint).map((video) => ({
        youtube_video_id: video.youtube_video_id,
        title: video.title,
        channel_name: video.channel_name,
        reason: "Adds depth, examples, and practical follow-through.",
      })),
    },
  ].filter((module) => module.videos.length > 0);

  return {
    title: playlistTitle,
    summary: `A guided path built from ${videos.length} videos in this playlist.`,
    difficulty: "mixed",
    estimated_minutes: videos.length * 18,
    learning_objectives: [
      "Build context quickly",
      "Move from fundamentals into deeper material",
      "Turn a flat playlist into a deliberate watch order",
    ],
    modules,
  };
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

    const { playlist_id } = await req.json();
    if (!playlist_id || typeof playlist_id !== "string") {
      return new Response(
        JSON.stringify({ error: "playlist_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
      .order("position", { ascending: true });

    if (itemsError) {
      throw itemsError;
    }

    const videoIds = [...new Set((items || []).map((item) => item.youtube_video_id))];
    if (videoIds.length < 2) {
      return new Response(
        JSON.stringify({ error: "Add at least two videos before building a learning path." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: videos, error: videosError } = await serviceClient
      .from("videos")
      .select("youtube_video_id, title, channel_name")
      .in("youtube_video_id", videoIds);

    if (videosError) {
      throw videosError;
    }

    const videoMap = new Map(
      (videos || []).map((video) => [video.youtube_video_id, video]),
    );

    const orderedVideos: PlaylistVideo[] = (items || [])
      .map((item) => {
        const video = videoMap.get(item.youtube_video_id);
        if (!video) return null;
        return {
          youtube_video_id: item.youtube_video_id,
          title: video.title,
          channel_name: video.channel_name,
          position: item.position,
        };
      })
      .filter((video): video is PlaylistVideo => Boolean(video));

    const LLMAPI_KEY = Deno.env.get("LLMAPI_KEY");
    const LLMAPI_BASE_URL = Deno.env.get("LLMAPI_BASE_URL") || "https://internal.llmapi.ai/v1/chat/completions";
    const LLMAPI_MODEL = Deno.env.get("LLMAPI_MODEL") || "gpt-4o-mini";

    let learningPath = fallbackLearningPath(playlist.prompt_text, orderedVideos);

    if (LLMAPI_KEY) {
      const llmRes = await fetch(LLMAPI_BASE_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LLMAPI_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: LLMAPI_MODEL,
          messages: [
            {
              role: "system",
              content: `You turn a flat YouTube playlist into a guided learning path.

Return only valid JSON with this shape:
{
  "title": "string",
  "summary": "string",
  "difficulty": "beginner" | "intermediate" | "advanced" | "mixed",
  "estimated_minutes": number,
  "learning_objectives": ["string"],
  "modules": [
    {
      "title": "string",
      "goal": "string",
      "outcome": "string",
      "videos": [
        {
          "youtube_video_id": "string",
          "reason": "string"
        }
      ]
    }
  ]
}

Rules:
- Use only the provided youtube_video_id values.
- Include every provided video exactly once.
- Order modules from fundamentals to advanced application.
- Keep 2 to 6 modules.
- Keep reasons concise and concrete.
- No markdown. No explanation outside JSON.`,
            },
            {
              role: "user",
              content: JSON.stringify({
                playlist_title: playlist.prompt_text,
                videos: orderedVideos.map((video) => ({
                  youtube_video_id: video.youtube_video_id,
                  title: video.title,
                  channel_name: video.channel_name,
                })),
              }),
            },
          ],
        }),
      });

      if (llmRes.ok) {
        const llmData = await llmRes.json();
        const content = llmData.choices?.[0]?.message?.content;
        if (content) {
          try {
            const parsed = JSON.parse(extractJsonBlock(content));
            if (parsed && Array.isArray(parsed.modules) && parsed.modules.length > 0) {
              const seenIds = new Set<string>();
              const modules: LearningPathModule[] = [];

              for (const rawModule of parsed.modules as any[]) {
                if (!rawModule || !Array.isArray(rawModule.videos)) continue;

                const moduleVideos: LearningPathVideo[] = [];
                for (const rawVideo of rawModule.videos as any[]) {
                  const id = typeof rawVideo?.youtube_video_id === "string" ? rawVideo.youtube_video_id : null;
                  if (!id || seenIds.has(id)) continue;

                  const originalVideo = orderedVideos.find((video) => video.youtube_video_id === id);
                  if (!originalVideo) continue;

                  seenIds.add(id);
                  moduleVideos.push({
                    youtube_video_id: id,
                    title: originalVideo.title,
                    channel_name: originalVideo.channel_name,
                    reason: typeof rawVideo.reason === "string" && rawVideo.reason.trim()
                      ? rawVideo.reason.trim()
                      : "Fits this stage of the path.",
                  });
                }

                if (moduleVideos.length === 0) continue;

                modules.push({
                  title: typeof rawModule.title === "string" && rawModule.title.trim()
                    ? rawModule.title.trim()
                    : "Learning Module",
                  goal: typeof rawModule.goal === "string" && rawModule.goal.trim()
                    ? rawModule.goal.trim()
                    : "Build understanding for this stage.",
                  outcome: typeof rawModule.outcome === "string" && rawModule.outcome.trim()
                    ? rawModule.outcome.trim()
                    : "You leave this section with more depth and context.",
                  videos: moduleVideos,
                });
              }

              const missingVideos = orderedVideos.filter((video) => !seenIds.has(video.youtube_video_id));
              if (missingVideos.length > 0) {
                const catchAllModule = modules.at(-1) || {
                  title: "Additional Study",
                  goal: "Cover the remaining useful material in the playlist.",
                  outcome: "You round out the path with complementary examples.",
                  videos: [],
                };

                catchAllModule.videos.push(
                  ...missingVideos.map((video) => ({
                    youtube_video_id: video.youtube_video_id,
                    title: video.title,
                    channel_name: video.channel_name,
                    reason: "Rounds out the path with adjacent examples and reinforcement.",
                  })),
                );

                if (!modules.at(-1)) {
                  modules.push(catchAllModule);
                }
              }

              if (modules.length > 0) {
                learningPath = {
                  title: typeof parsed.title === "string" && parsed.title.trim()
                    ? parsed.title.trim()
                    : playlist.prompt_text,
                  summary: typeof parsed.summary === "string" && parsed.summary.trim()
                    ? parsed.summary.trim()
                    : learningPath.summary,
                  difficulty: ["beginner", "intermediate", "advanced", "mixed"].includes(parsed.difficulty)
                    ? parsed.difficulty
                    : "mixed",
                  estimated_minutes: typeof parsed.estimated_minutes === "number" && Number.isFinite(parsed.estimated_minutes)
                    ? Math.max(10, Math.round(parsed.estimated_minutes))
                    : learningPath.estimated_minutes,
                  learning_objectives: Array.isArray(parsed.learning_objectives)
                    ? parsed.learning_objectives.filter((objective: unknown): objective is string =>
                      typeof objective === "string" && objective.trim().length > 0,
                    ).slice(0, 5)
                    : learningPath.learning_objectives,
                  modules,
                };
              }
            }
          } catch (parseError) {
            console.warn("build-learning-path parse error:", parseError);
          }
        }
      }
    }

    const { data: persisted, error: persistError } = await serviceClient
      .from("playlist_learning_paths")
      .upsert({
        playlist_id,
        user_id: user.id,
        title: learningPath.title,
        summary: learningPath.summary,
        estimated_minutes: learningPath.estimated_minutes,
        difficulty: learningPath.difficulty,
        learning_objectives: learningPath.learning_objectives,
        modules: learningPath.modules,
      }, { onConflict: "playlist_id" })
      .select("playlist_id, title, summary, estimated_minutes, difficulty, learning_objectives, modules, updated_at")
      .single();

    if (persistError || !persisted) {
      throw persistError || new Error("Failed to save the learning path");
    }

    return new Response(
      JSON.stringify(persisted),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("build-learning-path error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred. Please try again.";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
