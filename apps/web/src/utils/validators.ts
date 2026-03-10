const USERNAME_RE = /^[a-z0-9_-]{3,30}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidUsername(username: string): boolean {
  return USERNAME_RE.test(username);
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8;
}
