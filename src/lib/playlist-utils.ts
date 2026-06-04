import type { LearningPathRecord } from "@/types/learning-path";

const VALID_DIFFICULTIES = new Set(["beginner", "intermediate", "advanced", "mixed"]);

export function normalizeLearningPath(raw: Record<string, unknown>): LearningPathRecord {
  return {
    playlist_id: String(raw.playlist_id || ""),
    title: String(raw.title || "Learning Path"),
    summary: String(raw.summary || "Structured from your playlist."),
    estimated_minutes: typeof raw.estimated_minutes === "number" ? raw.estimated_minutes : null,
    difficulty: VALID_DIFFICULTIES.has(String(raw.difficulty))
      ? (raw.difficulty as LearningPathRecord["difficulty"])
      : null,
    learning_objectives: Array.isArray(raw.learning_objectives)
      ? raw.learning_objectives.filter((objective): objective is string => typeof objective === "string")
      : [],
    modules: Array.isArray(raw.modules)
      ? raw.modules.map((module) => {
          const moduleRecord = module as Record<string, unknown>;
          return {
            title: String(moduleRecord.title || "Module"),
            goal: String(moduleRecord.goal || "Build understanding for this stage."),
            outcome: String(moduleRecord.outcome || "You leave this stage with stronger context."),
            videos: Array.isArray(moduleRecord.videos)
              ? moduleRecord.videos.map((video) => {
                  const videoRecord = video as Record<string, unknown>;
                  return {
                    youtube_video_id: String(videoRecord.youtube_video_id || ""),
                    title: String(videoRecord.title || "Untitled video"),
                    channel_name: typeof videoRecord.channel_name === "string" ? videoRecord.channel_name : null,
                    reason: String(videoRecord.reason || "Fits this stage of the path."),
                  };
                }).filter((video) => video.youtube_video_id)
              : [],
          };
        }).filter((module) => module.videos.length > 0)
      : [],
    updated_at: String(raw.updated_at || new Date().toISOString()),
  };
}

export function buildPublicPlaylistSlug(title: string, playlistId: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50) || "playlist";

  return `${base}-${playlistId.split("-")[0]}`;
}
