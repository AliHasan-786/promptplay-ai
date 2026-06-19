import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const allowedOrigin = Deno.env.get("CORS_ORIGIN") || "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type PlaylistItemStatus = "active" | "deleted" | "private";

interface PlaylistVideo {
  youtube_video_id: string;
  title: string;
  channel_name: string | null;
  status: PlaylistItemStatus;
  position: number | null;
}

interface PlaylistAudit {
  quality_score: number;
  verdict: string;
  feed_gap: string;
  strengths: string[];
  missing_angles: string[];
  sequencing_risks: string[];
  maintenance_risks: string[];
  next_actions: string[];
  suggested_path_name: string;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function extractJsonBlock(content: string): string {
  const trimmed = content.trim();
  const match = trimmed.match(/\{.*\}/s);
  return match ? match[0] : trimmed;
}

function stringList(value: unknown, fallback: string[], maxItems = 5): string[] {
  if (!Array.isArray(value)) return fallback;

  const clean = value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, maxItems);

  return clean.length > 0 ? clean : fallback;
}

function normalizeAudit(value: Record<string, unknown>, fallback: PlaylistAudit): PlaylistAudit {
  const qualityScore = typeof value.quality_score === "number" && Number.isFinite(value.quality_score)
    ? value.quality_score
    : fallback.quality_score;

  return {
    quality_score: clampScore(qualityScore),
    verdict: typeof value.verdict === "string" && value.verdict.trim()
      ? value.verdict.trim()
      : fallback.verdict,
    feed_gap: typeof value.feed_gap === "string" && value.feed_gap.trim()
      ? value.feed_gap.trim()
      : fallback.feed_gap,
    strengths: stringList(value.strengths, fallback.strengths),
    missing_angles: stringList(value.missing_angles, fallback.missing_angles),
    sequencing_risks: stringList(value.sequencing_risks, fallback.sequencing_risks),
    maintenance_risks: stringList(value.maintenance_risks, fallback.maintenance_risks),
    next_actions: stringList(value.next_actions, fallback.next_actions),
    suggested_path_name: typeof value.suggested_path_name === "string" && value.suggested_path_name.trim()
      ? value.suggested_path_name.trim()
      : fallback.suggested_path_name,
  };
}

