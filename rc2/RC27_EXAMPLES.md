# RC2.7 — verbatim human-review examples

For every family, the three construction groups that recur most, with up to
3 questions from each rendered exactly as a candidate would see them. If a group
reads as one question asked repeatedly, that is visible here and nowhere in a
summary statistic.

## sequences — المتتاليات العددية

Sampled 360 questions across easy, medium, hard; 25 distinct constructions, largest group 26.

### family:sequences|scenario:digit_product_step|asks:nextTerm|direction:forward

- occurrences in the sample: **26** of 360
- reasoning signature: `{askedUnknown:nextTerm,family:sequences,pattern:[DIGIT_PRODUCT,ADD],reasoningDirection:nextTerm,templateId:SEQ_H_DIGIT_PRODUCT}`
- requested target: `nextTerm`
- scenario: `sequences/digit_product_step`
- stem skeleton: `ما العدد التالي في المتتالية؟`

> ما العدد التالي في المتتالية؟
> 
> `21، 23، 29، 47، 75، ؟`
>
> — SEQ_H_DIGIT_PRODUCT · hard · fixed/given · answer B) 110

> ما العدد التالي في المتتالية؟
> 
> `16، 22، 26، 38، 62، ؟`
>
> — SEQ_H_DIGIT_PRODUCT · hard · fixed/given · answer E) 74

> ما العدد التالي في المتتالية؟
> 
> `16، 22، 26، 38، 62، ؟`
>
> — SEQ_H_DIGIT_PRODUCT · hard · fixed/given · answer B) 74

### family:sequences|scenario:SEQ_E_GEO|asks:nextTerm|direction:forward

- occurrences in the sample: **24** of 360
- reasoning signature: `{askedUnknown:nextTerm,family:sequences,pattern:[MUL(2)],reasoningDirection:nextTerm,templateId:SEQ_E_GEO}`
- requested target: `nextTerm`
- scenario: `sequences/SEQ_E_GEO`
- stem skeleton: `ما العدد التالي في المتتالية؟`

> ما العدد التالي في المتتالية؟
> 
> `5، 10، 20، 40، 80، ؟`
>
> — SEQ_E_GEO · easy · fixed/given · answer E) 160

> ما العدد التالي في المتتالية؟
> 
> `4، 12، 36، 108، ؟`
>
> — SEQ_E_GEO · easy · fixed/given · answer C) 324

> ما العدد التالي في المتتالية؟
> 
> `162، 54، 18، 6، ؟`
>
> — SEQ_E_GEO · easy · fixed/given · answer E) 2

### family:sequences|scenario:SEQ_E_GEO|asks:missingMiddleTerm|direction:forward

- occurrences in the sample: **23** of 360
- reasoning signature: `{askedUnknown:missingMiddleTerm,family:sequences,pattern:[DIV(2)],reasoningDirection:missingMiddleTerm,templateId:SEQ_E_GEO}`
- requested target: `missingMiddleTerm`
- scenario: `sequences/SEQ_E_GEO`
- stem skeleton: `ما العدد المفقود في المتتالية؟`

> ما العدد المفقود في المتتالية؟
> 
> `160، 80، ؟، 20، 10`
>
> — SEQ_E_GEO · easy · fixed/given · answer E) 40

> ما العدد المفقود في المتتالية؟
> 
> `2، 4، ؟، 16، 32`
>
> — SEQ_E_GEO · easy · fixed/given · answer E) 8

> ما العدد المفقود في المتتالية؟
> 
> `2، 6، ؟، 54`
>
> — SEQ_E_GEO · easy · fixed/given · answer E) 18

## ratios — النسب وتقسيم الكميات

Sampled 360 questions across easy, medium, hard; 11 distinct constructions, largest group 62.

### family:ratios|scenario:RAT_M_ADD_SIDE|asks:sumBeforeChange|direction:forward

- occurrences in the sample: **62** of 360
- reasoning signature: `{askedUnknown:sumBeforeChange,derivedFrom:operationKinds,family:ratios,operationKinds:[add,ratio,multiply,subtract,divide],reasoningDirection:sumBeforeChange,templateId:RAT_M_ADD_SIDE}`
- requested target: `sumBeforeChange`
- scenario: `ratios/RAT_M_ADD_SIDE`
- stem skeleton: `النسبة بين أ : ب = # : #. أُضيفت # وحدات إلى ب فأصبحت النسبة أ : ب = # : #. فما مجموع أ + ب قبل الإضافة؟`

> النسبة بين أ : ب = 2 : 1. أُضيفت 8 وحدات إلى ب فأصبحت النسبة أ : ب = 2 : 3. فما مجموع أ + ب قبل الإضافة؟
>
> — RAT_M_ADD_SIDE · medium · sequential/given · answer E) 12

> النسبة بين أ : ب = 2 : 1، وأُضيفت 4 وحدات إلى ب فأصبحت النسبة أ : ب = 2 : 3. فما مجموع أ + ب قبل الإضافة؟
>
> — RAT_M_ADD_SIDE · medium · compact/given · answer A) 6

> النسبة بين أ : ب = 5 : 2، وأُضيفت 4 وحدات إلى ب فأصبحت النسبة أ : ب = 5 : 3. فما مجموع أ + ب قبل الإضافة؟
>
> — RAT_M_ADD_SIDE · medium · compact/given · answer E) 28

### family:ratios|scenario:RAT_E_SPLIT|asks:sideB|direction:forward

- occurrences in the sample: **43** of 360
- reasoning signature: `{askedUnknown:sideB,derivedFrom:operationKinds,family:ratios,operationKinds:[add,divide,multiply],reasoningDirection:sideB,templateId:RAT_E_SPLIT}`
- requested target: `sideB`
- scenario: `ratios/RAT_E_SPLIT`
- stem skeleton: `النسبة بين أ : ب = # : #. إذا كان مجموعهما #، فما قيمة ب؟`

> النسبة بين أ : ب = 1 : 5. إذا كان مجموعهما 36، فما قيمة ب؟
>
> — RAT_E_SPLIT · easy · compact/given · answer C) 30

> النسبة بين أ : ب = 5 : 7. إذا كان مجموعهما 60، فما قيمة ب؟
>
> — RAT_E_SPLIT · easy · compact/given · answer F) 35

> النسبة بين أ : ب = 1 : 6. إذا كان مجموعهما 63، فما قيمة ب؟
>
> — RAT_E_SPLIT · easy · compact/given · answer B) 54

### family:ratios|scenario:RAT_H_TWO_COMB|asks:thirdTerm|direction:forward

- occurrences in the sample: **33** of 360
- reasoning signature: `{askedUnknown:thirdTerm,derivedFrom:operationKinds,family:ratios,operationKinds:[multiply,ratio,add,divide],reasoningDirection:thirdTerm,templateId:RAT_H_TWO_COMB}`
- requested target: `thirdTerm`
- scenario: `ratios/RAT_H_TWO_COMB`
- stem skeleton: `النسبة أ : ب = # : #، والنسبة ب : ج = # : #. إذا كان أ + ب = #، فما قيمة ج؟`

> النسبة أ : ب = 1 : 2، والنسبة ب : ج = 4 : 5. إذا كان أ + ب = 72، فما قيمة ج؟
>
> — RAT_H_TWO_COMB · hard · sequential/given · answer E) 60

> النسبة أ : ب = 3 : 4، والنسبة ب : ج = 3 : 5. إذا كان أ + ب = 42، فما قيمة ج؟
>
> — RAT_H_TWO_COMB · hard · compact/given · answer B) 40

> النسبة أ : ب = 2 : 3، والنسبة ب : ج = 6 : 5. إذا كان أ + ب = 180، فما قيمة ج؟
>
> — RAT_H_TWO_COMB · hard · compact/given · answer D) 90

## percentages — النسب المئوية

Sampled 360 questions across easy, medium, hard; 9 distinct constructions, largest group 120.

### family:percentages|scenario:PCT_H_TWO_GROUP_CHANGE|asks:firstGroupSize|direction:forward

- occurrences in the sample: **120** of 360
- reasoning signature: `{askedUnknown:firstGroupSize,derivedFrom:operationKinds,family:percentages,operationKinds:[multiply,divide,subtract,percent,add,ratio],reasoningDirection:firstGroupSize,templateId:PCT_H_TWO_GROUP_CHANGE}`
- requested target: `firstGroupSize`
- scenario: `percentages/PCT_H_TWO_GROUP_CHANGE`
- stem skeleton: `في مؤسسة قسمان، مجموع أفرادهما # شخصًا. ارتفع عدد أفراد القسم الأول بنسبة #% وانخفض عدد أفراد القسم الثاني بنسبة #%، فأصبح المجموع # شخصًا. كم كان عدد أفراد الق`

> في مؤسسة قسمان، مجموع أفرادهما 200 شخصًا. ارتفع عدد أفراد القسم الأول بنسبة 20% وانخفض عدد أفراد القسم الثاني بنسبة 20%، فأصبح المجموع 192 شخصًا. كم كان عدد أفراد القسم الأول؟
>
> — PCT_H_TWO_GROUP_CHANGE · hard · sequential/given · answer D) 80 شخصًا

> المعطيات: في مؤسسة قسمان، مجموع أفرادهما 300 شخصًا؛ ارتفع عدد أفراد القسم الأول بنسبة 20% وانخفض عدد أفراد القسم الثاني بنسبة 25%، فأصبح المجموع 279 شخصًا. كم كان عدد أفراد القسم الأول؟
>
> — PCT_H_TWO_GROUP_CHANGE · hard · listed/given · answer A) 120 شخصًا

> المعطيات: في مؤسسة قسمان، مجموع أفرادهما 400 شخصًا؛ ارتفع عدد أفراد القسم الأول بنسبة 40% وانخفض عدد أفراد القسم الثاني بنسبة 5%، فأصبح المجموع 452 شخصًا. كم كان عدد أفراد القسم الأول؟
>
> — PCT_H_TWO_GROUP_CHANGE · hard · listed/given · answer E) 160 شخصًا

### family:percentages|scenario:PCT_M_REMAIN|asks:remainingAfterTwoStages|direction:forward

