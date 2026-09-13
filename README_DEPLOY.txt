Numerical Generator Practice UI - Vercel Ready

The version this ships with is in generator_manifest.json and in the pill at the
top of the page; both derive from ENGINE_VERSION in src/index.js. It is not
repeated here, because a second copy is how this file came to claim v1.2.1 while
the engine was three releases past it.

1. Upload this ZIP to Vercel (or upload its extracted contents).
2. index.html must remain at the root.
3. No build command is required.
4. The Seed is internal and intentionally hidden from the user.
5. PDF export uses the browser print dialog to preserve Arabic/RTL accurately. Choose Save as PDF / PDF in the print/share workflow.
6. Engine QA: npm test (Node 18+). Everything runs with no dependencies.
7. The browser journey — the test that drives this page in a real browser and
   proves the practice journey is carried from one sitting to the next — needs
   one: npm install --no-save playwright-core, then rerun npm test with
   RC291_CHROME pointing at a Chromium. Without it that file reports "skipped"
   and says so; the rest of the suite covers the same contract without a
   browser. The full product measurement is
   node tools/audit/rc291-acceptance.mjs.
