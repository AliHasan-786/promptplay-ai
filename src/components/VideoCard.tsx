import { Play, Ghost, Lock, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlaylistItem } from "@/lib/api";

interface VideoCardProps {
    item: PlaylistItem;
    index: number;
    onRemove?: (id: string) => void;
}

export function VideoCard({ item, index, onRemove }: VideoCardProps) {
    const video = item.video;
    const isGhost = item.status === "deleted" || item.status === "private";

    const statusConfig = {
        active: { icon: Play, label: null, className: "" },
        deleted: { icon: Ghost, label: "Deleted", className: "border-red-500/30 bg-red-500/5" },
        private: { icon: Lock, label: "Private", className: "border-yellow-500/30 bg-yellow-500/5" },
    };

    const { icon: StatusIcon, label, className } = statusConfig[item.status];

    const thumbnailUrl = video?.thumbnail_url || null;
    const title = video?.title || item.youtube_video_id;
    const channel = video?.channel_name || "";

    return (
        <li
            className={`group flex items-center gap-4 p-4 hover:bg-secondary/50 transition-all duration-200 animate-fade-in ${className}`}
            style={{ animationDelay: `${index * 50}ms` }}
        >
            {/* Thumbnail / Index */}
            <div className="relative flex-shrink-0">
                {thumbnailUrl ? (
                    <div className="w-16 h-12 rounded-lg overflow-hidden bg-secondary">
                        <img
                            src={thumbnailUrl}
                            alt={title}
                            className={`w-full h-full object-cover ${isGhost ? "opacity-40 grayscale" : ""}`}
                        />
                        {isGhost && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <StatusIcon className={`w-5 h-5 ${item.status === "deleted" ? "text-red-400" : "text-yellow-400"}`} />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className={`w-16 h-12 rounded-lg flex items-center justify-center ${isGhost ? "bg-red-500/10" : "bg-gradient-to-br from-primary/20 to-accent/20"}`}>
                        <StatusIcon className={`w-5 h-5 ${isGhost ? (item.status === "deleted" ? "text-red-400" : "text-yellow-400") : "text-primary"}`} />
                    </div>
                )}
            </div>

            {/* Video Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className={`font-medium truncate ${isGhost ? "text-muted-foreground line-through" : "text-foreground"}`}>
                        {title}
                    </p>
                    {label && (
                        <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${item.status === "deleted" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"
                            }`}>
                            {label}
                        </span>
                    )}
                </div>
                <p className="text-sm text-muted-foreground truncate">{channel}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {!isGhost && item.youtube_video_id && (
                    <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <a
                            href={`https://www.youtube.com/watch?v=${item.youtube_video_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    </Button>
                )}
                {onRemove && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemove(item.id)}
                        className="text-muted-foreground hover:text-destructive"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                )}
            </div>
        </li>
    );
}
