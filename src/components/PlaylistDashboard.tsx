import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  ListMusic,
  Loader2,
  Play,
  RefreshCw,
  Route,
  Sparkles,
  Trash2,
  Youtube,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LearningPathPanel } from "@/components/LearningPathPanel";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { LearningPathRecord } from "@/types/learning-path";

type PlaylistSource = "ai_generate" | "playlist_remix" | "import";
type PlaylistItemStatus = "active" | "deleted" | "private";

interface PlaylistSong {
  id: string;
  track_name: string;
  artist_name: string;
  thumbnail_url: string | null;
  youtube_id: string | null;
  status: PlaylistItemStatus;
}

interface PlaylistRecord {
  id: string;
  prompt_text: string;
  source: PlaylistSource;
  youtube_playlist_id: string | null;
  created_at: string;
  songs: PlaylistSong[];
  learning_path: LearningPathRecord | null;
}

interface PlaylistDashboardProps {
  authToken: string | null;
  providerToken: string | null;
  refreshTrigger: number;
  _onExportToYouTube?: (playlistId: string) => void;
}

const sourceLabel: Record<PlaylistSource, string> = {
  ai_generate: "AI Playlist",
  playlist_remix: "Remix",
  import: "Imported",
};

const sourceBadgeClass: Record<PlaylistSource, string> = {
  ai_generate: "border-primary/30 bg-primary/10 text-primary",
  playlist_remix: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  import: "border-sky-400/30 bg-sky-400/10 text-sky-300",
};

