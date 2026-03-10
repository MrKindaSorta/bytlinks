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

  // Try to extract channel ID
  let channelId: string | null = null;
  const channelMatch = channelUrl.match(/youtube\.com\/channel\/([a-zA-Z0-9_-]+)/);
  if (channelMatch) {
    channelId = channelMatch[1];
  } else {
    // Handle /@handle format
    const handleMatch = channelUrl.match(/youtube\.com\/@([a-zA-Z0-9_-]+)/);
    if (handleMatch) {
      const searchRes = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(handleMatch[1])}&key=${apiKey}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (searchRes.ok) {
        const searchData = await searchRes.json() as { items: { id: { channelId: string } }[] };
        channelId = searchData.items?.[0]?.id?.channelId || null;
      }
    }
  }

  if (!channelId) return { error: 'Could not extract YouTube channel ID' };

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${apiKey}`,
    { signal: AbortSignal.timeout(5000) }
  );

  if (!res.ok) return { error: 'Failed to fetch YouTube data' };
  const data = await res.json() as { items: { statistics: { subscriberCount: string } }[] };
  const count = data.items?.[0]?.statistics?.subscriberCount;
  if (!count) return { error: 'Channel not found' };
  return { value: parseInt(count, 10).toLocaleString() };
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
