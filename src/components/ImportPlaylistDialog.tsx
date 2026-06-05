import { useState } from "react";
import { Download, Loader2, Link2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ImportPlaylistDialogProps {
    youtubeAccessToken: string | null;
    authToken: string | null;
    connectYouTube?: () => Promise<string>;
    isConnectingYouTube?: boolean;
    onImportComplete: (result: Record<string, unknown>) => void;
    children?: React.ReactNode;
}

export function ImportPlaylistDialog({
    youtubeAccessToken,
    authToken,
    connectYouTube,
    isConnectingYouTube = false,
    onImportComplete,
    children,
}: ImportPlaylistDialogProps) {
    const [open, setOpen] = useState(false);
    const [url, setUrl] = useState("");
    const [isImporting, setIsImporting] = useState(false);
    const [connectedToken, setConnectedToken] = useState<string | null>(null);
    const activeYoutubeToken = youtubeAccessToken ?? connectedToken;

    const handleOpenChange = async (nextOpen: boolean) => {
        if (nextOpen && !authToken) {
            toast({
                title: "Sign in required",
                description: "Please sign in to import playlists.",
                variant: "destructive",
            });
            return;
        }

        setOpen(nextOpen);
    };

    const handleConnectYouTube = async () => {
        if (!connectYouTube) return;

        try {
            const token = await connectYouTube();
            setConnectedToken(token);
            toast({
                title: "YouTube connected",
                description: "Private imports, export, and sync are now available.",
            });
        } catch (error) {
            toast({
                title: "YouTube connection failed",
                description: error instanceof Error ? error.message : "Please try again.",
                variant: "destructive",
            });
        }
    };

    const handleImport = async () => {
        if (!url.trim()) return;
        if (!authToken) {
            toast({
                title: "Sign in required",
                description: "Please sign in to import playlists.",
                variant: "destructive",
            });
            return;
        }

        setIsImporting(true);
        try {
            // CRITICAL-2: Pass YouTube token as a header, not in the request body
            const { data, error } = await supabase.functions.invoke("youtube-import-playlist", {
                body: {
                    youtube_playlist_url: url.trim(),
                },
                headers: activeYoutubeToken ? {
                    "X-YouTube-Token": activeYoutubeToken,
                } : undefined,
            });

            if (error) throw error;

            // WARNING-12: Detect expired YouTube token and guide user to re-auth
            if (data?.error) {
                const errMsg: string = data.error;
                if (
                    errMsg.toLowerCase().includes("401") ||
                    errMsg.toLowerCase().includes("unauthorized") ||
                    errMsg.toLowerCase().includes("invalid_grant")
                ) {
                    toast({
                        title: "Session expired",
                        description: "Reconnect YouTube and try again.",
                        variant: "destructive",
                    });
                    return;
                }
                if (errMsg.toLowerCase().includes("private")) {
                    toast({
                        title: "Private playlist needs YouTube access",
                        description: "Connect YouTube in this dialog, then try importing again.",
                        variant: "destructive",
                    });
                    return;
                }
                throw new Error(errMsg);
            }

            toast({
                title: "Playlist Imported!",
                description: `"${data.title}" — ${data.total_videos} videos imported (${data.active_videos} active, ${data.deleted_videos} deleted, ${data.private_videos} private)`,
            });

            onImportComplete(data);
            setOpen(false);
            setUrl("");
        } catch (error) {
            console.error("Import error:", error);
            toast({
                title: "Import Failed",
                description: error instanceof Error ? error.message : "Failed to import playlist",
                variant: "destructive",
            });
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {children || (
                    <Button variant="outline" className="gap-2" disabled={isConnectingYouTube}>
                        {isConnectingYouTube ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4" />
                        )}
                        {isConnectingYouTube ? "Connecting..." : "Import Playlist"}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="glass border-border/50">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Link2 className="w-5 h-5 text-primary" />
                        Import YouTube Playlist
                    </DialogTitle>
                    <DialogDescription>
                        Paste a public or unlisted YouTube playlist URL to import it without
                        extra permissions. Private playlists require YouTube access.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                    <div className="relative">
                        <Input
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://www.youtube.com/playlist?list=PLxxxxxx"
                            className="pr-8"
                            disabled={isImporting}
                        />
                        {url && (
                            <button
                                onClick={() => setUrl("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <Button
                        onClick={handleImport}
                        disabled={!url.trim() || isImporting}
                        className="w-full gap-2"
                        variant="glow"
                    >
                        {isImporting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Importing...
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4" />
                                Import Playlist
                            </>
                        )}
                    </Button>

                    {!activeYoutubeToken && connectYouTube && (
                        <Button
                            onClick={handleConnectYouTube}
                            disabled={isConnectingYouTube}
                            className="w-full gap-2"
                            variant="outline"
                        >
                            {isConnectingYouTube ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Link2 className="w-4 h-4" />
                            )}
                            {isConnectingYouTube ? "Connecting..." : "Connect YouTube for private playlists"}
                        </Button>
                    )}

                    <p className="text-xs text-muted-foreground text-center">
                        Public imports do not need YouTube account access. Connect YouTube only
                        for private playlists, export, or sync.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