- occurrences in the sample: **53** of 360
- reasoning signature: `{askedUnknown:remainingAfterTwoStages,derivedFrom:operationKinds,family:percentages,operationKinds:[multiply,divide,subtract],reasoningDirection:remainingAfterTwoStages,templateId:PCT_M_REMAIN}`
- requested target: `remainingAfterTwoStages`
- scenario: `percentages/PCT_M_REMAIN`
- stem skeleton: `في مجموعة عددها #، غاب #% منهم، ثم غادر #% من الموجودين بعد ذلك. كم بقي؟`

> في مجموعة عددها 200، غاب 40% منهم، ثم غادر 20% من الموجودين بعد ذلك. كم بقي؟
>
> — PCT_M_REMAIN · easy · sequential/given · answer E) 96

> في مجموعة عددها 200، غاب 40% منهم، ثم غادر 25% من الموجودين بعد ذلك. كم بقي؟
>
> — PCT_M_REMAIN · easy · compact/given · answer B) 90

> في مجموعة عددها 200، غاب 20% منهم، ثم غادر 20% من الموجودين بعد ذلك. كم بقي؟
>
> — PCT_M_REMAIN · easy · compact/given · answer D) 128

### family:percentages|scenario:PCT_M_UNIT_PRICE|asks:scaledCostAfterIncrease|direction:forward

- occurrences in the sample: **36** of 360
- reasoning signature: `{askedUnknown:scaledCostAfterIncrease,derivedFrom:operationKinds,family:percentages,operationKinds:[divide,add,multiply],reasoningDirection:scaledCostAfterIncrease,templateId:PCT_M_UNIT_PRICE}`
- requested target: `scaledCostAfterIncrease`
- scenario: `percentages/PCT_M_UNIT_PRICE`
- stem skeleton: `ثمن # وحدات هو # درهمًا. إذا ارتفع سعر الوحدة بمقدار #% من القيمة السابقة، فما ثمن # وحدات بعد الزيادة؟`

> ثمن 5 وحدات هو 40 درهمًا. إذا ارتفع سعر الوحدة بمقدار 20% من القيمة السابقة، فما ثمن 10 وحدات بعد الزيادة؟
>
> — PCT_M_UNIT_PRICE · easy · compact/given · answer B) 96 درهمًا

> ثمن 5 وحدات هو 50 درهمًا. إذا ارتفع سعر الوحدة بمقدار 50% من القيمة السابقة، فما ثمن 15 وحدة بعد الزيادة؟
>
> — PCT_M_UNIT_PRICE · easy · sequential/given · answer A) 225 درهمًا

> ثمن 8 وحدات هو 80 درهمًا. إذا ارتفع سعر الوحدة بمقدار 10% من القيمة السابقة، فما ثمن 12 وحدة بعد الزيادة؟
>
> — PCT_M_UNIT_PRICE · easy · sequential/given · answer B) 132 درهمًا

## averages — المتوسط الحسابي

Sampled 360 questions across easy, medium, hard; 60 distinct constructions, largest group 23.

### family:averages|scenario:library_pages|asks:overlappingValue|direction:forward

- occurrences in the sample: **23** of 360
- reasoning signature: `{askedUnknown:overlappingValue,derivedFrom:operationKinds,family:averages,operationKinds:[multiply,add,ratio,subtract],reasoningDirection:overlappingValue,templateId:AVG_H_OVERLAP}`
- requested target: `overlappingValue`
- scenario: `averages/library_pages`
- stem skeleton: `المعطيات: متوسط الصفحات كلها في سجل عدد صفحات # كتابًا هو # صفحة؛ متوسط أول # كتب في السجل هو # صفحة؛ متوسط آخر # كتب فيه هو # صفحة. فما عدد صفحات الكتاب الذي ي`

> المعطيات: متوسط الصفحات كلها في سجل عدد صفحات 11 كتابًا هو 22 صفحة؛ متوسط أول 6 كتب في السجل هو 18 صفحة؛ متوسط آخر 6 كتب فيه هو 24 صفحة. فما عدد صفحات الكتاب الذي يقع في الموضع الأوسط من السجل؟
>
> — AVG_H_OVERLAP · hard · listed/given · answer F) 10 صفحات

> متوسط الصفحات كلها في سجل عدد صفحات 7 كتب هو 18 صفحة، ومتوسط أول 4 كتب في السجل هو 28 صفحة، ومتوسط آخر 4 كتب فيه هو 11 صفحة. فما عدد صفحات الكتاب الذي يقع في الموضع الأوسط من السجل؟
>
> — AVG_H_OVERLAP · hard · compact/given · answer E) 30 صفحة

> متوسط الصفحات كلها في سجل عدد صفحات 11 كتابًا هو 13 صفحة. متوسط أول 6 كتب في السجل هو 15 صفحة. متوسط آخر 6 كتب فيه هو 16 صفحة. فما عدد صفحات الكتاب الذي يقع في الموضع الأوسط من السجل؟
>
> — AVG_H_OVERLAP · hard · sequential/given · answer D) 43 صفحة

### family:averages|scenario:daily_visitors|asks:overlappingValue|direction:forward

- occurrences in the sample: **22** of 360
- reasoning signature: `{askedUnknown:overlappingValue,derivedFrom:operationKinds,family:averages,operationKinds:[multiply,add,ratio,subtract],reasoningDirection:overlappingValue,templateId:AVG_H_OVERLAP}`
- requested target: `overlappingValue`
- scenario: `averages/daily_visitors`
- stem skeleton: `متوسط أعداد الزوار كلها في سجل عدد الزوار في # أيام هو # زائرًا. متوسط أول # أيام في السجل هو # زائرًا. متوسط آخر # أيام فيه هو # زائرًا. فما عدد زوار اليوم الذ`

> متوسط أعداد الزوار كلها في سجل عدد الزوار في 5 أيام هو 17 زائرًا. متوسط أول 3 أيام في السجل هو 19 زائرًا. متوسط آخر 3 أيام فيه هو 12 زائرًا. فما عدد زوار اليوم الذي يقع في الموضع الأوسط من السجل؟
>
> — AVG_H_OVERLAP · hard · sequential/given · answer C) 8 زوار

> المطلوب: عدد زوار اليوم الذي يقع في الموضع الأوسط من السجل. المعطيات: متوسط أعداد الزوار كلها في سجل عدد الزوار في 9 أيام هو 13 زائرًا؛ متوسط أول 5 أيام في السجل هو 12 زائرًا؛ متوسط آخر 5 أيام فيه هو 17 زائرًا.
>
> — AVG_H_OVERLAP · hard · question_first/given · answer D) 28 زائرًا

> متوسط أعداد الزوار كلها في سجل عدد الزوار في 5 أيام هو 14 زائرًا، ومتوسط أول 3 أيام في السجل هو 16 زائرًا، ومتوسط آخر 3 أيام فيه هو 15 زائرًا. فما عدد زوار اليوم الذي يقع في الموضع الأوسط من السجل؟
>
> — AVG_H_OVERLAP · hard · compact/given · answer D) 23 زائرًا

### family:averages|scenario:warehouse_weights|asks:overlappingValue|direction:forward

- occurrences in the sample: **19** of 360
- reasoning signature: `{askedUnknown:overlappingValue,derivedFrom:operationKinds,family:averages,operationKinds:[multiply,add,ratio,subtract],reasoningDirection:overlappingValue,templateId:AVG_H_OVERLAP}`
- requested target: `overlappingValue`
- scenario: `averages/warehouse_weights`
- stem skeleton: `المعطيات: متوسط الأوزان كلها في سجل أوزان # صناديق هو # كيلوجرامًا؛ متوسط أول # صناديق في السجل هو # كيلوجرامًا؛ متوسط آخر # صناديق فيه هو # كيلوجرامًا. فما وزن`

> المعطيات: متوسط الأوزان كلها في سجل أوزان 7 صناديق هو 20 كيلوجرامًا؛ متوسط أول 4 صناديق في السجل هو 14 كيلوجرامًا؛ متوسط آخر 4 صناديق فيه هو 28 كيلوجرامًا. فما وزن الصندوق الذي يقع في الموضع الأوسط من السجل؟
>
> — AVG_H_OVERLAP · hard · listed/given · answer F) 28 كيلوجرامًا

> المعطيات: متوسط الأوزان كلها في سجل أوزان 5 صناديق هو 23 كيلوجرامًا؛ متوسط أول 3 صناديق في السجل هو 26 كيلوجرامًا؛ متوسط آخر 3 صناديق فيه هو 16 كيلوجرامًا. فما وزن الصندوق الذي يقع في الموضع الأوسط من السجل؟
>
> — AVG_H_OVERLAP · hard · listed/given · answer C) 11 كيلوجرامًا

> متوسط الأوزان كلها في سجل أوزان 7 صناديق هو 13 كيلوجرامًا. متوسط أول 4 صناديق في السجل هو 14 كيلوجرامًا. متوسط آخر 4 صناديق فيه هو 9 كيلوجرامات. فما وزن الصندوق الذي يقع في الموضع الأوسط من السجل؟
>
> — AVG_H_OVERLAP · hard · sequential/given · answer A) كيلوجرام واحد

## ages — مسائل الأعمار

Sampled 360 questions across easy, medium, hard; 8 distinct constructions, largest group 120.

### family:ages|scenario:AGE_E_SUM_DIFF|asks:olderAge|direction:forward

- occurrences in the sample: **120** of 360
- reasoning signature: `{askedUnknown:olderAge,derivedFrom:operationKinds,family:ages,operationKinds:[divide,ratio,add],reasoningDirection:olderAge,templateId:AGE_E_SUM_DIFF}`
- requested target: `olderAge`
- scenario: `ages/AGE_E_SUM_DIFF`
- stem skeleton: `شخص أكبر من الآخر بـ# سنوات، ومجموع عمريهما # سنة. كم @ الأكبر؟`

> شخص أكبر من الآخر بـ8 سنوات، ومجموع عمريهما 48 سنة. كم عمر الأكبر؟
>
> — AGE_E_SUM_DIFF · easy · sequential/given · answer E) 28 سنة

