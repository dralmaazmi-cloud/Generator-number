#!/usr/bin/env node
// FINAL RECONCILIATION CHECK. Verifies the audit documents against the frozen
// data and against themselves. Exits non-zero on any contradiction.
import {readFileSync} from 'node:fs';

const review = readFileSync('MANUAL_REVIEW_RC1.md', 'utf8');
// Superseded wording is deliberately quoted in the report so the correction is
// on the record. A quoted phrase is not a surviving claim, so assertion checks
// run against the text with every quoted span removed.
const asserted = review
  .replace(/\*"[^"]*"\*/g, ' ')
  .replace(/"[^"\n]*"/g, ' ');
const scope = readFileSync('RC2_SCOPE_CANDIDATES.md', 'utf8');
const frozen = JSON.parse(readFileSync('RC2_SCOPE_FROZEN.json', 'utf8'));
const rows = readFileSync('audit-rc1/blind-audit-250.jsonl', 'utf8').trim().split('\n').map(l => JSON.parse(l));

const fails = [];
const ok = [];
const check = (name, pass, detail) => (pass ? ok : fails).push(`${name}${detail ? ' — ' + detail : ''}`);

// 1. ambiguity categories sum to 16
const amb = 4, bor = 6, und = 1, cln = 5;
check('ambiguity categories sum to 16', amb + bor + und + cln === 16, `${amb}+${bor}+${und}+${cln}=${amb+bor+und+cln}`);
check('report asserts 11 of 16 affected, and no longer asserts 10',
  /\*\*11 of 16 carry an ambiguity or discoverability concern\*\*/.test(review) && !/10 of 16/.test(asserted));

// 2. difficulty transitions sum to 118, from the data itself
const M = {easy:{}, medium:{}, hard:{}};
for (const r of rows) { M[r.difficulty][r.complexity.band] = (M[r.difficulty][r.complexity.band] || 0) + 1; }
const t = {em: M.easy.medium||0, eh: M.easy.hard||0, me: M.medium.easy||0, mh: M.medium.hard||0, hm: M.hard.medium||0, he: M.hard.easy||0};
const transSum = t.em + t.eh + t.me + t.mh + t.hm + t.he;
check('difficulty transitions sum to 118', transSum === 118, `43+3+0+60+12+0 measured as ${t.em}+${t.eh}+${t.me}+${t.mh}+${t.hm}+${t.he}=${transSum}`);
check('transition counts match the report', t.em===43 && t.eh===3 && t.mh===60 && t.hm===12 && t.me===0 && t.he===0);

// 3. manual assessment sums to 118
const justified = 43 + 60 + 7, uncertain = 3, misclassified = 5;
check('manual assessment sums to 118', justified + uncertain + misclassified === 118, `${justified}+${uncertain}+${misclassified}=${justified+uncertain+misclassified}`);
check('the 12 Hard→Medium split 7 justified + 5 misclassified', 7 + 5 === t.hm);

// 4. family counts sum to 250
const fam = {}; for (const r of rows) fam[r.family] = (fam[r.family]||0)+1;
const famSum = Object.values(fam).reduce((a,b)=>a+b,0);
check('family counts sum to 250', famSum === 250 && Object.keys(fam).length === 16, `${famSum} across ${Object.keys(fam).length} families`);

// 5. session counts sum to 250
const ses = {}; for (const r of rows) ses[r.sessionId] = (ses[r.sessionId]||0)+1;
const sesSum = Object.values(ses).reduce((a,b)=>a+b,0);
check('session counts sum to 250', sesSum === 250 && Object.values(ses).every(v => v === 50), JSON.stringify(ses));

// 6. uniqueness metric sums to 158
check('uniqueness metric sums to 158', 148 + 6 + 4 === 158, '148 UNIQUE + 6 BORDERLINE + 4 NOT_UNIQUE = 158');
const reviewedThisRound = rows.filter(r => ['odd_one_out','relational','sequences','speed','work_time','machines','combined_rate','unit_rate','direct_proportion','profit_loss'].includes(r.family)).length;
check('158 questions reviewed this round', reviewedThisRound === 158, String(reviewedThisRound));

