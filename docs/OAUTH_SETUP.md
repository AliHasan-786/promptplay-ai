# OAuth Setup

Last updated: June 4, 2026

## Current product flow

PromptPlay now separates two different permissions:

- Google sign-in: account identity only.
- Public YouTube playlist import: server-side YouTube API key only; no user YouTube OAuth required.
- YouTube connection: requested only when a user imports private playlists, exports to YouTube, or syncs account-owned playlists.
- Full-access sign-in: optional one-pass sign-in path that requests YouTube access during sign-in for users who already know they want private import/export/sync.

This matters because YouTube write access uses sensitive or restricted Google OAuth scopes. Asking for that during signup creates the unverified-app warning and makes the first-run experience too high-friction.

## Required Google / Firebase setup

### 1. Basic Google sign-in

Use Firebase Auth for the app's normal Google sign-in.

Required client-side env vars:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

In Firebase Console:

- Enable Google as a sign-in provider.
- Add every production and preview domain to authorized domains.
- Make sure the Firebase web app config matches the values deployed to Vercel.

### 2. Supabase session bridge

The app exchanges the Firebase Google ID token for a Supabase session with `supabase.auth.signInWithIdToken`.

Required client-side env vars:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

In Supabase:

- Confirm Google sign-in is enabled if your Supabase project requires provider configuration for ID token sign-in.
- Confirm the site URL and redirect URLs include the deployed app URL and local development URL.

If users see `Authentication failed: Failed to fetch` immediately after the Google popup, check the deployed `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, browser console network errors, and Supabase auth provider settings first.

For the current production app, Vercel should point to:

- `VITE_SUPABASE_URL=https://cmxquktpeqosjoacvgvl.supabase.co`

If that host returns DNS `NXDOMAIN` or cannot be reached, the Supabase project is unavailable from the public API. Restore/reactivate the project in Supabase Studio, or create a new Supabase project, run migrations/functions against the new project, update Vercel `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, and redeploy the app.

### 3. YouTube connection

YouTube connection is requested separately with:

- `https://www.googleapis.com/auth/youtube.force-ssl`

This scope is needed for private playlist import, playlist creation/export operations, and account-owned sync. It should not be required for basic sign-in or public playlist import.

In Google Cloud Console:

- Enable YouTube Data API v3.
- Configure the OAuth consent screen with app name, support email, app logo, homepage, privacy policy, and terms URLs.
- Add the app's production domain as an authorized domain.
- Add the exact YouTube scope used by the app.
- Keep the app in Testing with test users while developing.
- Submit OAuth app verification before launching to public users.

## Product guidance

Do not make YouTube connection mandatory for basic account creation. Users should be able to:

- sign in
- generate playlists
- save public paths
- build learning paths
- track progress
- write notes

without granting YouTube account access.

Only require YouTube connection for:

- importing a private/user-authenticated playlist
- exporting a PromptPlay path to YouTube
- syncing a connected YouTube playlist

Do not require YouTube connection for public or unlisted playlist import. Those imports should use the server-side `YOUTUBE_API_KEY` in the Supabase Edge Function. Offer the full-access sign-in option for users who want to avoid a second Google flow later.

## References

- Google unverified apps: <https://support.google.com/googleapi/answer/7454865>
- Google sensitive scope verification: <https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification>
- Firebase Google sign-in: <https://firebase.google.com/docs/auth/web/google-signin>
- YouTube playlists insert scopes: <https://developers.google.com/youtube/v3/docs/playlists/insert>