> شخص أكبر من الآخر بـ4 سنوات، ومجموع عمريهما 24 سنة. كم عمر الأكبر؟
>
> — AGE_E_SUM_DIFF · easy · sequential/given · answer A) 14 سنة

> شخص أكبر من الآخر بـ10 سنوات، ومجموع عمريهما 58 سنة. كم عمر الأكبر؟
>
> — AGE_E_SUM_DIFF · easy · sequential/given · answer E) 34 سنة

### family:ages|scenario:AGE_H_PAST_FUT|asks:olderAgeNow|direction:forward

- occurrences in the sample: **120** of 360
- reasoning signature: `{askedUnknown:olderAgeNow,derivedFrom:operationKinds,family:ages,operationKinds:[multiply,subtract,add,divide],reasoningDirection:olderAgeNow,templateId:AGE_H_PAST_FUT}`
- requested target: `olderAgeNow`
- scenario: `ages/AGE_H_PAST_FUT`
- stem skeleton: `قبل # سنوات كان @ @ ضعف @ @، وبعد # سنوات من الآن سيكون مجموع عمريهما # سنة. كم @ @ الآن؟`

> قبل 3 سنوات كان عمر علي ضعف عمر راشد، وبعد 4 سنوات من الآن سيكون مجموع عمريهما 41 سنة. كم عمر علي الآن؟
>
> — AGE_H_PAST_FUT · hard · compact/given · answer C) 21 سنة

> قبل 5 سنوات كان عمر علي ضعف عمر راشد، وبعد 6 سنوات من الآن سيكون مجموع عمريهما 43 سنة. كم عمر علي الآن؟
>
> — AGE_H_PAST_FUT · hard · compact/given · answer E) 19 سنة

> المعطيات: قبل 4 سنوات كان عمر علي ثلاثة أمثال عمر راشد؛ بعد 4 سنوات من الآن سيكون مجموع عمريهما 40 سنة. كم عمر علي الآن؟
>
> — AGE_H_PAST_FUT · hard · listed/given · answer F) 22 سنة

### family:ages|scenario:AGE_H_THREE_SIBLINGS|asks:eldestAfterYears|direction:forward

- occurrences in the sample: **24** of 360
- reasoning signature: `{askedUnknown:eldestAfterYears,derivedFrom:operationKinds,family:ages,operationKinds:[add,multiply,subtract,divide],reasoningDirection:eldestAfterYears,templateId:AGE_H_THREE_SIBLINGS}`
- requested target: `eldestAfterYears`
- scenario: `ages/AGE_H_THREE_SIBLINGS`
- stem skeleton: `مجموع أعمار ثلاثة إخوة الآن # سنة. الأكبر أكبر من الأوسط بـ# سنوات، والأوسط أكبر من الأصغر بـ# سنوات. كم سيكون @ الأكبر بعد # سنوات؟`

> مجموع أعمار ثلاثة إخوة الآن 44 سنة. الأكبر أكبر من الأوسط بـ3 سنوات، والأوسط أكبر من الأصغر بـ4 سنوات. كم سيكون عمر الأكبر بعد 5 سنوات؟
>
> — AGE_H_THREE_SIBLINGS · medium · sequential/given · answer A) 23 سنة

> المعطيات: مجموع أعمار ثلاثة إخوة الآن 34 سنة؛ الأكبر أكبر من الأوسط بـ4 سنوات، والأوسط أكبر من الأصغر بـ3 سنوات. كم سيكون عمر الأكبر بعد 5 سنوات؟
>
> — AGE_H_THREE_SIBLINGS · medium · listed/given · answer E) 20 سنة

> المعطيات: مجموع أعمار ثلاثة إخوة الآن 65 سنة؛ الأكبر أكبر من الأوسط بـ4 سنوات، والأوسط أكبر من الأصغر بـ5 سنوات. كم سيكون عمر الأكبر بعد 6 سنوات؟
>
> — AGE_H_THREE_SIBLINGS · medium · listed/given · answer D) 32 سنة

## speed — السرعة والمسافة والزمن

Sampled 360 questions across easy, medium, hard; 59 distinct constructions, largest group 35.

### family:speed|scenario:boat_with_and_against_current|asks:currentSpeed|direction:reverse

- occurrences in the sample: **35** of 360
- reasoning signature: `{askedUnknown:currentSpeed,derivedFrom:operationKinds,family:speed,operationKinds:[divide,subtract,ratio],reasoningDirection:currentSpeed,templateId:SPD_H_CURRENT}`
- requested target: `currentSpeed`
- scenario: `speed/boat_with_and_against_current`
- stem skeleton: `قطع قارب # كيلومترًا مع التيار في # ساعة، وقطع المسافة نفسها ضد التيار في # ساعة. فما سرعة التيار؟`

> قطع قارب 231 كيلومترًا مع التيار في 11 ساعة، وقطع المسافة نفسها ضد التيار في 21 ساعة. فما سرعة التيار؟
>
> — SPD_H_CURRENT · hard · compact/given · answer A) 5 كم/ساعة

> قطع قارب 221 كيلومترًا مع التيار في 13 ساعة، وقطع المسافة نفسها ضد التيار في 17 ساعة. فما سرعة التيار؟
>
> — SPD_H_CURRENT · hard · compact/given · answer A) 2 كم/ساعة

> قطع قارب 589 كيلومترًا مع التيار في 19 ساعة، وقطع المسافة نفسها ضد التيار في 31 ساعة. فما سرعة التيار؟
>
> — SPD_H_CURRENT · hard · compact/given · answer F) 6 كم/ساعة

### family:speed|scenario:journey_split_between_two_speeds|asks:secondLegHours|direction:reverse

- occurrences in the sample: **33** of 360
- reasoning signature: `{askedUnknown:secondLegHours,derivedFrom:operationKinds,family:speed,operationKinds:[multiply,subtract,divide],reasoningDirection:secondLegHours,templateId:SPD_H_LEG_SPLIT}`
- requested target: `secondLegHours`
- scenario: `speed/journey_split_between_two_speeds`
- stem skeleton: `قطعت عربة # كيلومترًا في # ساعات، وسارت جزءًا من الرحلة بسرعة # كم/ساعة والجزء الباقي بسرعة # كم/ساعة. فكم ساعة سارت بالسرعة الثانية؟`

> قطعت عربة 230 كيلومترًا في 5 ساعات، وسارت جزءًا من الرحلة بسرعة 40 كم/ساعة والجزء الباقي بسرعة 70 كم/ساعة. فكم ساعة سارت بالسرعة الثانية؟
>
> — SPD_H_LEG_SPLIT · hard · compact/given · answer B) ساعة واحدة

> قطعت عربة 360 كيلومترًا في 7 ساعات. سارت جزءًا من الرحلة بسرعة 30 كم/ساعة والجزء الباقي بسرعة 80 كم/ساعة. فكم ساعة سارت بالسرعة الثانية؟
>
> — SPD_H_LEG_SPLIT · hard · sequential/given · answer B) 3 ساعات

> قطعت حافلة 270 كيلومترًا في 5 ساعات. سارت جزءًا من الرحلة بسرعة 50 كم/ساعة والجزء الباقي بسرعة 70 كم/ساعة. فكم ساعة سارت بالسرعة الثانية؟
>
> — SPD_H_LEG_SPLIT · hard · sequential/given · answer E) ساعة واحدة

### family:speed|scenario:boat_with_and_against_current|asks:boatSpeed|direction:forward

- occurrences in the sample: **30** of 360
- reasoning signature: `{askedUnknown:boatSpeed,derivedFrom:operationKinds,family:speed,operationKinds:[divide,add,ratio],reasoningDirection:boatSpeed,templateId:SPD_H_CURRENT}`
- requested target: `boatSpeed`
- scenario: `speed/boat_with_and_against_current`
- stem skeleton: `قطع قارب # كيلومترًا مع التيار في # ساعة، وقطع المسافة نفسها ضد التيار في # ساعة. فما سرعة القارب في الماء الساكن؟`

> قطع قارب 567 كيلومترًا مع التيار في 21 ساعة، وقطع المسافة نفسها ضد التيار في 27 ساعة. فما سرعة القارب في الماء الساكن؟
>
> — SPD_H_CURRENT · hard · sequential/given · answer D) 24 كم/ساعة

> قطع قارب 135 كيلومترًا مع التيار في 9 ساعات، وقطع المسافة نفسها ضد التيار في 15 ساعة. فما سرعة القارب في الماء الساكن؟
>
> — SPD_H_CURRENT · hard · compact/given · answer E) 12 كم/ساعة

> قطع قارب 364 كيلومترًا مع التيار في 14 ساعة، وقطع المسافة نفسها ضد التيار في 26 ساعة. فما سرعة القارب في الماء الساكن؟
>
> — SPD_H_CURRENT · hard · sequential/given · answer D) 20 كم/ساعة

## work_time — العمال والزمن

Sampled 360 questions across easy, medium, hard; 11 distinct constructions, largest group 101.

### family:work_time|scenario:three_workers_timed_in_pairs|asks:threeTogetherDays|direction:forward

- occurrences in the sample: **101** of 360
- reasoning signature: `{askedUnknown:threeTogetherDays,derivedFrom:operationKinds,family:work_time,operationKinds:[divide,ratio,multiply,add],reasoningDirection:threeTogetherDays,templateId:WORK_H_THREE_PAIRS}`
- requested target: `threeTogetherDays`
- scenario: `work_time/three_workers_timed_in_pairs`
- stem skeleton: `ينجز العاملان الأول والثاني عملًا معًا في # يومًا، والثاني والثالث في # يومًا، والأول والثالث في # يومًا. كم يومًا يحتاج الثلاثة معًا لإنجاز العمل نفسه؟`

> ينجز العاملان الأول والثاني عملًا معًا في 18 يومًا، والثاني والثالث في 36 يومًا، والأول والثالث في 24 يومًا. كم يومًا يحتاج الثلاثة معًا لإنجاز العمل نفسه؟
>
> — WORK_H_THREE_PAIRS · hard · sequential/given · answer D) 16 يومًا

