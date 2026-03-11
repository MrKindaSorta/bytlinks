/**
 * Password hashing, JWT utilities, and AES-GCM encryption using Web Crypto API.
 * No external dependencies — runs natively in Cloudflare Workers.
 */

const PBKDF2_ITERATIONS = 100_000;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

function bufferToHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer;
}

function base64UrlEncode(data: string): string {
  return btoa(data).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(data: string): string {
  const padded = data + '='.repeat((4 - (data.length % 4)) % 4);
  return atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
}

/**
 * Hash a password using PBKDF2-SHA256.
 * Returns "salt:hash" in hex.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const encoder = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_LENGTH * 8,
  );

  return `${bufferToHex(salt.buffer)}:${bufferToHex(derivedBits)}`;
}

/** Constant-time comparison of two Uint8Arrays (prevents timing attacks). */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

/** Constant-time comparison of two strings (prevents timing attacks). */
export function timingSafeCompare(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  if (bufA.byteLength !== bufB.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < bufA.length; i++) {
    diff |= bufA[i] ^ bufB[i];
  }
  return diff === 0;
}

/**
 * Verify a password against a stored "salt:hash" string.
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const [saltHex, hashHex] = storedHash.split(':');
  if (!saltHex || !hashHex) return false;

  const salt = new Uint8Array(hexToBuffer(saltHex));
  const encoder = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_LENGTH * 8,
  );

  const derived = new Uint8Array(derivedBits);
  const expected = new Uint8Array(hexToBuffer(hashHex));
  return timingSafeEqual(derived, expected);
}

interface JwtPayload {
  sub: string;
  email: string;
  plan: string;
  iat: number;
  exp: number;
}

/**
 * Create a JWT signed with HMAC-SHA256.
 */
export async function createJwt(
  payload: Omit<JwtPayload, 'iat' | 'exp'>,
  secret: string,
  expiresInSeconds: number = 7 * 24 * 60 * 60, // 7 days
): Promise<string> {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);

  const fullPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const body = base64UrlEncode(JSON.stringify(fullPayload));
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${header}.${body}`),
  );

  const sig = base64UrlEncode(
    String.fromCharCode(...new Uint8Array(signature)),
  );

  return `${header}.${body}.${sig}`;
}

/**
 * Verify and decode a JWT. Returns the payload or null if invalid/expired.
 */
export async function verifyJwt(
  token: string,
  secret: string,
): Promise<JwtPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, body, sig] = parts;
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );

  const signatureBytes = Uint8Array.from(base64UrlDecode(sig), (c) =>
    c.charCodeAt(0),
  );

  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    signatureBytes,
    encoder.encode(`${header}.${body}`),
  );

  if (!valid) return null;

  const payload: JwtPayload = JSON.parse(base64UrlDecode(body));
  const now = Math.floor(Date.now() / 1000);

  if (payload.exp < now) return null;

  return payload;
}

// ---------------------------------------------------------------------------
// Cryptographic access tokens (URL-safe, 22 chars = 131 bits entropy)
// ---------------------------------------------------------------------------

/** Generate a URL-safe random token (base62, 22 chars ≈ 131 bits). */
export function generateAccessToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(22));
  let token = '';
  for (let i = 0; i < 22; i++) {
    token += chars[bytes[i] % chars.length];
  }
  return token;
}

// ---------------------------------------------------------------------------
// AES-GCM symmetric encryption for provider credentials
// ---------------------------------------------------------------------------

/** Derive a 256-bit AES-GCM key from a raw passphrase via SHA-256. */
async function deriveAesKey(passphrase: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const raw = await crypto.subtle.digest('SHA-256', encoder.encode(passphrase));
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

/**
 * Encrypt a plaintext string with AES-GCM.
 * Returns a hex string: <12-byte IV><ciphertext>.
 */
export async function encryptCredential(plaintext: string, passphrase: string): Promise<string> {
  const key = await deriveAesKey(passphrase);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext),
  );
  const combined = new Uint8Array(12 + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), 12);
  return bufferToHex(combined.buffer);
}

/**
 * Decrypt a hex-encoded AES-GCM ciphertext (produced by encryptCredential).
 * Returns the original plaintext, or null if decryption fails.
 */
export async function decryptCredential(hexCipher: string, passphrase: string): Promise<string | null> {
  try {
    const key = await deriveAesKey(passphrase);
    const combined = new Uint8Array(hexToBuffer(hexCipher));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const plainBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return new TextDecoder().decode(plainBuffer);
  } catch {
    return null;
  }
}
