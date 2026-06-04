export interface LearningPathVideo {
  youtube_video_id: string;
  title: string;
  channel_name: string | null;
  reason: string;
}

export interface LearningPathModule {
  title: string;
  goal: string;
  outcome: string;
  videos: LearningPathVideo[];
}

export interface LearningPathRecord {
  playlist_id: string;
  title: string;
  summary: string;
  estimated_minutes: number | null;
  difficulty: "beginner" | "intermediate" | "advanced" | "mixed" | null;
  learning_objectives: string[];
  modules: LearningPathModule[];
  updated_at: string;
}
