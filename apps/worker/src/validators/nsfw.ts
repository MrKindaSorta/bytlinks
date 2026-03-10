import { BLOCKED_DOMAINS } from '@bytlinks/shared/constants';

/**
 * Checks if a URL belongs to a blocked NSFW domain.
 * Runs server-side on every link save/update.
 */
export function isBlockedUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    const base = hostname.replace(/^www\./, '');
    return BLOCKED_DOMAINS.some((d) => base === d || base.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

export const NSFW_ERROR_MESSAGE =
  "BytLinks supports professional links only. This URL isn't allowed on our platform.";
