# Google / Firebase Auth Setup

PromptPlay uses this auth chain:

1. the user signs in with Google through Firebase on the client
2. Firebase returns a Google ID token and access token
3. the app exchanges the ID token into a Supabase session with `signInWithIdToken`
4. the Google access token is used for YouTube import/export/sync calls during the session

This means you need both Firebase client config and Google API access.

## 1. Create or Open a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Create a project or open an existing one.
3. Add a Web app.
4. Copy the Firebase web config values for:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`
   - `measurementId` if present

Put those into `.env.local` using `.env.example`.

## 2. Enable Google Sign-In in Firebase Auth

1. In Firebase Console, open `Authentication`.
2. Enable the `Google` provider.
3. Add your local and production domains to `Authorized domains`.

## 3. Enable the YouTube Data API

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Make sure it is the same project used by Firebase, or a project whose credentials you control.
3. Enable `YouTube Data API v3`.
4. Create an API key for server-side YouTube search.
5. Restrict the key appropriately before production.

Store the API key in Supabase secrets as:

```bash
supabase secrets set YOUTUBE_API_KEY=your_key_here
```

## 4. Frontend Env Vars

Set these in `.env.local`:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key

VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

## 5. Supabase Secrets

Set these for edge functions:

```bash
supabase secrets set \
  SUPABASE_URL=https://your-project.supabase.co \
  SUPABASE_ANON_KEY=your_anon_key \
  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
  YOUTUBE_API_KEY=your_youtube_api_key \
  LLMAPI_KEY=your_llm_key
```

Optional:

```bash
supabase secrets set \
  LLMAPI_BASE_URL=https://your-provider.example/v1/chat/completions \
  LLMAPI_MODEL=gpt-4o-mini \
  CORS_ORIGIN=http://localhost:5173
```

## 6. Local Verification

1. Start the app:

```bash
npm install
npm run dev
```

2. Sign in with Google.
3. Generate a playlist.
4. Save it.
5. Import or export a playlist to verify YouTube access.

## Troubleshooting

### `Authentication failed`

- Check the Firebase config values in `.env.local`.
- Make sure Google Sign-In is enabled in Firebase Authentication.
- Confirm your local domain is listed in Firebase authorized domains.

### `YouTube access token required`

- The Google session likely expired.
- Sign out, then sign back in.

### `AI service not configured`

- Set `LLMAPI_KEY` in Supabase secrets.

### `YouTube API not configured`

- Set `YOUTUBE_API_KEY` in Supabase secrets.

### `Sign in required to generate playlists`

- The Supabase session exchange did not complete.
- Check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are correct.

## Notes

- The current app keeps YouTube access tied to the active sign-in session.
- Background token refresh and unattended sync are future enhancements, not current behavior.
