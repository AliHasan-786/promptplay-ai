import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  Globe,
  ListMusic,
  Lock,
  Loader2,
  NotebookText,
  Play,
  RefreshCw,
  Route,
  Search,
  Sparkles,
  Trash2,
  Youtube,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LearningPathPanel } from "@/components/LearningPathPanel";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { buildPublicPlaylistSlug, normalizeLearningPath } from "@/lib/playlist-utils";
import {
  buildSessionPlan,
  estimateVideoSeconds,
  formatSecondsLabel,
  sortStudyVideos,
  type StudySortMode,
  type WatchState,
} from "@/lib/video-utils";
import type { LearningPathRecord } from "@/types/learning-path";

type PlaylistSource = "ai_generate" | "playlist_remix" | "import";
type PlaylistItemStatus = "active" | "deleted" | "private";
type PlaylistVisibility = "private" | "public";

interface PlaylistSong {
  id: string;
  position: number;
  track_name: string;
  artist_name: string;
  thumbnail_url: string | null;
  youtube_id: string | null;
  duration: string | null;
  status: PlaylistItemStatus;
  watch_state: WatchState;
  learner_note: string | null;
}

interface PlaylistRecord {
  id: string;
  prompt_text: string;
  source: PlaylistSource;
  visibility: PlaylistVisibility;
  public_slug: string | null;
  public_description: string | null;
  published_at: string | null;
  youtube_playlist_id: string | null;
  created_at: string;
  songs: PlaylistSong[];
  learning_path: LearningPathRecord | null;
}

interface ReplacementCandidate {
  youtube_id: string;
  title: string;
  channel_name: string | null;
  thumbnail_url: string | null;
  duration: string | null;
}

interface PlaylistRepairSuggestion {
  item_id: string;
  position: number | null;
  status: PlaylistItemStatus;
  original_youtube_id: string;
  original_title: string;
  original_channel: string | null;
  candidates: ReplacementCandidate[];
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
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [updatingSongId, setUpdatingSongId] = useState<string | null>(null);
  const [savingNoteSongId, setSavingNoteSongId] = useState<string | null>(null);
  const [sortModes, setSortModes] = useState<Record<string, StudySortMode>>({});
  const [studyBudgets, setStudyBudgets] = useState<Record<string, number>>({});
  const [hideCompleted, setHideCompleted] = useState<Record<string, boolean>>({});
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [libraryQuery, setLibraryQuery] = useState("");
  const [repairingId, setRepairingId] = useState<string | null>(null);
  const [applyingReplacementId, setApplyingReplacementId] = useState<string | null>(null);
  const [replacementSuggestions, setReplacementSuggestions] = useState<Record<string, PlaylistRepairSuggestion[]>>({});

  const fetchPlaylists = async () => {
    if (!authToken) return;
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: playlistData, error: playlistError } = await supabase
        .from("generated_playlists")
        .select("id, prompt_text, source, visibility, public_slug, public_description, published_at, youtube_playlist_id, created_at")
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
        .select("id, playlist_id, youtube_video_id, position, status, watch_state, learner_note")
        .in("playlist_id", playlistIds)
        .order("position", { ascending: true });

      if (itemsError) throw itemsError;

      const videoIds = [...new Set((allItems || []).map((item) => item.youtube_video_id))];
      const videosMap: Record<string, { title: string; channel_name: string | null; thumbnail_url: string | null; duration: string | null }> = {};

