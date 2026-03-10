/** Live stat fetchers for social platform follower counts. */

// Spotify access token cache
let spotifyToken: { token: string; expiresAt: number } | null = null;

async function getSpotifyToken(clientId: string, clientSecret: string): Promise<string> {
  if (spotifyToken && Date.now() < spotifyToken.expiresAt) return spotifyToken.token;

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: 'grant_type=client_credentials',
  });

  const data = await res.json() as { access_token: string; expires_in: number };
  spotifyToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return spotifyToken.token;
}

export async function fetchSpotifyFollowers(
  artistUrl: string,
  clientId?: string,
  clientSecret?: string
): Promise<{ value: string } | { error: string }> {
  if (!clientId || !clientSecret) {
    return { error: 'Spotify credentials not set in Worker environment' };
  }

  const match = artistUrl.match(/open\.spotify\.com\/artist\/([a-zA-Z0-9]+)/);
  if (!match) return { error: 'Invalid Spotify artist URL' };

  const token = await getSpotifyToken(clientId, clientSecret);
  const res = await fetch(`https://api.spotify.com/v1/artists/${match[1]}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) return { error: 'Failed to fetch Spotify data' };
  const data = await res.json() as { followers: { total: number } };
  return { value: data.followers.total.toLocaleString() };
}

export async function fetchYouTubeSubscribers(
  channelUrl: string,
  apiKey?: string
): Promise<{ value: string } | { error: string }> {
  if (!apiKey) {
    return { error: 'YouTube API key not set in Worker environment' };
  }

  // Try /channel/ID format first
  const channelMatch = channelUrl.match(/youtube\.com\/channel\/([a-zA-Z0-9_-]+)/);
  if (channelMatch) {
    return fetchYouTubeByChannelId(channelMatch[1], apiKey);
  }

  // Handle /@handle format — use forHandle parameter (direct, no Search API needed)
  const handleMatch = channelUrl.match(/youtube\.com\/@([a-zA-Z0-9_.-]+)/);
  if (handleMatch) {
    return fetchYouTubeByParam('forHandle', handleMatch[1], apiKey);
  }

  // Handle /user/Username (legacy) — use forUsername parameter (1 quota unit)
  const userMatch = channelUrl.match(/youtube\.com\/user\/([a-zA-Z0-9_.-]+)/);
  if (userMatch) {
    return fetchYouTubeByParam('forUsername', userMatch[1], apiKey);
  }

  // Handle /c/CustomName — try forHandle first, fall back to search
  const customMatch = channelUrl.match(/youtube\.com\/c\/([a-zA-Z0-9_.-]+)/);
  if (customMatch) {
    const handleResult = await fetchYouTubeByParam('forHandle', customMatch[1], apiKey);
    if ('value' in handleResult) return handleResult;

    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(customMatch[1])}&maxResults=1&key=${apiKey}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (searchRes.ok) {
      const searchData = await searchRes.json() as { items?: { id: { channelId: string } }[] };
      const channelId = searchData.items?.[0]?.id?.channelId;
      if (channelId) return fetchYouTubeByChannelId(channelId, apiKey);
    }
  }

  return { error: 'Could not extract YouTube channel from URL. Use a youtube.com/@handle or /channel/ID link.' };
}

async function fetchYouTubeByParam(
  param: 'forHandle' | 'forUsername',
  value: string,
  apiKey: string
): Promise<{ value: string } | { error: string }> {
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=statistics&${param}=${encodeURIComponent(value)}&key=${apiKey}`,
    { signal: AbortSignal.timeout(5000) }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const parsed = safeParseApiError(body);
    return { error: parsed || `YouTube API error (${res.status})` };
  }
  const data = await res.json() as { items?: { statistics: { subscriberCount: string } }[] };
  const count = data.items?.[0]?.statistics?.subscriberCount;
  if (!count) return { error: 'Channel not found' };
  return { value: parseInt(count, 10).toLocaleString() };
}

async function fetchYouTubeByChannelId(
  channelId: string,
  apiKey: string
): Promise<{ value: string } | { error: string }> {
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${apiKey}`,
    { signal: AbortSignal.timeout(5000) }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const parsed = safeParseApiError(body);
    return { error: parsed || `YouTube API error (${res.status})` };
  }
  const data = await res.json() as { items?: { statistics: { subscriberCount: string } }[] };
  const count = data.items?.[0]?.statistics?.subscriberCount;
  if (!count) return { error: 'Channel not found' };
  return { value: parseInt(count, 10).toLocaleString() };
}

/** Extract a human-readable message from a Google API JSON error body */
function safeParseApiError(body: string): string | null {
  try {
    const json = JSON.parse(body) as { error?: { message?: string; errors?: { reason?: string }[] } };
    const reason = json.error?.errors?.[0]?.reason;
    const message = json.error?.message;
    if (reason === 'accessNotConfigured' || message?.includes('has not been used') || message?.includes('not been enabled')) {
      return 'YouTube Data API v3 is not enabled in your Google Cloud project. Enable it at console.cloud.google.com/apis';
    }
    if (reason === 'forbidden' || reason === 'quotaExceeded') {
      return `YouTube API: ${message || reason}`;
    }
    return message || null;
  } catch {
    return null;
  }
}

// NOTE: scrape-based, may break if Instagram changes their page structure
export async function fetchInstagramFollowers(
  profileUrl: string
): Promise<{ value: string } | { error: string }> {
  const match = profileUrl.match(/instagram\.com\/([a-zA-Z0-9_.]+)/);
  if (!match) return { error: 'Invalid Instagram profile URL' };

  try {
    const res = await fetch(`https://www.instagram.com/${match[1]}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BytLinksBot/1.0)',
        Accept: 'text/html',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return { error: 'Failed to fetch Instagram profile' };

    const html = await res.text();
    // Try meta tag: <meta property="og:description" content="X Followers, Y Following, Z Posts ...">
    const ogMatch = html.match(/content="([\d,.]+[KkMm]?)\s+Followers/i);
    if (ogMatch) return { value: ogMatch[1] };

    // Try JSON-LD or other patterns
    const jsonMatch = html.match(/"edge_followed_by":\s*\{\s*"count":\s*(\d+)/);
    if (jsonMatch) return { value: parseInt(jsonMatch[1], 10).toLocaleString() };

    return { error: 'Could not extract follower count' };
  } catch {
    return { error: 'Failed to fetch Instagram profile' };
  }
}

export async function fetchLiveStat(
  source: string,
  sourceUrl: string,
  env: Record<string, string | undefined>
): Promise<{ value: string } | { error: string }> {
  switch (source) {
    case 'spotify_followers':
      return fetchSpotifyFollowers(sourceUrl, env.SPOTIFY_CLIENT_ID, env.SPOTIFY_CLIENT_SECRET);
    case 'youtube_subscribers':
      return fetchYouTubeSubscribers(sourceUrl, env.YOUTUBE_API_KEY);
    case 'instagram_followers':
      return fetchInstagramFollowers(sourceUrl);
    default:
      return { error: 'Unknown source' };
  }
}
