# Numerical Generator Practice UI v1.1.0 - QA

## Scope
Standalone numerical generator only. No main application files were modified.

## User-flow changes
- Setup screen now transitions to a dedicated question-by-question session view.
- Back control moves to the previous question; on question 1 it opens the exit guard.
- Home opens the exit guard.
- Exit guard supports Save & exit, Exit without saving, and Cancel.
- Saved sessions are restored from localStorage with the exact generated questions and seeds.
- Results screen includes score, review, new session, PDF export, and advanced JSON export.
- PDF export uses a print-optimized Arabic RTL report to preserve shaping and layout.
- Adaptive mode now reacts to actual live answers and solving time instead of pre-generating one fixed difficulty.

## Automated runtime UI test
A self-contained browser test executed the real module graph in Chromium at a 390x844 mobile viewport.
- Family selector: 16 families + Random = 17 options.
- Generated session: PASS.
- 6 answer choices rendered: PASS.
- Answer check and dynamic explanation: PASS.
- Home -> exit modal: PASS.
- Save & exit -> resumable session card: PASS.
- Finish -> result view: PASS.
- Review -> 5 review items for a 5-question test: PASS.
- Browser page errors: 0.

## Generator regression
- 16 families x 3 difficulties x 50 seeds = 2,400 generated questions.
- Validation failures: 0.
- 50 mixed sessions x 10 questions = 500 session questions.
- Session validation failures: 0.
- Adaptive fast/correct sequence: medium -> medium -> medium -> hard -> hard -> hard.
- Adaptive slow/wrong sequence: medium -> medium -> medium -> easy -> easy -> easy.

## PDF verification
A completed 10-question generated session was converted through the same print-report generator.
- HTML report questions: 10.
- Chromium PDF pages: 5.
- Arabic/RTL shaping: visually verified.
- Correct/wrong option highlighting: visually verified.
- No clipping or broken glyphs observed on first and final rendered pages.

## Deployment
Package is static and Vercel-ready. `index.html` is at ZIP root. No API or build step is required.