> ينجز العاملان الأول والثاني عملًا معًا في 21 يومًا، والثاني والثالث في 36 يومًا، والأول والثالث في 28 يومًا. كم يومًا يحتاج الثلاثة معًا لإنجاز العمل نفسه؟
>
> — WORK_H_THREE_PAIRS · hard · compact/given · answer A) 18 يومًا

> ينجز العاملان الأول والثاني عملًا معًا في 28 يومًا، والثاني والثالث في 24 يومًا، والأول والثالث في 21 يومًا. كم يومًا يحتاج الثلاثة معًا لإنجاز العمل نفسه؟
>
> — WORK_H_THREE_PAIRS · hard · sequential/given · answer B) 16 يومًا

### family:work_time|scenario:WORK_E_INVERSE|asks:daysForNewCrew|direction:forward

- occurrences in the sample: **44** of 360
- reasoning signature: `{askedUnknown:daysForNewCrew,derivedFrom:operationKinds,family:work_time,operationKinds:[multiply,subtract,divide],reasoningDirection:daysForNewCrew,templateId:WORK_E_INVERSE}`
- requested target: `daysForNewCrew`
- scenario: `work_time/WORK_E_INVERSE`
- stem skeleton: `يستطيع # عمال إنجاز عمل في # يومًا. إذا عمل # عمال بالكفاءة نفسها، فكم يومًا يحتاجون؟`

> يستطيع 4 عمال إنجاز عمل في 15 يومًا. إذا عمل 6 عمال بالكفاءة نفسها، فكم يومًا يحتاجون؟
>
> — WORK_E_INVERSE · easy · compact/given · answer A) 10 أيام

> يستطيع 6 عمال إنجاز عمل في 12 يومًا. إذا عمل 18 عاملًا بالكفاءة نفسها، فكم يومًا يحتاجون؟
>
> — WORK_E_INVERSE · easy · compact/given · answer C) 4 أيام

> يستطيع 4 عمال إنجاز عمل في 6 أيام. إذا عمل 12 عاملًا بالكفاءة نفسها، فكم يومًا يحتاجون؟
>
> — WORK_E_INVERSE · easy · sequential/given · answer E) يومان

### family:work_time|scenario:WORK_M_EFF|asks:daysAfterEfficiencyGain|direction:forward

- occurrences in the sample: **38** of 360
- reasoning signature: `{askedUnknown:daysAfterEfficiencyGain,derivedFrom:operationKinds,family:work_time,operationKinds:[divide,add],reasoningDirection:daysAfterEfficiencyGain,templateId:WORK_M_EFF}`
- requested target: `daysAfterEfficiencyGain`
- scenario: `work_time/WORK_M_EFF`
- stem skeleton: `فريق ينجز عملًا في # يومًا. بعد تدريب ارتفعت كفاءة الفريق بمقدار #% من القيمة السابقة مع بقاء عدد العمال نفسه. كم يومًا يحتاج للعمل نفسه؟`

> فريق ينجز عملًا في 20 يومًا. بعد تدريب ارتفعت كفاءة الفريق بمقدار 150% من القيمة السابقة مع بقاء عدد العمال نفسه. كم يومًا يحتاج للعمل نفسه؟
>
> — WORK_M_EFF · easy · sequential/given · answer A) 8 أيام

> فريق ينجز عملًا في 30 يومًا، وبعد تدريب ارتفعت كفاءة الفريق بمقدار 25% من القيمة السابقة مع بقاء عدد العمال نفسه. كم يومًا يحتاج للعمل نفسه؟
>
> — WORK_M_EFF · easy · compact/given · answer C) 24 يومًا

> فريق ينجز عملًا في 16 يومًا. بعد تدريب ارتفعت كفاءة الفريق بمقدار 100% من القيمة السابقة مع بقاء عدد العمال نفسه. كم يومًا يحتاج للعمل نفسه؟
>
> — WORK_M_EFF · easy · sequential/given · answer C) 8 أيام

## machines — الآلات والإنتاج

Sampled 360 questions across easy, medium, hard; 65 distinct constructions, largest group 21.

### family:machines|scenario:solar_panels|asks:outputForNewSetup|direction:forward

- occurrences in the sample: **21** of 360
- reasoning signature: `{askedUnknown:outputForNewSetup,derivedFrom:operationKinds,family:machines,operationKinds:[multiply,subtract,divide],reasoningDirection:outputForNewSetup,templateId:MACH_E_HOURS}`
- requested target: `outputForNewSetup`
- scenario: `machines/solar_panels`
- stem skeleton: `تنتج # آلات متطابقة في الإنتاجية # لوحًا خلال # ساعات. كم لوحًا تنتج # آلات من النوع نفسه خلال ساعتين؟`

> تنتج 5 آلات متطابقة في الإنتاجية 375 لوحًا خلال 3 ساعات. كم لوحًا تنتج 3 آلات من النوع نفسه خلال ساعتين؟
>
> — MACH_E_HOURS · easy · sequential/given · answer D) 150 لوحًا

> تنتج 4 آلات متطابقة في الإنتاجية 360 لوحًا خلال 6 ساعات. كم لوحًا تنتج 3 آلات من النوع نفسه خلال 3 ساعات؟
>
> — MACH_E_HOURS · easy · compact/given · answer C) 135 لوحًا

> تنتج 6 آلات متطابقة في الإنتاجية 270 لوحًا خلال 3 ساعات. كم لوحًا تنتج 4 آلات من النوع نفسه خلال 4 ساعات؟
>
> — MACH_E_HOURS · easy · compact/given · answer B) 240 لوحًا

### family:machines|scenario:dairy_bottles/mixed_fleet_shortfall|asks:minimumSecondTypeMachines|direction:minimum

- occurrences in the sample: **21** of 360
- reasoning signature: `{askedUnknown:minimumSecondTypeMachines,derivedFrom:operationKinds,family:machines,operationKinds:[multiply,subtract,divide,add,ratio],reasoningDirection:minimumSecondTypeMachines,templateId:MACH_H_MIN_SECOND_TYPE}`
- requested target: `minimumSecondTypeMachines`
- scenario: `machines/dairy_bottles/mixed_fleet_shortfall`
- stem skeleton: `مطلوب إنتاج # زجاجة خلال # ساعات. تتوفر # آلات من النوع الأول، وتنتج كل واحدة منها # زجاجة/ساعة. آلات النوع الثاني تنتج كل واحدة منها # زجاجة/ساعة. فما أقل عدد `

> مطلوب إنتاج 958 زجاجة خلال 8 ساعات. تتوفر 4 آلات من النوع الأول، وتنتج كل واحدة منها 15 زجاجة/ساعة. آلات النوع الثاني تنتج كل واحدة منها 10 زجاجة/ساعة. فما أقل عدد من آلات النوع الثاني يكفي لبلوغ المطلوب؟
>
> — MACH_H_MIN_SECOND_TYPE · hard · sequential/given · answer A) 6

> مطلوب إنتاج 795 زجاجة خلال 8 ساعات. تتوفر آلتان من النوع الأول، وتنتج كل واحدة منها 24 زجاجة/ساعة. آلات النوع الثاني تنتج كل واحدة منها 9 زجاجة/ساعة. فما أقل عدد من آلات النوع الثاني يكفي لبلوغ المطلوب؟
>
> — MACH_H_MIN_SECOND_TYPE · hard · sequential/given · answer A) 6

> مطلوب إنتاج 562 زجاجة خلال 5 ساعات. تتوفر 4 آلات من النوع الأول، وتنتج كل واحدة منها 24 زجاجة/ساعة. آلات النوع الثاني تنتج كل واحدة منها 14 زجاجة/ساعة. فما أقل عدد من آلات النوع الثاني يكفي لبلوغ المطلوب؟
>
> — MACH_H_MIN_SECOND_TYPE · hard · sequential/given · answer C) 2

### family:machines|scenario:abstract_units/mixed_fleet_shortfall|asks:minimumSecondTypeMachines|direction:minimum

- occurrences in the sample: **21** of 360
- reasoning signature: `{askedUnknown:minimumSecondTypeMachines,derivedFrom:operationKinds,family:machines,operationKinds:[multiply,subtract,divide,add,ratio],reasoningDirection:minimumSecondTypeMachines,templateId:MACH_H_MIN_SECOND_TYPE}`
- requested target: `minimumSecondTypeMachines`
- scenario: `machines/abstract_units/mixed_fleet_shortfall`
- stem skeleton: `مطلوب إنتاج # وحدة خلال # ساعات، وتتوفر آلتان من النوع الأول، وتنتج كل واحدة منها # وحدة/ساعة، وآلات النوع الثاني تنتج كل واحدة منها # وحدة/ساعة. فما أقل عدد من`

> مطلوب إنتاج 611 وحدة خلال 8 ساعات، وتتوفر آلتان من النوع الأول، وتنتج كل واحدة منها 24 وحدة/ساعة، وآلات النوع الثاني تنتج كل واحدة منها 14 وحدة/ساعة. فما أقل عدد من آلات النوع الثاني يكفي لبلوغ المطلوب؟
>
> — MACH_H_MIN_SECOND_TYPE · hard · compact/given · answer A) 3

> المطلوب: أقل عدد من آلات النوع الثاني يكفي لبلوغ المطلوب. المعطيات: مطلوب إنتاج 746 وحدة خلال 8 ساعات؛ تتوفر آلتان من النوع الأول، وتنتج كل واحدة منها 15 وحدة/ساعة؛ آلات النوع الثاني تنتج كل واحدة منها 16 وحدة/ساعة.
>
> — MACH_H_MIN_SECOND_TYPE · hard · question_first/given · answer D) 4

> المعطيات: مطلوب إنتاج 359 وحدة خلال 4 ساعات؛ تتوفر 4 آلات من النوع الأول، وتنتج كل واحدة منها 15 وحدة/ساعة؛ آلات النوع الثاني تنتج كل واحدة منها 9 وحدة/ساعة. فما أقل عدد من آلات النوع الثاني يكفي لبلوغ المطلوب؟
>
> — MACH_H_MIN_SECOND_TYPE · hard · listed/given · answer C) 4

## direct_proportion — التناسب المباشر