function normalizeLearningPath(raw: Record<string, unknown>): LearningPathRecord {
  return {
    playlist_id: String(raw.playlist_id || ""),
    title: String(raw.title || "Learning Path"),
    summary: String(raw.summary || "Structured from your playlist."),
    estimated_minutes: typeof raw.estimated_minutes === "number" ? raw.estimated_minutes : null,
    difficulty: ["beginner", "intermediate", "advanced", "mixed"].includes(String(raw.difficulty))
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

export function PlaylistDashboard({
  authToken,
  providerToken,
  refreshTrigger,
  _onExportToYouTube,
}: PlaylistDashboardProps) {
  const [playlists, setPlaylists] = useState<PlaylistRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [buildingPathId, setBuildingPathId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const fetchPlaylists = async () => {
    if (!authToken) return;
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: playlistData, error: playlistError } = await supabase
        .from("generated_playlists")
        .select("id, prompt_text, source, youtube_playlist_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (playlistError) throw playlistError;
      if (!playlistData || playlistData.length === 0) {
        setPlaylists([]);
        return;
      }

      const playlistIds = playlistData.map((playlist) => playlist.id);

      const { data: allItems, error: itemsError } = await supabase
        .from("playlist_items")
        .select("id, playlist_id, youtube_video_id, position, status")
        .in("playlist_id", playlistIds)
        .order("position", { ascending: true });

      if (itemsError) throw itemsError;

      const videoIds = [...new Set((allItems || []).map((item) => item.youtube_video_id))];
      const videosMap: Record<string, { title: string; channel_name: string | null; thumbnail_url: string | null }> = {};

      if (videoIds.length > 0) {
        const { data: allVideos, error: videosError } = await supabase
          .from("videos")
          .select("youtube_video_id, title, channel_name, thumbnail_url")
          .in("youtube_video_id", videoIds);

        if (videosError) throw videosError;

        for (const video of allVideos || []) {
          videosMap[video.youtube_video_id] = video;
        }
      }

      const { data: allPaths, error: pathsError } = await supabase
        .from("playlist_learning_paths")
        .select("playlist_id, title, summary, estimated_minutes, difficulty, learning_objectives, modules, updated_at")
        .in("playlist_id", playlistIds);

      if (pathsError) throw pathsError;

      const pathsByPlaylist = new Map<string, LearningPathRecord>();
      for (const path of allPaths || []) {
        pathsByPlaylist.set(path.playlist_id, normalizeLearningPath(path as unknown as Record<string, unknown>));
      }

      const itemsByPlaylist: Record<string, PlaylistSong[]> = {};
      for (const item of allItems || []) {
        const video = videosMap[item.youtube_video_id];
        if (!itemsByPlaylist[item.playlist_id]) itemsByPlaylist[item.playlist_id] = [];

        itemsByPlaylist[item.playlist_id].push({
          id: item.id,
          track_name: video?.title || "Unknown",
          artist_name: video?.channel_name || "Unknown",
          thumbnail_url: video?.thumbnail_url || null,
          youtube_id: item.youtube_video_id,
          status: (item.status as PlaylistItemStatus) || "active",
        });
      }

      setPlaylists(
        playlistData.map((playlist) => ({
          id: playlist.id,
          prompt_text: playlist.prompt_text,
          source: (playlist.source as PlaylistSource) || "ai_generate",
          youtube_playlist_id: playlist.youtube_playlist_id,
          created_at: playlist.created_at,
          songs: itemsByPlaylist[playlist.id] || [],
          learning_path: pathsByPlaylist.get(playlist.id) || null,
        })),
      );
    } catch (error) {
      console.error("Failed to fetch playlists:", error);
      toast({
        title: "Could not load playlists",
        description: error instanceof Error ? error.message : "Please refresh and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, refreshTrigger]);

  const handleDelete = async (playlistId: string) => {
    if (!window.confirm("Delete this playlist? This cannot be undone.")) return;

    try {
      const { error } = await supabase
        .from("generated_playlists")
        .delete()
        .eq("id", playlistId);

      if (error) throw error;

      setPlaylists((prev) => prev.filter((playlist) => playlist.id !== playlistId));
      toast({ title: "Playlist deleted" });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Could not delete playlist.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateRecommendation = async (playlist: PlaylistRecord) => {
    setGeneratingId(playlist.id);

    try {
      if (playlist.songs.length === 0) {
        throw new Error("Playlist is empty. Import or save some videos first.");
      }

      const sampleTracks = playlist.songs
        .slice(0, 30)
        .map((song) => `${song.artist_name} - ${song.track_name}`)
        .join(", ");
      const prompt = `Create a 15-video YouTube playlist inspired by these videos: ${sampleTracks}. Keep the subject matter, taste level, and creator style closely aligned while avoiding duplicates.`;

      const { data, error } = await supabase.functions.invoke("generate-playlist", {
        body: { prompt },
      });

      if (data?.error) throw new Error(data.error);
      if (error) throw error;

      const videos = (data?.songs || [])
        .filter((video: Record<string, unknown>) => video.youtube_id)
        .map((video: Record<string, unknown>) => ({
          youtube_id: video.youtube_id as string,
          title: (video.title as string) || "Unknown",
          creator: (video.creator as string) || "Unknown",
          thumbnail: (video.thumbnail as string) || "",
        }));

      if (videos.length === 0) {
        throw new Error("Could not find relevant recommendations.");
      }

      const newPromptText = `Remix of: ${playlist.prompt_text}`;
      const { data: savedPlaylist, error: saveError } = await supabase.functions.invoke("save-generated-playlist", {
        body: {
          prompt: newPromptText,
          source: "playlist_remix",
          videos,
        },
      });

      if (savedPlaylist?.error) throw new Error(savedPlaylist.error);
      if (saveError) throw saveError;

      toast({
        title: "Remix created",
        description: `Saved ${videos.length} fresh recommendations based on this playlist.`,
      });

      setExpandedId(savedPlaylist.playlist_id ?? null);
      await fetchPlaylists();
    } catch (error) {
      console.error("Recommendation error:", error);
      toast({
        title: "Remix failed",
        description: error instanceof Error ? error.message : "Failed to create a remix.",
        variant: "destructive",
      });
    } finally {
      setGeneratingId(null);
    }
  };

  const handleBuildLearningPath = async (playlistId: string) => {
    setBuildingPathId(playlistId);

    try {
      const { data, error } = await supabase.functions.invoke("build-learning-path", {
        body: { playlist_id: playlistId },
      });

      if (data?.error) throw new Error(data.error);
      if (error) throw error;

      const learningPath = normalizeLearningPath(data as Record<string, unknown>);
      setPlaylists((prev) =>
        prev.map((playlist) =>
          playlist.id === playlistId
            ? { ...playlist, learning_path: learningPath }
            : playlist,
        ),
      );

      setExpandedId(playlistId);
      toast({
        title: "Learning path ready",
        description: "This playlist now has a structured watch order and module plan.",
      });
    } catch (error) {
      console.error("Learning path error:", error);
      toast({
        title: "Could not build learning path",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBuildingPathId(null);
    }
  };

  const handleSyncPlaylist = async (playlist: PlaylistRecord) => {
    setSyncingId(playlist.id);

    try {
      if (!providerToken) {
        throw new Error("Please sign in again to reconnect your YouTube account.");
      }

      const { data, error } = await supabase.functions.invoke("sync-playlist", {
        body: { playlist_id: playlist.id },
        headers: {
          "X-YouTube-Token": providerToken,
        },
      });

      if (data?.error) throw new Error(data.error);
      if (error) throw error;

      await fetchPlaylists();

      toast({
        title: "Playlist synced",
        description: `${data?.active_videos || 0} active videos remain available on YouTube.`,
      });
    } catch (error) {
      console.error("Sync error:", error);
      toast({
        title: "Sync failed",
        description: error instanceof Error ? error.message : "Could not sync playlist.",
        variant: "destructive",
      });
    } finally {
      setSyncingId(null);
    }
  };

  const handleExportToYouTube = async (playlist: PlaylistRecord) => {
    setExportingId(playlist.id);

    try {
      if (!providerToken) {
        throw new Error("Please sign in again to connect your YouTube account.");
      }

      const { data, error } = await supabase.functions.invoke("youtube-create-playlist", {
        body: {
          playlist_id: playlist.id,
          playlist_name: playlist.prompt_text,
        },
        headers: {
          "X-YouTube-Token": providerToken,
        },
      });

      if (data?.error) {
        const errMsg = String(data.error);
        if (
          errMsg.toLowerCase().includes("401") ||
          errMsg.toLowerCase().includes("unauthorized") ||
          errMsg.toLowerCase().includes("invalid_grant")
        ) {
          toast({
            title: "Session expired",
            description: "Please sign out and sign back in to reconnect your YouTube account.",
            variant: "destructive",
          });
          return;
        }

        throw new Error(errMsg);
      }

      if (error) throw error;

      setPlaylists((prev) =>
        prev.map((entry) =>
          entry.id === playlist.id
            ? { ...entry, youtube_playlist_id: data.playlistId ?? entry.youtube_playlist_id }
            : entry,
        ),
      );

      toast({
        title: "Exported to YouTube",
        description: `${data?.videosAdded || 0} videos were added to your YouTube playlist.`,
      });

      if (data?.playlistUrl) {
        window.open(data.playlistUrl, "_blank");
      }
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Could not export playlist.",
        variant: "destructive",
      });
    } finally {
      setExportingId(null);
    }
  };

  if (!authToken) return null;

  if (isLoading && playlists.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (playlists.length === 0) return null;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <ListMusic className="h-5 w-5 text-primary" />
          Your Library
        </h2>
        <span className="text-sm text-muted-foreground">
          {playlists.length} {playlists.length === 1 ? "playlist" : "playlists"}
        </span>
      </div>

      <div className="space-y-3">
        {playlists.map((playlist) => {
          const isExpanded = expandedId === playlist.id;
          const isExporting = exportingId === playlist.id;
          const isGenerating = generatingId === playlist.id;
          const isBuildingPath = buildingPathId === playlist.id;
          const isSyncing = syncingId === playlist.id;
          const ghostCount = playlist.songs.filter((song) => song.status !== "active").length;

          return (
            <div key={playlist.id} className="overflow-hidden rounded-2xl glass animate-fade-in">
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : playlist.id)}
                    className="min-w-0 flex-1 text-left group"
                  >
                    <h3 className="truncate font-medium text-foreground transition-colors group-hover:text-primary">
                      {playlist.prompt_text}
                    </h3>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className={sourceBadgeClass[playlist.source]}>
                        {sourceLabel[playlist.source]}
                      </Badge>
                      <span>{playlist.songs.length} videos</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(playlist.created_at).toLocaleDateString()}
                      </span>
                      {playlist.learning_path && (
                        <Badge variant="outline" className="border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
                          Path ready
                        </Badge>
                      )}
                      {ghostCount > 0 && (
                        <Badge variant="outline" className="border-yellow-400/30 bg-yellow-400/10 text-yellow-300">
                          {ghostCount} unavailable
                        </Badge>
                      )}
                      {playlist.youtube_playlist_id && (
                        <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-300">
                          On YouTube
                        </Badge>
                      )}
                    </div>
                  </button>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {playlist.youtube_playlist_id && (
                      <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                        <a
                          href={`https://www.youtube.com/playlist?list=${playlist.youtube_playlist_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open on YouTube"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}

                    {!playlist.youtube_playlist_id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportToYouTube(playlist)}
                        disabled={isExporting || isGenerating || isBuildingPath}
                        className="gap-1.5 text-xs"
                      >
                        {isExporting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Youtube className="h-3.5 w-3.5" />
                        )}
                        Export
                      </Button>
                    )}

                    {playlist.youtube_playlist_id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSyncPlaylist(playlist)}
                        disabled={isSyncing || isGenerating || isBuildingPath || isExporting}
                        className="gap-1.5 text-xs text-sky-300 hover:bg-sky-500/10 hover:text-sky-200"
                        title="Sync availability from YouTube"
                      >
                        {isSyncing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                        Sync
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleGenerateRecommendation(playlist)}
                      disabled={isGenerating || isExporting || isBuildingPath || isSyncing}
                      className="gap-1.5 text-xs text-primary hover:bg-primary/10 hover:text-primary"
                      title="Create a remix"
                    >
                      {isGenerating ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      Remix
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleBuildLearningPath(playlist.id)}
                      disabled={isBuildingPath || isGenerating || isSyncing || playlist.songs.length < 2}
                      className="gap-1.5 text-xs text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-200"
                      title="Build a guided learning path"
                    >
                      {isBuildingPath ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Route className="h-3.5 w-3.5" />
                      )}
                      {playlist.learning_path ? "Refresh Path" : "Build Path"}
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setExpandedId(isExpanded ? null : playlist.id)}
                      className="h-8 w-8"
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(playlist.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-border/50">
                  {ghostCount > 0 && (
                    <div className="border-b border-border/50 bg-yellow-500/5 px-4 py-3 text-sm text-yellow-100">
                      {ghostCount} videos are currently marked as deleted or private. PromptPlay keeps them in the record so your playlist history and learning path stay intact.
                    </div>
                  )}

                  {playlist.songs.length > 0 && (
                    <ul className="divide-y divide-border/30">
                      {playlist.songs.map((song) => (
                        <li key={song.id}>
                          <a
                            href={song.youtube_id
                              ? `https://www.youtube.com/watch?v=${song.youtube_id}`
                              : `https://www.youtube.com/results?search_query=${encodeURIComponent(`${song.track_name} ${song.artist_name}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/30"
                          >
                            <div className="h-10 w-10 flex-shrink-0 rounded bg-secondary">
                              {song.thumbnail_url ? (
                                <img
                                  src={song.thumbnail_url}
                                  alt=""
                                  className={`h-full w-full rounded object-cover ${song.status !== "active" ? "opacity-40 grayscale" : ""}`}
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <Play className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className={`truncate text-sm font-medium transition-colors group-hover:text-primary ${song.status !== "active" ? "text-muted-foreground line-through" : "text-foreground"}`}>
                                  {song.track_name}
                                </p>
                                {song.status !== "active" && (
                                  <Badge variant="outline" className="border-yellow-400/20 bg-yellow-400/10 text-yellow-300">
                                    {song.status}
                                  </Badge>
                                )}
                              </div>
                              <p className="truncate text-xs text-muted-foreground">{song.artist_name}</p>
                            </div>
                            <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}

                  {playlist.learning_path ? (
                    <LearningPathPanel learningPath={playlist.learning_path} />
                  ) : (
                    <div className="border-t border-border/50 px-4 py-4">
                      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <h4 className="text-sm font-semibold text-foreground">Turn this playlist into a guided path</h4>
                            <p className="mt-1 text-sm text-muted-foreground">
                              PromptPlay can sequence these videos into modules, define the goal of each stage, and explain why each video belongs.
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => handleBuildLearningPath(playlist.id)}
                            disabled={isBuildingPath || playlist.songs.length < 2}
                            className="gap-2 border-emerald-400/30 text-emerald-200 hover:bg-emerald-500/10"
                          >
                            {isBuildingPath ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Route className="h-4 w-4" />
                            )}
                            Build Learning Path
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
