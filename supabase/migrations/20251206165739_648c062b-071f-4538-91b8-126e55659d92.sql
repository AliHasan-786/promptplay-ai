-- Create profiles table linked to auth.users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$;

-- Trigger to auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create generated_playlists table
CREATE TABLE public.generated_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on generated_playlists
ALTER TABLE public.generated_playlists ENABLE ROW LEVEL SECURITY;

-- Playlist policies
CREATE POLICY "Users can view their own playlists"
ON public.generated_playlists FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own playlists"
ON public.generated_playlists FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own playlists"
ON public.generated_playlists FOR DELETE
USING (auth.uid() = user_id);

-- Create playlist_songs table
CREATE TABLE public.playlist_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES public.generated_playlists(id) ON DELETE CASCADE,
  artist_name TEXT NOT NULL,
  track_name TEXT NOT NULL,
  spotify_id TEXT,
  youtube_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on playlist_songs
ALTER TABLE public.playlist_songs ENABLE ROW LEVEL SECURITY;

-- Songs policies (users can access songs from their own playlists)
CREATE POLICY "Users can view songs from their playlists"
ON public.playlist_songs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.generated_playlists
    WHERE id = playlist_songs.playlist_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert songs to their playlists"
ON public.playlist_songs FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.generated_playlists
    WHERE id = playlist_songs.playlist_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete songs from their playlists"
ON public.playlist_songs FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.generated_playlists
    WHERE id = playlist_songs.playlist_id
    AND user_id = auth.uid()
  )
);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();