Sampled 360 questions across easy, medium, hard; 14 distinct constructions, largest group 70.

### family:direct_proportion|scenario:PROP_H_COMPOUND|asks:scaledOutputPlusReserve|direction:forward

- occurrences in the sample: **70** of 360
- reasoning signature: `{askedUnknown:scaledOutputPlusReserve,derivedFrom:operationKinds,family:direct_proportion,operationKinds:[divide,multiply,add],reasoningDirection:scaledOutputPlusReserve,templateId:PROP_H_COMPOUND}`
- requested target: `scaledOutputPlusReserve`
- scenario: `direct_proportion/PROP_H_COMPOUND`
- stem skeleton: `تحتاج # وحدات إلى # كيلوجرامًا من مادة. نريد تجهيز # وحدات، مع إضافة احتياط بنسبة #% فوق الكمية المحسوبة. كم كيلوجرامًا نحتاج؟`

> تحتاج 5 وحدات إلى 20 كيلوجرامًا من مادة. نريد تجهيز 8 وحدات، مع إضافة احتياط بنسبة 25% فوق الكمية المحسوبة. كم كيلوجرامًا نحتاج؟
>
> — PROP_H_COMPOUND · medium · sequential/given · answer B) 40 كيلوجرامًا

> تحتاج 4 وحدات إلى 30 كيلوجرامًا من مادة، ونريد تجهيز 8 وحدات، مع إضافة احتياط بنسبة 10% فوق الكمية المحسوبة. كم كيلوجرامًا نحتاج؟
>
> — PROP_H_COMPOUND · medium · compact/given · answer A) 66 كيلوجرامًا

> المعطيات: تحتاج 6 وحدات إلى 30 كيلوجرامًا من مادة؛ نريد تجهيز 12 وحدة، مع إضافة احتياط بنسبة 25% فوق الكمية المحسوبة. كم كيلوجرامًا نحتاج؟
>
> — PROP_H_COMPOUND · medium · listed/given · answer E) 75 كيلوجرامًا

### family:direct_proportion|scenario:PROP_H_TWO_ITEM_SYSTEM|asks:boxUnitPrice|direction:forward

- occurrences in the sample: **50** of 360
- reasoning signature: `{askedUnknown:boxUnitPrice,derivedFrom:operationKinds,family:direct_proportion,operationKinds:[multiply,ratio,subtract,divide],reasoningDirection:boxUnitPrice,templateId:PROP_H_TWO_ITEM_SYSTEM}`
- requested target: `boxUnitPrice`
- scenario: `direct_proportion/PROP_H_TWO_ITEM_SYSTEM`
- stem skeleton: `ثمن # صناديق وقطعة واحدة معًا # درهمًا. وثمن # صناديق و# قطع معًا # درهمًا. فما ثمن الصندوق الواحد؟`

> ثمن 5 صناديق وقطعة واحدة معًا 34 درهمًا. وثمن 4 صناديق و4 قطع معًا 40 درهمًا. فما ثمن الصندوق الواحد؟
>
> — PROP_H_TWO_ITEM_SYSTEM · medium · sequential/given · answer D) 6 دراهم

> المعطيات: ثمن 5 صناديق و4 قطع معًا 87 درهمًا؛ وثمن صندوق واحد وقطعتان معًا 21 درهمًا. فما ثمن الصندوق الواحد؟
>
> — PROP_H_TWO_ITEM_SYSTEM · medium · listed/given · answer F) 15 درهمًا

> ثمن صندوقان وقطعتان معًا 20 درهمًا. وثمن صندوق واحد و4 قطع معًا 22 درهمًا. فما ثمن الصندوق الواحد؟
>
> — PROP_H_TWO_ITEM_SYSTEM · medium · sequential/given · answer F) 6 دراهم

### family:direct_proportion|scenario:partnership_capital_times_duration|asks:firstPartnerShare|direction:forward

- occurrences in the sample: **46** of 360
- reasoning signature: `{askedUnknown:firstPartnerShare,derivedFrom:operationKinds,family:direct_proportion,operationKinds:[multiply,add,divide],reasoningDirection:firstPartnerShare,templateId:PROP_H_CAPITAL_TIME}`
- requested target: `firstPartnerShare`
- scenario: `direct_proportion/partnership_capital_times_duration`
- stem skeleton: `شارك @ بمبلغ # درهمًا لمدة # أشهر، وشارك @ بمبلغ # درهمًا لمدة # أشهر. فإذا بلغ الربح # درهمًا، فكم نصيب @؟`

> شارك أحمد بمبلغ 2400 درهمًا لمدة 5 أشهر، وشارك سالم بمبلغ 3000 درهمًا لمدة 10 أشهر. فإذا بلغ الربح 2100 درهمًا، فكم نصيب أحمد؟
>
> — PROP_H_CAPITAL_TIME · hard · compact/given · answer A) 600 درهمًا

> شارك أحمد بمبلغ 4500 درهمًا لمدة 10 أشهر، وشارك سالم بمبلغ 6000 درهمًا لمدة 7 أشهر. فإذا بلغ الربح 5800 درهمًا، فكم نصيب أحمد؟
>
> — PROP_H_CAPITAL_TIME · hard · compact/given · answer B) 3000 درهمًا

> شارك أحمد بمبلغ 4000 درهمًا لمدة 9 أشهر، وشارك سالم بمبلغ 6000 درهمًا لمدة 10 أشهر. فإذا بلغ الربح 2000 درهمًا، فكم نصيب أحمد؟
>
> — PROP_H_CAPITAL_TIME · hard · sequential/given · answer B) 750 درهمًا

## fractions — الكسور المتتابعة

Sampled 120 questions across easy; 8 distinct constructions, largest group 19.

### family:fractions|scenario:FRAC_H_4|asks:chainResult|direction:forward

- occurrences in the sample: **19** of 120
- reasoning signature: `{askedUnknown:chainResult,derivedFrom:operationKinds,family:fractions,operationKinds:[divide],reasoningDirection:chainResult,templateId:FRAC_H_4}`
- requested target: `chainResult`
- scenario: `fractions/FRAC_H_4`
- stem skeleton: `خُمس العدد #، ثم نصف الناتج، ثم سُدس الناتج، ثم ثلث الناتج. ما الناتج؟`

> خُمس العدد 900، ثم نصف الناتج، ثم سُدس الناتج، ثم ثلث الناتج. ما الناتج؟
>
> — FRAC_H_4 · easy · compact/given · answer D) 5

> نصف العدد 1920، ثم سُدس الناتج، ثم ثُمن الناتج، ثم ربع الناتج. ما الناتج؟
>
> — FRAC_H_4 · easy · sequential/given · answer C) 5

> خُمس العدد 1440، ثم سُدس الناتج، ثم نصف الناتج، ثم ثُمن الناتج. ما الناتج؟
>
> — FRAC_H_4 · easy · sequential/given · answer F) 3

### family:fractions|scenario:FRAC_H_4|asks:hiddenFraction|direction:forward

- occurrences in the sample: **17** of 120
- reasoning signature: `{askedUnknown:hiddenFraction,derivedFrom:operationKinds,family:fractions,operationKinds:[multiply,divide],reasoningDirection:hiddenFraction,templateId:FRAC_H_4}`
- requested target: `hiddenFraction`
- scenario: `fractions/FRAC_H_4`
- stem skeleton: `ربع العدد #، ثم ثلث الناتج، ثم ثُمن الناتج، ثم كسرٌ من الناتج، فكان الناتج #. فما هذا الكسر؟`

> ربع العدد 1152، ثم ثلث الناتج، ثم ثُمن الناتج، ثم كسرٌ من الناتج، فكان الناتج 2. فما هذا الكسر؟
>
> — FRAC_H_4 · easy · compact/given · answer E) السُدس

> ربع العدد 2400، ثم خُمس الناتج، ثم ثُمن الناتج، ثم كسرٌ من الناتج، فكان الناتج 5. فما هذا الكسر؟
>
> — FRAC_H_4 · easy · sequential/given · answer F) الثلث

> ثلث العدد 960، ثم نصف الناتج، ثم ثُمن الناتج، ثم كسرٌ من الناتج، فكان الناتج 5. فما هذا الكسر؟
>
> — FRAC_H_4 · easy · sequential/given · answer A) الربع

### family:fractions|scenario:FRAC_M_3|asks:hiddenFraction|direction:forward

- occurrences in the sample: **17** of 120
- reasoning signature: `{askedUnknown:hiddenFraction,derivedFrom:operationKinds,family:fractions,operationKinds:[multiply,divide],reasoningDirection:hiddenFraction,templateId:FRAC_M_3}`
- requested target: `hiddenFraction`
- scenario: `fractions/FRAC_M_3`
- stem skeleton: `ثلث العدد #، ثم خُمس الناتج، ثم كسرٌ من الناتج، فكان الناتج #. فما هذا الكسر؟`

> ثلث العدد 720، ثم خُمس الناتج، ثم كسرٌ من الناتج، فكان الناتج 8. فما هذا الكسر؟
>
> — FRAC_M_3 · easy · compact/given · answer E) السُدس

> ربع العدد 480، ثم نصف الناتج، ثم كسرٌ من الناتج، فكان الناتج 12. فما هذا الكسر؟
>
> — FRAC_M_3 · easy · compact/given · answer E) الخُمس

> ربع العدد 1080، ثم سُدس الناتج، ثم كسرٌ من الناتج، فكان الناتج 15. فما هذا الكسر؟
>
> — FRAC_M_3 · easy · sequential/given · answer F) الثلث

## unit_rate — المعدل الوحدوي

Sampled 360 questions across easy, medium, hard; 46 distinct constructions, largest group 19.

### family:unit_rate|scenario:abstract_units|asks:originalRate|direction:forward

- occurrences in the sample: **19** of 360
- reasoning signature: `{askedUnknown:originalRate,derivedFrom:operationKinds,family:unit_rate,operationKinds:[divide,add,multiply,ratio],reasoningDirection:originalRate,templateId:RATE_H_RATE_FROM_GAP}`
- requested target: `originalRate`
- scenario: `unit_rate/abstract_units`
- stem skeleton: `المعطيات: ينجز جهاز # وحدة بمعدل ثابت؛ ولو زاد معدله بمقدار # وحدة/ساعة لأنجز العمل نفسه في ساعة واحدة أقل. فما معدله الأصلي؟`

