import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  ExternalLink,
  Globe,
  ListMusic,
  Loader2,
  Play,
  Save,
  Youtube,
} from "lucide-react";
import { Header } from "@/components/Header";
import { HeroBackground } from "@/components/HeroBackground";
import { LearningPathPanel } from "@/components/LearningPathPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { normalizeLearningPath } from "@/lib/playlist-utils";
import type { LearningPathRecord } from "@/types/learning-path";

type PlaylistSource = "ai_generate" | "playlist_remix" | "import";
type PlaylistItemStatus = "active" | "deleted" | "private";

interface PublicPlaylistSong {
  id: string;
  track_name: string;
  artist_name: string;
  thumbnail_url: string | null;
  youtube_id: string | null;
  status: PlaylistItemStatus;
}

interface PublicPlaylistRecord {
  id: string;
  prompt_text: string;
  public_slug: string;
  public_description: string | null;
  published_at: string | null;
  source: PlaylistSource;
  youtube_playlist_id: string | null;
  created_at: string;
  songs: PublicPlaylistSong[];
  learning_path: LearningPathRecord | null;
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

const PublicPlaylist = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [playlist, setPlaylist] = useState<PublicPlaylistRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingCopy, setIsSavingCopy] = useState(false);
  const [hasSavedCopy, setHasSavedCopy] = useState(false);

  useEffect(() => {
    const fetchPlaylist = async () => {
      if (!slug) {
        setPlaylist(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const { data: playlistRow, error: playlistError } = await supabase
          .from("generated_playlists")
          .select("id, prompt_text, source, created_at, youtube_playlist_id, public_slug, public_description, published_at")
          .eq("public_slug", slug)
          .eq("visibility", "public")
          .maybeSingle();

        if (playlistError) throw playlistError;
        if (!playlistRow) {
          setPlaylist(null);
          return;
        }

        const { data: items, error: itemsError } = await supabase
          .from("playlist_items")
          .select("id, youtube_video_id, status, position")
          .eq("playlist_id", playlistRow.id)
          .order("position", { ascending: true });

        if (itemsError) throw itemsError;

        const videoIds = [...new Set((items || []).map((item) => item.youtube_video_id))];
        const videosMap: Record<string, { title: string; channel_name: string | null; thumbnail_url: string | null }> = {};

        if (videoIds.length > 0) {
          const { data: videos, error: videosError } = await supabase
            .from("videos")
            .select("youtube_video_id, title, channel_name, thumbnail_url")
            .in("youtube_video_id", videoIds);

          if (videosError) throw videosError;

          for (const video of videos || []) {
            videosMap[video.youtube_video_id] = video;
          }
        }

        const { data: pathRow, error: pathError } = await supabase
          .from("playlist_learning_paths")
          .select("playlist_id, title, summary, estimated_minutes, difficulty, learning_objectives, modules, updated_at")
          .eq("playlist_id", playlistRow.id)
          .maybeSingle();

        if (pathError) throw pathError;

        setPlaylist({
          id: playlistRow.id,
          prompt_text: playlistRow.prompt_text,
          public_slug: playlistRow.public_slug || slug,
          public_description: playlistRow.public_description,
          published_at: playlistRow.published_at,
          source: (playlistRow.source as PlaylistSource) || "ai_generate",
          youtube_playlist_id: playlistRow.youtube_playlist_id,
          created_at: playlistRow.created_at,
          songs: (items || []).map((item) => ({
            id: item.id,
            track_name: videosMap[item.youtube_video_id]?.title || "Unknown",
            artist_name: videosMap[item.youtube_video_id]?.channel_name || "Unknown",
            thumbnail_url: videosMap[item.youtube_video_id]?.thumbnail_url || null,
            youtube_id: item.youtube_video_id,
            status: (item.status as PlaylistItemStatus) || "active",
          })),
          learning_path: pathRow ? normalizeLearningPath(pathRow as unknown as Record<string, unknown>) : null,
        });
      } catch (error) {
        console.error("Failed to load public playlist:", error);
        toast({
          title: "Could not load public page",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
        setPlaylist(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaylist();
  }, [slug]);

  useEffect(() => {
    if (!playlist) {
      document.title = "PromptPlay — Shared Playlist";
      return;
    }

    document.title = `${playlist.prompt_text} — PromptPlay`;
  }, [playlist]);

  const handleSaveCopy = async () => {
    if (!playlist || isSavingCopy || hasSavedCopy) return;

    if (!user) {
      navigate("/auth");
      return;
    }

    setIsSavingCopy(true);

    try {
      const { data, error } = await supabase.functions.invoke("save-generated-playlist", {
        body: {
          prompt: playlist.prompt_text,
          source: "import",
          videos: playlist.songs.map((song) => ({
            youtube_id: song.youtube_id,
            title: song.track_name,
            creator: song.artist_name,
            thumbnail: song.thumbnail_url,
          })),
          learning_path: playlist.learning_path
            ? {
                title: playlist.learning_path.title,
                summary: playlist.learning_path.summary,
                estimated_minutes: playlist.learning_path.estimated_minutes,
                difficulty: playlist.learning_path.difficulty,
                learning_objectives: playlist.learning_path.learning_objectives,
                modules: playlist.learning_path.modules,
              }
            : null,
        },
      });

      if (data?.error) throw new Error(data.error);
      if (error) throw error;

      setHasSavedCopy(true);
      toast({
        title: "Saved to your library",
        description: "You now have your own copy to remix, export, or edit.",
      });
    } catch (error) {
      console.error("Failed to save public playlist copy:", error);
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Could not save this path to your library.",
        variant: "destructive",
      });
    } finally {
      setIsSavingCopy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <HeroBackground />
        <Header />
        <main className="flex min-h-screen items-center justify-center px-4 pt-24">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="min-h-screen">
        <HeroBackground />
        <Header />
        <main className="px-4 pb-20 pt-28">
          <div className="mx-auto max-w-3xl">
            <div className="rounded-3xl border border-border/60 bg-card/70 p-10 text-center backdrop-blur">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
                <Globe className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-semibold text-foreground">Public page not found</h1>
              <p className="mt-3 text-muted-foreground">
                This shared path may have been unpublished or the link is invalid.
              </p>
              <Button className="mt-6" onClick={() => navigate("/")}>
                Go to PromptPlay
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const ghostCount = playlist.songs.filter((song) => song.status !== "active").length;
  const publishedDate = playlist.published_at || playlist.created_at;
  const introCopy = playlist.public_description || playlist.learning_path?.summary || "A curated YouTube playlist shared from PromptPlay.";

  return (
    <div className="min-h-screen">
      <HeroBackground />
      <Header />

      <main className="px-4 pb-20 pt-28">
        <div className="mx-auto max-w-4xl space-y-6">
          <section className="rounded-3xl border border-border/60 bg-card/75 p-6 backdrop-blur">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className={sourceBadgeClass[playlist.source]}>
                    {sourceLabel[playlist.source]}
                  </Badge>
                  <Badge variant="outline" className="border-border/70 text-muted-foreground">
                    {playlist.songs.length} videos
                  </Badge>
                  <Badge variant="outline" className="border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
                    {playlist.learning_path ? "Guided path" : "Curated playlist"}
                  </Badge>
                </div>

                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-foreground">{playlist.prompt_text}</h1>
                  <p className="mt-3 max-w-2xl text-base text-muted-foreground">{introCopy}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>Shared {new Date(publishedDate).toLocaleDateString()}</span>
                  {playlist.learning_path?.difficulty && (
                    <Badge variant="outline" className="border-primary/30 text-primary">
                      {playlist.learning_path.difficulty}
                    </Badge>
                  )}
                  {playlist.learning_path?.estimated_minutes !== null && (
                    <Badge variant="outline" className="border-border/70 text-muted-foreground">
                      {playlist.learning_path.estimated_minutes} min
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex w-full max-w-xs flex-col gap-3">
                <Button
                  onClick={handleSaveCopy}
                  disabled={isSavingCopy || hasSavedCopy || authLoading}
                  className="gap-2"
                >
                  {isSavingCopy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : hasSavedCopy ? (
                    <Save className="h-4 w-4" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  {user ? (hasSavedCopy ? "Saved to your library" : "Save your own copy") : "Sign in to save"}
                </Button>

                {playlist.youtube_playlist_id && (
                  <Button variant="outline" asChild className="gap-2">
                    <a
                      href={`https://www.youtube.com/playlist?list=${playlist.youtube_playlist_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Youtube className="h-4 w-4" />
                      Open on YouTube
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </section>

          {ghostCount > 0 && (
            <section className="rounded-2xl border border-yellow-400/30 bg-yellow-500/5 px-4 py-3 text-sm text-yellow-100">
              This shared path currently includes {ghostCount} unavailable videos. PromptPlay keeps them visible so the path history stays intact.
            </section>
          )}

          {playlist.learning_path && <LearningPathPanel learningPath={playlist.learning_path} />}

          <section className="overflow-hidden rounded-3xl border border-border/60 bg-card/70 backdrop-blur">
            <div className="border-b border-border/50 px-5 py-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <ListMusic className="h-5 w-5 text-primary" />
                Playlist Videos
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Preview the full collection and open any item directly on YouTube.
              </p>
            </div>

            <ul className="divide-y divide-border/30">
              {playlist.songs.map((song) => (
                <li key={song.id}>
                  <a
                    href={song.youtube_id
                      ? `https://www.youtube.com/watch?v=${song.youtube_id}`
                      : `https://www.youtube.com/results?search_query=${encodeURIComponent(`${song.track_name} ${song.artist_name}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-secondary/30"
                  >
                    <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-secondary">
                      {song.thumbnail_url ? (
                        <img
                          src={song.thumbnail_url}
                          alt=""
                          className={`h-full w-full rounded-lg object-cover ${song.status !== "active" ? "opacity-40 grayscale" : ""}`}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Play className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
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
          </section>
        </div>
      </main>
    </div>
  );
};

export default PublicPlaylist;
