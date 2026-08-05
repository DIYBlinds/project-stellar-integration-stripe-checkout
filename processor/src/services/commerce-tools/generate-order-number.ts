import { createHash } from 'crypto';

function uuidValidate(uuid: string): boolean {
  return /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/i.test(
    uuid,
  );
}

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Generates a 2-letter prefix from cartCreatedAt (day and year)
 * @param cartCreatedAt ISO 8601 timestamp
 * @returns 2-letter prefix (e.g., 'EY' for 5th day of 2025)
 */
function getPrefixFromTimestamp(cartCreatedAt: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(cartCreatedAt)) {
    throw new Error(`Invalid cartCreatedAt: ${cartCreatedAt}`);
  }
  const date = new Date(cartCreatedAt);
  const year = (date.getUTCFullYear() - 2000) % 26; // 2025 → 25 → Y
  const day = (date.getUTCDate() - 1) % 26; // 1-31 → 0-25 (A-Z), 27-31 → 0-4 (A-E)
  // Map day to A-Z (1=A, 2=B, ..., 26=Z, 27=A, ..., 31=E), year to A-Z
  return `${alphabet[day]}${alphabet[year]}`; // Day-year format
}

/**
 * Converts hash segment to uppercase letters with uniform distribution
 */
function hashToLetters(hashSegment: string, length: number): string {
  let result = '';
  const maxIndex = alphabet.length; // 26

  // Use a scaling factor to make distribution more uniform
  for (let i = 0; i < length; i++) {
    const hexByte = parseInt(hashSegment.substring(i * 2, i * 2 + 2), 16);
    // Scale 0-255 to 0-25 uniformly
    const index = Math.floor((hexByte / 256) * maxIndex);
    result += alphabet[index];
  }

  return result;
}

/**
 * Converts hash segment to digits with uniform distribution
 */
function hashToNumbers(hashSegment: string, length: number): string {
  let result = '';
  const maxDigit = 10; // 0-9

  // Use a scaling factor to make distribution more uniform
  for (let i = 0; i < length; i++) {
    const hexByte = parseInt(hashSegment.substring(i * 2, i * 2 + 2), 16);
    // Scale 0-255 to 0-9 uniformly
    const digit = Math.floor((hexByte / 256) * maxDigit);
    result += digit.toString();
  }

  return result;
}

/**
 * Generates order number derived from cart ID and creation time
 * @param cartId UUID of the cart (e.g., "013b4fcb-b257-4804-adf8-4f6c8083595a")
 * @param cartCreatedAt ISO 8601 timestamp of cart creation (e.g., "2025-05-19T10:00:00.000Z")
 * @param attempt Include attempt number to vary output on retries (e.g., 0, 1, 2, etc.)
 * @returns Deterministic unique order number in LLLL-NNNN format
 */
export function generateOrderNumberFromCartId(cartId: string, cartCreatedAt: string, attempt: number): string {
  if (!uuidValidate(cartId)) throw new Error(`Invalid cartId: ${cartId}`);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(cartCreatedAt)) {
    throw new Error(`Invalid cartCreatedAt: ${cartCreatedAt}`);
  }
  const prefix = getPrefixFromTimestamp(cartCreatedAt);
  const input = `${cartId}:${cartCreatedAt}:${attempt}`;
  const hash = createHash('sha256').update(input).digest('hex');
  const letters = hashToLetters(hash.substring(0, 4), 2);
  const numbers = hashToNumbers(hash.substring(4, 12), 4);
  return `${prefix}${letters}-${numbers}`;
}
