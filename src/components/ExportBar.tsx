import { Button } from "@/components/ui/button";
import { Download, Loader2, Youtube } from "lucide-react";
import { ImportPlaylistDialog } from "@/components/ImportPlaylistDialog";
import { toast } from "@/hooks/use-toast";

interface ExportBarProps {
  authToken: string | null;
  providerToken: string | null;
  connectYouTube: () => Promise<string>;
  isConnectingYouTube: boolean;
  onImportComplete: (result: Record<string, unknown>) => void;
}

export function ExportBar({
  authToken,
  providerToken,
  connectYouTube,
  isConnectingYouTube,
  onImportComplete,
}: ExportBarProps) {
  if (!authToken) return null;

  const handleConnectYouTube = async () => {
    try {
      await connectYouTube();
      toast({
        title: "YouTube connected",
        description: "You can now import, export, and sync playlists.",
      });
    } catch (error) {
      toast({
        title: "YouTube connection failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-gradient-to-t from-background via-background to-transparent pt-8 pb-6">
        <div className="max-w-3xl mx-auto px-4">
          <div className="glass rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              {providerToken ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-400" />
                  YouTube connected for import, export, and sync
                </span>
              ) : (
                <span>Connect YouTube only when you need import, export, or sync</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {!providerToken && (
                <Button
                  variant="outline"
                  className="gap-2"
                  size="sm"
                  onClick={handleConnectYouTube}
                  disabled={isConnectingYouTube}
                >
                  {isConnectingYouTube ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Youtube className="w-4 h-4" />
                  )}
                  Connect YouTube
                </Button>
              )}

              {/* Import */}
              {providerToken && (
                <ImportPlaylistDialog
                  youtubeAccessToken={providerToken}
                  authToken={authToken}
                  onImportComplete={onImportComplete}
                >
                  <Button variant="outline" className="gap-2" size="sm">
                    <Download className="w-4 h-4" />
                    Import
                  </Button>
                </ImportPlaylistDialog>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
