/**
 * Review scrapers for the Testimonials import feature.
 *
 * Google: Fetches a Google Business Profile page and extracts reviews from
 * JSON-LD structured data embedded in the HTML.
 *
 * Trustpilot: STUBBED — returns a sentinel object until ToS review is complete.
 * // TODO: Trustpilot scraper — implement when ToS review is complete.
 */

import type { TestimonialItem } from '@bytlinks/shared';

export interface ScrapeResult {
  items: TestimonialItem[];
}

export interface ScrapeStubbed {
  stubbed: true;
  message: string;
}

/** Extract Review items from JSON-LD blocks in an HTML string. */
function extractJsonLdReviews(html: string): TestimonialItem[] {
  const results: TestimonialItem[] = [];
  // Match all <script type="application/ld+json"> blocks
  const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const json = JSON.parse(match[1]);
      const candidates = Array.isArray(json) ? json : [json];

      for (const obj of candidates) {
        // Top-level Review array or LocalBusiness with aggregateRating/review
        const reviews: unknown[] = [];
        if (obj['@type'] === 'Review') {
          reviews.push(obj);
        } else if (Array.isArray(obj.review)) {
          reviews.push(...obj.review);
        }

        for (const rev of reviews) {
          const r = rev as Record<string, unknown>;
          const authorObj = r.author as Record<string, unknown> | undefined;
          const ratingObj = r.reviewRating as Record<string, unknown> | undefined;
          const author =
            (typeof authorObj?.name === 'string' ? authorObj.name : null) ||
            (typeof r.author === 'string' ? r.author : null);
          const bodyText =
            (typeof r.reviewBody === 'string' ? r.reviewBody : null) ||
            (typeof r.description === 'string' ? r.description : null);

          if (!author || !bodyText) continue;

          const rating =
            typeof ratingObj?.ratingValue === 'number'
              ? ratingObj.ratingValue
              : typeof ratingObj?.ratingValue === 'string'
              ? parseFloat(ratingObj.ratingValue as string)
              : undefined;

          results.push({
            id: crypto.randomUUID(),
            quote: bodyText.trim(),
            author: author.trim(),
            source: 'google',
            rating: rating !== undefined && !isNaN(rating) ? Math.min(5, Math.max(1, Math.round(rating))) : undefined,
            imported_at: Math.floor(Date.now() / 1000),
          });

          if (results.length >= 10) return results;
        }
      }
    } catch {
      // Malformed JSON-LD — skip block
    }
  }

  return results;
}

/**
 * Scrape reviews from a Google Business Profile URL.
 * Returns up to 10 TestimonialItems extracted from JSON-LD structured data.
 */
export async function scrapeGoogleReviews(url: string): Promise<ScrapeResult> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; BytLinksBot/1.0; +https://bytlinks.com)',
      Accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    return { items: [] };
  }

  // Read up to 128 KB — JSON-LD is typically in the <head>
  const reader = res.body?.getReader();
  if (!reader) return { items: [] };

  let html = '';
  const decoder = new TextDecoder();
  while (html.length < 131_072) {
    const { done, value } = await reader.read();
    if (done) break;
    html += decoder.decode(value, { stream: true });
  }
  reader.cancel();

  const items = extractJsonLdReviews(html);
  return { items };
}

/**
 * Trustpilot import — stubbed pending ToS review.
 * // TODO: Trustpilot scraper — implement when ToS review is complete.
 */
export function scrapeTrustpilotReviews(_url: string): ScrapeStubbed {
  return {
    stubbed: true,
    message: 'Trustpilot import coming soon',
  };
}