function fallbackAudit(playlistTitle: string, videos: PlaylistVideo[]): PlaylistAudit {
  const totalVideos = videos.length;
  const unavailableCount = videos.filter((video) => video.status !== "active").length;
  const activeVideos = Math.max(0, totalVideos - unavailableCount);
  const channelCount = new Set(videos.map((video) => video.channel_name || "Unknown")).size;
  const hasGoodSize = totalVideos >= 6 && totalVideos <= 30;
  const qualityScore = clampScore(
    45 +
    Math.min(activeVideos, 12) * 3 +
    Math.min(channelCount, 6) * 4 +
    (hasGoodSize ? 8 : -6) -
    unavailableCount * 10,
  );

  const maintenanceRisks = unavailableCount > 0
    ? [`${unavailableCount} video${unavailableCount === 1 ? "" : "s"} are deleted or private and need repair.`]
    : ["No unavailable videos are currently recorded. Re-sync periodically so the path does not silently decay."];

  return {
    quality_score: qualityScore,
    verdict: qualityScore >= 75
      ? "Promising path foundation"
      : qualityScore >= 55
        ? "Useful playlist, but not yet a strong learning path"
        : "Fragile playlist that needs structure before it is worth sharing",
    feed_gap: "A YouTube custom feed can discover adjacent videos, but this collection still needs deliberate ordering, missing-context checks, and maintenance before it becomes a reusable path.",
    strengths: [
      `${totalVideos} videos are already collected in one place.`,
      channelCount > 1
        ? `It includes material from ${channelCount} channels, which can make it stronger than a single-creator course.`
        : "The focused channel mix can be useful if the source is trusted.",
    ],
    missing_angles: [
      "Add an explicit beginner-to-advanced order rather than relying on feed order.",
      "Add a practical project, checkpoint, or outcome so the user knows when they are done.",
      "Add at least one alternative viewpoint or newer resource if this topic changes quickly.",
    ],
    sequencing_risks: [
      "A flat playlist may mix fundamentals, examples, and deep dives without prerequisite logic.",
      "Users may bounce if the first two videos do not create a fast win.",
    ],
    maintenance_risks: maintenanceRisks,
    next_actions: [
      "Build or refresh the learning path.",
      unavailableCount > 0 ? "Find replacements for unavailable videos." : "Publish a public path once the order and description are clear.",
      "Add notes or checkpoints to make this more durable than a feed.",
    ],
    suggested_path_name: playlistTitle,
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
      .select("id, prompt_text, source, youtube_playlist_id")
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
      .select("youtube_video_id, position, status")
      .eq("playlist_id", playlist_id)
      .order("position", { ascending: true });

    if (itemsError) throw itemsError;

    const videoIds = [...new Set((items || []).map((item) => item.youtube_video_id))];
    if (videoIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "Add videos before auditing this path." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: videos, error: videosError } = await serviceClient
      .from("videos")
      .select("youtube_video_id, title, channel_name")
      .in("youtube_video_id", videoIds);

    if (videosError) throw videosError;

    const videoMap = new Map((videos || []).map((video) => [video.youtube_video_id, video]));
    const orderedVideos: PlaylistVideo[] = (items || [])
      .map((item) => {
        const video = videoMap.get(item.youtube_video_id);
        if (!video) return null;

        return {
          youtube_video_id: item.youtube_video_id,
          title: video.title,
          channel_name: video.channel_name,
          position: item.position,
          status: (item.status as PlaylistItemStatus) || "active",
        };
      })
      .filter((video): video is PlaylistVideo => Boolean(video));

    const fallback = fallbackAudit(playlist.prompt_text, orderedVideos);
    let audit = fallback;

    const LLMAPI_KEY = Deno.env.get("LLMAPI_KEY");
    const LLMAPI_BASE_URL = Deno.env.get("LLMAPI_BASE_URL") || "https://internal.llmapi.ai/v1/chat/completions";
    const LLMAPI_MODEL = Deno.env.get("LLMAPI_MODEL") || "gpt-4o-mini";

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
              content: `You audit YouTube playlists as durable learning or research paths.

Context:
- YouTube can now generate custom feeds from typed interests.
- Do not praise generic discovery.
- Evaluate whether this playlist is useful beyond a feed: sequence, missing context, actionability, durability, maintenance, and shareability.

Return only valid JSON:
{
  "quality_score": number,
  "verdict": "string",
  "feed_gap": "string explaining what this still needs beyond a YouTube custom feed",
  "strengths": ["string"],
  "missing_angles": ["string"],
  "sequencing_risks": ["string"],
  "maintenance_risks": ["string"],
  "next_actions": ["string"],
  "suggested_path_name": "string"
}

Rules:
- quality_score is 0-100.
- Be direct and practical.
- Keep every list to 2-5 items.
- No markdown.
- Do not invent specific video facts beyond titles/channels/status.`,
            },
            {
              role: "user",
              content: JSON.stringify({
                playlist_title: playlist.prompt_text,
                source: playlist.source,
                linked_youtube_playlist: Boolean(playlist.youtube_playlist_id),
                videos: orderedVideos.map((video) => ({
                  title: video.title,
                  channel_name: video.channel_name,
                  status: video.status,
                  position: video.position,
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
            audit = normalizeAudit(parsed, fallback);
          } catch (parseError) {
            console.warn("audit-playlist parse error:", parseError);
          }
        }
      }
    }

    return new Response(
      JSON.stringify(audit),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("audit-playlist error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred. Please try again.";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
