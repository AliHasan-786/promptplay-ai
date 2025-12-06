import { Button } from "@/components/ui/button";
import { Music2, Youtube } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ExportBarProps {
  songCount: number;
  onExportSpotify: () => void;
  onExportYouTube: () => void;
}

export function ExportBar({ songCount, onExportSpotify, onExportYouTube }: ExportBarProps) {
  if (songCount === 0) return null;

  const handleSpotifyExport = () => {
    toast({
      title: "Spotify Export",
      description: "Connect your Spotify account to export this playlist.",
    });
    onExportSpotify();
  };

  const handleYouTubeExport = () => {
    toast({
      title: "YouTube Export",
      description: "Connect your YouTube account to export this playlist.",
    });
    onExportYouTube();
  };

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
                onClick={handleSpotifyExport}
                className="gap-2"
              >
                <Music2 className="w-4 h-4" />
                Export to Spotify
              </Button>
              
              <Button
                variant="youtube"
                onClick={handleYouTubeExport}
                className="gap-2"
              >
                <Youtube className="w-4 h-4" />
                Export to YouTube
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
