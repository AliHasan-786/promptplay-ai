import { Button } from "@/components/ui/button";
import { Music2, Youtube, Loader2 } from "lucide-react";

interface ExportBarProps {
  songCount: number;
  onExportSpotify: () => void;
  onExportYouTube: () => void;
  isYouTubeConnected?: boolean;
  isExporting?: boolean;
}

export function ExportBar({ 
  songCount, 
  onExportSpotify, 
  onExportYouTube,
  isYouTubeConnected = false,
  isExporting = false
}: ExportBarProps) {
  if (songCount === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-gradient-to-t from-background via-background to-transparent pt-8 pb-6">
        <div className="max-w-2xl mx-auto px-4">
          <div className="glass rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{songCount}</span> tracks ready to export
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="spotify"
                onClick={onExportSpotify}
                className="gap-2"
              >
                <Music2 className="w-4 h-4" />
                Export to Spotify
              </Button>
              
              <Button
                variant="youtube"
                onClick={onExportYouTube}
                disabled={isExporting}
                className="gap-2"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Youtube className="w-4 h-4" />
                )}
                {isYouTubeConnected ? 'Export to YouTube' : 'Connect YouTube'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
