import { Ghost, AlertTriangle, Search, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GhostVideo } from "@/lib/api";

interface GhostVideoAlertProps {
    ghostVideos: GhostVideo[];
    onFindReplacement?: (videoId: string) => void;
}

export function GhostVideoAlert({ ghostVideos, onFindReplacement }: GhostVideoAlertProps) {
    if (ghostVideos.length === 0) return null;

    const deletedCount = ghostVideos.filter(v => v.status === "deleted").length;
    const privateCount = ghostVideos.filter(v => v.status === "private").length;

    return (
        <div className="w-full animate-fade-in">
            {/* Alert Header */}
            <div className="glass rounded-2xl border border-red-500/20 overflow-hidden">
                <div className="bg-red-500/10 px-5 py-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                        <Ghost className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground">
                            {ghostVideos.length} Ghost {ghostVideos.length === 1 ? "Video" : "Videos"} Detected
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {deletedCount > 0 && `${deletedCount} deleted`}
                            {deletedCount > 0 && privateCount > 0 && " · "}
                            {privateCount > 0 && `${privateCount} private`}
                            {" — "}We saved the original titles before they disappeared
                        </p>
                    </div>
                </div>

                {/* Ghost Video List */}
                <ul className="divide-y divide-border/50">
                    {ghostVideos.map((ghost, index) => (
                        <li
                            key={ghost.youtube_video_id}
                            className="px-5 py-4 flex items-center gap-4 animate-fade-in"
                            style={{ animationDelay: `${(index + 1) * 80}ms` }}
                        >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${ghost.status === "deleted" ? "bg-red-500/10" : "bg-yellow-500/10"
                                }`}>
                                {ghost.status === "deleted" ? (
                                    <AlertTriangle className="w-5 h-5 text-red-400" />
                                ) : (
                                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground truncate">
                                    {ghost.original_title}
                                </p>
                                <p className="text-sm text-muted-foreground truncate">
                                    {ghost.original_channel || "Unknown channel"} · {ghost.status}
                                </p>
                            </div>

                            {onFindReplacement && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onFindReplacement(ghost.youtube_video_id)}
                                    className="flex-shrink-0 gap-1.5 text-xs"
                                >
                                    <Search className="w-3.5 h-3.5" />
                                    Find Replacement
                                    <ArrowRight className="w-3 h-3" />
                                </Button>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
