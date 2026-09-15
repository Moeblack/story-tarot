const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** Cryptographically random, URL safe seed. */
export function randomSeed(length = 12): string {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = '';
  for (let i = 0; i < length; i += 1) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/** Build an id that does not collide with `taken`, e.g. `custom-deck-3`. */
export function uniqueId(prefix: string, taken: ReadonlyArray<string>): string {
  const used = new Set(taken);
  let index = 1;
  let candidate = `${prefix}-${index}`;
  while (used.has(candidate)) {
    index += 1;
    candidate = `${prefix}-${index}`;
  }
  return candidate;
}
