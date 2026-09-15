/**
 * 确定性随机数。
 *
 * 同一个 seed 永远产生同一串数：xmur3 把字符串散列成 32 位整数，
 * mulberry32 以纯整数运算推进状态。两者都不依赖浮点库或宿主随机源，
 * 因此在 Node、浏览器、任何 JS 引擎上结果逐位一致。
 */
export function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let index = 0; index < seed.length; index += 1) {
    h = Math.imul(h ^ seed.charCodeAt(index), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

export function mulberry32(state: number): () => number {
  let a = state >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 返回 [0,1) 的确定性随机序列。 */
export function createRandom(seed: string): () => number {
  return mulberry32(hashSeed(seed));
}

const SEED_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/**
 * 省略 seed 时由服务端生成的随机 seed（不参与可复现性，只是给这一次抽卡一个名字）。
 * 刻意不使用宿主 crypto，保持 core 层可在浏览器内直接复用。
 */
export function randomSeed(length = 12): string {
  let out = '';
  for (let index = 0; index < length; index += 1) {
    out += SEED_ALPHABET.charAt(Math.floor(Math.random() * SEED_ALPHABET.length));
  }
  return out;
}
