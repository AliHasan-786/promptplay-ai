import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function decodeHtml(s: string): string {
    return s
        .replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
        .replace(/&quot;/g, '"').replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ');
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get('Authorization');
        const { youtube_playlist_url, youtube_access_token } = await req.json();

        if (!youtube_playlist_url) throw new Error('YouTube playlist URL required');
        if (!youtube_access_token) throw new Error('YouTube access token required');

        // Extract playlist ID from URL
        const urlObj = new URL(youtube_playlist_url);
        const playlistId = urlObj.searchParams.get('list');
        if (!playlistId) throw new Error('Invalid YouTube playlist URL — missing "list" parameter');

        // Create Supabase client with user's auth
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Get user from auth header
        const { data: { user }, error: userError } = await createClient(
            supabaseUrl,
            Deno.env.get('SUPABASE_ANON_KEY')!,
            { global: { headers: { Authorization: authHeader! } } }
        ).auth.getUser();

        if (userError || !user) throw new Error('Authentication required');

        // Fetch playlist metadata from YouTube
        const playlistRes = await fetch(
            `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}`,
            { headers: { Authorization: `Bearer ${youtube_access_token}` } }
        );
        const playlistData = await playlistRes.json();
        if (playlistData.error) throw new Error(playlistData.error.message);

        const playlistTitle = decodeHtml(
            playlistData.items?.[0]?.snippet?.title || 'Imported Playlist'
        );

        // Fetch all playlist items (paginated)
        const allItems: any[] = [];
        let nextPageToken: string | undefined = undefined;

        do {
            const itemsUrl = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
            itemsUrl.searchParams.set('part', 'snippet,status');
            itemsUrl.searchParams.set('playlistId', playlistId);
            itemsUrl.searchParams.set('maxResults', '50');
            if (nextPageToken) itemsUrl.searchParams.set('pageToken', nextPageToken);

            const itemsRes = await fetch(itemsUrl.toString(), {
                headers: { Authorization: `Bearer ${youtube_access_token}` },
            });
            const itemsData = await itemsRes.json();
            if (itemsData.error) throw new Error(itemsData.error.message);

            allItems.push(...(itemsData.items || []));
            nextPageToken = itemsData.nextPageToken;
        } while (nextPageToken);

        console.log(`Fetched ${allItems.length} items from playlist "${playlistTitle}"`);

        // Create playlist in Supabase
        const { data: playlist, error: insertError } = await supabase
            .from('generated_playlists')
            .insert({
                user_id: user.id,
                prompt_text: playlistTitle,
                youtube_playlist_id: playlistId,
            })
            .select()
            .single();

        if (insertError) throw new Error(insertError.message);

        // Insert each video
        let activeCount = 0;
        let deletedCount = 0;
        let privateCount = 0;

        const songsToInsert = allItems
            .filter(item => item.snippet?.resourceId?.videoId)
            .map(item => {
                const videoId = item.snippet.resourceId.videoId;
                const privacyStatus = item.status?.privacyStatus;
                const isActive = privacyStatus !== 'private' && privacyStatus !== 'privacyStatusUnspecified';

                if (privacyStatus === 'private') privateCount++;
                else if (privacyStatus === 'privacyStatusUnspecified') deletedCount++;
                else activeCount++;

                return {
                    playlist_id: playlist.id,
                    track_name: decodeHtml(item.snippet.title || 'Unknown'),
                    artist_name: decodeHtml(item.snippet.videoOwnerChannelTitle || 'Unknown'),
                    youtube_id: videoId,
                };
            });

        if (songsToInsert.length > 0) {
            const { error: songsError } = await supabase
                .from('playlist_songs')
                .insert(songsToInsert);
            if (songsError) throw new Error(songsError.message);
        }

        return new Response(JSON.stringify({
            playlist_id: playlist.id,
            title: playlistTitle,
            total_videos: allItems.length,
            active_videos: activeCount,
            deleted_videos: deletedCount,
            private_videos: privateCount,
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Import error:', error);
        return new Response(JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error',
        }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
