import { useState } from "react";
import { Sparkles, Loader2, ExternalLink, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, type Video } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

interface SuggestionPanelProps {
    playlistId: string;
    authToken: string | null;
    onAddSuggestion?: (video: Video) => void;
}

export function SuggestionPanel({ playlistId, authToken, onAddSuggestion }: SuggestionPanelProps) {
    const [suggestions, setSuggestions] = useState<Video[]>([]);
    const [topic, setTopic] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleGetSuggestions = async () => {
        if (!authToken) return;

        setIsLoading(true);
        try {
            const result = await api.getSuggestions(playlistId, 5, authToken);
            setSuggestions(result.suggestions);
            setTopic(result.based_on_topic || null);

            if (result.suggestions.length === 0) {
                toast({
                    title: "No Suggestions",
                    description: "No similar videos found. Try adding more videos to your playlist first.",
                });
            }
        } catch (error) {
            console.error("Suggestion error:", error);
            toast({
                title: "Suggestions Unavailable",
                description: "Could not generate suggestions. Ensure the backend and embeddings are configured.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Similar Videos
                </h3>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGetSuggestions}
                    disabled={isLoading}
                    className="gap-1.5"
                >
                    {isLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                    )}
                    {suggestions.length > 0 ? "Refresh" : "Get Suggestions"}
                </Button>
            </div>

            {topic && (
                <p className="text-sm text-muted-foreground mb-3">
                    Based on: <span className="text-primary">{topic}</span>
                </p>
            )}

            {suggestions.length > 0 && (
                <div className="glass rounded-2xl overflow-hidden">
                    <ul className="divide-y divide-border/50">
                        {suggestions.map((video, index) => (
                            <li
                                key={video.youtube_video_id}
                                className="group flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors duration-200 animate-fade-in"
                                style={{ animationDelay: `${index * 60}ms` }}
                            >
                                {/* Thumbnail */}
                                {video.thumbnail_url ? (
                                    <div className="w-14 h-10 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                                        <img
                                            src={video.thumbnail_url}
                                            alt={video.title}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-14 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                                        <Sparkles className="w-4 h-4 text-primary" />
                                    </div>
                                )}

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">{video.title}</p>
                                    <p className="text-xs text-muted-foreground truncate">{video.channel_name}</p>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {onAddSuggestion && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onAddSuggestion(video)}
                                            className="h-8 w-8 text-primary hover:text-primary"
                                            title="Add to playlist"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        asChild
                                        className="h-8 w-8 text-muted-foreground"
                                    >
                                        <a
                                            href={`https://www.youtube.com/watch?v=${video.youtube_video_id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
