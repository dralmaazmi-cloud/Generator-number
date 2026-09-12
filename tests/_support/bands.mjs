// RC2.2-1. A family now supplies only the bands it can actually compute, so a
// test may no longer assume every family answers at 'medium' or 'hard'. This
// asks the registry instead of hardcoding, which also means a later change to a
// family's capability updates every test that uses it.

import {FAMILY_MAP} from '../../src/registry.js';

const ORDER = ['easy', 'medium', 'hard'];

/**
 * A band the family really supports: the preferred one when available,
 * otherwise the nearest supported band below it, otherwise the lowest.
 */
export function supportedBand(family, preferred = 'medium') {
  const have = FAMILY_MAP[family]?.difficulties ?? [];
  if (!have.length) throw new Error(`unknown family ${family}`);
  if (have.includes(preferred)) return preferred;
  const want = ORDER.indexOf(preferred);
  for (let i = want - 1; i >= 0; i--) if (have.includes(ORDER[i])) return ORDER[i];
  for (let i = want + 1; i < ORDER.length; i++) if (have.includes(ORDER[i])) return ORDER[i];
  return have[0];
}

export const supportedBands = family => [...(FAMILY_MAP[family]?.difficulties ?? [])];

/**
 * The band a specific TEMPLATE now lives at. RC2.2 moved templates between
 * pools to match what they compute, so a test that names a template cannot
 * assume the band its id was christened with — CAL_H_LONG computes easy now.
 * Probed rather than tabulated, so it stays true after a later move.
 */
export async function bandOfTemplate(family, templateId, attempts = 400) {
  const {SeededRNG} = await import('../../src/rng.js');
  const mod = await import(`../../src/families/${family}.js`);
  const gen = Object.values(mod).find(v => typeof v === 'function' && /^generate/.test(v.name));
  for (const band of ORDER) {
    for (let i = 0; i < attempts; i++) {
      const seed = `probe-${family}-${band}-${i}`;
      try {
        const base = gen({difficulty: band, rng: new SeededRNG(seed).fork('c'), seed, engineVersion: 'probe', telemetry: null});
        if (base && base.template_id === templateId) return band;
      } catch { break; }
    }
  }
  throw new Error(`template ${templateId} is not reachable in ${family} at any band`);
}
