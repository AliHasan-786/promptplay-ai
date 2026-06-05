import { useState, useEffect, createContext, useContext } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { auth, createYouTubeProvider } from "@/lib/firebase";
import {
  GoogleAuthProvider,
  reauthenticateWithPopup,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";
import {
  clearStoredYouTubeAccessToken,
  getStoredYouTubeAccessToken,
  storeYouTubeAccessToken,
} from "@/lib/youtubeAccess";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  providerToken: string | null;
  isConnectingYouTube: boolean;
  connectYouTube: () => Promise<string>;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnectingYouTube, setIsConnectingYouTube] = useState(false);
  const [youtubeAccessToken, setYoutubeAccessToken] = useState<string | null>(() =>
    getStoredYouTubeAccessToken(),
  );

  useEffect(() => {
    // WARNING-11: Rely solely on onAuthStateChange for both initial state and updates.
    // onAuthStateChange fires synchronously with the current session on mount,
    // so a separate getSession() call creates a race condition and is unnecessary.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (!session) {
          clearStoredYouTubeAccessToken();
          setYoutubeAccessToken(null);
        } else {
          setYoutubeAccessToken(getStoredYouTubeAccessToken());
        }
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const syncStoredToken = () => {
      setYoutubeAccessToken(getStoredYouTubeAccessToken());
    };

    window.addEventListener("promptplay:youtube-token-updated", syncStoredToken);
    return () => window.removeEventListener("promptplay:youtube-token-updated", syncStoredToken);
  }, []);

  const connectYouTube = async () => {
    setIsConnectingYouTube(true);

    try {
      const provider = createYouTubeProvider();
      const result = auth.currentUser
        ? await reauthenticateWithPopup(auth.currentUser, provider)
        : await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;

      if (!accessToken) {
        throw new Error("Google did not return a YouTube access token.");
      }

      setYoutubeAccessToken(accessToken);
      storeYouTubeAccessToken(accessToken);

      return accessToken;
    } finally {
      setIsConnectingYouTube(false);
    }
  };

  const signOut = async () => {
    clearStoredYouTubeAccessToken();
    setYoutubeAccessToken(null);
    await supabase.auth.signOut();
    await firebaseSignOut(auth);
  };

  const providerToken = youtubeAccessToken;
  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        providerToken,
        isConnectingYouTube,
        connectYouTube,
        isLoading,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
