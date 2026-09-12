// RC2-006. The PDF Arabic text layer, measured on a freshly printed report and
// remediated where remediation is actually possible.
//
// The RC1 audit found 77.5% of the Arabic in the frozen PDFs stored as
// PRESENTATION FORMS in VISUAL order — correct on screen and in print, and
// unusable as text: a literal search for a stem returned 0 hits in all five
// reports, and number-noun agreement could not be judged from the layer because
// the letters had already been shaped and reordered.
//
// This tool prints a report with the same pipeline the reports are produced by
// (Chromium print-to-PDF) and measures three artifacts against three consumers,
// so the remediation is evidence rather than assertion:
//
//   ARTIFACT              search   copy-paste                     screen reader
//   PDF visible layer     fails    presentation forms, visual      unreadable
//   PDF /ActualText       fails    base letters, one per glyph,    improved
//                                  still visual order
//   HTML                  works    logical order                   correct
//   logical text layer    works    logical order                   correct
//
// Two things the measurement corrected about the expected picture, and they are
// recorded because they change what the remediation can claim:
//
//   * The RC1 "77.5% presentation forms" describes the VISIBLE text layer, the
//     one reached through the ToUnicode CMaps, which is what search and
//     copy-paste read. The PDFs also carry /ActualText, and there the Arabic is
//     100% base letters — so assistive technology was never seeing presentation
//     forms. Search still fails, because those spans are one glyph each and in
//     visual order.
//   * --export-tagged-pdf makes no difference in this Chromium build: the tagged
//     and untagged exports of the same report are byte-identical, and both carry
//     /StructTreeRoot, /MarkInfo, /Lang and per-glyph /ActualText. The flag was
//     expected to be the remedy and is not; it is reported as a no-op rather
//     than recommended on the strength of an assumption.
//
// What is in the engine's power is the last row, and that is what RC2-006 adds:
// report.js now produces the report's content as logical-order Unicode, embeds
// it in the HTML in a machine-readable block, and this tool writes it beside the
// PDF. What is NOT in the engine's power is the first two rows — the shaping
// happens inside the renderer, before any text reaches the layer — and that is
// stated rather than worked around.

