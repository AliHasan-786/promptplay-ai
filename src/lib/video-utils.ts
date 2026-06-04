export type StudySortMode = "course" | "reverse" | "shortest" | "longest";
export type WatchState = "not_started" | "in_progress" | "completed" | "skipped";

export interface StudyVideoLike {
  id: string;
  track_name: string;
  artist_name: string;
  status: "active" | "deleted" | "private";
  duration: string | null;
  watch_state: WatchState;
}

export function parseIsoDurationToSeconds(duration: string | null): number | null {
  if (!duration) return null;

  const match = duration.match(/P(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?/);
  if (!match) return null;

  const [, hours = "0", minutes = "0", seconds = "0"] = match;
  return (Number(hours) * 3600) + (Number(minutes) * 60) + Number(seconds);
}

export function formatMinutesLabel(totalMinutes: number): string {
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`;
}

export function formatSecondsLabel(totalSeconds: number): string {
  const roundedMinutes = Math.max(1, Math.round(totalSeconds / 60));
  return formatMinutesLabel(roundedMinutes);
}

export function estimateVideoSeconds(
  video: StudyVideoLike,
  fallbackSeconds: number,
): number {
  return parseIsoDurationToSeconds(video.duration) ?? fallbackSeconds;
}

export function sortStudyVideos(
  videos: StudyVideoLike[],
  sortMode: StudySortMode,
  fallbackSeconds: number,
): StudyVideoLike[] {
  const sorted = [...videos];

  if (sortMode === "course") {
    return sorted;
  }

  if (sortMode === "reverse") {
    return sorted.reverse();
  }

  return sorted.sort((left, right) => {
    const leftSeconds = estimateVideoSeconds(left, fallbackSeconds);
    const rightSeconds = estimateVideoSeconds(right, fallbackSeconds);
    return sortMode === "shortest"
      ? leftSeconds - rightSeconds
      : rightSeconds - leftSeconds;
  });
}

export function buildSessionPlan(
  videos: StudyVideoLike[],
  targetMinutes: number,
  fallbackSeconds: number,
): StudyVideoLike[] {
  const targetSeconds = targetMinutes * 60;
  const activeQueue = videos.filter((video) =>
    video.status === "active" && !["completed", "skipped"].includes(video.watch_state),
  );

  const plan: StudyVideoLike[] = [];
  let usedSeconds = 0;

  for (const video of activeQueue) {
    const videoSeconds = estimateVideoSeconds(video, fallbackSeconds);
    if (plan.length > 0 && usedSeconds + videoSeconds > targetSeconds) {
      break;
    }

    plan.push(video);
    usedSeconds += videoSeconds;

    if (usedSeconds >= targetSeconds) {
      break;
    }
  }

  return plan;
}
