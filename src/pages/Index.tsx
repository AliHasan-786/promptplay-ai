import { useState } from "react";
import { Header } from "@/components/Header";
import { HeroBackground } from "@/components/HeroBackground";
import { PromptInput } from "@/components/PromptInput";
import { SongList, Song } from "@/components/SongList";
import { ExportBar } from "@/components/ExportBar";
import { toast } from "@/hooks/use-toast";

// Mock data for demonstration
const mockGenerateSongs = (prompt: string): Song[] => {
  const songs: Song[] = [
    { id: "1", artist: "Koji Kondo", track_name: "Dire, Dire Docks" },
    { id: "2", artist: "Koji Kondo", track_name: "Zelda's Lullaby" },
    { id: "3", artist: "Koji Kondo", track_name: "Gerudo Valley" },
    { id: "4", artist: "Grant Kirkhope", track_name: "Treasure Trove Cove" },
    { id: "5", artist: "David Wise", track_name: "Aquatic Ambiance" },
    { id: "6", artist: "Koji Kondo", track_name: "File Select (Mario 64)" },
    { id: "7", artist: "Christopher Larkin", track_name: "City of Tears" },
    { id: "8", artist: "Toby Fox", track_name: "Fallen Down" },
    { id: "9", artist: "C418", track_name: "Sweden" },
    { id: "10", artist: "Yasunori Mitsuda", track_name: "Corridors of Time" },
  ];
  
  return songs;
};

const Index = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState("");

  const handleGenerate = async (prompt: string) => {
    setIsLoading(true);
    setCurrentPrompt(prompt);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    const generatedSongs = mockGenerateSongs(prompt);
    setSongs(generatedSongs);
    setIsLoading(false);
    
    toast({
      title: "Playlist Generated!",
      description: `Created ${generatedSongs.length} tracks based on your prompt.`,
    });
  };

  const handleRemoveSong = (id: string) => {
    setSongs((prev) => prev.filter((song) => song.id !== id));
    toast({
      title: "Track Removed",
      description: "The track has been removed from your playlist.",
    });
  };

  const handleLogin = () => {
    toast({
      title: "Sign In",
      description: "Authentication coming soon with Lovable Cloud.",
    });
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setSongs([]);
  };

  const handleExportSpotify = () => {
    console.log("Export to Spotify:", songs);
  };

  const handleExportYouTube = () => {
    console.log("Export to YouTube:", songs);
  };

  return (
    <div className="min-h-screen">
      <HeroBackground />
      <Header 
        isLoggedIn={isLoggedIn} 
        onLogin={handleLogin} 
        onLogout={handleLogout} 
      />
      
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
      />
    </div>
  );
};

export default Index;
