// RC2-006 — the PDF Arabic text layer.
//
// The RC1 audit found 77.5% of the Arabic in the frozen PDFs stored as
// presentation forms in visual order, with 0 unmapped characters and 0 literal
// stem-search hits across all five reports: correct on screen and in print, and
// unusable as text.
//
// Measuring a freshly printed report reproduces it (78.3%) and corrects two
// things about the expected picture, both of which change what can be claimed:
//
//   * the 77.5% describes the VISIBLE layer, reached through the ToUnicode
//     CMaps, which is what search and copy-paste read. The same PDFs carry
//     /ActualText in which the Arabic is 100% base letters, so assistive
//     technology was not seeing presentation forms. Search still fails there,
//     because those spans are one glyph each and in visual order;
//   * --export-tagged-pdf was expected to be the remedy and is a no-op: the two
//     exports are identical once the timestamp is set aside.
//
// The shaping happens inside the renderer, before any text reaches the layer, so
// the remediation is to produce the logical text ourselves and ship it with the
// report. These tests hold that layer to being genuinely logical and genuinely
// complete.

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

import Engine from '../src/index.js';
import {buildPrintReportHtml, buildReportTextLayer} from '../report.js';
import {countArabic} from '../tools/audit/rc2-006-pdf-accessibility.mjs';

// Printing a PDF spawns Chromium, and two tests each spawning one can contend
// under the runner's parallelism — a flaky sign-off suite is worse than a slow
// one. The measurement is taken once and shared by the tests that need it.
let measurementPromise = null;
async function measureOnce() {
  if (!measurementPromise) {
    const {measure} = await import('../tools/audit/rc2-006-pdf-accessibility.mjs');
    measurementPromise = measure({questions: 5, seed: 'rc2-006-measure'});
  }
  return measurementPromise;
}

function session(count = 6, seed = 'rc2-006-test') {
  const engine = new Engine();
  const s = engine.generatePractice({count, difficulty: 'mixed', seed});
  return {settings: {mode: 'training', difficulty: 'mixed', count}, questions: s.questions, responses: [], summary: s.summary};
}

// --- the layer is logical ---------------------------------------------------

test('RC2-006: the logical text layer contains no presentation forms', () => {
  const text = buildReportTextLayer(session());
  const a = countArabic(text);
  assert.equal(a.presentation, 0, 'presentation forms must not appear in a logical layer');
  assert.ok(a.base > 500, `the layer must actually carry Arabic, saw ${a.base}`);
});

test('RC2-006: every stem, option and explanation is searchable in it', () => {
  const s = session(8);
  const text = buildReportTextLayer(s);
  for (const q of s.questions) {
    assert.ok(text.includes(q.question), `stem missing: ${q.question.slice(0, 40)}`);
    assert.ok(text.includes(String(q.correct_value)), `key missing for ${q.generator_id}`);
    for (const v of Object.values(q.options)) {
      assert.ok(text.includes(String(v)), `option missing: ${v}`);
    }
    for (const step of q.explanation.steps) {
      assert.ok(text.includes(step), `step missing for ${q.generator_id}`);
    }
    assert.ok(text.includes(q.explanation.remember));
  }
});

test('RC2-006: the layer is in logical order, not reversed', () => {
  const s = session(4);
  const text = buildReportTextLayer(s);
  // A reversed layer would contain the reversed stem and not the stem itself.
  const stem = s.questions[0].question;
  const reversed = [...stem].reverse().join('');
  assert.ok(text.includes(stem));
  assert.ok(!text.includes(reversed), 'the layer must not be visual-order');
});

test('RC2-006: the printed HTML carries the layer in a machine-readable block', () => {
  const s = session(5);
  const html = buildPrintReportHtml(s);
  const m = /<script type="application\/json" id="report-logical-text">([\s\S]*?)<\/script>/.exec(html);
  assert.ok(m, 'the block must be present');
  const parsed = JSON.parse(m[1].replace(/\\u003c/g, '<'));
  assert.equal(parsed.schema, 'rc2-006-logical-text-layer-v1');
  assert.equal(parsed.text, buildReportTextLayer(s), 'the embedded layer must be the layer');
  assert.ok(parsed.note.length > 40, 'and must say what it is for');
});

