import { Music } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  isLoggedIn: boolean;
  onLogin: () => void;
  onLogout: () => void;
}

export function Header({ isLoggedIn, onLogin, onLogout }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="glass border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Music className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">
              Playlist<span className="text-gradient-primary">AI</span>
            </span>
          </div>
          
          <div>
            {isLoggedIn ? (
              <Button variant="ghost" onClick={onLogout}>
                Sign Out
              </Button>
            ) : (
              <Button variant="outline" onClick={onLogin}>
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