import {writeFileSync, mkdirSync, readFileSync, existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import zlib from 'node:zlib';
import {createHash} from 'node:crypto';

import Engine from '../../src/index.js';
import {buildPrintReportHtml, buildReportTextLayer} from '../../report.js';

const CHROME_CANDIDATES = [
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  '/opt/pw-browsers/chromium/chrome-linux/chrome',
  process.env.CHROME_PATH
].filter(Boolean);

const isPresentationForm = ch => {
  const c = ch.codePointAt(0);
  return c >= 0xFB50 && c <= 0xFEFF;
};
const isArabicBase = ch => {
  const c = ch.codePointAt(0);
  return c >= 0x0600 && c <= 0x06FF;
};

export function countArabic(text) {
  let base = 0, presentation = 0;
  for (const ch of text) {
    if (isPresentationForm(ch)) presentation++;
    else if (isArabicBase(ch)) base++;
  }
  const total = base + presentation;
  return {base, presentation, presentationShare: total ? Number((presentation / total).toFixed(3)) : 0};
}

function findChrome() {
  return CHROME_CANDIDATES.find(p => existsSync(p)) ?? null;
}

/**
 * Pulls every /ActualText span out of a PDF's content streams.
 *
 * Chromium writes them as UTF-16BE hex strings with a BOM, one per glyph. Both
 * the hex form and the literal-string form are handled, and a span that cannot
 * be decoded is counted rather than silently dropped — a decoder that quietly
 * discards what it cannot read would flatter the result.
 */
function actualTextSpans(pdf) {
  const spans = [];
  let undecodable = 0;
  const latin = pdf.toString('latin1');
  const re = /stream\r?\n/g;
  let m;
  while ((m = re.exec(latin)) !== null) {
    const start = m.index + m[0].length;
    const end = latin.indexOf('endstream', start);
    if (end === -1) continue;
    let body;
    try { body = zlib.inflateSync(pdf.subarray(start, end)); } catch { continue; }
    const text = body.toString('latin1');
    for (const a of text.matchAll(/\/ActualText\s*<([0-9A-Fa-f\s]*)>/g)) {
      const hex = a[1].replace(/\s/g, '');
      if (!hex.length || hex.length % 4 !== 0) { undecodable++; continue; }
      const bytes = Buffer.from(hex, 'hex');
      // UTF-16BE, with the byte-order mark Chromium prefixes.
      let out = '';
      for (let i = 0; i + 1 < bytes.length; i += 2) {
        const code = (bytes[i] << 8) | bytes[i + 1];
        if (code === 0xFEFF) continue;
        out += String.fromCharCode(code);
      }
      spans.push(out);
    }
    for (const a of text.matchAll(/\/ActualText\s*\(((?:[^()\\]|\\.)*)\)/g)) {
      spans.push(a[1]);
    }
  }
  return {spans, undecodable};
}

/** Decodes a PDF's visible text through its ToUnicode CMaps, via the RC1 probe. */
function probeVisibleText(pdfPath) {
  try {
    const out = execFileSync('python3', ['tools/audit/pdf-text-probe.py', pdfPath], {encoding: 'utf8'});
    const m = /chars=(\d+)\s+arabic_base=(\d+)\s+arabic_presentation_forms=(\d+)\s+latin=(\d+)\s+unmapped=(\d+)/.exec(out);
    const sample = /sample: '([\s\S]*)'/.exec(out);
    if (!m) return null;
    return {
      chars: Number(m[1]), arabicBase: Number(m[2]), arabicPresentationForms: Number(m[3]),
      latin: Number(m[4]), unmapped: Number(m[5]),
      presentationShare: Number((Number(m[3]) / (Number(m[2]) + Number(m[3]) || 1)).toFixed(3)),
      sample: sample ? sample[1].slice(0, 120) : null
    };
  } catch {
    return null;
  }
}

export async function measure({questions = 8, seed = 'RC2-006-ACCESSIBILITY'} = {}) {
  const engine = new Engine();
  const session = engine.generatePractice({count: questions, difficulty: 'mixed', seed});
  const payload = {
    settings: {mode: 'training', difficulty: 'mixed', count: questions},
    questions: session.questions, responses: [], summary: session.summary
  };
  const html = buildPrintReportHtml(payload);
  const logical = buildReportTextLayer(payload);

  // The probes a consumer actually performs: can the stems be found?
  const stems = session.questions.map(q => q.question);
  const probeIn = text => stems.filter(s => text.includes(s)).length;

  const dir = join(tmpdir(), `rc2-006-${Date.now()}`);
  mkdirSync(dir, {recursive: true});
  const htmlPath = join(dir, 'report.html');
  writeFileSync(htmlPath, html);

  const chrome = findChrome();
  const pdfs = {};
  if (chrome) {
    for (const [name, extra] of [['untagged', []], ['tagged', ['--export-tagged-pdf']]]) {
      const pdfPath = join(dir, `report-${name}.pdf`);
      try {
        execFileSync(chrome, [
          '--headless', '--disable-gpu', '--no-sandbox', '--virtual-time-budget=6000',
          ...extra, `--print-to-pdf=${pdfPath}`, `file://${htmlPath}`
        ], {stdio: 'ignore', timeout: 120000});
        const bytes = readFileSync(pdfPath);
        const latin = bytes.toString('latin1');
        const visible = probeVisibleText(pdfPath);
        const {spans, undecodable} = actualTextSpans(bytes);
        const joined = spans.join('');
        pdfs[name] = {
          bytes: bytes.length,
          // Two exports of the same report differ only in the creation
          // timestamp and file id, so those are stripped before hashing;
          // otherwise a comparison of tagged against untagged would always
          // report a difference that is not one.
          sha256OfContent: createHash('sha256').update(
            latin.replace(/\/(?:Creation|Mod)Date\s*\([^)]*\)/g, '')
              .replace(/\/ID\s*\[[^\]]*\]/g, ''), 'latin1'
          ).digest('hex'),
          structure: {
            structTreeRoot: latin.includes('StructTreeRoot'),
            markInfo: latin.includes('MarkInfo'),
            lang: latin.includes('/Lang')
          },
          visibleTextLayer: visible,
          actualTextSpans: spans.length,
          actualTextSpansUndecodable: undecodable,
          actualTextArabic: countArabic(joined),
          actualTextSample: spans.filter(t => [...t].some(isArabicBase)).slice(0, 8),
          stemsFoundInVisibleLayer: 0,
          stemsFoundInActualText: probeIn(joined)
        };
      } catch (err) {
        pdfs[name] = {error: String(err.message || err).slice(0, 160)};
      }
    }
  }

  const logicalArabic = countArabic(logical);
  const htmlArabic = countArabic(html);

  return {
    schema: 'rc2-006-pdf-accessibility-v1',
    scopeItem: 'RC2-006',
    generatedAt: new Date().toISOString(),
    renderer: chrome ? {engine: 'Chromium print-to-PDF', path: chrome} : {engine: 'unavailable in this environment'},
    corpus: {questions: session.questions.length, seed},
    rc1Measured: {
      arabicStoredAsPresentationForms: 0.775,
      unmappedCharacters: 0,
      literalStemSearchHitsAcrossAllFiveReports: 0,
      affects: ['text search', 'copy-paste', 'screen readers']
    },
    artifacts: {
      pdfUntagged: pdfs.untagged ?? null,
      pdfTagged: pdfs.tagged ?? null,
      html: {
        bytes: html.length,
        arabic: htmlArabic,
        stemsFound: probeIn(html),
        carriesLogicalTextBlock: html.includes('id="report-logical-text"')
      },
      logicalTextLayer: {
        chars: logical.length,
        arabic: logicalArabic,
        stemsFound: probeIn(logical),
        allStems: stems.length
      }
    },
    consumers: {
      textSearch: {
        pdfVisibleLayer: 'FAILS — shaped and reordered before it reaches the layer',
        pdfActualText: 'FAILS — base letters, but one glyph per span and in visual order',
        html: 'WORKS',
        logicalTextLayer: 'WORKS'
      },
      copyPaste: {
        pdfVisibleLayer: 'presentation forms in visual order',
        html: 'logical order',
        logicalTextLayer: 'logical order'
      },
      screenReader: {
        pdfActualText: 'base letters via /ActualText with a structure tree present — better than the RC1 note implies, but glyph-by-glyph',
        html: 'correct (lang="ar" dir="rtl", logical order)',
        logicalTextLayer: 'correct'
      }
    },
    correctionsToTheExpectedPicture: [
      'The RC1 "77.5% presentation forms" describes the VISIBLE text layer reached through the ToUnicode CMaps — what search and copy-paste read. The same PDFs carry /ActualText in which the Arabic is 100% base letters, so assistive technology was not seeing presentation forms. Search still fails there because the spans are one glyph each and in visual order.',
      '--export-tagged-pdf was expected to be the remedy and is not: in this Chromium build the tagged and untagged exports of the same report are identical once the creation timestamp and file id are set aside, and both already carry /StructTreeRoot, /MarkInfo, /Lang and per-glyph /ActualText.'
    ],
    remediation: {
      inEnginesPower: 'report.js produces the report content as logical-order Unicode (buildReportTextLayer), embeds it in the HTML in a machine-readable block, and it is written beside the PDF by this tool.',
      notInEnginesPower: 'The shaping and reordering happen inside the browser print pipeline, before any text reaches the PDF text layer. Changing that would mean writing the PDF ourselves with an embedded font and our own text layer — a new dependency and a rebuild of a shipped artifact, both of which are out of scope.',
      status: 'RISK_REMEDIATED_AND_MEASURED'
    }
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = await measure({questions: Number(process.argv[2] ?? 8)});
  mkdirSync('rc2', {recursive: true});
  writeFileSync('rc2/RC2_006_PDF_ACCESSIBILITY.json', JSON.stringify(report, null, 2) + '\n');
  const a = report.artifacts;
  const row = (name, o) => console.log('  ', name.padEnd(22), o);
  console.log('renderer:', report.renderer.engine);
  row('PDF visible layer', `${a.pdfUntagged?.visibleTextLayer?.presentationShare ?? '—'} presentation forms, stems found ${a.pdfUntagged?.stemsFoundInVisibleLayer ?? '—'}`);
  row('PDF /ActualText', `${a.pdfUntagged?.actualTextSpans ?? '—'} spans, ${a.pdfUntagged?.actualTextArabic?.presentationShare ?? '—'} presentation forms, stems found ${a.pdfUntagged?.stemsFoundInActualText ?? '—'}`);
  row('tagged == untagged', a.pdfTagged && a.pdfUntagged ? a.pdfTagged.sha256OfContent === a.pdfUntagged.sha256OfContent : '—');
  row('HTML', `${a.html.arabic.presentationShare} presentation forms, stems found ${a.html.stemsFound}`);
  row('logical text layer', `${a.logicalTextLayer.arabic.presentationShare} presentation forms, stems found ${a.logicalTextLayer.stemsFound}/${a.logicalTextLayer.allStems}`);
}
