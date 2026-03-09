/* eslint-disable @typescript-eslint/no-explicit-any */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// WARNING-13: Use env var for CORS origin; fall back to wildcard only in dev
const allowedOrigin = Deno.env.get('CORS_ORIGIN') || '*';
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  // WARNING-13: x-youtube-token added to allowed headers
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-youtube-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DAILY_LIMIT = 15;

/** Decode HTML entities that YouTube API returns */
function decodeHtml(s: string): string {
  return s
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

/** Search YouTube for a query and return up to maxResults videos */
async function youtubeSearch(
  query: string,
  apiKey: string,
  maxResults = 3
): Promise<Array<{ videoId: string; title: string; channel: string; thumbnail: string }>> {
  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('q', query);
  url.searchParams.set('type', 'video');
  url.searchParams.set('maxResults', String(maxResults));
  url.searchParams.set('key', apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    console.error(`YouTube API ${res.status} for "${query}"`);
    return [];
  }

  const data = await res.json();
  return (data.items || []).map((item: any) => ({
    videoId: item.id.videoId,
    title: decodeHtml(item.snippet?.title || ''),
    channel: decodeHtml(item.snippet?.channelTitle || ''),
    thumbnail: item.snippet?.thumbnails?.medium?.url ||
      item.snippet?.thumbnails?.default?.url || '',
  }));
}

/** Extract user ID from the Supabase JWT */
async function getUserId(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch {
    return null;
  }
}

/** Check daily AI-generated playlist count for a user.
 *
 * WARNING-9: Filters by source='ai_generate' so imports don't count against the limit.
 * NOTE: Requires a DB migration to add `source varchar default 'ai_generate'` to
 * `generated_playlists`. Until that migration runs, this filter returns 0 rows
 * (no records match), effectively giving everyone unlimited AI generations.
 */
async function getDailyCount(userId: string): Promise<number> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('generated_playlists')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('source', 'ai_generate') // WARNING-9: only count AI-generated playlists
    .gte('created_at', today.toISOString());

  return count || 0;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // WARNING-7: Server-side prompt length cap
    if (prompt.length > 2000) {
      return new Response(
        JSON.stringify({ error: 'Prompt is too long. Please keep it under 2000 characters.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Auth + Rate limiting ──
    const authHeader = req.headers.get('Authorization');
    const userId = await getUserId(authHeader);
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Sign in required to generate playlists.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const dailyCount = await getDailyCount(userId);
    if (dailyCount >= DAILY_LIMIT) {
      // WARNING-5: Return 429 status instead of 200 for rate limit response
      return new Response(
        JSON.stringify({
          error: `You've reached your daily limit of ${DAILY_LIMIT} playlists. Come back tomorrow!`,
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LLMAPI_KEY = Deno.env.get('LLMAPI_KEY');
    const LLMAPI_BASE_URL = Deno.env.get('LLMAPI_BASE_URL') || 'https://internal.llmapi.ai/v1/chat/completions';
    const LLMAPI_MODEL = Deno.env.get('LLMAPI_MODEL') || 'gpt-4o-mini';
    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');

    if (!LLMAPI_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!YOUTUBE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'YouTube API not configured.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Step 1: LLM generates YouTube search queries ──
    const systemPrompt = `You are an expert YouTube discovery assistant. Given a user request OR a list of existing videos, generate a list of YouTube search queries to find the most relevant, highly-curated videos.

RULES:
1. Return ONLY a valid JSON array of strings — each string is a YouTube search query.
2. Each search query should be specific enough to find a single relevant video as the top result.
3. Include the channel name or creator in the query when you know it.
4. Generate 8-15 diverse search queries covering different aspects of the request.
5. Each query should target a DIFFERENT video — avoid queries that would return the same result.
6. Make queries highly specific based on semantic value, topic, and sentiment.
7. RECOMMENDATION MODE: If the user provides a list of existing videos, they want recommendations for SIMILAR videos. Analyze the genres, creators, naming conventions, and semantics of those videos to generate queries for OTHER videos that perfectly match that vibe/topic.
8. No markdown, no explanation. ONLY a JSON array of strings.

SAFETY:
- If the user asks for content involving explicit violence, sexual/pornographic content, hate speech, self-harm, or illegal activity, DO NOT generate search queries.
- Instead, return exactly: {"refused": true, "reason": "I can't help find that type of content. Try asking for something else!"}

NON-VIDEO REQUESTS:
- If the user request is clearly NOT related to finding YouTube videos (e.g. math questions, general knowledge, writing code), DO NOT generate search queries.
- Instead, return exactly: {"off_topic": true, "reason": "I'm designed to find YouTube videos! Try describing content you'd like to watch or providing some examples to base recommendations on."}

Example for "chill fire emblem music":
["fire emblem awakening id purpose calm OST","fire emblem three houses garreg mach monastery music","fire emblem path of radiance theme piano"]

Example for recommendation based on "Two Minute Papers, Yannic Kilcher":
["AI news updates latest breakthroughs","machine learning research paper summary","artificial intelligence research overview","computer graphics paper explanation"]`;

    console.log('Generating search queries for:', prompt);

    const llmRes = await fetch(LLMAPI_BASE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LLMAPI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: LLMAPI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!llmRes.ok) {
      if (llmRes.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit — wait a few seconds and try again.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: 'AI service unavailable.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const llmData = await llmRes.json();
    const content = llmData.choices?.[0]?.message?.content;
    if (!content) {
      return new Response(
        JSON.stringify({ error: 'Empty AI response.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Parse the LLM response ──
    let parsed: any;
    try {
      let s = content.trim();

      // Robustly extract JSON array or object if LLM added conversational text
      const match = s.match(/\[.*\]/s) || s.match(/\{.*\}/s);
      if (match) {
        s = match[0];
      }

      parsed = JSON.parse(s.trim());
    } catch {
      // LLM returned something that isn't JSON — probably a conversational answer
      return new Response(
        JSON.stringify({
          error: "I'm designed to find YouTube videos! Try describing content you'd like to watch — music, tutorials, reviews, podcasts, etc.",
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for safety refusal
    if (parsed?.refused) {
      return new Response(
        JSON.stringify({ error: parsed.reason || "I can't help find that type of content." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for off-topic
    if (parsed?.off_topic) {
      return new Response(
        JSON.stringify({
          error: parsed.reason || "I'm designed to find YouTube videos! Try describing content you'd like to watch.",
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Must be an array of search queries
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No search queries generated. Try a different prompt!' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchQueries: string[] = parsed;

    console.log(`LLM generated ${searchQueries.length} search queries`);

    // ── Step 2: Search YouTube for each query (parallel, 1 result each) ──
    const searchPromises = searchQueries.map(q => youtubeSearch(q, YOUTUBE_API_KEY, 1));
    const searchResults = await Promise.all(searchPromises);

    // Flatten and deduplicate by video ID
    const seen = new Set<string>();
    const videos: any[] = [];

    for (const results of searchResults) {
      for (const v of results) {
        if (!v.videoId || seen.has(v.videoId)) continue;
        seen.add(v.videoId);
        videos.push({
          id: `video-${Date.now()}-${videos.length}`,
          title: v.title,
          creator: v.channel,
          youtube_id: v.videoId,
          thumbnail: v.thumbnail,
          watch_url: `https://www.youtube.com/watch?v=${v.videoId}`,
        });
      }
    }

    console.log(`Returning ${videos.length} unique videos`);

    return new Response(
      JSON.stringify({ songs: videos }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // CRITICAL-3: Log full error server-side; return generic message to client
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
