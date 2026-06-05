export const YOUTUBE_TOKEN_STORAGE_KEY = "promptplay_youtube_access_token";

export function getStoredYouTubeAccessToken() {
  return typeof window === "undefined"
    ? null
    : sessionStorage.getItem(YOUTUBE_TOKEN_STORAGE_KEY);
}

export function storeYouTubeAccessToken(accessToken: string) {
  sessionStorage.setItem(YOUTUBE_TOKEN_STORAGE_KEY, accessToken);
  window.dispatchEvent(new Event("promptplay:youtube-token-updated"));
}

export function clearStoredYouTubeAccessToken() {
  sessionStorage.removeItem(YOUTUBE_TOKEN_STORAGE_KEY);
  window.dispatchEvent(new Event("promptplay:youtube-token-updated"));
}
