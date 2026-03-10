/**
 * Email provider sync utilities.
 * Used by the newsletter signup handler to push new subscribers
 * to Mailchimp or ConvertKit after they sign up.
 */

export interface ProviderSyncResult {
  success: boolean;
  error?: string;
}

/**
 * Sync a new subscriber to a Mailchimp audience.
 *
 * @param email - Subscriber email
 * @param apiKey - Mailchimp API key (e.g. "abc123-us6")
 * @param audienceId - Mailchimp list/audience ID
 * @param datacenter - Mailchimp datacenter prefix (e.g. "us6"); derived from
 *   the API key if not provided explicitly.
 */
export async function syncToMailchimp(
  email: string,
  apiKey: string,
  audienceId: string,
  datacenter?: string,
): Promise<ProviderSyncResult> {
  try {
    // Derive datacenter from API key suffix if not provided
    const dc = datacenter || apiKey.split('-').pop() || 'us1';
    const url = `https://${dc}.api.mailchimp.com/3.0/lists/${audienceId}/members`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${btoa(`anystring:${apiKey}`)}`,
      },
      body: JSON.stringify({
        email_address: email,
        status: 'subscribed',
      }),
      signal: AbortSignal.timeout(8000),
    });

    // 200 = created, 400 with "Member Exists" is also acceptable
    if (res.ok) return { success: true };

    const body = await res.json() as { title?: string; detail?: string };
    if (body.title === 'Member Exists') return { success: true };

    return { success: false, error: body.detail || body.title || `HTTP ${res.status}` };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Sync a new subscriber to a ConvertKit form.
 *
 * @param email - Subscriber email
 * @param apiKey - ConvertKit API key
 * @param formId - ConvertKit form ID
 */
export async function syncToConvertKit(
  email: string,
  apiKey: string,
  formId: string,
): Promise<ProviderSyncResult> {
  try {
    const url = `https://api.convertkit.com/v3/forms/${formId}/subscribe`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, email }),
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) return { success: true };

    const body = await res.json() as { error?: string; message?: string };
    return { success: false, error: body.message || body.error || `HTTP ${res.status}` };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