test('RC2-006 meta: the block cannot break out of the script element', () => {
  // A stem containing </script> would end the block early and corrupt the page.
  const s = session(3);
  s.questions[0] = {...s.questions[0], question: 'ما قيمة </script><img src=x> العدد؟'};
  const html = buildPrintReportHtml(s);
  const blocks = html.match(/<script type="application\/json" id="report-logical-text">/g) || [];
  assert.equal(blocks.length, 1);
  const m = /<script type="application\/json" id="report-logical-text">([\s\S]*?)<\/script>/.exec(html);
  const parsed = JSON.parse(m[1].replace(/\\u003c/g, '<'));
  assert.ok(parsed.text.includes('</script>'), 'the content survives intact');
});

// --- the measurement --------------------------------------------------------

test('RC2-006: the defect is reproduced and the remediation measured', async () => {
  const report = await measureOnce();
  if (report.renderer.engine === 'unavailable in this environment') {
    // The logical layer is still checkable without a renderer, and is.
    assert.equal(report.artifacts.logicalTextLayer.arabic.presentation, 0);
    return;
  }
  const pdf = report.artifacts.pdfUntagged;
  assert.ok(pdf && pdf.visibleTextLayer, 'a PDF must have been produced');

  // The RC1 finding, reproduced on a freshly printed report.
  assert.ok(pdf.visibleTextLayer.presentationShare > 0.6,
    `visible layer presentation share ${pdf.visibleTextLayer.presentationShare}`);
  assert.equal(pdf.visibleTextLayer.unmapped, 0, 'the v1.2.0 failure mode stays absent');
  assert.equal(pdf.stemsFoundInVisibleLayer, 0, 'and the layer still cannot be searched');

  // The correction: /ActualText carries base letters, and still cannot be searched.
  assert.ok(pdf.actualTextSpans > 100);
  assert.equal(pdf.actualTextSpansUndecodable, 0, 'a decoder that drops what it cannot read would flatter this');
  assert.equal(pdf.actualTextArabic.presentation, 0, 'assistive text is base letters, not presentation forms');
  assert.equal(pdf.stemsFoundInActualText, 0, 'but glyph-by-glyph in visual order, so search still fails');

  // The remediation.
  assert.equal(report.artifacts.logicalTextLayer.arabic.presentation, 0);
  assert.equal(report.artifacts.logicalTextLayer.stemsFound, report.artifacts.logicalTextLayer.allStems);
  assert.equal(report.artifacts.html.stemsFound, report.artifacts.logicalTextLayer.allStems);
  assert.equal(report.artifacts.html.carriesLogicalTextBlock, true);
});

test('RC2-006: the tagged export is recorded as the no-op it measured as', async () => {
  const report = await measureOnce();
  if (!report.artifacts.pdfTagged || !report.artifacts.pdfUntagged) return;
  assert.equal(
    report.artifacts.pdfTagged.sha256OfContent,
    report.artifacts.pdfUntagged.sha256OfContent,
    'the flag was expected to help and does not; the claim must match the measurement'
  );
  for (const key of ['structTreeRoot', 'markInfo', 'lang']) {
    assert.equal(report.artifacts.pdfUntagged.structure[key], true,
      `${key} is present without the flag`);
  }
});

test('RC2-006: the published artifact states what each consumer gets', () => {
  const saved = JSON.parse(readFileSync('rc2/RC2_006_PDF_ACCESSIBILITY.json', 'utf8'));
  assert.equal(saved.schema, 'rc2-006-pdf-accessibility-v1');
  assert.equal(saved.remediation.status, 'RISK_REMEDIATED_AND_MEASURED');
  assert.equal(saved.rc1Measured.arabicStoredAsPresentationForms, 0.775);
  assert.equal(saved.rc1Measured.literalStemSearchHitsAcrossAllFiveReports, 0);
  // The limitation that remains must be stated, not omitted.
  assert.ok(saved.remediation.notInEnginesPower.length > 80);
  assert.equal(saved.correctionsToTheExpectedPicture.length, 2);
  for (const consumer of ['textSearch', 'copyPaste', 'screenReader']) {
    assert.ok(saved.consumers[consumer], `${consumer} must be answered`);
  }
});