> المعطيات: ينجز جهاز 36 وحدة بمعدل ثابت؛ ولو زاد معدله بمقدار 6 وحدة/ساعة لأنجز العمل نفسه في ساعة واحدة أقل. فما معدله الأصلي؟
>
> — RATE_H_RATE_FROM_GAP · hard · listed/given · answer C) 12 وحدة/ساعة

> ينجز جهاز 360 وحدة بمعدل ثابت، ولو زاد معدله بمقدار 20 وحدة/ساعة لأنجز العمل نفسه في 3 ساعات أقل. فما معدله الأصلي؟
>
> — RATE_H_RATE_FROM_GAP · hard · compact/given · answer E) 40 وحدة/ساعة

> المعطيات: ينجز جهاز 120 وحدة بمعدل ثابت؛ ولو زاد معدله بمقدار 5 وحدة/ساعة لأنجز العمل نفسه في 4 ساعات أقل. فما معدله الأصلي؟
>
> — RATE_H_RATE_FROM_GAP · hard · listed/given · answer A) 10 وحدة/ساعة

### family:unit_rate|scenario:dairy_bottles|asks:originalRate|direction:forward

- occurrences in the sample: **19** of 360
- reasoning signature: `{askedUnknown:originalRate,derivedFrom:operationKinds,family:unit_rate,operationKinds:[divide,add,multiply,ratio],reasoningDirection:originalRate,templateId:RATE_H_RATE_FROM_GAP}`
- requested target: `originalRate`
- scenario: `unit_rate/dairy_bottles`
- stem skeleton: `المعطيات: ينجز جهاز # زجاجة بمعدل ثابت؛ ولو زاد معدله بمقدار # زجاجة/ساعة لأنجز العمل نفسه في # ساعات أقل. فما معدله الأصلي؟`

> المعطيات: ينجز جهاز 480 زجاجة بمعدل ثابت؛ ولو زاد معدله بمقدار 10 زجاجة/ساعة لأنجز العمل نفسه في 4 ساعات أقل. فما معدله الأصلي؟
>
> — RATE_H_RATE_FROM_GAP · hard · listed/given · answer C) 30 وحدة/ساعة

> ينجز جهاز 350 زجاجة بمعدل ثابت، ولو زاد معدله بمقدار 10 زجاجة/ساعة لأنجز العمل نفسه في 4 ساعات أقل. فما معدله الأصلي؟
>
> — RATE_H_RATE_FROM_GAP · hard · compact/given · answer D) 25 وحدة/ساعة

> ينجز جهاز 60 زجاجة بمعدل ثابت، ولو زاد معدله بمقدار 20 زجاجة/ساعة لأنجز العمل نفسه في 4 ساعات أقل. فما معدله الأصلي؟
>
> — RATE_H_RATE_FROM_GAP · hard · compact/given · answer B) 10 وحدة/ساعة

### family:unit_rate|scenario:solar_panels|asks:originalRate|direction:forward

- occurrences in the sample: **17** of 360
- reasoning signature: `{askedUnknown:originalRate,derivedFrom:operationKinds,family:unit_rate,operationKinds:[divide,add,multiply,ratio],reasoningDirection:originalRate,templateId:RATE_H_RATE_FROM_GAP}`
- requested target: `originalRate`
- scenario: `unit_rate/solar_panels`
- stem skeleton: `المعطيات: ينجز جهاز # لوحًا بمعدل ثابت؛ ولو زاد معدله بمقدار # لوح/ساعة لأنجز العمل نفسه في # ساعات أقل. فما معدله الأصلي؟`

> المعطيات: ينجز جهاز 80 لوحًا بمعدل ثابت؛ ولو زاد معدله بمقدار 6 لوح/ساعة لأنجز العمل نفسه في 3 ساعات أقل. فما معدله الأصلي؟
>
> — RATE_H_RATE_FROM_GAP · hard · listed/given · answer C) 10 وحدة/ساعة

> المعطيات: ينجز جهاز 168 لوحًا بمعدل ثابت؛ ولو زاد معدله بمقدار 4 لوح/ساعة لأنجز العمل نفسه في ساعة واحدة أقل. فما معدله الأصلي؟
>
> — RATE_H_RATE_FROM_GAP · hard · listed/given · answer F) 24 وحدة/ساعة

> المعطيات: ينجز جهاز 180 لوحًا بمعدل ثابت؛ ولو زاد معدله بمقدار 6 لوح/ساعة لأنجز العمل نفسه في ساعة واحدة أقل. فما معدله الأصلي؟
>
> — RATE_H_RATE_FROM_GAP · hard · listed/given · answer D) 30 وحدة/ساعة

## combined_rate — المعدل المشترك

Sampled 360 questions across easy, medium, hard; 56 distinct constructions, largest group 19.

### family:combined_rate|scenario:solar_panels|asks:firstPumpSoloHours|direction:forward

- occurrences in the sample: **19** of 360
- reasoning signature: `{askedUnknown:firstPumpSoloHours,derivedFrom:operationKinds,family:combined_rate,operationKinds:[divide,subtract,ratio,multiply],reasoningDirection:firstPumpSoloHours,templateId:COMB_H_TWO_PUMPS}`
- requested target: `firstPumpSoloHours`
- scenario: `combined_rate/solar_panels`
- stem skeleton: `المعطيات: تملأ مضختان خزانًا معًا في # ساعات؛ ولو عملت الأولى وحدها # ساعات ثم أكملت الثانية وحدها # ساعات لامتلأ الخزان أيضًا. كم ساعة تحتاج الأولى وحدها لملئه`

> المعطيات: تملأ مضختان خزانًا معًا في 8 ساعات؛ ولو عملت الأولى وحدها 10 ساعات ثم أكملت الثانية وحدها 4 ساعات لامتلأ الخزان أيضًا. كم ساعة تحتاج الأولى وحدها لملئه؟
>
> — COMB_H_TWO_PUMPS · hard · listed/given · answer E) 12 ساعة

> تملأ مضختان خزانًا معًا في 8 ساعات. ولو عملت الأولى وحدها 10 ساعات ثم أكملت الثانية وحدها 4 ساعات لامتلأ الخزان أيضًا. كم ساعة تحتاج الأولى وحدها لملئه؟
>
> — COMB_H_TWO_PUMPS · hard · sequential/given · answer F) 12 ساعة

> تملأ مضختان خزانًا معًا في 6 ساعات. ولو عملت الأولى وحدها 16 ساعة ثم أكملت الثانية وحدها ساعة واحدة لامتلأ الخزان أيضًا. كم ساعة تحتاج الأولى وحدها لملئه؟
>
> — COMB_H_TWO_PUMPS · hard · sequential/given · answer A) 18 ساعة

### family:combined_rate|scenario:textile_shirts|asks:firstPumpSoloHours|direction:forward

- occurrences in the sample: **19** of 360
- reasoning signature: `{askedUnknown:firstPumpSoloHours,derivedFrom:operationKinds,family:combined_rate,operationKinds:[divide,subtract,ratio,multiply],reasoningDirection:firstPumpSoloHours,templateId:COMB_H_TWO_PUMPS}`
- requested target: `firstPumpSoloHours`
- scenario: `combined_rate/textile_shirts`
- stem skeleton: `تملأ مضختان خزانًا معًا في # ساعات. ولو عملت الأولى وحدها # ساعة ثم أكملت الثانية وحدها ساعة واحدة لامتلأ الخزان أيضًا. كم ساعة تحتاج الأولى وحدها لملئه؟`

> تملأ مضختان خزانًا معًا في 6 ساعات. ولو عملت الأولى وحدها 21 ساعة ثم أكملت الثانية وحدها ساعة واحدة لامتلأ الخزان أيضًا. كم ساعة تحتاج الأولى وحدها لملئه؟
>
> — COMB_H_TWO_PUMPS · hard · sequential/given · answer C) 24 ساعة

> تملأ مضختان خزانًا معًا في 10 ساعات. ولو عملت الأولى وحدها 12 ساعة ثم أكملت الثانية وحدها 9 ساعات لامتلأ الخزان أيضًا. كم ساعة تحتاج الأولى وحدها لملئه؟
>
> — COMB_H_TWO_PUMPS · hard · sequential/given · answer B) 30 ساعة

> تملأ مضختان خزانًا معًا في 6 ساعات، ولو عملت الأولى وحدها 8 ساعات ثم أكملت الثانية وحدها 3 ساعات لامتلأ الخزان أيضًا. كم ساعة تحتاج الأولى وحدها لملئه؟
>
> — COMB_H_TWO_PUMPS · hard · compact/given · answer D) 10 ساعات

### family:combined_rate|scenario:bakery_loaves|asks:firstPumpSoloHours|direction:forward

- occurrences in the sample: **18** of 360
- reasoning signature: `{askedUnknown:firstPumpSoloHours,derivedFrom:operationKinds,family:combined_rate,operationKinds:[divide,subtract,ratio,multiply],reasoningDirection:firstPumpSoloHours,templateId:COMB_H_TWO_PUMPS}`
- requested target: `firstPumpSoloHours`
- scenario: `combined_rate/bakery_loaves`
- stem skeleton: `المعطيات: تملأ مضختان خزانًا معًا في # ساعات؛ ولو عملت الأولى وحدها # ساعات ثم أكملت الثانية وحدها # ساعات لامتلأ الخزان أيضًا. كم ساعة تحتاج الأولى وحدها لملئه`

> المعطيات: تملأ مضختان خزانًا معًا في 6 ساعات؛ ولو عملت الأولى وحدها 8 ساعات ثم أكملت الثانية وحدها 3 ساعات لامتلأ الخزان أيضًا. كم ساعة تحتاج الأولى وحدها لملئه؟
>
> — COMB_H_TWO_PUMPS · hard · listed/given · answer B) 10 ساعات

