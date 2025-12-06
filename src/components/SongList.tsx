import { Music, X, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface Song {
  id: string;
  artist: string;
  track_name: string;
}

interface SongListProps {
  songs: Song[];
  onRemove: (id: string) => void;
}

export function SongList({ songs, onRemove }: SongListProps) {
  if (songs.length === 0) return null;

  return (
    <div className="w-full max-w-2xl mx-auto mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-foreground">
          Generated Playlist
        </h2>
        <span className="text-muted-foreground text-sm">
          {songs.length} {songs.length === 1 ? "track" : "tracks"}
        </span>
      </div>
      
      <div className="glass rounded-2xl overflow-hidden">
        <ul className="divide-y divide-border/50">
          {songs.map((song, index) => (
            <li
              key={song.id}
              className="group flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors duration-200 animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-3 text-muted-foreground group-hover:text-foreground transition-colors">
                <GripVertical className="w-4 h-4 opacity-0 group-hover:opacity-50 cursor-grab" />
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <Music className="w-5 h-5 text-primary" />
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {song.track_name}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {song.artist}
                </p>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(song.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
