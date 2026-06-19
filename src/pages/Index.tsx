import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { HeroBackground } from "@/components/HeroBackground";
import { ChatInterface } from "@/components/ChatInterface";
import { PlaylistDashboard } from "@/components/PlaylistDashboard";
import { ExportBar } from "@/components/ExportBar";
import { ImportPlaylistDialog } from "@/components/ImportPlaylistDialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Download, Loader2 } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const {
    user,
    isLoading: authLoading,
    session,
    providerToken,
    connectYouTube,
    isConnectingYouTube,
  } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  const authToken = session?.access_token || null;

  const handlePlaylistCreated = (_playlistId: string) => {
    setRefreshKey(prev => prev + 1);
  };

  const handleImportComplete = (_result: unknown) => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen">
      <HeroBackground />
      <Header />

      <main className="pt-24 pb-32 px-4">
        <div className="max-w-4xl mx-auto space-y-10">
          {/* Chat Interface */}
          <ChatInterface
            authToken={authToken}
            onPlaylistCreated={handlePlaylistCreated}
          />

          {user && (
            <div className="flex justify-center animate-fade-in">
              <ImportPlaylistDialog
                youtubeAccessToken={providerToken}
                authToken={authToken}
                connectYouTube={connectYouTube}
                isConnectingYouTube={isConnectingYouTube}
                onImportComplete={handleImportComplete}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-muted-foreground hover:text-foreground"
                  disabled={isConnectingYouTube}
                >
                  {isConnectingYouTube ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {isConnectingYouTube ? "Connecting YouTube..." : "Import and audit a YouTube playlist"}
                </Button>
              </ImportPlaylistDialog>
            </div>
          )}

          {/* Auth prompt */}
          {!authLoading && !user && (
            <div className="text-center animate-fade-in">
              <p className="text-muted-foreground mb-3">
                Sign in to import, audit, repair, and build guided YouTube learning paths
              </p>
              <button
                onClick={() => navigate("/auth")}
                className="text-primary hover:underline font-medium"
              >
                Create a free account →
              </button>
            </div>
          )}

          {/* Playlist Dashboard */}
          {user && (
            <PlaylistDashboard
              authToken={authToken}
              providerToken={providerToken}
              connectYouTube={connectYouTube}
              isConnectingYouTube={isConnectingYouTube}
              refreshTrigger={refreshKey}
            />
          )}
        </div>
      </main>

      {/* Bottom Bar */}
      <ExportBar
        authToken={authToken}
        providerToken={providerToken}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
};

export default Index;
