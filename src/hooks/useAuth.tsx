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
const YOUTUBE_TOKEN_STORAGE_KEY = "promptplay_youtube_access_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnectingYouTube, setIsConnectingYouTube] = useState(false);
  const [youtubeAccessToken, setYoutubeAccessToken] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : sessionStorage.getItem(YOUTUBE_TOKEN_STORAGE_KEY),
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
          sessionStorage.removeItem(YOUTUBE_TOKEN_STORAGE_KEY);
          setYoutubeAccessToken(null);
        }
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
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
      sessionStorage.setItem(YOUTUBE_TOKEN_STORAGE_KEY, accessToken);

      return accessToken;
    } finally {
      setIsConnectingYouTube(false);
    }
  };

  const signOut = async () => {
    sessionStorage.removeItem(YOUTUBE_TOKEN_STORAGE_KEY);
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
