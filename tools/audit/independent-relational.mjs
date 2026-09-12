#!/usr/bin/env node
// MANUAL BLIND REVIEW — independent relational verifier.
//
// Written from scratch; does NOT import src/qa/relational-oracle.js. It parses
// the Arabic statements out of the published stem, enumerates every linear
// extension of the resulting partial order by brute force, and answers the
// question from that enumeration alone.

import {readFileSync} from 'node:fs';

function parseStem(stem) {
  // Only the declarative sentences count as relations. The final clause is the
  // question ("كم شخصًا نعرف يقينًا أنهم أسرع من راشد؟") and must not contribute
  // a node called أنهم.
  const body = stem.split('؟')[0].split(/كم شخصًا|أي عبارة|أي مقارنة|من صاحب/)[0];
  const edges = [];
  for (const m of body.matchAll(/([\u0621-\u064A]+)\s+(?:أسرع|أطول)\s+من\s+([\u0621-\u064A]+)/g)) {
    edges.push([m[1], m[2]]);
  }
  const nodes = [...new Set(edges.flat())];
  return {nodes, edges};
}


/** Every total order consistent with the edges. Brute force, no shortcuts. */
function linearExtensions(nodes, edges) {
  const out = [];
  const above = new Map(nodes.map(n => [n, new Set()]));
  for (const [a, b] of edges) above.get(b).add(a);
  const perm = [];
  const used = new Set();
  (function rec() {
    if (out.length > 20000) return;
    if (perm.length === nodes.length) { out.push([...perm]); return; }
    for (const n of nodes) {
      if (used.has(n)) continue;
      let ok = true;
      for (const p of above.get(n)) if (!used.has(p)) { ok = false; break; }
      if (!ok) continue;
      used.add(n); perm.push(n);
      rec();
      perm.pop(); used.delete(n);
    }
  })();
  return out;
}

const AR_COUNT = {0:'لا أحد',1:'شخص واحد',2:'شخصان',3:'ثلاثة أشخاص',4:'أربعة أشخاص',5:'خمسة أشخاص'};
const UNDET = 'لا يمكن تحديده';

const rows = readFileSync('audit-rc1/blind-audit-250.jsonl', 'utf8').trim().split('\n')
  .map(l => JSON.parse(l)).filter(r => r.family === 'relational');

for (const r of rows) {
  const {nodes, edges} = parseStem(r.stem);
  const exts = linearExtensions(nodes, edges);
  const id = `${r.sessionId}/${String(r.questionNumber).padStart(2,'0')}`;
  const strictlyAbove = (a, b) => exts.every(e => e.indexOf(a) < e.indexOf(b));
  let independent, note = '';

  if (/المركز/.test(r.stem)) {
    const posWord = {'الثالث':3,'الرابع':4,'الخامس':5,'الثاني':2,'السادس':6};
    const k = Object.entries(posWord).find(([w]) => r.stem.includes(w))?.[1];
    const occupants = [...new Set(exts.map(e => e[k-1]))];
    independent = occupants.length === 1 ? occupants[0] : UNDET;
    note = `position ${k}, occupants across ${exts.length} extensions: {${occupants.join(', ')}}`;
  } else if (/كم شخصًا/.test(r.stem)) {
    const target = /من\s+([ء-ي]+)\s*؟/.exec(r.stem)?.[1];
    const n = nodes.filter(x => x !== target && strictlyAbove(x, target)).length;
    independent = AR_COUNT[n];
    note = `certainly above ${target}: ${n} (${nodes.filter(x => x !== target && strictlyAbove(x, target)).join(', ') || 'none'}); ${exts.length} extensions`;
  } else if (/لا يمكن حسمها/.test(r.stem)) {
    const undet = [];
    for (let i = 0; i < nodes.length; i++) for (let j = i+1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      if (!strictlyAbove(a,b) && !strictlyAbove(b,a)) undet.push(`${a} و${b}`);
    }
    const opts = ['A','B','C','D','E','F'].map(l => [l, r.options[l]]);
    const matching = opts.filter(([,v]) => undet.some(u => {
      const [x,y] = u.split(' و'); return v === `${x} و${y}` || v === `${y} و${x}`;
    }));
    independent = matching.map(([l,v]) => v).join(' | ');
    note = `all undetermined pairs: {${undet.join(', ')}}; options matching: ${matching.map(([l])=>l).join(',')||'none'}`;
  } else {
    // "which statement is certain?"
    const opts = ['A','B','C','D','E','F'].map(l => [l, r.options[l]]);
    const certain = opts.filter(([,v]) => {
      const m = /([ء-ي]+)\s+(?:أسرع|أطول)\s+من\s+([ء-ي]+)/.exec(v);
      return m && strictlyAbove(m[1], m[2]);
    });
    independent = certain.map(([,v]) => v).join(' | ');
    note = `${exts.length} extensions; options certainly true: ${certain.map(([l])=>l).join(',')||'none'}`;
  }

  const publishedLetter = r.publishedKey;
  const publishedValue = r.publishedCorrectValue;
  const agree = independent === publishedValue;
  console.log(`${id}  ${r.templateId}  [${r.difficulty}]  nodes=${nodes.length} edges=${edges.length}`);
  console.log(`   independent: ${independent}`);
  console.log(`   published  : ${publishedValue}  (${publishedLetter})   ${agree ? 'AGREE' : '*** DISAGREE ***'}`);
  console.log(`   ${note}`);
}
