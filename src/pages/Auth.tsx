import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { HeroBackground } from "@/components/HeroBackground";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";

function getAuthErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Please try again later.";

  if (message.toLowerCase().includes("failed to fetch")) {
    return "Could not reach the auth service. Check the deployed Supabase URL/key and Google auth configuration.";
  }

  return message;
}

export default function Auth() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      // 1. Trigger the Firebase popup (clean URL, custom domains supported)
      const result = await signInWithPopup(auth, googleProvider);

      // 2. Extract the ID Token for Supabase Auth.
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const idToken = credential?.idToken;

      if (!idToken) throw new Error("Failed to retrieve Google ID Token");

      // 3. Hand the tokens over to Supabase so our backend & DB stay perfectly in sync
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) throw error;

      // 4. Redirect to the dashboard!
      navigate("/");

    } catch (error: unknown) {
      console.error("Auth error:", error);
      toast({
        title: "Authentication failed",
        description: getAuthErrorMessage(error),
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <HeroBackground />

      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Logo + copy */}
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-4xl font-bold text-foreground logo-shine tracking-tight mb-3">
              PromptPlay
            </h1>
            <p className="text-lg text-muted-foreground font-medium mb-2">
              Build smarter YouTube playlists and guided learning paths
            </p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Describe a topic, import an existing playlist, or remix what you already save.
              PromptPlay helps you turn flat video lists into curated collections you can
              export, maintain, and structure into guided paths.
            </p>
          </div>

          {/* Sign-in card */}
          <div className="glass rounded-2xl p-6 space-y-4 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <Button
              onClick={handleGoogleSignIn}
              variant="outline"
              size="lg"
              className="w-full h-14 text-base relative overflow-hidden bg-background hover:bg-secondary border-border"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    <path d="M1 1h22v22H1z" fill="none" />
                  </svg>
                  Sign in with Google
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Sign in creates your PromptPlay account. You can connect YouTube later when
              importing, exporting, or syncing playlists.
            </p>
          </div>

          {/* Back to home */}
          <div className="mt-6 text-center animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
