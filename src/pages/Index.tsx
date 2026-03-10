import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { HeroBackground } from "@/components/HeroBackground";
import { ChatInterface } from "@/components/ChatInterface";
import { PlaylistDashboard } from "@/components/PlaylistDashboard";
import { ExportBar } from "@/components/ExportBar";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, session, providerToken } = useAuth();
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

          {/* Auth prompt */}
          {!authLoading && !user && (
            <div className="text-center animate-fade-in">
              <p className="text-muted-foreground mb-3">
                Sign in to start generating AI-powered playlists
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