      if (videoIds.length > 0) {
        const { data: allVideos, error: videosError } = await supabase
          .from("videos")
          .select("youtube_video_id, title, channel_name, thumbnail_url, duration")
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
          position: item.position ?? itemsByPlaylist[item.playlist_id].length,
          track_name: video?.title || "Unknown",
          artist_name: video?.channel_name || "Unknown",
          thumbnail_url: video?.thumbnail_url || null,
          youtube_id: item.youtube_video_id,
          duration: video?.duration || null,
          status: (item.status as PlaylistItemStatus) || "active",
          watch_state: (item.watch_state as WatchState) || "not_started",
          learner_note: item.learner_note || null,
        });
      }

      const nextPlaylists = playlistData.map((playlist) => ({
        id: playlist.id,
        prompt_text: playlist.prompt_text,
        source: (playlist.source as PlaylistSource) || "ai_generate",
        visibility: (playlist.visibility as PlaylistVisibility) || "private",
        public_slug: playlist.public_slug,
        public_description: playlist.public_description,
        published_at: playlist.published_at,
        youtube_playlist_id: playlist.youtube_playlist_id,
        created_at: playlist.created_at,
        songs: itemsByPlaylist[playlist.id] || [],
        learning_path: pathsByPlaylist.get(playlist.id) || null,
      }));

      setPlaylists(nextPlaylists);
      setNoteDrafts(
        Object.fromEntries(
          nextPlaylists.flatMap((playlist) =>
            playlist.songs.map((song) => [song.id, song.learner_note || ""]),
          ),
        ),
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

  const handleDescriptionChange = (playlistId: string, value: string) => {
    setPlaylists((prev) =>
      prev.map((playlist) =>
        playlist.id === playlistId
          ? { ...playlist, public_description: value }
          : playlist,
      ),
    );
  };

  const getPublicUrl = (playlist: PlaylistRecord) => {
    if (!playlist.public_slug || typeof window === "undefined") return null;
    return `${window.location.origin}/p/${playlist.public_slug}`;
  };

  const getFallbackVideoSeconds = (playlist: PlaylistRecord) => {
    const estimatedMinutes = playlist.learning_path?.estimated_minutes;
    if (estimatedMinutes && playlist.songs.length > 0) {
      return Math.max(300, Math.round((estimatedMinutes * 60) / playlist.songs.length));
    }

    return 18 * 60;
  };

  const handleWatchStateChange = async (
    playlistId: string,
    songId: string,
    nextState: WatchState,
  ) => {
    setUpdatingSongId(songId);

    try {
      const updates: {
        watch_state: WatchState;
        started_at?: string | null;
        completed_at?: string | null;
      } = { watch_state: nextState };

      if (nextState === "not_started") {
        updates.started_at = null;
        updates.completed_at = null;
      } else if (nextState === "in_progress") {
        updates.started_at = new Date().toISOString();
        updates.completed_at = null;
      } else {
        updates.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("playlist_items")
        .update(updates)
        .eq("id", songId);

      if (error) throw error;

      setPlaylists((prev) =>
        prev.map((playlist) =>
          playlist.id === playlistId
            ? {
                ...playlist,
                songs: playlist.songs.map((song) =>
                  song.id === songId
                    ? { ...song, watch_state: nextState }
                    : song,
                ),
              }
            : playlist,
        ),
      );
    } catch (error) {
      console.error("Watch state update error:", error);
      toast({
        title: "Could not update progress",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdatingSongId(null);
    }
  };

  const handleSaveNote = async (
    playlistId: string,
    songId: string,
  ) => {
    setSavingNoteSongId(songId);

    try {
      const learnerNote = noteDrafts[songId]?.trim() || null;
      const { error } = await supabase
        .from("playlist_items")
        .update({ learner_note: learnerNote })
        .eq("id", songId);

      if (error) throw error;

      setPlaylists((prev) =>
        prev.map((playlist) =>
          playlist.id === playlistId
            ? {
                ...playlist,
                songs: playlist.songs.map((song) =>
                  song.id === songId
                    ? { ...song, learner_note: learnerNote }
                    : song,
                ),
              }
            : playlist,
        ),
      );
    } catch (error) {
      console.error("Note save error:", error);
      toast({
        title: "Could not save note",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingNoteSongId(null);
    }
  };

  const handleFindReplacements = async (playlistId: string) => {
    setRepairingId(playlistId);

    try {
      const { data, error } = await supabase.functions.invoke("suggest-playlist-replacements", {
        body: { playlist_id: playlistId },
      });

      if (data?.error) throw new Error(data.error);
      if (error) throw error;

      setReplacementSuggestions((prev) => ({
        ...prev,
        [playlistId]: (data?.suggestions || []) as PlaylistRepairSuggestion[],
      }));
    } catch (error) {
      console.error("Replacement suggestion error:", error);
      toast({
        title: "Could not find replacements",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setRepairingId(null);
    }
  };

  const handleApplyReplacement = async (
    playlistId: string,
    itemId: string,
    replacement: ReplacementCandidate,
  ) => {
    setApplyingReplacementId(itemId);

    try {
      const { data, error } = await supabase.functions.invoke("apply-playlist-replacement", {
        body: {
          playlist_id: playlistId,
          item_id: itemId,
          replacement,
        },
      });

      if (data?.error) throw new Error(data.error);
      if (error) throw error;

      setReplacementSuggestions((prev) => ({
        ...prev,
        [playlistId]: (prev[playlistId] || []).filter((suggestion) => suggestion.item_id !== itemId),
      }));

      await fetchPlaylists();
      toast({
        title: "Replacement applied",
        description: "The unavailable video has been swapped into a live alternative.",
      });
    } catch (error) {
      console.error("Replacement apply error:", error);
      toast({
        title: "Could not apply replacement",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setApplyingReplacementId(null);
    }
  };

  const handlePublishPlaylist = async (playlist: PlaylistRecord) => {
    setPublishingId(playlist.id);

    try {
      const publicSlug = playlist.public_slug || buildPublicPlaylistSlug(playlist.prompt_text, playlist.id);
      const publishedAt = playlist.published_at || new Date().toISOString();
      const publicDescription = playlist.public_description?.trim() || null;

      const { error } = await supabase
        .from("generated_playlists")
        .update({
          visibility: "public",
          public_slug: publicSlug,
          public_description: publicDescription,
          published_at: publishedAt,
        })
        .eq("id", playlist.id);

      if (error) throw error;

      setPlaylists((prev) =>
        prev.map((entry) =>
          entry.id === playlist.id
            ? {
                ...entry,
                visibility: "public",
                public_slug: publicSlug,
                public_description: publicDescription,
                published_at: publishedAt,
              }
            : entry,
        ),
      );

      toast({
        title: playlist.visibility === "public" ? "Public page updated" : "Public page published",
        description: "Anyone with the link can now preview and save this path.",
      });
    } catch (error) {
      console.error("Publish error:", error);
      toast({
        title: "Publish failed",
        description: error instanceof Error ? error.message : "Could not publish this page.",
        variant: "destructive",
      });
    } finally {
      setPublishingId(null);
    }
  };

  const handleUnpublishPlaylist = async (playlistId: string) => {
    setPublishingId(playlistId);

    try {
      const { error } = await supabase
        .from("generated_playlists")
        .update({
          visibility: "private",
          published_at: null,
        })
        .eq("id", playlistId);

      if (error) throw error;

      setPlaylists((prev) =>
        prev.map((playlist) =>
          playlist.id === playlistId
            ? { ...playlist, visibility: "private", published_at: null }
            : playlist,
        ),
      );

      toast({
        title: "Public page unpublished",
        description: "The shared link is no longer publicly accessible.",
      });
    } catch (error) {
      console.error("Unpublish error:", error);
      toast({
        title: "Unpublish failed",
        description: error instanceof Error ? error.message : "Could not unpublish this page.",
        variant: "destructive",
      });
    } finally {
      setPublishingId(null);
    }
  };

  const handleCopyLink = async (playlist: PlaylistRecord) => {
    const publicUrl = getPublicUrl(playlist);
    if (!publicUrl) return;

    try {
      await navigator.clipboard.writeText(publicUrl);
      toast({
        title: "Link copied",
        description: "Your public page URL is ready to share.",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: error instanceof Error ? error.message : "Could not copy the public link.",
        variant: "destructive",
      });
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

  const normalizedLibraryQuery = libraryQuery.trim().toLowerCase();
  const visiblePlaylists = normalizedLibraryQuery
    ? playlists.filter((playlist) => {
        const haystack = [
          playlist.prompt_text,
          playlist.public_description || "",
          playlist.learning_path?.title || "",
          playlist.learning_path?.summary || "",
          ...(playlist.learning_path?.learning_objectives || []),
          ...playlist.songs.flatMap((song) => [
            song.track_name,
            song.artist_name,
            song.learner_note || "",
          ]),
        ].join(" ").toLowerCase();

        return haystack.includes(normalizedLibraryQuery);
      })
    : playlists;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
            <ListMusic className="h-5 w-5 text-primary" />
            Your Library
          </h2>
          <span className="text-sm text-muted-foreground">
            {visiblePlaylists.length} of {playlists.length} {playlists.length === 1 ? "playlist" : "playlists"}
          </span>
        </div>

        <div className="relative w-full md:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={libraryQuery}
            onChange={(event) => setLibraryQuery(event.target.value)}
            placeholder="Search titles, channels, and notes"
            className="pl-9"
          />
        </div>
      </div>

      {visiblePlaylists.length === 0 && (
        <div className="rounded-2xl border border-border/60 bg-card/60 p-6 text-sm text-muted-foreground">
          No playlists match that search yet. Try a different title, creator, or note keyword.
        </div>
      )}

      <div className="space-y-3">
        {visiblePlaylists.map((playlist) => {
          const isExpanded = expandedId === playlist.id;
          const isExporting = exportingId === playlist.id;
          const isGenerating = generatingId === playlist.id;
          const isBuildingPath = buildingPathId === playlist.id;
          const isSyncing = syncingId === playlist.id;
          const isPublishing = publishingId === playlist.id;
          const fallbackVideoSeconds = getFallbackVideoSeconds(playlist);
          const sortMode = sortModes[playlist.id] || "course";
          const studyBudget = studyBudgets[playlist.id] || 30;
          const hideCompletedItems = hideCompleted[playlist.id] || false;
          const sortedSongs = sortStudyVideos(playlist.songs, sortMode, fallbackVideoSeconds);
          const visibleSongs = hideCompletedItems
            ? sortedSongs.filter((song) => !["completed", "skipped"].includes(song.watch_state))
            : sortedSongs;
          const sessionPlan = buildSessionPlan(sortedSongs, studyBudget, fallbackVideoSeconds);
          const ghostCount = playlist.songs.filter((song) => song.status !== "active").length;
          const completedCount = playlist.songs.filter((song) => ["completed", "skipped"].includes(song.watch_state)).length;
          const noteCount = playlist.songs.filter((song) => song.learner_note?.trim()).length;
          const playlistRepairSuggestions = replacementSuggestions[playlist.id] || [];
          const progressPercent = playlist.songs.length > 0
            ? Math.round((completedCount / playlist.songs.length) * 100)
            : 0;
          const remainingVideos = playlist.songs.filter((song) =>
            song.status === "active" && !["completed", "skipped"].includes(song.watch_state),
          );
          const remainingSeconds = remainingVideos.reduce((total, song) =>
            total + estimateVideoSeconds(song, fallbackVideoSeconds), 0,
          );
          const sessionPlanSeconds = sessionPlan.reduce((total, song) =>
            total + estimateVideoSeconds(song, fallbackVideoSeconds), 0,
          );
          const resumeSong = sortedSongs.find((song) =>
            song.status === "active" && song.watch_state === "in_progress",
          ) || sessionPlan[0] || remainingVideos[0] || sortedSongs.find((song) => song.status === "active");
          const progressByVideoId = Object.fromEntries(
            playlist.songs
              .filter((song) => song.youtube_id)
              .map((song) => [song.youtube_id as string, song.watch_state]),
          ) as Record<string, WatchState>;
          const publicUrl = getPublicUrl(playlist);

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
                      <span>{completedCount}/{playlist.songs.length} done</span>
                      {remainingVideos.length > 0 && (
                        <span>{formatSecondsLabel(remainingSeconds)} left</span>
                      )}
                      {noteCount > 0 && (
                        <span>{noteCount} notes</span>
                      )}
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
                      {playlist.visibility === "public" && (
                        <Badge variant="outline" className="border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
                          Public
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
                    <div className="border-b border-border/50 bg-yellow-500/5 px-4 py-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="text-sm text-yellow-100">
                          {ghostCount} videos are currently marked as deleted or private. PromptPlay keeps them in the record so your playlist history and learning path stay intact.
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleFindReplacements(playlist.id)}
                          disabled={repairingId === playlist.id || applyingReplacementId !== null}
                          className="gap-2 border-yellow-400/30 bg-yellow-400/10 text-yellow-100 hover:bg-yellow-400/20"
                        >
                          {repairingId === playlist.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                          Find replacements
                        </Button>
                      </div>

                      {playlistRepairSuggestions.length > 0 && (
                        <div className="mt-4 space-y-3">
                          {playlistRepairSuggestions.map((suggestion) => (
                            <div
                              key={suggestion.item_id}
                              className="rounded-2xl border border-yellow-400/20 bg-background/50 p-4"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="border-yellow-400/20 bg-yellow-400/10 text-yellow-300">
                                  {suggestion.status}
                                </Badge>
                                {suggestion.position !== null && (
                                  <Badge variant="outline" className="border-border/70 text-muted-foreground">
                                    Slot #{suggestion.position + 1}
                                  </Badge>
                                )}
                              </div>

                              <div className="mt-2">
                                <p className="text-sm font-medium text-foreground">
                                  {suggestion.original_title}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {suggestion.original_channel || "Unknown channel"}
                                </p>
                              </div>

                              <div className="mt-3 grid gap-3 lg:grid-cols-3">
                                {suggestion.candidates.length > 0 ? suggestion.candidates.map((candidate) => (
                                  <div
                                    key={candidate.youtube_id}
                                    className="rounded-xl border border-border/50 bg-card/50 p-3"
                                  >
                                    <div className="flex gap-3">
                                      <div className="h-14 w-20 flex-shrink-0 overflow-hidden rounded bg-secondary">
                                        {candidate.thumbnail_url ? (
                                          <img
                                            src={candidate.thumbnail_url}
                                            alt=""
                                            className="h-full w-full object-cover"
                                          />
                                        ) : null}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <a
                                          href={`https://www.youtube.com/watch?v=${candidate.youtube_id}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="line-clamp-2 text-sm font-medium text-foreground transition-colors hover:text-primary"
                                        >
                                          {candidate.title}
                                        </a>
                                        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                                          {candidate.channel_name || "Unknown channel"}
                                        </p>
                                        {candidate.duration && (
                                          <p className="mt-1 text-xs text-muted-foreground">
                                            {formatSecondsLabel(estimateVideoSeconds({
                                              id: candidate.youtube_id,
                                              track_name: candidate.title,
                                              artist_name: candidate.channel_name || "Unknown",
                                              status: "active",
                                              duration: candidate.duration,
                                              watch_state: "not_started",
                                            }, fallbackVideoSeconds))}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleApplyReplacement(playlist.id, suggestion.item_id, candidate)}
                                      disabled={applyingReplacementId !== null}
                                      className="mt-3 w-full text-xs"
                                    >
                                      {applyingReplacementId === suggestion.item_id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        "Use this replacement"
                                      )}
                                    </Button>
                                  </div>
                                )) : (
                                  <div className="rounded-xl border border-dashed border-border/60 bg-background/40 p-4 text-sm text-muted-foreground lg:col-span-3">
                                    No strong replacement candidates were found yet. Try syncing again later or remix the playlist to discover nearby alternatives.
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="border-b border-border/50 px-4 py-4">
                    <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                              {playlist.visibility === "public" ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-foreground">
                                {playlist.learning_path ? "Public path page" : "Public playlist page"}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {playlist.visibility === "public"
                                  ? "This page is live. People can preview it, save their own copy, and open the videos directly."
                                  : "Publish this collection to create a shareable PromptPlay page for friends, teams, or communities."}
                              </p>
                            </div>
                          </div>

                          <Textarea
                            value={playlist.public_description || ""}
                            onChange={(event) => handleDescriptionChange(playlist.id, event.target.value)}
                            placeholder={playlist.learning_path
                              ? "Optional intro for visitors. Explain who this path is for and why it is worth following."
                              : "Optional intro for visitors. Explain what this playlist covers and why you curated it."}
                            className="min-h-24 border-border/60 bg-background/60"
                          />
                        </div>

                        <div className="flex w-full flex-col gap-2 lg:max-w-xs">
                          <Button
                            onClick={() => handlePublishPlaylist(playlist)}
                            disabled={isPublishing}
                            className="gap-2"
                          >
                            {isPublishing ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Globe className="h-4 w-4" />
                            )}
                            {playlist.visibility === "public" ? "Update public page" : "Publish page"}
                          </Button>

                          {playlist.visibility === "public" && publicUrl && (
                            <>
                              <Button
                                variant="outline"
                                onClick={() => handleCopyLink(playlist)}
                                className="gap-2"
                              >
                                <Copy className="h-4 w-4" />
                                Copy link
                              </Button>
                              <Button variant="outline" asChild className="gap-2">
                                <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                                  <Eye className="h-4 w-4" />
                                  Preview page
                                </a>
                              </Button>
                              <Button
                                variant="ghost"
                                onClick={() => handleUnpublishPlaylist(playlist.id)}
                                disabled={isPublishing}
                                className="gap-2 text-muted-foreground hover:text-foreground"
                              >
                                <Lock className="h-4 w-4" />
                                Unpublish
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {playlist.songs.length > 0 && (
                    <>
                      <div className="border-b border-border/50 px-4 py-4">
                        <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-3">
                              <div>
                                <h4 className="text-sm font-semibold text-foreground">Study mode</h4>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  Track your progress, hide what you already finished, and build a focused session from the next best videos.
                                </p>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span>{completedCount} of {playlist.songs.length} finished</span>
                                  <span>{progressPercent}% complete</span>
                                </div>
                                <Progress value={progressPercent} className="h-2 bg-secondary/70" />
                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  <Badge variant="outline" className="border-border/70 text-muted-foreground">
                                    {remainingVideos.length} active videos left
                                  </Badge>
                                  <Badge variant="outline" className="border-border/70 text-muted-foreground">
                                    {formatSecondsLabel(remainingSeconds)} remaining
                                  </Badge>
                                  <Badge variant="outline" className="border-border/70 text-muted-foreground">
                                    {noteCount} notes
                                  </Badge>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Queue mode</p>
                                <div className="flex flex-wrap gap-2">
                                  {([
                                    ["course", "Course order"],
                                    ["reverse", "Reverse order"],
                                    ["shortest", "Shortest first"],
                                    ["longest", "Longest first"],
                                  ] as Array<[StudySortMode, string]>).map(([mode, label]) => (
                                    <Button
                                      key={mode}
                                      variant={sortMode === mode ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => setSortModes((prev) => ({ ...prev, [playlist.id]: mode }))}
                                      className="text-xs"
                                    >
                                      {label}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="w-full max-w-sm space-y-3">
                              <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <h5 className="text-sm font-semibold text-foreground">Next session</h5>
                                    <p className="text-xs text-muted-foreground">
                                      Fit your next block into a realistic time window.
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={hideCompletedItems}
                                      onCheckedChange={(checked) =>
                                        setHideCompleted((prev) => ({ ...prev, [playlist.id]: checked }))
                                      }
                                    />
                                    <span className="text-xs text-muted-foreground">Hide completed</span>
                                  </div>
                                </div>

                                {resumeSong && (
                                  <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="min-w-0">
                                        <p className="text-xs font-medium uppercase tracking-wide text-primary/80">
                                          Resume next
                                        </p>
                                        <p className="truncate text-sm font-medium text-foreground">
                                          {resumeSong.track_name}
                                        </p>
                                        <p className="truncate text-xs text-muted-foreground">
                                          {resumeSong.artist_name}
                                        </p>
                                      </div>
                                      <Button variant="outline" size="sm" asChild className="gap-2 text-xs">
                                        <a
                                          href={resumeSong.youtube_id
                                            ? `https://www.youtube.com/watch?v=${resumeSong.youtube_id}`
                                            : `https://www.youtube.com/results?search_query=${encodeURIComponent(`${resumeSong.track_name} ${resumeSong.artist_name}`)}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          <Play className="h-3.5 w-3.5" />
                                          Continue
                                        </a>
                                      </Button>
                                    </div>
                                  </div>
                                )}

                                <div className="mt-3 flex flex-wrap gap-2">
                                  {[15, 30, 45, 60].map((budget) => (
                                    <Button
                                      key={budget}
                                      variant={studyBudget === budget ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => setStudyBudgets((prev) => ({ ...prev, [playlist.id]: budget }))}
                                      className="text-xs"
                                    >
                                      {budget} min
                                    </Button>
                                  ))}
                                </div>

                                <div className="mt-4 rounded-xl border border-border/50 bg-card/60 p-3">
                                  {sessionPlan.length > 0 ? (
                                    <div className="space-y-3">
                                      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                                        <span>{sessionPlan.length} videos queued</span>
                                        <span>{formatSecondsLabel(sessionPlanSeconds)}</span>
                                      </div>
                                      <ul className="space-y-2">
                                        {sessionPlan.map((song, index) => (
                                          <li key={`${song.id}-plan`} className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                              <p className="truncate text-sm font-medium text-foreground">
                                                {index + 1}. {song.track_name}
                                              </p>
                                              <p className="truncate text-xs text-muted-foreground">{song.artist_name}</p>
                                            </div>
                                            <span className="flex-shrink-0 text-xs text-muted-foreground">
                                              {formatSecondsLabel(estimateVideoSeconds(song, fallbackVideoSeconds))}
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  ) : (
                                    <div className="text-sm text-muted-foreground">
                                      You have finished the active queue. Remix this playlist, sync for new changes, or build a new path.
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <ul className="divide-y divide-border/30">
                        {visibleSongs.map((song) => {
                          const isDone = ["completed", "skipped"].includes(song.watch_state);
                          const isUpdatingSong = updatingSongId === song.id;
                          const isSavingNote = savingNoteSongId === song.id;
                          const isNoteOpen = expandedNotes[song.id] || false;
                          const watchUrl = song.youtube_id
                            ? `https://www.youtube.com/watch?v=${song.youtube_id}`
                            : `https://www.youtube.com/results?search_query=${encodeURIComponent(`${song.track_name} ${song.artist_name}`)}`;

                          return (
                            <li key={song.id} className={isDone ? "bg-emerald-500/5" : ""}>
                              <div className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <a
                                    href={watchUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex min-w-0 flex-1 items-center gap-3"
                                  >
                                    <div className="h-10 w-10 flex-shrink-0 rounded bg-secondary">
                                      {song.thumbnail_url ? (
                                        <img
                                          src={song.thumbnail_url}
                                          alt=""
                                          className={`h-full w-full rounded object-cover ${song.status !== "active" ? "opacity-40 grayscale" : ""} ${isDone ? "opacity-60" : ""}`}
                                        />
                                      ) : (
                                        <div className="flex h-full w-full items-center justify-center">
                                          <Play className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className={`truncate text-sm font-medium transition-colors group-hover:text-primary ${song.status !== "active" ? "text-muted-foreground line-through" : isDone ? "text-foreground/70" : "text-foreground"}`}>
                                          {song.track_name}
                                        </p>
                                        {song.status !== "active" && (
                                          <Badge variant="outline" className="border-yellow-400/20 bg-yellow-400/10 text-yellow-300">
                                            {song.status}
                                          </Badge>
                                        )}
                                        {song.watch_state === "in_progress" && (
                                          <Badge variant="outline" className="border-sky-400/20 bg-sky-400/10 text-sky-300">
                                            In progress
                                          </Badge>
                                        )}
                                        {song.watch_state === "completed" && (
                                          <Badge variant="outline" className="border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                                            Completed
                                          </Badge>
                                        )}
                                        {song.watch_state === "skipped" && (
                                          <Badge variant="outline" className="border-amber-400/20 bg-amber-400/10 text-amber-300">
                                            Skipped
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                        <span className="truncate">{song.artist_name}</span>
                                        <span>#{song.position + 1}</span>
                                        <span>{formatSecondsLabel(estimateVideoSeconds(song, fallbackVideoSeconds))}</span>
                                        {song.learner_note?.trim() && (
                                          <span className="inline-flex items-center gap-1">
                                            <NotebookText className="h-3.5 w-3.5" />
                                            Note saved
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                                  </a>

                                  <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-2">
                                    {song.watch_state !== "in_progress" && !isDone && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleWatchStateChange(playlist.id, song.id, "in_progress")}
                                        disabled={isUpdatingSong}
                                        className="text-xs"
                                      >
                                        Start
                                      </Button>
                                    )}
                                    {song.watch_state !== "completed" && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleWatchStateChange(playlist.id, song.id, "completed")}
                                        disabled={isUpdatingSong}
                                        className="text-xs"
                                      >
                                        {isUpdatingSong ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Done"}
                                      </Button>
                                    )}
                                    {song.watch_state !== "skipped" && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleWatchStateChange(playlist.id, song.id, "skipped")}
                                        disabled={isUpdatingSong}
                                        className="text-xs text-muted-foreground"
                                      >
                                        Skip
                                      </Button>
                                    )}
                                    {song.watch_state !== "not_started" && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleWatchStateChange(playlist.id, song.id, "not_started")}
                                        disabled={isUpdatingSong}
                                        className="text-xs text-muted-foreground"
                                      >
                                        Reset
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        setExpandedNotes((prev) => ({ ...prev, [song.id]: !prev[song.id] }))
                                      }
                                      className="gap-1.5 text-xs text-muted-foreground"
                                    >
                                      <NotebookText className="h-3.5 w-3.5" />
                                      {song.learner_note?.trim() ? "Edit note" : "Add note"}
                                    </Button>
                                  </div>
                                </div>

                                {song.learner_note?.trim() && !isNoteOpen && (
                                  <div className="mt-3 rounded-xl border border-border/50 bg-background/50 p-3">
                                    <p className="line-clamp-2 text-sm text-muted-foreground">
                                      {song.learner_note}
                                    </p>
                                  </div>
                                )}

                                {isNoteOpen && (
                                  <div className="mt-3 rounded-xl border border-border/50 bg-background/50 p-3">
                                    <div className="flex items-center justify-between gap-3">
                                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        Private learning note
                                      </p>
                                      {isSavingNote && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                                    </div>
                                    <Textarea
                                      value={noteDrafts[song.id] || ""}
                                      onChange={(event) =>
                                        setNoteDrafts((prev) => ({ ...prev, [song.id]: event.target.value }))
                                      }
                                      placeholder="Capture the key idea, next action, or what was confusing."
                                      className="mt-3 min-h-24 border-border/60 bg-background/60"
                                    />
                                    <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleSaveNote(playlist.id, song.id)}
                                        disabled={isSavingNote}
                                        className="text-xs"
                                      >
                                        Save note
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setNoteDrafts((prev) => ({ ...prev, [song.id]: song.learner_note || "" }));
                                          setExpandedNotes((prev) => ({ ...prev, [song.id]: false }));
                                        }}
                                        className="text-xs text-muted-foreground"
                                      >
                                        Close
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  )}

                  {playlist.learning_path ? (
                    <LearningPathPanel
                      learningPath={playlist.learning_path}
                      progressByVideoId={progressByVideoId}
                    />
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