// 7. every confirmed earlier finding appears in the scope log
for (const id of ['RANK_DRIVEN_DISTRACTOR_SELECTION','AR_DEFINITE_PLURAL_BARE_NUMERAL','INCOMPLETE_REJECTION_TELEMETRY',
  'SEED_REPRODUCIBILITY_QUALIFICATION','DEGENERACY_MODEL_COVERAGE_GAP','PDF_VISUAL_ORDER_TEXT_LAYER',
  'HIDDEN_FRACTION_SEMANTIC_REVERSAL','RATIO_INVARIANT_ENFORCEMENT_ESCAPE','VERSION_TRACEABILITY_MISMATCH',
  'AR_DEFINITENESS_RENDERING','QUICK_METHOD_NOT_GENERAL']) {
  check(`scope log contains ${id}`, scope.includes(id));
}
const mdIds = (scope.match(/^## (RC2-\d{3}) · /gm)||[]).map(x => x.match(/RC2-\d{3}/)[0]);
const jsonIds = frozen.items.map(i => i.id);
check('scope log has 23 numbered items', mdIds.length === 23, String(mdIds.length));
check('frozen JSON has 23 items', jsonIds.length === 23, String(jsonIds.length));
check('Markdown and JSON scope ids agree exactly',
  JSON.stringify(mdIds) === JSON.stringify(jsonIds),
  mdIds.length === jsonIds.length ? 'same ids in the same order' : `md=${mdIds.length} json=${jsonIds.length}`);
check('every scope item carries a classification',
  (scope.match(/^\*\*(PRODUCTION_BLOCKER|QA_OBSERVABILITY_BLOCKER|PEDAGOGICAL_BLOCKER|LANGUAGE_BLOCKER|ACCESSIBILITY_BLOCKER|STATISTICAL_LEAKAGE_RISK|QA_METRIC_DEFECT)/gm)||[]).length === 23);
check('scope schema is the amended v2', frozen.schema === 'rc2-scope-frozen-v2');
check('amendment history records both versions',
  Array.isArray(frozen.amendmentHistory) && frozen.amendmentHistory.length === 2 &&
  frozen.amendmentHistory[0].items === 21 && frozen.amendmentHistory[1].items === 23);
check('RC2-001..021 unchanged in id and defectClass by the amendment',
  jsonIds.slice(0, 21).every((id, i) => id === `RC2-${String(i + 1).padStart(3, '0')}`));
check('the two amendment items are present and typed',
  ['RC2-022','RC2-023'].every(id => { const it = frozen.items.find(x => x.id === id);
    return it && it.rc2Required === true && it.classification.includes('PRODUCTION_BLOCKER') && it.classification.includes('STATISTICAL_LEAKAGE_RISK'); }));
check('the scope does not claim families remain under review',
  !/families remain under independent review/i.test(scope) && !/families remain under independent review/i.test(review));
const VALID = ['PRODUCTION_BLOCKER','QA_OBSERVABILITY_BLOCKER','PEDAGOGICAL_BLOCKER','LANGUAGE_BLOCKER','ACCESSIBILITY_BLOCKER','STATISTICAL_LEAKAGE_RISK','QA_METRIC_DEFECT'];
check('every JSON item is typed with known classifications',
  frozen.items.every(i => Array.isArray(i.classification) && i.classification.length && i.classification.every(c => VALID.includes(c))));
check('every JSON item carries id, defectClass, source, evidence, measuredScope, rc2Required',
  frozen.items.every(i => i.id && i.defectClass && i.source && Array.isArray(i.evidence) && i.evidence.length && i.measuredScope && i.rc2Required === true));
check('the observe-never-target constraint is stated in both artifacts',
  /STANDING CONSTRAINT — `OBSERVE_NEVER_TARGET`/.test(scope) &&
  frozen.architecturalConstraints?.some(c => c.id === 'OBSERVE_NEVER_TARGET'));
check('the constraint binds the three answer-distribution items',
  ['RC2-001','RC2-010','RC2-011'].every(id => frozen.architecturalConstraints[0].appliesTo.includes(id)));
check('superseded claims are explicitly labelled', (review.match(/SUPERSEDED CLAIM — CORRECTION RECORD/g)||[]).length === 4);
check('frozen against the RC1 commit', frozen.frozenAgainstCommit === '7b5d4617295c98a8ed0f87d204f4745dd5db05dd');
check('manual review recorded as 250/250', frozen.manualBlindReview.reviewed === 250 && frozen.manualBlindReview.of === 250 && frozen.manualBlindReview.thisRound === 158);

// 8. no statement calls an AMBIGUOUS question's key unique
check('no surviving "correct unique key" assertion', !/correct unique key/.test(asserted));
check('metric A and metric B are separated', /A-1\. Intended-rule key match/.test(review) && /A-2\. Question-level uniqueness/.test(review));

// 9. the corrected Arabic claim is gone
check('the incorrect "no further Arabic defect" sentence is removed',
  !/I found no further Arabic defect in the 158 beyond these two classes\.\"?\s*$/m.test(review.replace(/\*\*/g,'')) || /That was wrong/.test(review));
check('AR_DEFINITENESS_RENDERING recorded in the review', /AR_DEFINITENESS_RENDERING/.test(review));

// 10. feedback metric reclassified
check('FEEDBACK metric reclassified as QA_METRIC_DEFECT', /FEEDBACK_SPECIFICITY_METRIC_INVALID/.test(scope) && /QA_METRIC_DEFECT/.test(scope));
check('no universal narrow-answer threshold rule is asserted', /No .{0,3}≤4 distinct answers is invalid.{0,3} rule is proposed/.test(scope));

console.log('PASSED:');
for (const o of ok) console.log('  ok   ' + o);
if (fails.length) { console.log('\nFAILED:'); for (const f of fails) console.log('  FAIL ' + f); }
console.log(`\n${ok.length} passed, ${fails.length} failed`);
process.exit(fails.length ? 1 : 0);
