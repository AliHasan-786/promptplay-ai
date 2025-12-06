import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { HeroBackground } from "@/components/HeroBackground";
import { PromptInput } from "@/components/PromptInput";
import { SongList, Song } from "@/components/SongList";
import { ExportBar } from "@/components/ExportBar";
import { useAuth } from "@/hooks/useAuth";
import { useYouTubeAuth } from "@/hooks/useYouTubeAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const MAX_YOUTUBE_SONGS = 10;

const Index = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { isConnected: isYouTubeConnected, accessToken, isConnecting, connect: connectYouTube } = useYouTubeAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState("");

  const handleGenerate = async (prompt: string) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to generate playlists.",
      });
      navigate("/auth");
      return;
    }

    setIsLoading(true);
    setCurrentPrompt(prompt);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-playlist', {
        body: { prompt }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to generate playlist');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.songs && Array.isArray(data.songs)) {
        setSongs(data.songs);
        toast({
          title: "Playlist Generated!",
          description: `Created ${data.songs.length} tracks based on your prompt.`,
        });
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate playlist. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveSong = (id: string) => {
    setSongs((prev) => prev.filter((song) => song.id !== id));
    toast({
      title: "Track Removed",
      description: "The track has been removed from your playlist.",
    });
  };

  const handleExportSpotify = () => {
    toast({
      title: "Spotify Export",
      description: "Spotify integration coming soon!",
    });
  };

  const handleExportYouTube = async () => {
    if (!isYouTubeConnected) {
      connectYouTube();
      return;
    }

    if (songs.length === 0) {
      toast({
        title: "No tracks",
        description: "Generate a playlist first before exporting.",
      });
      return;
    }

    setIsExporting(true);

    try {
      const songsToExport = songs.map(s => ({ artist: s.artist, track_name: s.track_name }));
      
      const { data, error } = await supabase.functions.invoke('youtube-create-playlist', {
        body: { 
          accessToken, 
          songs: songsToExport,
          playlistName: currentPrompt || 'AI Generated Playlist'
        }
      });

      if (error || data.error) {
        throw new Error(data?.error || error?.message || 'Failed to create playlist');
      }

      const limitMessage = data.wasLimited 
        ? ` (limited to ${MAX_YOUTUBE_SONGS} tracks due to API quota)`
        : '';

      toast({
        title: "Playlist Created!",
        description: `Added ${data.songsAdded} tracks to YouTube${limitMessage}`,
      });

      // Open the playlist in a new tab
      if (data.playlistUrl) {
        window.open(data.playlistUrl, '_blank');
      }
    } catch (error) {
      console.error('YouTube export error:', error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export to YouTube",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <HeroBackground />
      <Header />
      
      <main className="pt-32 pb-40 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12 animate-fade-in">
            <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-4 tracking-tight">
              What do you want to{" "}
              <span className="text-gradient-primary">listen to?</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-xl mx-auto">
              Describe your perfect playlist and let AI create it for you. Export to Spotify or YouTube in seconds.
            </p>
          </div>

          {/* Prompt Input */}
          <div className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <PromptInput onGenerate={handleGenerate} isLoading={isLoading} />
          </div>

          {/* Auth prompt for non-logged in users */}
          {!authLoading && !user && (
            <div className="mt-8 text-center animate-fade-in" style={{ animationDelay: "0.3s" }}>
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

          {/* Song List */}
          {songs.length > 0 && (
            <div className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
              <SongList songs={songs} onRemove={handleRemoveSong} />
            </div>
          )}
        </div>
      </main>

      {/* Export Bar */}
      <ExportBar 
        songCount={songs.length}
        onExportSpotify={handleExportSpotify}
        onExportYouTube={handleExportYouTube}
        isYouTubeConnected={isYouTubeConnected}
        isExporting={isExporting || isConnecting}
      />
    </div>
  );
};

export default Index;