> تملأ مضختان خزانًا معًا في 12 ساعة، ولو عملت الأولى وحدها 13 ساعة ثم أكملت الثانية وحدها 8 ساعات لامتلأ الخزان أيضًا. كم ساعة تحتاج الأولى وحدها لملئه؟
>
> — COMB_H_TWO_PUMPS · hard · compact/given · answer B) 15 ساعة

> تملأ مضختان خزانًا معًا في 4 ساعات، ولو عملت الأولى وحدها 16 ساعة ثم أكملت الثانية وحدها ساعة واحدة لامتلأ الخزان أيضًا. كم ساعة تحتاج الأولى وحدها لملئه؟
>
> — COMB_H_TWO_PUMPS · hard · compact/given · answer A) 20 ساعة

## relational — المقارنة والترتيب العلاقاتي

Sampled 360 questions across easy, medium, hard; 25 distinct constructions, largest group 46.

### family:relational|scenario:REL_H_COUNT_BRANCHED|asks:countAbove|direction:forward

- occurrences in the sample: **46** of 360
- reasoning signature: `{askedUnknown:countAbove,derivedFrom:operationKinds,family:relational,operationKinds:[ratio],reasoningDirection:countAbove,templateId:REL_H_COUNT_BRANCHED}`
- requested target: `countAbove`
- scenario: `relational/REL_H_COUNT_BRANCHED`
- stem skeleton: `@ أسرع من @. @ أسرع من @. @ أسرع من @. @ أسرع من @. @ أسرع من @. @ أسرع من @. @ أسرع من @. @ أسرع من @. كم شخصًا نعرف يقينًا أنهم أسرع من @؟`

> بدر أسرع من سالم. نورة أسرع من خالد. فهد أسرع من سالم. بدر أسرع من ريم. ريم أسرع من ناصر. فهد أسرع من ريم. ناصر أسرع من خالد. سالم أسرع من نورة. كم شخصًا نعرف يقينًا أنهم أسرع من ناصر؟
>
> — REL_H_COUNT_BRANCHED · hard · fixed/given · answer C) ثلاثة أشخاص

> ليان أسرع من ماجد. بدر أسرع من ماجد. هند أسرع من ليان. ناصر أسرع من هند. فهد أسرع من بدر. سالم أسرع من ناصر. خالد أسرع من سالم. فهد أسرع من سالم. خالد أسرع من بدر. كم شخصًا نعرف يقينًا أنهم أسرع من ليان؟
>
> — REL_H_COUNT_BRANCHED · hard · fixed/given · answer F) خمسة أشخاص

> نورة أسرع من سارة. هند أسرع من بدر. نورة أسرع من هند. سارة أسرع من فهد. ريم أسرع من سارة. فهد أسرع من ماجد. ريم أسرع من هند. كم شخصًا نعرف يقينًا أنهم أسرع من بدر؟
>
> — REL_H_COUNT_BRANCHED · hard · fixed/given · answer B) ثلاثة أشخاص

### family:relational|scenario:REL_M_BRANCH_UNRES|asks:undeterminedPair|direction:forward

- occurrences in the sample: **41** of 360
- reasoning signature: `{askedUnknown:undeterminedPair,derivedFrom:operationKinds,family:relational,operationKinds:[],reasoningDirection:undeterminedPair,templateId:REL_M_BRANCH_UNRES}`
- requested target: `undeterminedPair`
- scenario: `relational/REL_M_BRANCH_UNRES`
- stem skeleton: `@ أسرع من @. @ أسرع من @. @ أسرع من @. @ أسرع من @. @ أسرع من @. @ أسرع من @. أي مقارنة لا يمكن حسمها؟`

> ماجد أسرع من هند. ماجد أسرع من حمد. سالم أسرع من هند. ماجد أسرع من بدر. سالم أسرع من حمد. سالم أسرع من بدر. أي مقارنة لا يمكن حسمها؟
>
> — REL_M_BRANCH_UNRES · hard · fixed/given · answer B) حمد وبدر

> ماجد أسرع من سارة. سامي أسرع من سارة. ماجد أسرع من خالد. خالد أسرع من علي. سامي أسرع من خالد. أي مقارنة لا يمكن حسمها؟
>
> — REL_M_BRANCH_UNRES · hard · fixed/given · answer E) سامي وماجد

> ناصر أسرع من سارة. خالد أسرع من علي. هند أسرع من ليان. خالد أسرع من ليان. هند أسرع من علي. ليان أسرع من سارة. علي أسرع من ناصر. أي مقارنة لا يمكن حسمها؟
>
> — REL_M_BRANCH_UNRES · hard · fixed/given · answer C) ليان وناصر

### family:relational|scenario:REL_H_GUARANTEE|asks:guaranteedDespiteBranches|direction:forward

- occurrences in the sample: **37** of 360
- reasoning signature: `{askedUnknown:guaranteedDespiteBranches,derivedFrom:operationKinds,family:relational,operationKinds:[],reasoningDirection:guaranteedDespiteBranches,templateId:REL_H_GUARANTEE}`
- requested target: `guaranteedDespiteBranches`
- scenario: `relational/REL_H_GUARANTEE`
- stem skeleton: `@ أسرع من @. @ أسرع من @. @ أسرع من @. @ أسرع من @. @ أسرع من @. أي عبارة يجب أن تكون صحيحة مهما كان ترتيب @ ونورة؟`

> هند أسرع من راشد. راشد أسرع من حمد. نورة أسرع من ريم. هند أسرع من نورة. ريم أسرع من ماجد. أي عبارة يجب أن تكون صحيحة مهما كان ترتيب راشد ونورة؟
>
> — REL_H_GUARANTEE · medium · fixed/given · answer A) هند أسرع من ريم

> حمد أسرع من بدر. حمد أسرع من راشد. راشد أسرع من ليان. ناصر أسرع من خالد. حمد أسرع من ناصر. أي عبارة يجب أن تكون صحيحة مهما كان ترتيب راشد وخالد؟
>
> — REL_H_GUARANTEE · medium · fixed/given · answer F) حمد أسرع من ليان

> سالم أسرع من راشد. علي أسرع من نورة. نورة أسرع من سالم. ماجد أسرع من بدر. ماجد أسرع من علي. أي عبارة يجب أن تكون صحيحة مهما كان ترتيب بدر وسالم؟
>
> — REL_H_GUARANTEE · medium · fixed/given · answer E) ماجد أسرع من نورة

## calendar — الاستدلال الزمني وأيام الأسبوع

Sampled 360 questions across easy, medium, hard; 9 distinct constructions, largest group 120.

### family:calendar|scenario:CAL_H_CYCLE_MEET|asks:meetingWeekday|direction:forward

- occurrences in the sample: **120** of 360
- reasoning signature: `{askedUnknown:meetingWeekday,derivedFrom:operationKinds,family:calendar,operationKinds:[multiply,subtract,ratio],reasoningDirection:meetingWeekday,templateId:CAL_H_CYCLE_MEET}`
- requested target: `meetingWeekday`
- scenario: `calendar/CAL_H_CYCLE_MEET`
- stem skeleton: `يزور أحدهما المكتبة كل # أيام ويزورها الآخر كل # أيام، والتقيا فيها اليوم، وكان يوم الأحد. في أي يوم من أيام الأسبوع يلتقيان فيها مرة أخرى؟`

> يزور أحدهما المكتبة كل 8 أيام ويزورها الآخر كل 10 أيام، والتقيا فيها اليوم، وكان يوم الأحد. في أي يوم من أيام الأسبوع يلتقيان فيها مرة أخرى؟
>
> — CAL_H_CYCLE_MEET · medium · compact/given · answer B) الجمعة

> يزور أحدهما المكتبة كل 4 أيام ويزورها الآخر كل 10 أيام. التقيا فيها اليوم، وكان يوم الثلاثاء. في أي يوم من أيام الأسبوع يلتقيان فيها مرة أخرى؟
>
> — CAL_H_CYCLE_MEET · medium · sequential/given · answer A) الاثنين

> يزور أحدهما المكتبة كل 4 أيام ويزورها الآخر كل 10 أيام. التقيا فيها اليوم، وكان يوم الخميس. في أي يوم من أيام الأسبوع يلتقيان فيها مرة أخرى؟
>
> — CAL_H_CYCLE_MEET · medium · sequential/given · answer D) الأربعاء

### family:calendar|scenario:two_dated_weekdays_across_a_month_boundary|asks:daysBetweenDates|direction:reverse

- occurrences in the sample: **63** of 360
- reasoning signature: `{askedUnknown:daysBetweenDates,derivedFrom:operationKinds,family:calendar,operationKinds:[add,subtract],reasoningDirection:daysBetweenDates,templateId:CAL_H_MONTH_LENGTH}`
- requested target: `daysBetweenDates`
- scenario: `calendar/two_dated_weekdays_across_a_month_boundary`
- stem skeleton: `كان اليوم # من شهرٍ ما يوم الاثنين، وكان اليوم # من الشهر الذي يليه يوم الخميس. كم يومًا بين التاريخين؟`

> كان اليوم 7 من شهرٍ ما يوم الاثنين، وكان اليوم 10 من الشهر الذي يليه يوم الخميس. كم يومًا بين التاريخين؟
>
> — CAL_H_MONTH_LENGTH · hard · compact/given · answer F) 31 يومًا

> كان اليوم 6 من شهرٍ ما يوم الجمعة، وكان اليوم 20 من الشهر الذي يليه يوم الأحد. كم يومًا بين التاريخين؟
>
> — CAL_H_MONTH_LENGTH · hard · compact/given · answer E) 44 يومًا

> كان اليوم 18 من شهرٍ ما يوم السبت، وكان اليوم 19 من الشهر الذي يليه يوم الأربعاء. كم يومًا بين التاريخين؟
>
> — CAL_H_MONTH_LENGTH · hard · sequential/given · answer E) 32 يومًا

### family:calendar|scenario:two_cycles_with_offset_starts|asks:firstSharedWeekday|direction:forward

