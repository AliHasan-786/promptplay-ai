import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface YouTubeTokens {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
}

const STORAGE_KEY = 'youtube_tokens';
const REDIRECT_URI = `${window.location.origin}/`;

export function useYouTubeAuth() {
  const [tokens, setTokens] = useState<YouTubeTokens | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Load tokens from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as YouTubeTokens;
        // Check if token is still valid
        if (parsed.expires_at > Date.now()) {
          setTokens(parsed);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    
    if (code && !tokens) {
      exchangeCode(code);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const exchangeCode = async (code: string) => {
    setIsConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('youtube-auth', {
        body: { action: 'exchange_code', code, redirectUri: REDIRECT_URI }
      });

      if (error || data.error) {
        throw new Error(data?.error || error?.message || 'Failed to exchange code');
      }

      const newTokens: YouTubeTokens = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: Date.now() + (data.expires_in * 1000),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(newTokens));
      setTokens(newTokens);
      
      toast({
        title: "YouTube Connected",
        description: "Your YouTube account is now connected.",
      });
    } catch (error) {
      console.error('YouTube code exchange error:', error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect YouTube",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('youtube-auth', {
        body: { action: 'get_auth_url', redirectUri: REDIRECT_URI }
      });

      if (error || data.error) {
        throw new Error(data?.error || error?.message || 'Failed to get auth URL');
      }

      window.location.href = data.authUrl;
    } catch (error) {
      console.error('YouTube connect error:', error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to start YouTube connection",
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setTokens(null);
    toast({
      title: "YouTube Disconnected",
      description: "Your YouTube account has been disconnected.",
    });
  }, []);

  return {
    isConnected: !!tokens,
    accessToken: tokens?.access_token,
    isConnecting,
    connect,
    disconnect,
  };
}
