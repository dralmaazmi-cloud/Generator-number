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
 * The band a specific TEMPLATE lives at.
 *
 * RC2.3 makes this a lookup rather than a probe: the band is now decided by the
 * structural adjudication, so asking the adjudication is asking the source. The
 * probe that used to stand here inferred the band from which pool a draw landed
 * in, which was true while pools were the authority and is now one indirection
 * away from it.
 */
export async function bandOfTemplate(family, templateId) {
  const {structuralBandOf} = await import('../../src/qa/structure.js');
  const band = structuralBandOf(templateId);
  if (!supportedBands(family).includes(band)) {
    throw new Error(`template ${templateId} bands at ${band}, which ${family} does not serve`);
  }
  return band;
}
