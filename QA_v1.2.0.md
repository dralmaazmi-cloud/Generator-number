# QA — Numerical Generator Engine v1.2.1

## نطاق الفحص

الإصدار مستقل وغير مدمج بالتطبيق الرئيسي.

### فحوص المحرك
- 16 عائلة × 3 مستويات × 100 seed = **4,800 سؤال منفرد**.
- النتيجة: **0 فشل Validation**.
- 120 جلسة مختلطة × 14 سؤالًا = **1,680 سؤالًا إضافيًا**.
- كل الجلسات: `validation.valid = true`.
- 100 سؤال تكيفي متسلسل مع تاريخ أداء متغير: **PASS**.
- اختبار تقرير الطباعة: يولّد HTML عربي RTL، ويعرض نمط تدريب/امتحان، ولا يعرض الـSeed للمستخدم.

### فحوص البنية
- جميع imports النسبية تشير إلى ملفات موجودة.
- `app.js`, `report.js`, `src/index.js`: اجتازت `node --check`.
- جميع معرفات DOM الثابتة المستخدمة في `app.js` موجودة في `index.html`.
- لا توجد IDs مكررة في HTML.

## الوظائف المنفذة
- Training / Exam separation.
- Multi-family selection + balanced random distribution.
- Adaptive training only.
- Optional countdown timer + auto-finish.
- Save / resume / discard.
- Weak-area selection using persisted local statistics.
- Mistake-focused practice.
- Same-idea follow-up question.
- Favorites.
- Same-settings / harder / easier follow-up sessions.
- Result analytics by family and difficulty.
- PDF print report + advanced JSON export.
- Seed hidden from UI and PDF.

## ملاحظة
سلامة البرمجة والحساب والتحقق البنيوي مثبتة في هذه الاختبارات. المعايرة السيكومترية الفعلية (difficulty/discrimination/time norms) تحتاج بيانات مستخدمين بعد الاستخدام الحقيقي.
