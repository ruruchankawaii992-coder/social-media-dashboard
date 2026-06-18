export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function isValidPostContent(content: string): boolean {
  return content.length > 0 && content.length <= 5000;
}

export function isValidPassword(password: string): boolean {
  return password.length >= 6;
}
