# Google OAuth Setup Guide

This guide will help you set up Google OAuth credentials for YouTube API access.

## Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **YouTube Data API v3**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "YouTube Data API v3"
   - Click "Enable"

4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - If prompted, configure the OAuth consent screen first:
     - Choose "External" (unless you have a Google Workspace)
     - Fill in the required fields (App name, User support email, Developer contact)
     - Add scopes: `https://www.googleapis.com/auth/youtube`
     - Add test users if your app is in testing mode
   - For Application type, select "Web application"
   - Add Authorized redirect URIs:
     - For local development: `http://localhost:5173/` (or your local port)
     - For production: `https://your-domain.com/`
     - **Important**: The redirect URI must match exactly what your app uses (currently `${window.location.origin}/`)

5. Copy your **Client ID** and **Client Secret**

## Step 2: Set Environment Variables in Supabase

### Option A: Using Supabase Dashboard (Recommended for Production)

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to "Project Settings" > "Edge Functions" > "Secrets"
4. Add the following secrets:
   - `GOOGLE_CLIENT_ID` - Your Google OAuth Client ID
   - `GOOGLE_CLIENT_SECRET` - Your Google OAuth Client Secret

### Option B: Using Supabase CLI (For Local Development)

1. Install Supabase CLI if you haven't: `npm install -g supabase`
2. Login: `supabase login`
3. Link your project: `supabase link --project-ref YOUR_PROJECT_REF`
4. Set secrets:
   ```bash
   supabase secrets set GOOGLE_CLIENT_ID=your_client_id_here
   supabase secrets set GOOGLE_CLIENT_SECRET=your_client_secret_here
   ```

## Step 3: Deploy/Update Edge Function

If you're using Supabase CLI:
```bash
supabase functions deploy youtube-auth
```

If you're using the dashboard, the function should automatically update when you push changes.

## Step 4: Verify Setup

1. Make sure your redirect URI in Google Cloud Console matches your app's origin
2. Test the OAuth flow in your application
3. Check the Supabase Edge Function logs if you encounter issues

## Troubleshooting

### Error: "OAuth client was not found" (401: invalid_client)
- **Cause**: The Client ID is incorrect or not set. This usually happens when you copy the Client Secret instead of the Client ID, or create a non-Web OAuth client.
- **Solution**:
  - Make sure you created a **Web application** OAuth client in Google Cloud Console (the Client ID should end with `.apps.googleusercontent.com`)
  - Copy the **Client ID** (not the secret) and set it in Supabase secrets without quotes or spaces:
    ```bash
    supabase secrets set GOOGLE_CLIENT_ID=your_client_id_here GOOGLE_CLIENT_SECRET=your_client_secret_here
    ```
  - Redeploy the function so it picks up the updated secrets:
    ```bash
    supabase functions deploy youtube-auth
    ```

### Error: "redirect_uri_mismatch"
- **Cause**: The redirect URI doesn't match what's configured in Google Cloud Console
- **Solution**: Add your app's origin (e.g., `http://localhost:5173/` or `https://your-domain.com/`) to Authorized redirect URIs in Google Cloud Console

### Error: "Google OAuth credentials not configured"
- **Cause**: Environment variables are not set in Supabase
- **Solution**: Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Supabase secrets

## How to test the OAuth flow

1. Quick sanity check (no browser):
   ```bash
   supabase functions invoke youtube-auth \
     --project-ref <YOUR_PROJECT_REF> \
     --no-verify-jwt \
     --body '{"action":"get_auth_url","redirectUri":"http://localhost:5173/"}'
   ```
   - Confirm the returned `authUrl` has your Client ID and the expected redirect URI.

2. End-to-end browser test:
   - Start the app locally: `npm install && npm run dev`
   - Visit `http://localhost:5173/`, click "Connect YouTube", sign in, and ensure you are redirected back without the Google error page.
   - If you still see `invalid_client`, re-check that the Client ID is the web client ID and matches the value in Supabase secrets.

## Important Notes

- Never commit your Client ID or Client Secret to version control
- The redirect URI must include the trailing slash if your app uses it
- For local development, use `http://localhost:PORT/` (replace PORT with your dev server port)
- For production, use your actual domain with the protocol (https://)
