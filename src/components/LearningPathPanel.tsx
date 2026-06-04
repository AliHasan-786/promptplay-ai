import { Clock3, Route, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { LearningPathRecord } from "@/types/learning-path";

interface LearningPathPanelProps {
  learningPath: LearningPathRecord;
}

export function LearningPathPanel({ learningPath }: LearningPathPanelProps) {
  return (
    <div className="border-t border-border/50 bg-secondary/10 px-4 py-4">
      <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Route className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-foreground">{learningPath.title}</h4>
                <p className="text-sm text-muted-foreground">{learningPath.summary}</p>
              </div>
            </div>

            {learningPath.learning_objectives.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {learningPath.learning_objectives.map((objective) => (
                  <Badge key={objective} variant="secondary" className="bg-primary/10 text-primary">
                    {objective}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 md:justify-end">
            {learningPath.difficulty && (
              <Badge variant="outline" className="border-primary/30 text-primary">
                {learningPath.difficulty}
              </Badge>
            )}
            {learningPath.estimated_minutes !== null && (
              <Badge variant="outline" className="gap-1 border-border/70 text-muted-foreground">
                <Clock3 className="h-3 w-3" />
                {learningPath.estimated_minutes} min
              </Badge>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {learningPath.modules.map((module, moduleIndex) => (
            <div
              key={`${learningPath.playlist_id}-${moduleIndex}`}
              className="rounded-2xl border border-border/50 bg-card/50 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                  {moduleIndex + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h5 className="font-semibold text-foreground">{module.title}</h5>
                    <Badge variant="outline" className="border-border/70 text-muted-foreground">
                      {module.videos.length} videos
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{module.goal}</p>
                  <p className="mt-2 flex items-start gap-2 text-sm text-foreground/90">
                    <Target className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>{module.outcome}</span>
                  </p>
                </div>
              </div>

              <ul className="mt-4 space-y-2">
                {module.videos.map((video, videoIndex) => (
                  <li
                    key={`${video.youtube_video_id}-${videoIndex}`}
                    className="rounded-xl border border-border/40 bg-background/60 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <a
                          href={`https://www.youtube.com/watch?v=${video.youtube_video_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="line-clamp-2 text-sm font-medium text-foreground transition-colors hover:text-primary"
                        >
                          {video.title}
                        </a>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {video.channel_name || "Unknown channel"}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">#{videoIndex + 1}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{video.reason}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
