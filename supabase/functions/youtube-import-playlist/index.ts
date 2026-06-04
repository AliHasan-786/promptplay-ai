import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// WARNING-13: Use env var for CORS origin; fall back to wildcard only in dev
const allowedOrigin = Deno.env.get('CORS_ORIGIN') || '*';
const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigin,
    // CRITICAL-2 + WARNING-13: x-youtube-token added to allowed headers
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-youtube-token',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function decodeHtml(s: string): string {
    return s
        .replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
        .replace(/&quot;/g, '"').replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ');
}

async function fetchVideoDurations(
    apiKey: string,
    videoIds: string[],
): Promise<Map<string, string>> {
    const durations = new Map<string, string>();

    for (let index = 0; index < videoIds.length; index += 50) {
        const chunk = videoIds.slice(index, index + 50);
        const url = new URL('https://www.googleapis.com/youtube/v3/videos');
        url.searchParams.set('part', 'contentDetails');
        url.searchParams.set('id', chunk.join(','));
        url.searchParams.set('key', apiKey);

        const response = await fetch(url.toString());
        if (!response.ok) continue;

        const data = await response.json();
        for (const item of data.items || []) {
            if (item.id && item.contentDetails?.duration) {
                durations.set(item.id, item.contentDetails.duration);
            }
        }
    }

    return durations;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // CRITICAL-4: Validate authHeader before use — no non-null assertion
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Authentication required' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // CRITICAL-2: Read YouTube token from header, not request body
        const youtube_access_token = req.headers.get('X-YouTube-Token');
        const { youtube_playlist_url } = await req.json();

        if (!youtube_playlist_url) {
            return new Response(
                JSON.stringify({ error: 'YouTube playlist URL required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }
        if (!youtube_access_token) {
            return new Response(
                JSON.stringify({ error: 'YouTube access token required' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // WARNING-8: Wrap URL parsing in try/catch with user-friendly errors
        let playlistId: string;
        try {
            const urlObj = new URL(youtube_playlist_url);
            const extractedId = urlObj.searchParams.get('list');
            if (!extractedId) {
                return new Response(
                    JSON.stringify({ error: 'Invalid YouTube playlist URL. Make sure it contains a "list=" parameter.' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }
            playlistId = extractedId;
        } catch {
            return new Response(
                JSON.stringify({ error: 'Invalid URL format. Please paste the full YouTube playlist URL.' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Create Supabase service client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // CRITICAL-4: authHeader is now guaranteed non-null; no ! needed
        const { data: { user }, error: userError } = await createClient(
            supabaseUrl,
            Deno.env.get('SUPABASE_ANON_KEY')!,
            { global: { headers: { Authorization: authHeader } } }
        ).auth.getUser();

        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Authentication required' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Fetch playlist metadata from YouTube
        const playlistRes = await fetch(
            `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}`,
            { headers: { Authorization: `Bearer ${youtube_access_token}` } }
        );
        const playlistData = await playlistRes.json();
        // Known API error — return friendly message, not raw exception
        if (playlistData.error) {
            return new Response(
                JSON.stringify({ error: 'Failed to fetch playlist from YouTube. Check the URL and try again.' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

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
            if (itemsData.error) {
                return new Response(
                    JSON.stringify({ error: 'Failed to fetch playlist items from YouTube. The playlist may be private or unavailable.' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            allItems.push(...(itemsData.items || []));
            nextPageToken = itemsData.nextPageToken;
        } while (nextPageToken);

        console.log(`Fetched ${allItems.length} items from playlist "${playlistTitle}"`);

        // Create playlist in Supabase.
        const { data: playlist, error: insertError } = await supabase
            .from('generated_playlists')
            .insert({
                user_id: user.id,
                prompt_text: playlistTitle,
                youtube_playlist_id: playlistId,
                source: 'import',
                last_synced_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (insertError) {
            console.error('Failed to create playlist record:', insertError);
            return new Response(
                JSON.stringify({ error: 'An unexpected error occurred. Please try again.' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        let activeCount = 0;
        let deletedCount = 0;
        let privateCount = 0;

        const validItems = allItems.filter(item => item.snippet?.resourceId?.videoId);
        const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY');
        const durationsByVideoId = youtubeApiKey
            ? await fetchVideoDurations(youtubeApiKey, validItems.map((item) => item.snippet.resourceId.videoId))
            : new Map<string, string>();
        const videosToUpsert: Array<Record<string, unknown>> = [];
        const playlistItemsToInsert: Array<Record<string, unknown>> = [];

        for (let i = 0; i < validItems.length; i++) {
            const item = validItems[i];
            const videoId = item.snippet.resourceId.videoId;
            const privacyStatus = item.status?.privacyStatus;
            const isPrivate = privacyStatus === 'private';
            const isDeleted = privacyStatus === 'privacyStatusUnspecified';
            const itemStatus = isPrivate ? 'private' : (isDeleted ? 'deleted' : 'active');
            const thumbnailUrl = item.snippet.thumbnails?.medium?.url ||
                item.snippet.thumbnails?.default?.url || '';

            if (isPrivate) privateCount++;
            else if (isDeleted) deletedCount++;
            else activeCount++;

            videosToUpsert.push({
                youtube_video_id: videoId,
                title: decodeHtml(item.snippet.title || 'Unknown'),
                channel_name: decodeHtml(item.snippet.videoOwnerChannelTitle || item.snippet.channelTitle || 'Unknown'),
                thumbnail_url: thumbnailUrl || null,
                privacy_status: isPrivate ? 'private' : (isDeleted ? 'deleted' : 'public'),
                duration: durationsByVideoId.get(videoId) || null,
            });

            playlistItemsToInsert.push({
                playlist_id: playlist.id,
                youtube_video_id: videoId,
                position: i,
                status: itemStatus,
            });
        }

        if (videosToUpsert.length > 0) {
            const { error: videoError } = await supabase
                .from('videos')
                .upsert(videosToUpsert, { onConflict: 'youtube_video_id' });

            if (videoError) {
                await supabase.from('generated_playlists').delete().eq('id', playlist.id);
                throw videoError;
            }
        }

        if (playlistItemsToInsert.length > 0) {
            const { error: itemError } = await supabase
                .from('playlist_items')
                .insert(playlistItemsToInsert);

            if (itemError) {
                await supabase.from('generated_playlists').delete().eq('id', playlist.id);
                throw itemError;
            }
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
        // CRITICAL-3: Log full error server-side; return generic message to client
        console.error('Error:', error);
        return new Response(
            JSON.stringify({ error: 'An unexpected error occurred. Please try again.' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
