import { ListMusic, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function Header() {
  const navigate = useNavigate();
  const { user, isLoading, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="glass border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate("/")}>
            <div className="w-9 h-9 rounded-lg bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/20 group-hover:shadow-red-600/40 transition-shadow">
              <ListMusic className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold logo-shine tracking-tight">
              promptplay
            </span>
          </div>

          <div className="flex items-center gap-3">
            {!isLoading && (
              user ? (
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="w-4 h-4" />
                    <span className="max-w-[150px] truncate">{user.email}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground hover:text-foreground">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              ) : (
                <Button variant="outline" onClick={() => navigate("/auth")} className="border-border/50">
                  Sign In
                </Button>
              )
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
