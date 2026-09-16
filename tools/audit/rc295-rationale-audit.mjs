#!/usr/bin/env node
// RC2.9.5 §1.1. D1 as a MEASURED NUMBER.
//
// RC2.9.4 reported D1 as a zero. An independent scan of 4,000 wrong options
// found 22 reason sentences spanning four or more families, several of them
// naming an operation, and two that are false where they land. This measures
// the same things the reviewer measured, on the engine as it stands:
//
//   1. how many distinct reason sentences span >= 4 families;
//   2. which of those name an operation (a verb the learner is said to have
//      performed, or an operation noun the sentence says the solution needs);
//   3. how many rendered reasons name an operation THE SOLUTION DOES NOT USE
//      (measured against the question's own operation profile, which is what
//      RC2.9.4 never checked — it only checked the DERIVATION);
//   4. how many still contradict their derivation (RC2.9.4's own check).
//
// Usage: node tools/audit/rc295-rationale-audit.mjs [questions] [out.json]

import Engine from '../../src/index.js';
import {rationaleProblems, claimedOperations, solutionClaims, FAMILY_NEUTRAL, namesAnOperation, FACTUAL_FALLBACK, FACTUAL_FALLBACK_VARIANTS}
  from '../../src/qa/rationale.js';

const [N = '900', OUT = 'rc2/RC295_D1_AUDIT.json'] = process.argv.slice(2);

const engine = new Engine();
const families = engine.listFamilies().map(f => f.id);
const BANDS = ['easy', 'medium', 'hard'];

/** The sentence after the «اخترت …» head, which is the reason proper. */
export function reasonSentence(text) {
  const split = /^(اخترت [^]*?(?:، وهي ناتج [^]*?)?\.)\s+([^]*)$/u.exec(String(text ?? ''));
  return split ? split[2].trim() : String(text ?? '').trim();
}

const rows = [];
let drawn = 0, options = 0;
outer:
for (let i = 0; i < Number(N); i++) {
  for (const band of BANDS) {
    const family = families[i % families.length];
    let q;
    try { q = engine.generateQuestion({family, difficulty: band, seed: `rc295-d1|${band}|${family}|${i}`}); }
    catch { continue; }
    drawn++;
    const meta = q.metadata.options_meta ?? {};
    for (const [letter, m] of Object.entries(meta)) {
      if (m.correct) continue;
      const text = q.explanation?.distractor_analysis?.[letter];
      const sentence = reasonSentence(text);
      options++;
      rows.push({
        family: q.family, templateId: q.metadata.template_id, band,
        misconceptionId: m.misconceptionId, derivation: m.derivation, sentence,
        solutionOperations: q.metadata.operation_kinds ?? [],
        derivationProblems: rationaleProblems({
          text, derivation: m.derivation, family: q.family, value: m.value, optionText: q.options?.[letter]
        }),
        claimedDid: [...claimedOperations(sentence)],
        claimedSolution: [...solutionClaims(sentence)]
      });
      if (options >= 4000) break outer;
    }
  }
}

const bySentence = new Map();
for (const r of rows) {
  if (!bySentence.has(r.sentence)) bySentence.set(r.sentence, {sentence: r.sentence, families: new Set(), uses: 0, ids: new Set()});
  const e = bySentence.get(r.sentence);
  e.families.add(r.family); e.uses++; e.ids.add(r.misconceptionId);
}
const spread = [...bySentence.values()]
  .map(e => ({sentence: e.sentence, families: [...e.families].sort(), familyCount: e.families.size,
    uses: e.uses, ids: [...e.ids], namesOperation: namesAnOperation(e.sentence)}))
  .sort((a, b) => b.familyCount - a.familyCount || b.uses - a.uses);

const wide = spread.filter(s => s.familyCount >= 4);
const wideNamingOperation = wide.filter(s => s.namesAnOperation ?? s.namesOperation);
// The factual fallback is not a reason: it is what is shown when no reason can
// be given truthfully. It is reported on its own rather than counted as a
// family-neutral sentence.
// RC2.9.6 §3.2. The fallback is now rendered per family, so any of its
// variants counts as the fallback rather than as an undeclared wide sentence.
const FALLBACKS = new Set([FACTUAL_FALLBACK, ...Object.values(FACTUAL_FALLBACK_VARIANTS)]);
const undeclared = wide.filter(s => !FAMILY_NEUTRAL.includes(s.sentence) && !FALLBACKS.has(s.sentence));
const fallbackUses = rows.filter(r => FALLBACKS.has(r.sentence)).length;

const falseSolutionClaim = rows.filter(r =>
  r.claimedSolution.some(op => !r.solutionOperations.includes(op)));
const derivationContradictions = rows.filter(r => r.derivationProblems.length);

const report = {
  drawnQuestions: drawn,
  wrongOptions: options,
  distinctSentences: spread.length,
  sentencesSpanningFourOrMoreFamilies: wide.length,
  ofThoseNamingAnOperation: wideNamingOperation.length,
  ofThoseNotInTheDeclaredNeutralSet: undeclared.length,
  declaredNeutralSet: FAMILY_NEUTRAL,
  declaredNeutralSetSize: FAMILY_NEUTRAL.length,
  declaredNeutralSentencesNamingAnOperation: FAMILY_NEUTRAL.filter(namesAnOperation),
  factualFallbackUses: fallbackUses,
  factualFallbackRate: Number((100 * fallbackUses / Math.max(1, options)).toFixed(2)),
  reasonsNamingAnOperationTheSolutionDoesNotUse: falseSolutionClaim.length,
  reasonsContradictingTheirDerivation: derivationContradictions.length,
  wideSentences: wide,
  falseSolutionClaimExamples: falseSolutionClaim.slice(0, 20).map(r => ({
    family: r.family, templateId: r.templateId, misconceptionId: r.misconceptionId,
    derivation: r.derivation, sentence: r.sentence,
    claimedSolutionOperations: r.claimedSolution, solutionOperations: r.solutionOperations
  })),
  derivationContradictionExamples: derivationContradictions.slice(0, 10)
};

const {writeFileSync} = await import('node:fs');
writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n');

console.log(`questions drawn                                   : ${drawn}`);
console.log(`wrong options scanned                             : ${options}`);
console.log(`distinct reason sentences                         : ${spread.length}`);
console.log(`sentences spanning >= 4 families                  : ${wide.length}`);
console.log(`  of those naming an operation                    : ${wideNamingOperation.length}`);
console.log(`  of those outside the declared neutral set       : ${undeclared.length}`);
console.log(`declared family-neutral set                       : ${FAMILY_NEUTRAL.length} sentences, ${report.declaredNeutralSentencesNamingAnOperation.length} naming an operation`);
console.log(`no truthful reason available, factual line shown : ${fallbackUses} (${report.factualFallbackRate}% of wrong options)`);
console.log(`reasons naming an operation the SOLUTION does not use : ${falseSolutionClaim.length}`);
console.log(`reasons contradicting their own derivation        : ${derivationContradictions.length}`);
console.log(`\nwidest sentences:`);
for (const s of wide.slice(0, 25)) console.log(`${String(s.familyCount).padStart(2)} families ${s.namesOperation ? 'OP ' : '   '} ${s.uses.toString().padStart(4)} uses  ${s.sentence}`);
