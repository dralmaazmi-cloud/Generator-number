export function hashSeed(input) {
  const str = String(input ?? '0');
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h += h << 13; h ^= h >>> 7;
  h += h << 3;  h ^= h >>> 17;
  h += h << 5;
  return h >>> 0;
}

export class SeededRNG {
  constructor(seed = Date.now()) {
    this.seed = String(seed);
    this.state = hashSeed(this.seed) || 0x6D2B79F5;
  }

  next() {
    let t = this.state += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const out = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    this.state >>>= 0;
    return out;
  }

  int(min, max) {
    if (max < min) [min, max] = [max, min];
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  float(min = 0, max = 1) {
    return min + this.next() * (max - min);
  }

  bool(probability = 0.5) {
    return this.next() < probability;
  }

  pick(array) {
    if (!array?.length) throw new Error('Cannot pick from an empty array');
    return array[this.int(0, array.length - 1)];
  }

  weightedPick(items) {
    const total = items.reduce((s, x) => s + x.weight, 0);
    let r = this.next() * total;
    for (const item of items) {
      r -= item.weight;
      if (r <= 0) return item.value;
    }
    return items.at(-1).value;
  }

  shuffle(array) {
    const out = [...array];
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  sample(array, n) {
    return this.shuffle(array).slice(0, n);
  }

  fork(label) {
    return new SeededRNG(`${this.seed}|${label}|${this.state}`);
  }
}

export function makeSeed(prefix = 'NUM') {
  const now = Date.now().toString(36);
  const rand = Math.floor(Math.random() * 1e9).toString(36);
  return `${prefix}-${now}-${rand}`;
}
