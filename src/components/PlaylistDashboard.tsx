import { useState, useEffect } from "react";
import {
    ListMusic, Clock, Loader2, Trash2, ExternalLink, Youtube, Play,
    ChevronDown, ChevronUp, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface PlaylistSong {
    id: string;
    track_name: string;
    artist_name: string;
    youtube_id: string | null;
}

interface PlaylistRecord {
    id: string;
    prompt_text: string;
    youtube_playlist_id: string | null;
    created_at: string;
    songs: PlaylistSong[];
}

interface PlaylistDashboardProps {
    authToken: string | null;
    providerToken: string | null;
    refreshTrigger: number;
    onExportToYouTube?: (playlistId: string) => void;
}

export function PlaylistDashboard({
    authToken,
    providerToken,
    refreshTrigger,
    onExportToYouTube,
}: PlaylistDashboardProps) {
    const [playlists, setPlaylists] = useState<PlaylistRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [exportingId, setExportingId] = useState<string | null>(null);
    const [generatingId, setGeneratingId] = useState<string | null>(null);

    const fetchPlaylists = async () => {
        if (!authToken) return;
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: playlistData, error: playlistError } = await supabase
                .from("generated_playlists")
                .select("id, prompt_text, youtube_playlist_id, created_at")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            if (playlistError) throw playlistError;
            if (!playlistData || playlistData.length === 0) {
                setPlaylists([]);
                return;
            }

            // Batch fetch all items for all playlists in one query
            const playlistIds = playlistData.map(p => p.id);
            const { data: allItems } = await supabase
                .from("playlist_items")
                .select("id, playlist_id, youtube_video_id, position")
                .in("playlist_id", playlistIds)
                .order("position", { ascending: true });

            // Batch fetch all referenced videos in one query
            const videoIds = [...new Set((allItems || []).map(i => i.youtube_video_id))];
            const videosMap: Record<string, { title: string; channel_name: string | null }> = {};
            if (videoIds.length > 0) {
                const { data: allVideos } = await supabase
                    .from("videos")
                    .select("youtube_video_id, title, channel_name")
                    .in("youtube_video_id", videoIds);
                for (const v of allVideos || []) {
                    videosMap[v.youtube_video_id] = v;
                }
            }

            // Group items by playlist
            const itemsByPlaylist: Record<string, PlaylistSong[]> = {};
            for (const item of allItems || []) {
                const video = videosMap[item.youtube_video_id];
                if (!itemsByPlaylist[item.playlist_id]) itemsByPlaylist[item.playlist_id] = [];
                itemsByPlaylist[item.playlist_id].push({
                    id: item.id,
                    track_name: video?.title || "Unknown",
                    artist_name: video?.channel_name || "Unknown",
                    youtube_id: item.youtube_video_id,
                });
            }

            const enriched: PlaylistRecord[] = playlistData.map(p => ({
                ...p,
                songs: itemsByPlaylist[p.id] || [],
            }));

            setPlaylists(enriched);
        } catch (error) {
            console.error("Failed to fetch playlists:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPlaylists();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authToken, refreshTrigger]);

    const handleDelete = async (playlistId: string) => {
        // WARNING-10: Confirm before deleting
        if (!window.confirm("Delete this playlist? This cannot be undone.")) return;

        try {
            // Songs cascade-delete via FK
            const { error } = await supabase
                .from("generated_playlists")
                .delete()
                .eq("id", playlistId);

            if (error) throw error;
            setPlaylists(prev => prev.filter(p => p.id !== playlistId));
            toast({ title: "Playlist deleted" });
        } catch (error) {
            toast({
                title: "Delete failed",
                description: error instanceof Error ? error.message : "Could not delete",
                variant: "destructive",
            });
        }
    };

    const handleGenerateRecommendation = async (playlist: PlaylistRecord) => {
        setGeneratingId(playlist.id);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("You must be signed in.");
            if (playlist.songs.length === 0) throw new Error("Playlist is empty. Cannot generate recommendations.");

            // Construct prompt using up to 30 tracks to prevent huge context limits
            const sampleTracks = playlist.songs.slice(0, 30).map(s => `${s.artist_name} - ${s.track_name}`).join(", ");
            const prompt = `Create a 15-song recommended playlist inspired exactly by these songs: ${sampleTracks}. The genre, semantic value, and vibe must match closely.`;

            const { data, error } = await supabase.functions.invoke("generate-playlist", {
                body: { prompt },
            });

            // WARNING-12: Detect expired YouTube/Supabase token
            if (data?.error) {
                const errMsg: string = data.error;
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

            const videos = (data?.songs || []).filter((v: Record<string, unknown>) => v.youtube_id).map((v: Record<string, unknown>) => ({
                youtube_id: v.youtube_id as string,
                title: (v.title as string) || "Unknown",
                creator: (v.creator as string) || "Unknown",
                thumbnail: (v.thumbnail as string) || "",
            }));

            if (videos.length === 0) {
                throw new Error("Could not find relevant recommendations.");
            }

            const newPromptText = `Recommendations based on: ${playlist.prompt_text}`;
            const { data: newPlaylist, error: playlistError } = await supabase
                .from("generated_playlists")
                .insert({ user_id: user.id, prompt_text: newPromptText })
                .select().single();

            if (playlistError) throw playlistError;

            // Upsert video metadata
            const videosToUpsert = videos.map(v => ({
                youtube_video_id: v.youtube_id,
                title: v.title,
                channel_name: v.creator,
                description: "",
                thumbnail_url: v.thumbnail,
            }));
            const { error: videosError } = await supabase
                .from("videos")
                .upsert(videosToUpsert, { onConflict: "youtube_video_id" });
            if (videosError) throw videosError;

            // Insert playlist items
            const itemsToInsert = videos.map((v, idx) => ({
                playlist_id: newPlaylist.id,
                youtube_video_id: v.youtube_id,
                position: idx,
                status: "active",
            }));
            const { error: itemsError } = await supabase.from("playlist_items").insert(itemsToInsert);
            if (itemsError) throw itemsError;

            toast({
                title: "Recommendations Generated!",
                description: `Created a new playlist with ${videos.length} similar tracks.`,
            });

            fetchPlaylists();
        } catch (error) {
            console.error("Recommendation error:", error);
            toast({
                title: "Generation Failed",
                description: error instanceof Error ? error.message : "Failed to generate recommendations",
                variant: "destructive",
            });
        } finally {
            setGeneratingId(null);
        }
    };

    const handleExportToYouTube = async (playlist: PlaylistRecord) => {
        setExportingId(playlist.id);
        try {
            if (!providerToken) {
                toast({
                    title: "Connect YouTube first",
                    description: "Please sign in again to connect your YouTube account.",
                    variant: "destructive",
                });
                setExportingId(null);
                return;
            }

            // Build songs payload
            const songs = playlist.songs.map(s => ({
                artist: s.artist_name,
                track_name: s.track_name,
                youtube_id: s.youtube_id,
            }));

            const { data, error } = await supabase.functions.invoke("youtube-create-playlist", {
                body: {
                    accessToken: providerToken,
                    songs,
                    playlistName: playlist.prompt_text,
                },
            });

            if (error) throw error;

            // WARNING-12: Detect expired YouTube token
            if (data?.error) {
                const errMsg: string = data.error;
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

            // Update the playlist record with the YouTube playlist ID
            if (data?.playlistId) {
                await supabase
                    .from("generated_playlists")
                    .update({ youtube_playlist_id: data.playlistId })
                    .eq("id", playlist.id);

                setPlaylists(prev => prev.map(p =>
                    p.id === playlist.id
                        ? { ...p, youtube_playlist_id: data.playlistId }
                        : p
                ));
            }

            toast({
                title: "Exported to YouTube!",
                description: `${data?.songsAdded || 0} videos added to your YouTube playlist.`,
            });

            // Open the YouTube playlist
            if (data?.playlistUrl) {
                window.open(data.playlistUrl, "_blank");
            }
        } catch (error) {
            console.error("Export error:", error);
            toast({
                title: "Export failed",
                description: error instanceof Error ? error.message : "Could not export to YouTube",
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
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (playlists.length === 0) return null;

    return (
        <div className="w-full max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                    <ListMusic className="w-5 h-5 text-primary" />
                    Your Playlists
                </h2>
                <span className="text-sm text-muted-foreground">
                    {playlists.length} {playlists.length === 1 ? "playlist" : "playlists"}
                </span>
            </div>

            <div className="space-y-3">
                {playlists.map(playlist => {
                    const isExpanded = expandedId === playlist.id;
                    const isExporting = exportingId === playlist.id;
                    const isGenerating = generatingId === playlist.id;

                    return (
                        <div key={playlist.id} className="glass rounded-2xl overflow-hidden animate-fade-in">
                            {/* Header */}
                            <div className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <button
                                        onClick={() => setExpandedId(isExpanded ? null : playlist.id)}
                                        className="flex-1 min-w-0 text-left group"
                                    >
                                        <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                                            {playlist.prompt_text}
                                        </h3>
                                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                            <span>{playlist.songs.length} videos</span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5" />
                                                {new Date(playlist.created_at).toLocaleDateString()}
                                            </span>
                                            {playlist.youtube_playlist_id && (
                                                <span className="text-red-400 flex items-center gap-1">
                                                    <Youtube className="w-3.5 h-3.5" /> On YouTube
                                                </span>
                                            )}
                                        </div>
                                    </button>

                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        {/* View on YouTube */}
                                        {playlist.youtube_playlist_id && (
                                            <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                                                <a
                                                    href={`https://www.youtube.com/playlist?list=${playlist.youtube_playlist_id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    title="Open on YouTube"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                            </Button>
                                        )}

                                        {/* Export to YouTube */}
                                        {!playlist.youtube_playlist_id && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleExportToYouTube(playlist)}
                                                disabled={isExporting || isGenerating}
                                                className="gap-1.5 text-xs"
                                            >
                                                {isExporting ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                    <Youtube className="w-3.5 h-3.5" />
                                                )}
                                                Export
                                            </Button>
                                        )}

                                        {/* Generate Recommendation */}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleGenerateRecommendation(playlist)}
                                            disabled={isGenerating || isExporting}
                                            className="gap-1.5 text-xs text-primary hover:text-primary hover:bg-primary/10"
                                            title="Recommend Similar"
                                        >
                                            {isGenerating ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <Sparkles className="w-3.5 h-3.5" />
                                            )}
                                        </Button>

                                        {/* Expand/collapse */}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setExpandedId(isExpanded ? null : playlist.id)}
                                            className="h-8 w-8"
                                        >
                                            {isExpanded ? (
                                                <ChevronUp className="w-4 h-4" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4" />
                                            )}
                                        </Button>

                                        {/* Delete */}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(playlist.id)}
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Expanded video list */}
                            {isExpanded && playlist.songs.length > 0 && (
                                <div className="border-t border-border/50">
                                    <ul className="divide-y divide-border/30">
                                        {playlist.songs.map((song) => (
                                            <li key={song.id}>
                                                <a
                                                    href={song.youtube_id
                                                        ? `https://www.youtube.com/watch?v=${song.youtube_id}`
                                                        : `https://www.youtube.com/results?search_query=${encodeURIComponent(song.track_name + ' ' + song.artist_name)}`
                                                    }
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/30 transition-colors group"
                                                >
                                                    <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center flex-shrink-0">
                                                        {song.youtube_id ? (
                                                            <img
                                                                src={`https://img.youtube.com/vi/${song.youtube_id}/default.jpg`}
                                                                alt=""
                                                                className="w-full h-full rounded object-cover"
                                                            />
                                                        ) : (
                                                            <Play className="w-4 h-4 text-muted-foreground" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                                                            {song.track_name}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground truncate">
                                                            {song.artist_name}
                                                        </p>
                                                    </div>
                                                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