- occurrences in the sample: **57** of 360
- reasoning signature: `{askedUnknown:firstSharedWeekday,derivedFrom:operationKinds,family:calendar,operationKinds:[multiply,subtract,ratio],reasoningDirection:firstSharedWeekday,templateId:CAL_H_OFFSET_CYCLES}`
- requested target: `firstSharedWeekday`
- scenario: `calendar/two_cycles_with_offset_starts`
- stem skeleton: `يتكرر الحدث الأول كل # أيام ابتداءً من يوم الجمعة، ويتكرر الحدث الثاني كل # يومًا ابتداءً بعد # أيام من بداية الأول. ما اليوم الذي يجتمع فيه الحدثان لأول مرة؟`

> يتكرر الحدث الأول كل 4 أيام ابتداءً من يوم الجمعة، ويتكرر الحدث الثاني كل 12 يومًا ابتداءً بعد 4 أيام من بداية الأول. ما اليوم الذي يجتمع فيه الحدثان لأول مرة؟
>
> — CAL_H_OFFSET_CYCLES · hard · sequential/given · answer F) الثلاثاء

> يتكرر الحدث الأول كل 8 أيام ابتداءً من يوم الأحد، ويتكرر الحدث الثاني كل 14 يومًا ابتداءً بعد 6 أيام من بداية الأول. ما اليوم الذي يجتمع فيه الحدثان لأول مرة؟
>
> — CAL_H_OFFSET_CYCLES · hard · sequential/given · answer E) السبت

> يتكرر الحدث الأول كل 8 أيام ابتداءً من يوم الجمعة، ويتكرر الحدث الثاني كل 14 يومًا ابتداءً بعد 8 أيام من بداية الأول. ما اليوم الذي يجتمع فيه الحدثان لأول مرة؟
>
> — CAL_H_OFFSET_CYCLES · hard · compact/given · answer D) السبت

## odd_one_out — العدد الذي لا ينتمي

Sampled 240 questions across easy, medium; 7 distinct constructions, largest group 64.

### family:odd_one_out|scenario:ODD_H_TRIANGULAR|asks:outlier|direction:forward

- occurrences in the sample: **64** of 240
- reasoning signature: `{askedUnknown:outlier,derivedFrom:operationKinds,family:odd_one_out,operationKinds:[multiply,divide],reasoningDirection:outlier,templateId:ODD_H_TRIANGULAR}`
- requested target: `outlier`
- scenario: `odd_one_out/ODD_H_TRIANGULAR`
- stem skeleton: `أي عدد لا ينتمي إلى المجموعة الآتية؟`

> أي عدد لا ينتمي إلى المجموعة الآتية؟
> 
> `72، 45، 66، 91، 55، 78`
>
> — ODD_H_TRIANGULAR · medium · fixed/given · answer B) 72

> أي عدد لا ينتمي إلى المجموعة الآتية؟
> 
> `55، 78، 105، 42، 66، 91`
>
> — ODD_H_TRIANGULAR · medium · fixed/given · answer F) 42

> أي عدد لا ينتمي إلى المجموعة الآتية؟
> 
> `171، 105، 153، 120، 188، 136`
>
> — ODD_H_TRIANGULAR · medium · fixed/given · answer C) 188

### family:odd_one_out|scenario:ODD_H_SQ_MINUS|asks:outlier|direction:forward

- occurrences in the sample: **56** of 240
- reasoning signature: `{askedUnknown:outlier,derivedFrom:operationKinds,family:odd_one_out,operationKinds:[multiply,add],reasoningDirection:outlier,templateId:ODD_H_SQ_MINUS}`
- requested target: `outlier`
- scenario: `odd_one_out/ODD_H_SQ_MINUS`
- stem skeleton: `أي عدد لا ينتمي إلى المجموعة الآتية؟`

> أي عدد لا ينتمي إلى المجموعة الآتية؟
> 
> `63، 80، 99، 35، 48، 90`
>
> — ODD_H_SQ_MINUS · medium · fixed/given · answer D) 90

> أي عدد لا ينتمي إلى المجموعة الآتية؟
> 
> `4، 48، 63، 15، 35، 24`
>
> — ODD_H_SQ_MINUS · medium · fixed/given · answer B) 4

> أي عدد لا ينتمي إلى المجموعة الآتية؟
> 
> `48، 42، 63، 80، 35، 99`
>
> — ODD_H_SQ_MINUS · medium · fixed/given · answer C) 42

### family:odd_one_out|scenario:ODD_M_CUBES|asks:outlier|direction:forward

- occurrences in the sample: **30** of 240
- reasoning signature: `{askedUnknown:outlier,derivedFrom:operationKinds,family:odd_one_out,operationKinds:[multiply],reasoningDirection:outlier,templateId:ODD_M_CUBES}`
- requested target: `outlier`
- scenario: `odd_one_out/ODD_M_CUBES`
- stem skeleton: `أي عدد لا ينتمي إلى المجموعة الآتية؟`

> أي عدد لا ينتمي إلى المجموعة الآتية؟
> 
> `512، 125، 343، 216، 625، 64`
>
> — ODD_M_CUBES · easy · fixed/given · answer A) 625

> أي عدد لا ينتمي إلى المجموعة الآتية؟
> 
> `216، 512، 125، 64، 343، 289`
>
> — ODD_M_CUBES · easy · fixed/given · answer D) 289

> أي عدد لا ينتمي إلى المجموعة الآتية؟
> 
> `216، 343، 100، 512، 64، 125`
>
> — ODD_M_CUBES · easy · fixed/given · answer D) 100

## profit_loss — الربح والخسارة والأسعار

Sampled 360 questions across easy, medium, hard; 66 distinct constructions, largest group 11.

### family:profit_loss|scenario:bookshop|asks:costFromSellPrice|direction:forward

- occurrences in the sample: **11** of 360
- reasoning signature: `{askedUnknown:costFromSellPrice,derivedFrom:operationKinds,family:profit_loss,operationKinds:[add,multiply,divide],reasoningDirection:costFromSellPrice,templateId:PL_H_REVERSE}`
- requested target: `costFromSellPrice`
- scenario: `profit_loss/bookshop`
- stem skeleton: `باعت مكتبة كتابًا بـ# درهمًا محققًا ربحًا قدره #% من تكلفة الشراء. فما تكلفة الشراء؟`

> باعت مكتبة كتابًا بـ150 درهمًا محققًا ربحًا قدره 50% من تكلفة الشراء. فما تكلفة الشراء؟
>
> — PL_H_REVERSE · easy · compact/given · answer E) 100 درهمًا

> باعت مكتبة كتابًا بـ300 درهمًا محققًا ربحًا قدره 25% من تكلفة الشراء. فما تكلفة الشراء؟
>
> — PL_H_REVERSE · easy · sequential/given · answer E) 240 درهمًا

> باعت مكتبة كتابًا بـ200 درهمًا محققًا ربحًا قدره 25% من تكلفة الشراء. فما تكلفة الشراء؟
>
> — PL_H_REVERSE · easy · compact/given · answer F) 160 درهمًا

### family:profit_loss|scenario:bookshop|asks:profitPercent|direction:forward

- occurrences in the sample: **11** of 360
- reasoning signature: `{askedUnknown:profitPercent,derivedFrom:operationKinds,family:profit_loss,operationKinds:[subtract,multiply,divide],reasoningDirection:profitPercent,templateId:PL_E_PROFIT}`
- requested target: `profitPercent`
- scenario: `profit_loss/bookshop`
- stem skeleton: `اشترت مكتبة كتابًا بـ# درهمًا وباعه بـ# درهمًا. ما نسبة الربح من سعر الشراء؟`

> اشترت مكتبة كتابًا بـ160 درهمًا وباعه بـ232 درهمًا. ما نسبة الربح من سعر الشراء؟
>
> — PL_E_PROFIT · easy · sequential/given · answer B) 45%

> اشترت مكتبة كتابًا بـ180 درهمًا وباعه بـ207 درهمًا. ما نسبة الربح من سعر الشراء؟
>
> — PL_E_PROFIT · easy · sequential/given · answer E) 15%

> اشترت مكتبة كتابًا بـ120 درهمًا وباعه بـ150 درهمًا. ما نسبة الربح من سعر الشراء؟
>
> — PL_E_PROFIT · easy · sequential/given · answer F) 25%

### family:profit_loss|scenario:furniture/consignment_part_sold_target_overall_margin|asks:remainderMarginPercent|direction:reverse

- occurrences in the sample: **11** of 360
- reasoning signature: `{askedUnknown:remainderMarginPercent,derivedFrom:operationKinds,family:profit_loss,operationKinds:[subtract,multiply,divide],reasoningDirection:remainderMarginPercent,templateId:PL_H_REST_MARGIN}`
- requested target: `remainderMarginPercent`
- scenario: `profit_loss/furniture/consignment_part_sold_target_overall_margin`
- stem skeleton: `اشترى تاجر بضاعة بمبلغ # درهمًا. باع منها ما تكلفته # درهمًا بربح #% من تكلفة ذلك الجزء. بكم في المئة من تكلفة الباقي يجب أن يبيع الباقي ليكون ربحه الكلي #% من `

> اشترى تاجر بضاعة بمبلغ 480 درهمًا. باع منها ما تكلفته 120 درهمًا بربح 10% من تكلفة ذلك الجزء. بكم في المئة من تكلفة الباقي يجب أن يبيع الباقي ليكون ربحه الكلي 25% من التكلفة الكلية؟
>
> — PL_H_REST_MARGIN · hard · sequential/given · answer C) 30%

> اشترى تاجر بضاعة بمبلغ 500 درهمًا. باع منها ما تكلفته 400 درهمًا بربح 15% من تكلفة ذلك الجزء. بكم في المئة من تكلفة الباقي يجب أن يبيع الباقي ليكون ربحه الكلي 25% من التكلفة الكلية؟
>
> — PL_H_REST_MARGIN · hard · sequential/given · answer D) 65%

> المعطيات: اشترى تاجر بضاعة بمبلغ 500 درهمًا؛ باع منها ما تكلفته 200 درهمًا بربح 10% من تكلفة ذلك الجزء. بكم في المئة من تكلفة الباقي يجب أن يبيع الباقي ليكون ربحه الكلي 16% من التكلفة الكلية؟
>
> — PL_H_REST_MARGIN · hard · listed/given · answer C) 20%

