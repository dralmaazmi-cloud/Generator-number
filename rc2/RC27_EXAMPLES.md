# RC2.7 — verbatim human-review examples

For every family, the three construction groups that recur most, with up to
3 questions from each rendered exactly as a candidate would see them. If a group
reads as one question asked repeatedly, that is visible here and nowhere in a
summary statistic.

## sequences — المتتاليات العددية

Sampled 360 questions across easy, medium, hard; 25 distinct constructions, largest group 28.

### family:sequences|scenario:SEQ_E_GEO|asks:nextTerm|direction:forward

- occurrences in the sample: **28** of 360
- reasoning signature: `{askedUnknown:nextTerm,family:sequences,pattern:[DIV(2)],reasoningDirection:nextTerm,templateId:SEQ_E_GEO}`
- requested target: `nextTerm`
- scenario: `sequences/SEQ_E_GEO`
- stem skeleton: `ما العدد التالي في المتتالية؟`

> ما العدد التالي في المتتالية؟
> 
> `128، 64، 32، 16، 8، ؟`
>
> — SEQ_E_GEO · easy · fixed/given · answer C) 4

> ما العدد التالي في المتتالية؟
> 
> `128، 64، 32، 16، 8، ؟`
>
> — SEQ_E_GEO · easy · fixed/given · answer F) 4

> ما العدد التالي في المتتالية؟
> 
> `5، 10، 20، 40، 80، ؟`
>
> — SEQ_E_GEO · easy · fixed/given · answer C) 160

### family:sequences|scenario:SEQ_H_ALT_DIV|asks:nextTerm|direction:forward

- occurrences in the sample: **28** of 360
- reasoning signature: `{askedUnknown:nextTerm,family:sequences,pattern:[SUB(5),DIV_LADDER(2,3,4)],reasoningDirection:nextTerm,templateId:SEQ_H_ALT_DIV}`
- requested target: `nextTerm`
- scenario: `sequences/SEQ_H_ALT_DIV`
- stem skeleton: `ما العدد التالي في المتتالية؟`

> ما العدد التالي في المتتالية؟
> 
> `285، 280، 140، 135، 45، 40، ؟`
>
> — SEQ_H_ALT_DIV · hard · fixed/given · answer A) 10

> ما العدد التالي في المتتالية؟
> 
> `261، 256، 128، 123، 41، 36، ؟`
>
> — SEQ_H_ALT_DIV · hard · fixed/given · answer D) 9

> ما العدد التالي في المتتالية؟
> 
> `339، 336، 168، 165، 55، 52، ؟`
>
> — SEQ_H_ALT_DIV · hard · fixed/given · answer A) 13

### family:sequences|scenario:SEQ_E_ARITH|asks:previousTerm|direction:forward

- occurrences in the sample: **25** of 360
- reasoning signature: `{askedUnknown:previousTerm,family:sequences,pattern:[ADD(-9)],reasoningDirection:previousTerm,templateId:SEQ_E_ARITH}`
- requested target: `previousTerm`
- scenario: `sequences/SEQ_E_ARITH`
- stem skeleton: `ما العدد السابق في المتتالية؟`

> ما العدد السابق في المتتالية؟
> 
> `؟، 28، 19، 10، 1، -8`
>
> — SEQ_E_ARITH · easy · fixed/given · answer D) 37

> ما العدد السابق في المتتالية؟
> 
> `؟، 25، 30، 35، 40، 45`
>
> — SEQ_E_ARITH · easy · fixed/given · answer E) 20

> ما العدد السابق في المتتالية؟
> 
> `؟، 14، 23، 32، 41، 50`
>
> — SEQ_E_ARITH · easy · fixed/given · answer E) 5

## ratios — النسب وتقسيم الكميات

Sampled 360 questions across easy, medium, hard; 11 distinct constructions, largest group 72.

### family:ratios|scenario:RAT_M_ADD_SIDE|asks:sumBeforeChange|direction:forward

- occurrences in the sample: **72** of 360
- reasoning signature: `{askedUnknown:sumBeforeChange,derivedFrom:operationKinds,family:ratios,operationKinds:[add,ratio,multiply,subtract,divide],reasoningDirection:sumBeforeChange,templateId:RAT_M_ADD_SIDE}`
- requested target: `sumBeforeChange`
- scenario: `ratios/RAT_M_ADD_SIDE`
- stem skeleton: `النسبة بين أ : ب = # : #، وأُضيفت # وحدات إلى ب فأصبحت النسبة أ : ب = # : #. فما مجموع أ + ب قبل الإضافة؟`

> النسبة بين أ : ب = 4 : 3، وأُضيفت 4 وحدات إلى ب فأصبحت النسبة أ : ب = 4 : 5. فما مجموع أ + ب قبل الإضافة؟
>
> — RAT_M_ADD_SIDE · medium · compact/given · answer E) 14

> المعطيات: النسبة بين أ : ب = 5 : 1؛ أُضيفت 4 وحدات إلى ب فأصبحت النسبة أ : ب = 5 : 2. فما مجموع أ + ب قبل الإضافة؟
>
> — RAT_M_ADD_SIDE · medium · listed/given · answer B) 24

> المعطيات: النسبة بين أ : ب = 3 : 1؛ أُضيفت 9 وحدات إلى ب فأصبحت النسبة أ : ب = 3 : 4. فما مجموع أ + ب قبل الإضافة؟
>
> — RAT_M_ADD_SIDE · medium · listed/given · answer B) 12

### family:ratios|scenario:RAT_E_KNOWN|asks:sideB|direction:forward

- occurrences in the sample: **45** of 360
- reasoning signature: `{askedUnknown:sideB,derivedFrom:operationKinds,family:ratios,operationKinds:[divide,multiply],reasoningDirection:sideB,templateId:RAT_E_KNOWN}`
- requested target: `sideB`
- scenario: `ratios/RAT_E_KNOWN`
- stem skeleton: `النسبة أ : ب = # : #. إذا كانت أ = #، فما قيمة ب؟`

> النسبة أ : ب = 3 : 2. إذا كانت أ = 12، فما قيمة ب؟
>
> — RAT_E_KNOWN · easy · compact/given · answer D) 8

> النسبة أ : ب = 5 : 6. إذا كانت أ = 45، فما قيمة ب؟
>
> — RAT_E_KNOWN · easy · sequential/given · answer A) 54

> النسبة أ : ب = 5 : 7. إذا كانت أ = 15، فما قيمة ب؟
>
> — RAT_E_KNOWN · easy · sequential/given · answer D) 21

### family:ratios|scenario:RAT_H_TWO_COMB|asks:thirdTerm|direction:forward

- occurrences in the sample: **33** of 360
- reasoning signature: `{askedUnknown:thirdTerm,derivedFrom:operationKinds,family:ratios,operationKinds:[multiply,ratio,add,divide],reasoningDirection:thirdTerm,templateId:RAT_H_TWO_COMB}`
- requested target: `thirdTerm`
- scenario: `ratios/RAT_H_TWO_COMB`
- stem skeleton: `النسبة أ : ب = # : #، والنسبة ب : ج = # : #. إذا كان أ + ب = #، فما قيمة ج؟`

> النسبة أ : ب = 1 : 3، والنسبة ب : ج = 2 : 3. إذا كان أ + ب = 16، فما قيمة ج؟
>
> — RAT_H_TWO_COMB · hard · compact/given · answer D) 18

> النسبة أ : ب = 1 : 2، والنسبة ب : ج = 3 : 2. إذا كان أ + ب = 18، فما قيمة ج؟
>
> — RAT_H_TWO_COMB · hard · sequential/given · answer F) 8

> النسبة أ : ب = 4 : 3، والنسبة ب : ج = 4 : 3. إذا كان أ + ب = 112، فما قيمة ج؟
>
> — RAT_H_TWO_COMB · hard · sequential/given · answer C) 36

## percentages — النسب المئوية

Sampled 360 questions across easy, medium, hard; 9 distinct constructions, largest group 120.

### family:percentages|scenario:PCT_H_TWO_GROUP_CHANGE|asks:firstGroupSize|direction:forward

- occurrences in the sample: **120** of 360
- reasoning signature: `{askedUnknown:firstGroupSize,derivedFrom:operationKinds,family:percentages,operationKinds:[multiply,divide,subtract,percent,add,ratio],reasoningDirection:firstGroupSize,templateId:PCT_H_TWO_GROUP_CHANGE}`
- requested target: `firstGroupSize`
- scenario: `percentages/PCT_H_TWO_GROUP_CHANGE`
- stem skeleton: `في مؤسسة قسمان، مجموع أفرادهما # شخصًا، وارتفع عدد أفراد القسم الأول بنسبة #% وانخفض عدد أفراد القسم الثاني بنسبة #%، فأصبح المجموع # شخصًا. كم كان عدد أفراد ال`

> في مؤسسة قسمان، مجموع أفرادهما 300 شخصًا، وارتفع عدد أفراد القسم الأول بنسبة 50% وانخفض عدد أفراد القسم الثاني بنسبة 10%، فأصبح المجموع 288 شخصًا. كم كان عدد أفراد القسم الأول؟
>
> — PCT_H_TWO_GROUP_CHANGE · hard · compact/given · answer F) 30 شخصًا

> المعطيات: في مؤسسة قسمان، مجموع أفرادهما 300 شخصًا؛ ارتفع عدد أفراد القسم الأول بنسبة 40% وانخفض عدد أفراد القسم الثاني بنسبة 5%، فأصبح المجموع 339 شخصًا. كم كان عدد أفراد القسم الأول؟
>
> — PCT_H_TWO_GROUP_CHANGE · hard · listed/given · answer B) 120 شخصًا

> في مؤسسة قسمان، مجموع أفرادهما 300 شخصًا. ارتفع عدد أفراد القسم الأول بنسبة 20% وانخفض عدد أفراد القسم الثاني بنسبة 30%، فأصبح المجموع 230 شخصًا. كم كان عدد أفراد القسم الأول؟
>
> — PCT_H_TWO_GROUP_CHANGE · hard · sequential/given · answer D) 40 شخصًا

### family:percentages|scenario:PCT_M_REMAIN|asks:remainingAfterTwoStages|direction:forward

- occurrences in the sample: **47** of 360
- reasoning signature: `{askedUnknown:remainingAfterTwoStages,derivedFrom:operationKinds,family:percentages,operationKinds:[multiply,divide,subtract],reasoningDirection:remainingAfterTwoStages,templateId:PCT_M_REMAIN}`
- requested target: `remainingAfterTwoStages`
- scenario: `percentages/PCT_M_REMAIN`
- stem skeleton: `في مجموعة عددها #، غاب #% منهم، ثم غادر #% من الموجودين بعد ذلك. كم بقي؟`

> في مجموعة عددها 80، غاب 25% منهم، ثم غادر 10% من الموجودين بعد ذلك. كم بقي؟
>
> — PCT_M_REMAIN · easy · sequential/given · answer E) 54

> في مجموعة عددها 200، غاب 40% منهم، ثم غادر 10% من الموجودين بعد ذلك. كم بقي؟
>
> — PCT_M_REMAIN · easy · sequential/given · answer B) 108

> في مجموعة عددها 100، غاب 40% منهم، ثم غادر 25% من الموجودين بعد ذلك. كم بقي؟
>
> — PCT_M_REMAIN · easy · sequential/given · answer F) 45

### family:percentages|scenario:PCT_M_UNIT_PRICE|asks:scaledCostAfterIncrease|direction:forward

- occurrences in the sample: **43** of 360
- reasoning signature: `{askedUnknown:scaledCostAfterIncrease,derivedFrom:operationKinds,family:percentages,operationKinds:[divide,add,multiply],reasoningDirection:scaledCostAfterIncrease,templateId:PCT_M_UNIT_PRICE}`
- requested target: `scaledCostAfterIncrease`
- scenario: `percentages/PCT_M_UNIT_PRICE`
- stem skeleton: `ثمن # وحدات هو # درهمًا. إذا ارتفع سعر الوحدة بمقدار #% من القيمة السابقة، فما ثمن # وحدات بعد الزيادة؟`

> ثمن 5 وحدات هو 60 درهمًا. إذا ارتفع سعر الوحدة بمقدار 20% من القيمة السابقة، فما ثمن 10 وحدات بعد الزيادة؟
>
> — PCT_M_UNIT_PRICE · easy · sequential/given · answer E) 144 درهمًا

> ثمن 8 وحدات هو 40 درهمًا. إذا ارتفع سعر الوحدة بمقدار 25% من القيمة السابقة، فما ثمن 10 وحدات بعد الزيادة؟
>
> — PCT_M_UNIT_PRICE · easy · sequential/given · answer C) 62.5 درهمًا

> ثمن 4 وحدات هو 24 درهمًا. إذا ارتفع سعر الوحدة بمقدار 25% من القيمة السابقة، فما ثمن 5 وحدات بعد الزيادة؟
>
> — PCT_M_UNIT_PRICE · easy · compact/given · answer F) 37.5 درهمًا

## averages — المتوسط الحسابي

Sampled 360 questions across easy, medium, hard; 61 distinct constructions, largest group 19.

### family:averages|scenario:library_pages|asks:overlappingValue|direction:forward

- occurrences in the sample: **19** of 360
- reasoning signature: `{askedUnknown:overlappingValue,derivedFrom:operationKinds,family:averages,operationKinds:[multiply,add,ratio,subtract],reasoningDirection:overlappingValue,templateId:AVG_H_OVERLAP}`
- requested target: `overlappingValue`
- scenario: `averages/library_pages`
- stem skeleton: `متوسط الصفحات كلها في سجل عدد صفحات # كتابًا هو # صفحة، ومتوسط أول # كتب في السجل هو # صفحة، ومتوسط آخر # كتب فيه هو # صفحات. فما عدد صفحات الكتاب الذي يقع في ا`

> متوسط الصفحات كلها في سجل عدد صفحات 11 كتابًا هو 13 صفحة، ومتوسط أول 6 كتب في السجل هو 23 صفحة، ومتوسط آخر 6 كتب فيه هو 10 صفحات. فما عدد صفحات الكتاب الذي يقع في الموضع الأوسط من السجل؟
>
> — AVG_H_OVERLAP · hard · compact/given · answer B) 55 صفحة

> متوسط الصفحات كلها في سجل عدد صفحات 9 كتب هو 20 صفحة. متوسط أول 5 كتب في السجل هو 28 صفحة. متوسط آخر 5 كتب فيه هو 20 صفحة. فما عدد صفحات الكتاب الذي يقع في الموضع الأوسط من السجل؟
>
> — AVG_H_OVERLAP · hard · sequential/given · answer B) 60 صفحة

> متوسط الصفحات كلها في سجل عدد صفحات 7 كتب هو 19 صفحة. متوسط أول 4 كتب في السجل هو 20 صفحة. متوسط آخر 4 كتب فيه هو 17 صفحة. فما عدد صفحات الكتاب الذي يقع في الموضع الأوسط من السجل؟
>
> — AVG_H_OVERLAP · hard · sequential/given · answer F) 15 صفحة

### family:averages|scenario:workshop_lengths|asks:overlappingValue|direction:forward

- occurrences in the sample: **19** of 360
- reasoning signature: `{askedUnknown:overlappingValue,derivedFrom:operationKinds,family:averages,operationKinds:[multiply,add,ratio,subtract],reasoningDirection:overlappingValue,templateId:AVG_H_OVERLAP}`
- requested target: `overlappingValue`
- scenario: `averages/workshop_lengths`
- stem skeleton: `المطلوب: طول اللوح الذي يقع في الموضع الأوسط من السجل. المعطيات: متوسط الأطوال كلها في سجل أطوال # ألواح هو # مترًا؛ متوسط أول # ألواح في السجل هو # مترًا؛ متوس`

> المطلوب: طول اللوح الذي يقع في الموضع الأوسط من السجل. المعطيات: متوسط الأطوال كلها في سجل أطوال 9 ألواح هو 18 مترًا؛ متوسط أول 5 ألواح في السجل هو 24 مترًا؛ متوسط آخر 5 ألواح فيه هو 15 مترًا.
>
> — AVG_H_OVERLAP · hard · question_first/given · answer B) 33 مترًا

> متوسط الأطوال كلها في سجل أطوال 7 ألواح هو 16 مترًا، ومتوسط أول 4 ألواح في السجل هو 26 مترًا، ومتوسط آخر 4 ألواح فيه هو 11 مترًا. فما طول اللوح الذي يقع في الموضع الأوسط من السجل؟
>
> — AVG_H_OVERLAP · hard · compact/given · answer D) 36 مترًا

> متوسط الأطوال كلها في سجل أطوال 9 ألواح هو 17 مترًا. متوسط أول 5 ألواح في السجل هو 17 مترًا. متوسط آخر 5 ألواح فيه هو 22 مترًا. فما طول اللوح الذي يقع في الموضع الأوسط من السجل؟
>
> — AVG_H_OVERLAP · hard · sequential/given · answer B) 42 مترًا

### family:averages|scenario:nursery_heights|asks:overlappingValue|direction:forward

- occurrences in the sample: **19** of 360
- reasoning signature: `{askedUnknown:overlappingValue,derivedFrom:operationKinds,family:averages,operationKinds:[multiply,add,ratio,subtract],reasoningDirection:overlappingValue,templateId:AVG_H_OVERLAP}`
- requested target: `overlappingValue`
- scenario: `averages/nursery_heights`
- stem skeleton: `متوسط الأطوال كلها في سجل أطوال # شتلات هو # سنتيمترًا، ومتوسط أول # شتلات في السجل هو # سنتيمترًا، ومتوسط آخر # شتلات فيه هو # سنتيمترًا. فما طول الشتلة التي ت`

> متوسط الأطوال كلها في سجل أطوال 9 شتلات هو 15 سنتيمترًا، ومتوسط أول 5 شتلات في السجل هو 12 سنتيمترًا، ومتوسط آخر 5 شتلات فيه هو 24 سنتيمترًا. فما طول الشتلة التي تقع في الموضع الأوسط من السجل؟
>
> — AVG_H_OVERLAP · hard · compact/given · answer B) 45 سنتيمترًا

> المعطيات: متوسط الأطوال كلها في سجل أطوال 7 شتلات هو 24 سنتيمترًا؛ متوسط أول 4 شتلات في السجل هو 27 سنتيمترًا؛ متوسط آخر 4 شتلات فيه هو 19 سنتيمترًا. فما طول الشتلة التي تقع في الموضع الأوسط من السجل؟
>
> — AVG_H_OVERLAP · hard · listed/given · answer C) 16 سنتيمترًا

> متوسط الأطوال كلها في سجل أطوال 9 شتلات هو 20 سنتيمترًا. متوسط أول 5 شتلات في السجل هو 13 سنتيمترًا. متوسط آخر 5 شتلات فيه هو 26 سنتيمترًا. فما طول الشتلة التي تقع في الموضع الأوسط من السجل؟
>
> — AVG_H_OVERLAP · hard · sequential/given · answer C) 15 سنتيمترًا

## ages — مسائل الأعمار

Sampled 360 questions across easy, medium, hard; 8 distinct constructions, largest group 120.

### family:ages|scenario:AGE_E_SUM_DIFF|asks:olderAge|direction:forward

- occurrences in the sample: **120** of 360
- reasoning signature: `{askedUnknown:olderAge,derivedFrom:operationKinds,family:ages,operationKinds:[divide,ratio,add],reasoningDirection:olderAge,templateId:AGE_E_SUM_DIFF}`
- requested target: `olderAge`
- scenario: `ages/AGE_E_SUM_DIFF`
- stem skeleton: `شخص أكبر من الآخر بـ# سنة، ومجموع عمريهما # سنة. كم @ الأكبر؟`

> شخص أكبر من الآخر بـ12 سنة، ومجموع عمريهما 58 سنة. كم عمر الأكبر؟
>
> — AGE_E_SUM_DIFF · easy · compact/given · answer E) 35 سنة

> شخص أكبر من الآخر بـ12 سنة، ومجموع عمريهما 54 سنة. كم عمر الأكبر؟
>
> — AGE_E_SUM_DIFF · easy · sequential/given · answer A) 33 سنة

> شخص أكبر من الآخر بـ4 سنوات، ومجموع عمريهما 22 سنة. كم عمر الأكبر؟
>
> — AGE_E_SUM_DIFF · easy · sequential/given · answer C) 13 سنة

### family:ages|scenario:AGE_H_PAST_FUT|asks:olderAgeNow|direction:forward

- occurrences in the sample: **120** of 360
- reasoning signature: `{askedUnknown:olderAgeNow,derivedFrom:operationKinds,family:ages,operationKinds:[multiply,subtract,add,divide],reasoningDirection:olderAgeNow,templateId:AGE_H_PAST_FUT}`
- requested target: `olderAgeNow`
- scenario: `ages/AGE_H_PAST_FUT`
- stem skeleton: `قبل سنتين كان @ @ ضعف @ @، وبعد # سنوات من الآن سيكون مجموع عمريهما # سنة. كم @ @ الآن؟`

> قبل سنتين كان عمر علي ضعف عمر راشد، وبعد 6 سنوات من الآن سيكون مجموع عمريهما 40 سنة. كم عمر علي الآن؟
>
> — AGE_H_PAST_FUT · hard · compact/given · answer F) 18 سنة

> المعطيات: قبل 5 سنوات كان عمر علي ضعف عمر راشد؛ بعد 4 سنوات من الآن سيكون مجموع عمريهما 45 سنة. كم عمر علي الآن؟
>
> — AGE_H_PAST_FUT · hard · listed/given · answer A) 23 سنة

> المعطيات: قبل 4 سنوات كان عمر علي ضعف عمر راشد؛ بعد 5 سنوات من الآن سيكون مجموع عمريهما 36 سنة. كم عمر علي الآن؟
>
> — AGE_H_PAST_FUT · hard · listed/given · answer B) 16 سنة

### family:ages|scenario:AGE_M_FUT_SUM_DIFF|asks:olderAgeNow|direction:forward

- occurrences in the sample: **24** of 360
- reasoning signature: `{askedUnknown:olderAgeNow,derivedFrom:operationKinds,family:ages,operationKinds:[multiply,subtract,divide,add],reasoningDirection:olderAgeNow,templateId:AGE_M_FUT_SUM_DIFF}`
- requested target: `olderAgeNow`
- scenario: `ages/AGE_M_FUT_SUM_DIFF`
- stem skeleton: `المعطيات: @ أكبر من @ بـ# سنوات؛ بعد # سنوات سيكون مجموع عمريهما # سنة. كم @ @ الآن؟`

> المعطيات: سارة أكبر من مريم بـ6 سنوات؛ بعد 4 سنوات سيكون مجموع عمريهما 36 سنة. كم عمر سارة الآن؟
>
> — AGE_M_FUT_SUM_DIFF · medium · listed/given · answer A) 17 سنة

> المعطيات: سارة أكبر من مريم بـ8 سنوات؛ بعد 6 سنوات سيكون مجموع عمريهما 60 سنة. كم عمر سارة الآن؟
>
> — AGE_M_FUT_SUM_DIFF · medium · listed/given · answer B) 28 سنة

> سارة أكبر من مريم بـ6 سنوات. بعد 5 سنوات سيكون مجموع عمريهما 48 سنة. كم عمر سارة الآن؟
>
> — AGE_M_FUT_SUM_DIFF · medium · sequential/given · answer D) 22 سنة

## speed — السرعة والمسافة والزمن

Sampled 360 questions across easy, medium, hard; 59 distinct constructions, largest group 40.

### family:speed|scenario:journey_split_between_two_speeds|asks:firstLegDistance|direction:reverse

- occurrences in the sample: **40** of 360
- reasoning signature: `{askedUnknown:firstLegDistance,derivedFrom:operationKinds,family:speed,operationKinds:[multiply,subtract,divide],reasoningDirection:firstLegDistance,templateId:SPD_H_LEG_SPLIT}`
- requested target: `firstLegDistance`
- scenario: `speed/journey_split_between_two_speeds`
- stem skeleton: `قطعت حافلة # كيلومترًا في # ساعات. سارت جزءًا من الرحلة بسرعة # كم/ساعة والجزء الباقي بسرعة # كم/ساعة. فما طول الجزء الأول؟`

> قطعت حافلة 240 كيلومترًا في 4 ساعات. سارت جزءًا من الرحلة بسرعة 30 كم/ساعة والجزء الباقي بسرعة 70 كم/ساعة. فما طول الجزء الأول؟
>
> — SPD_H_LEG_SPLIT · hard · sequential/given · answer A) 30 كيلومترًا

> قطعت عبّارة 190 كيلومترًا في 3 ساعات، وسارت جزءًا من الرحلة بسرعة 45 كم/ساعة والجزء الباقي بسرعة 100 كم/ساعة. فما طول الجزء الأول؟
>
> — SPD_H_LEG_SPLIT · hard · compact/given · answer D) 90 كيلومترًا

> المعطيات: قطعت حافلة 520 كيلومترًا في 7 ساعات؛ سارت جزءًا من الرحلة بسرعة 40 كم/ساعة والجزء الباقي بسرعة 100 كم/ساعة. فما طول الجزء الأول؟
>
> — SPD_H_LEG_SPLIT · hard · listed/given · answer D) 120 كيلومترًا

### family:speed|scenario:boat_with_and_against_current|asks:boatSpeed|direction:forward

- occurrences in the sample: **31** of 360
- reasoning signature: `{askedUnknown:boatSpeed,derivedFrom:operationKinds,family:speed,operationKinds:[divide,add,ratio],reasoningDirection:boatSpeed,templateId:SPD_H_CURRENT}`
- requested target: `boatSpeed`
- scenario: `speed/boat_with_and_against_current`
- stem skeleton: `قطع قارب # كيلومترًا مع التيار في # ساعة، وقطع المسافة نفسها ضد التيار في # ساعة. فما سرعة القارب في الماء الساكن؟`

> قطع قارب 391 كيلومترًا مع التيار في 17 ساعة، وقطع المسافة نفسها ضد التيار في 23 ساعة. فما سرعة القارب في الماء الساكن؟
>
> — SPD_H_CURRENT · hard · sequential/given · answer C) 20 كم/ساعة

> قطع قارب 240 كيلومترًا مع التيار في 12 ساعة، وقطع المسافة نفسها ضد التيار في 20 ساعة. فما سرعة القارب في الماء الساكن؟
>
> — SPD_H_CURRENT · hard · compact/given · answer E) 16 كم/ساعة

> قطع قارب 572 كيلومترًا مع التيار في 22 ساعة، وقطع المسافة نفسها ضد التيار في 26 ساعة. فما سرعة القارب في الماء الساكن؟
>
> — SPD_H_CURRENT · hard · compact/given · answer A) 24 كم/ساعة

### family:speed|scenario:journey_split_between_two_speeds|asks:secondLegHours|direction:reverse

- occurrences in the sample: **25** of 360
- reasoning signature: `{askedUnknown:secondLegHours,derivedFrom:operationKinds,family:speed,operationKinds:[multiply,subtract,divide],reasoningDirection:secondLegHours,templateId:SPD_H_LEG_SPLIT}`
- requested target: `secondLegHours`
- scenario: `speed/journey_split_between_two_speeds`
- stem skeleton: `المعطيات: قطعت دراجة # كيلومترًا في # ساعات؛ سارت جزءًا من الرحلة بسرعة # كم/ساعة والجزء الباقي بسرعة # كم/ساعة. فكم ساعة سارت بالسرعة الثانية؟`

> المعطيات: قطعت دراجة 550 كيلومترًا في 7 ساعات؛ سارت جزءًا من الرحلة بسرعة 50 كم/ساعة والجزء الباقي بسرعة 100 كم/ساعة. فكم ساعة سارت بالسرعة الثانية؟
>
> — SPD_H_LEG_SPLIT · hard · listed/given · answer C) 4 ساعات

> قطعت حافلة 285 كيلومترًا في 4 ساعات، وسارت جزءًا من الرحلة بسرعة 60 كم/ساعة والجزء الباقي بسرعة 75 كم/ساعة. فكم ساعة سارت بالسرعة الثانية؟
>
> — SPD_H_LEG_SPLIT · hard · compact/given · answer D) 3 ساعات

> المعطيات: قطعت عبّارة 320 كيلومترًا في 5 ساعات؛ سارت جزءًا من الرحلة بسرعة 40 كم/ساعة والجزء الباقي بسرعة 70 كم/ساعة. فكم ساعة سارت بالسرعة الثانية؟
>
> — SPD_H_LEG_SPLIT · hard · listed/given · answer A) 4 ساعات

## work_time — العمال والزمن

Sampled 360 questions across easy, medium, hard; 11 distinct constructions, largest group 104.

### family:work_time|scenario:three_workers_timed_in_pairs|asks:threeTogetherDays|direction:forward

- occurrences in the sample: **104** of 360
- reasoning signature: `{askedUnknown:threeTogetherDays,derivedFrom:operationKinds,family:work_time,operationKinds:[divide,ratio,multiply,add],reasoningDirection:threeTogetherDays,templateId:WORK_H_THREE_PAIRS}`
- requested target: `threeTogetherDays`
- scenario: `work_time/three_workers_timed_in_pairs`
- stem skeleton: `ينجز العاملان الأول والثاني عملًا معًا في # يومًا، والثاني والثالث في # يومًا، والأول والثالث في # يومًا. كم يومًا يحتاج الثلاثة معًا لإنجاز العمل نفسه؟`

> ينجز العاملان الأول والثاني عملًا معًا في 28 يومًا، والثاني والثالث في 24 يومًا، والأول والثالث في 21 يومًا. كم يومًا يحتاج الثلاثة معًا لإنجاز العمل نفسه؟
>
> — WORK_H_THREE_PAIRS · hard · compact/given · answer E) 16 يومًا

> ينجز العاملان الأول والثاني عملًا معًا في 28 يومًا، والثاني والثالث في 36 يومًا، والأول والثالث في 21 يومًا. كم يومًا يحتاج الثلاثة معًا لإنجاز العمل نفسه؟
>
> — WORK_H_THREE_PAIRS · hard · sequential/given · answer C) 18 يومًا

> ينجز العاملان الأول والثاني عملًا معًا في 20 يومًا، والثاني والثالث في 30 يومًا، والأول والثالث في 24 يومًا. كم يومًا يحتاج الثلاثة معًا لإنجاز العمل نفسه؟
>
> — WORK_H_THREE_PAIRS · hard · compact/given · answer D) 16 يومًا

### family:work_time|scenario:WORK_E_INVERSE|asks:daysForNewCrew|direction:forward

- occurrences in the sample: **44** of 360
- reasoning signature: `{askedUnknown:daysForNewCrew,derivedFrom:operationKinds,family:work_time,operationKinds:[multiply,subtract,divide],reasoningDirection:daysForNewCrew,templateId:WORK_E_INVERSE}`
- requested target: `daysForNewCrew`
- scenario: `work_time/WORK_E_INVERSE`
- stem skeleton: `يستطيع # عاملًا إنجاز عمل في # يومًا. إذا عمل # عاملًا بالكفاءة نفسها، فكم يومًا يحتاجون؟`

> يستطيع 12 عاملًا إنجاز عمل في 18 يومًا. إذا عمل 24 عاملًا بالكفاءة نفسها، فكم يومًا يحتاجون؟
>
> — WORK_E_INVERSE · easy · sequential/given · answer F) 9 أيام

> يستطيع 4 عمال إنجاز عمل في 18 يومًا. إذا عمل 24 عاملًا بالكفاءة نفسها، فكم يومًا يحتاجون؟
>
> — WORK_E_INVERSE · easy · compact/given · answer F) 3 أيام

> يستطيع 4 عمال إنجاز عمل في 12 يومًا. إذا عمل 24 عاملًا بالكفاءة نفسها، فكم يومًا يحتاجون؟
>
> — WORK_E_INVERSE · easy · compact/given · answer A) يومان

### family:work_time|scenario:WORK_E_VOLUME|asks:workersForMoreWork|direction:forward

- occurrences in the sample: **41** of 360
- reasoning signature: `{askedUnknown:workersForMoreWork,derivedFrom:operationKinds,family:work_time,operationKinds:[multiply,divide],reasoningDirection:workersForMoreWork,templateId:WORK_E_VOLUME}`
- requested target: `workersForMoreWork`
- scenario: `work_time/WORK_E_VOLUME`
- stem skeleton: `يستطيع # عمال إنجاز مهمتين خلال # أيام. كم عاملًا نحتاج لإنجاز # مهام خلال # أيام بالكفاءة نفسها؟`

> يستطيع 10 عمال إنجاز مهمتين خلال 4 أيام. كم عاملًا نحتاج لإنجاز 3 مهام خلال 4 أيام بالكفاءة نفسها؟
>
> — WORK_E_VOLUME · easy · compact/given · answer B) 15 عاملًا

> يستطيع 12 عاملًا إنجاز 4 مهام خلال 6 أيام. كم عاملًا نحتاج لإنجاز 6 مهام خلال 6 أيام بالكفاءة نفسها؟
>
> — WORK_E_VOLUME · easy · compact/given · answer E) 18 عاملًا

> يستطيع 6 عمال إنجاز 3 مهام خلال 6 أيام. كم عاملًا نحتاج لإنجاز 5 مهام خلال 6 أيام بالكفاءة نفسها؟
>
> — WORK_E_VOLUME · easy · sequential/given · answer D) 10 عمال

## machines — الآلات والإنتاج

Sampled 360 questions across easy, medium, hard; 66 distinct constructions, largest group 21.

### family:machines|scenario:bakery_loaves/mixed_fleet_shortfall|asks:minimumSecondTypeMachines|direction:minimum

- occurrences in the sample: **21** of 360
- reasoning signature: `{askedUnknown:minimumSecondTypeMachines,derivedFrom:operationKinds,family:machines,operationKinds:[multiply,subtract,divide,add,ratio],reasoningDirection:minimumSecondTypeMachines,templateId:MACH_H_MIN_SECOND_TYPE}`
- requested target: `minimumSecondTypeMachines`
- scenario: `machines/bakery_loaves/mixed_fleet_shortfall`
- stem skeleton: `مطلوب إنتاج # رغيفًا خلال # ساعات. تتوفر # آلات من النوع الأول، وتنتج كل واحدة منها # رغيف/ساعة. آلات النوع الثاني تنتج كل واحدة منها # رغيف/ساعة. فما أقل عدد م`

> مطلوب إنتاج 406 رغيفًا خلال 4 ساعات. تتوفر 3 آلات من النوع الأول، وتنتج كل واحدة منها 20 رغيف/ساعة. آلات النوع الثاني تنتج كل واحدة منها 9 رغيف/ساعة. فما أقل عدد من آلات النوع الثاني يكفي لبلوغ المطلوب؟
>
> — MACH_H_MIN_SECOND_TYPE · hard · sequential/given · answer E) 5

> المطلوب: أقل عدد من آلات النوع الثاني يكفي لبلوغ المطلوب. المعطيات: مطلوب إنتاج 728 رغيفًا خلال 6 ساعات؛ تتوفر 4 آلات من النوع الأول، وتنتج كل واحدة منها 24 رغيف/ساعة؛ آلات النوع الثاني تنتج كل واحدة منها 10 رغيف/ساعة.
>
> — MACH_H_MIN_SECOND_TYPE · hard · question_first/given · answer E) 3

> المعطيات: مطلوب إنتاج 840 رغيفًا خلال 6 ساعات؛ تتوفر 5 آلات من النوع الأول، وتنتج كل واحدة منها 18 رغيف/ساعة؛ آلات النوع الثاني تنتج كل واحدة منها 9 رغيف/ساعة. فما أقل عدد من آلات النوع الثاني يكفي لبلوغ المطلوب؟
>
> — MACH_H_MIN_SECOND_TYPE · hard · listed/given · answer A) 6

### family:machines|scenario:cannery_cans/mixed_fleet_shortfall|asks:minimumSecondTypeMachines|direction:minimum

- occurrences in the sample: **19** of 360
- reasoning signature: `{askedUnknown:minimumSecondTypeMachines,derivedFrom:operationKinds,family:machines,operationKinds:[multiply,subtract,divide,add,ratio],reasoningDirection:minimumSecondTypeMachines,templateId:MACH_H_MIN_SECOND_TYPE}`
- requested target: `minimumSecondTypeMachines`
- scenario: `machines/cannery_cans/mixed_fleet_shortfall`
- stem skeleton: `مطلوب إنتاج # علبة خلال # ساعات. تتوفر # آلات من النوع الأول، وتنتج كل واحدة منها # علبة/ساعة. آلات النوع الثاني تنتج كل واحدة منها # علبة/ساعة. فما أقل عدد من `

> مطلوب إنتاج 735 علبة خلال 6 ساعات. تتوفر 5 آلات من النوع الأول، وتنتج كل واحدة منها 15 علبة/ساعة. آلات النوع الثاني تنتج كل واحدة منها 9 علبة/ساعة. فما أقل عدد من آلات النوع الثاني يكفي لبلوغ المطلوب؟
>
> — MACH_H_MIN_SECOND_TYPE · hard · sequential/given · answer B) 6

> مطلوب إنتاج 955 علبة خلال 8 ساعات. تتوفر 4 آلات من النوع الأول، وتنتج كل واحدة منها 18 علبة/ساعة. آلات النوع الثاني تنتج كل واحدة منها 9 علبة/ساعة. فما أقل عدد من آلات النوع الثاني يكفي لبلوغ المطلوب؟
>
> — MACH_H_MIN_SECOND_TYPE · hard · sequential/given · answer F) 6

> المطلوب: أقل عدد من آلات النوع الثاني يكفي لبلوغ المطلوب. المعطيات: مطلوب إنتاج 367 علبة خلال 4 ساعات؛ تتوفر آلتان من النوع الأول، وتنتج كل واحدة منها 12 علبة/ساعة؛ آلات النوع الثاني تنتج كل واحدة منها 14 علبة/ساعة.
>
> — MACH_H_MIN_SECOND_TYPE · hard · question_first/given · answer F) 5

### family:machines|scenario:abstract_units|asks:outputForNewSetup|direction:forward

- occurrences in the sample: **18** of 360
- reasoning signature: `{askedUnknown:outputForNewSetup,derivedFrom:operationKinds,family:machines,operationKinds:[multiply,subtract,divide],reasoningDirection:outputForNewSetup,templateId:MACH_E_HOURS}`
- requested target: `outputForNewSetup`
- scenario: `machines/abstract_units`
- stem skeleton: `تنتج # آلات متطابقة في الإنتاجية # وحدة خلال # ساعات. كم وحدة تنتج # آلات من النوع نفسه خلال # ساعات؟`

> تنتج 3 آلات متطابقة في الإنتاجية 180 وحدة خلال 3 ساعات. كم وحدة تنتج 5 آلات من النوع نفسه خلال 4 ساعات؟
>
> — MACH_E_HOURS · easy · compact/given · answer D) 400 وحدة

> تنتج 6 آلات متطابقة في الإنتاجية 240 وحدة خلال 4 ساعات. كم وحدة تنتج 4 آلات من النوع نفسه خلال ساعتين؟
>
> — MACH_E_HOURS · easy · compact/given · answer E) 80 وحدة

> تنتج 6 آلات متطابقة في الإنتاجية 360 وحدة خلال 3 ساعات. كم وحدة تنتج 4 آلات من النوع نفسه خلال ساعتين؟
>
> — MACH_E_HOURS · easy · sequential/given · answer A) 160 وحدة

## direct_proportion — التناسب المباشر

Sampled 360 questions across easy, medium, hard; 14 distinct constructions, largest group 63.

### family:direct_proportion|scenario:PROP_H_TWO_ITEM_SYSTEM|asks:boxUnitPrice|direction:forward

- occurrences in the sample: **63** of 360
- reasoning signature: `{askedUnknown:boxUnitPrice,derivedFrom:operationKinds,family:direct_proportion,operationKinds:[multiply,ratio,subtract,divide],reasoningDirection:boxUnitPrice,templateId:PROP_H_TWO_ITEM_SYSTEM}`
- requested target: `boxUnitPrice`
- scenario: `direct_proportion/PROP_H_TWO_ITEM_SYSTEM`
- stem skeleton: `ثمن # صناديق وقطعة واحدة معًا # درهمًا. وثمن صندوق واحد و# قطع معًا # درهمًا. فما ثمن الصندوق الواحد؟`

> ثمن 3 صناديق وقطعة واحدة معًا 59 درهمًا. وثمن صندوق واحد و4 قطع معًا 38 درهمًا. فما ثمن الصندوق الواحد؟
>
> — PROP_H_TWO_ITEM_SYSTEM · medium · sequential/given · answer D) 18 درهمًا

> المعطيات: ثمن 5 صناديق وقطعة واحدة معًا 33 درهمًا؛ وثمن صندوق واحد و4 قطع معًا 18 درهمًا. فما ثمن الصندوق الواحد؟
>
> — PROP_H_TWO_ITEM_SYSTEM · medium · listed/given · answer A) 6 دراهم

> ثمن 3 صناديق وقطعة واحدة معًا 22 درهمًا، وثمن 5 صناديق و5 قطع معًا 50 درهمًا. فما ثمن الصندوق الواحد؟
>
> — PROP_H_TWO_ITEM_SYSTEM · medium · compact/given · answer C) 6 دراهم

### family:direct_proportion|scenario:PROP_H_COMPOUND|asks:scaledOutputPlusReserve|direction:forward

- occurrences in the sample: **57** of 360
- reasoning signature: `{askedUnknown:scaledOutputPlusReserve,derivedFrom:operationKinds,family:direct_proportion,operationKinds:[divide,multiply,add],reasoningDirection:scaledOutputPlusReserve,templateId:PROP_H_COMPOUND}`
- requested target: `scaledOutputPlusReserve`
- scenario: `direct_proportion/PROP_H_COMPOUND`
- stem skeleton: `المعطيات: تحتاج # وحدات إلى # كيلوجرامًا من مادة؛ نريد تجهيز # وحدات، مع إضافة احتياط بنسبة #% فوق الكمية المحسوبة. كم كيلوجرامًا نحتاج؟`

> المعطيات: تحتاج 4 وحدات إلى 40 كيلوجرامًا من مادة؛ نريد تجهيز 10 وحدات، مع إضافة احتياط بنسبة 25% فوق الكمية المحسوبة. كم كيلوجرامًا نحتاج؟
>
> — PROP_H_COMPOUND · medium · listed/given · answer E) 125 كيلوجرامًا

> _(one rendered example withheld: this instance coincides with an item in a sealed holdout, and every example here is printed with its answer.)_

> تحتاج 5 وحدات إلى 30 كيلوجرامًا من مادة، ونريد تجهيز 10 وحدات، مع إضافة احتياط بنسبة 25% فوق الكمية المحسوبة. كم كيلوجرامًا نحتاج؟
>
> — PROP_H_COMPOUND · medium · compact/given · answer A) 75 كيلوجرامًا

### family:direct_proportion|scenario:two_pricing_plans|asks:smallestQuantityWhereSecondPlanWins|direction:comparison

- occurrences in the sample: **44** of 360
- reasoning signature: `{askedUnknown:smallestQuantityWhereSecondPlanWins,derivedFrom:operationKinds,family:direct_proportion,operationKinds:[subtract,multiply,divide,add,ratio],reasoningDirection:smallestQuantityWhereSecondPlanWins,templateId:PROP_H_BREAK_EVEN}`
- requested target: `smallestQuantityWhereSecondPlanWins`
- scenario: `direct_proportion/two_pricing_plans`
- stem skeleton: `الخطة الثانية رسم ثابت # درهمًا وسعر # دراهم للوحدة الواحدة، وتعرض شركة خطتين لشراء الوحدة نفسها، والخطة الأولى رسم ثابت # درهمًا وسعر # دراهم للوحدة الواحدة. م`

> الخطة الثانية رسم ثابت 40 درهمًا وسعر 6 دراهم للوحدة الواحدة، وتعرض شركة خطتين لشراء الوحدة نفسها، والخطة الأولى رسم ثابت 20 درهمًا وسعر 8 دراهم للوحدة الواحدة. ما أقل عدد صحيح من الوحدات تصبح عنده تكلفة الخطة الثانية أقل من تكلفة الأولى؟
>
> — PROP_H_BREAK_EVEN · hard · compact/rotated · answer D) 11

> المطلوب: أقل عدد صحيح من الوحدات تصبح عنده الخطة الثانية أقل تكلفة. المعطيات: تعرض شركة خطتين لشراء الوحدة نفسها؛ الخطة الأولى رسم ثابت 40 درهمًا وسعر 9 دراهم للوحدة الواحدة؛ الخطة الثانية رسم ثابت 65 درهمًا وسعر 4 دراهم للوحدة الواحدة.
>
> — PROP_H_BREAK_EVEN · hard · question_first/given · answer E) 6

> المعطيات: تعرض شركة خطتين لشراء الوحدة نفسها؛ الخطة الأولى رسم ثابت 40 درهمًا وسعر 15 درهمًا للوحدة الواحدة؛ الخطة الثانية رسم ثابت 64 درهمًا وسعر 12 درهمًا للوحدة الواحدة. ما أقل عدد صحيح من الوحدات تصبح عنده تكلفة الخطة الثانية أقل من تكلفة الأولى؟
>
> — PROP_H_BREAK_EVEN · hard · listed/given · answer B) 9

## fractions — الكسور المتتابعة

Sampled 120 questions across easy; 8 distinct constructions, largest group 20.

### family:fractions|scenario:FRAC_M_3|asks:hiddenFraction|direction:forward

- occurrences in the sample: **20** of 120
- reasoning signature: `{askedUnknown:hiddenFraction,derivedFrom:operationKinds,family:fractions,operationKinds:[multiply,divide],reasoningDirection:hiddenFraction,templateId:FRAC_M_3}`
- requested target: `hiddenFraction`
- scenario: `fractions/FRAC_M_3`
- stem skeleton: `ثُمن العدد #، ثم نصف الناتج، ثم كسرٌ من الناتج، فكان الناتج #. فما هذا الكسر؟`

> ثُمن العدد 640، ثم نصف الناتج، ثم كسرٌ من الناتج، فكان الناتج 10. فما هذا الكسر؟
>
> — FRAC_M_3 · easy · compact/given · answer D) الربع

> ثُمن العدد 1600، ثم خُمس الناتج، ثم كسرٌ من الناتج، فكان الناتج 10. فما هذا الكسر؟
>
> — FRAC_M_3 · easy · sequential/given · answer D) الربع

> ثلث العدد 576، ثم سُدس الناتج، ثم كسرٌ من الناتج، فكان الناتج 8. فما هذا الكسر؟
>
> — FRAC_M_3 · easy · compact/given · answer B) الربع

### family:fractions|scenario:FRAC_M_3|asks:chainResult|direction:forward

- occurrences in the sample: **19** of 120
- reasoning signature: `{askedUnknown:chainResult,derivedFrom:operationKinds,family:fractions,operationKinds:[divide],reasoningDirection:chainResult,templateId:FRAC_M_3}`
- requested target: `chainResult`
- scenario: `fractions/FRAC_M_3`
- stem skeleton: `ثلث العدد #، ثم ربع الناتج، ثم سُدس الناتج. ما الناتج؟`

> ثلث العدد 576، ثم ربع الناتج، ثم سُدس الناتج. ما الناتج؟
>
> — FRAC_M_3 · easy · sequential/given · answer F) 8

> ربع العدد 432، ثم ثلث الناتج، ثم سُدس الناتج. ما الناتج؟
>
> — FRAC_M_3 · easy · sequential/given · answer D) 6

> نصف العدد 576، ثم ثُمن الناتج، ثم سُدس الناتج. ما الناتج؟
>
> — FRAC_M_3 · easy · compact/given · answer D) 6

### family:fractions|scenario:FRAC_H_4|asks:startNumber|direction:forward

- occurrences in the sample: **17** of 120
- reasoning signature: `{askedUnknown:startNumber,derivedFrom:operationKinds,family:fractions,operationKinds:[multiply,divide],reasoningDirection:startNumber,templateId:FRAC_H_4}`
- requested target: `startNumber`
- scenario: `fractions/FRAC_H_4`
- stem skeleton: `خُمس عدد، ثم سُدس الناتج، ثم ثُمن الناتج، ثم ثلث الناتج، فكان الناتج #. فما العدد؟`

> خُمس عدد، ثم سُدس الناتج، ثم ثُمن الناتج، ثم ثلث الناتج، فكان الناتج 2. فما العدد؟
>
> — FRAC_H_4 · easy · compact/given · answer F) 1440

> ثُمن عدد، ثم خُمس الناتج، ثم ربع الناتج، ثم ثلث الناتج، فكان الناتج 6. فما العدد؟
>
> — FRAC_H_4 · easy · sequential/given · answer D) 2880

> خُمس عدد، ثم ثلث الناتج، ثم سُدس الناتج، ثم نصف الناتج، فكان الناتج 2. فما العدد؟
>
> — FRAC_H_4 · easy · compact/given · answer A) 360

## unit_rate — المعدل الوحدوي

Sampled 360 questions across easy, medium, hard; 47 distinct constructions, largest group 21.

### family:unit_rate|scenario:solar_panels|asks:originalRate|direction:forward

- occurrences in the sample: **21** of 360
- reasoning signature: `{askedUnknown:originalRate,derivedFrom:operationKinds,family:unit_rate,operationKinds:[divide,add,multiply,ratio],reasoningDirection:originalRate,templateId:RATE_H_RATE_FROM_GAP}`
- requested target: `originalRate`
- scenario: `unit_rate/solar_panels`
- stem skeleton: `ينجز جهاز # لوحًا بمعدل ثابت. ولو زاد معدله بمقدار # لوح/ساعة لأنجز العمل نفسه في # ساعات أقل. فما معدله الأصلي؟`

> ينجز جهاز 920 لوحًا بمعدل ثابت. ولو زاد معدله بمقدار 6 لوح/ساعة لأنجز العمل نفسه في 3 ساعات أقل. فما معدله الأصلي؟
>
> — RATE_H_RATE_FROM_GAP · hard · sequential/given · answer B) 40 وحدة/ساعة

> المعطيات: ينجز جهاز 1020 لوحًا بمعدل ثابت؛ ولو زاد معدله بمقدار 4 لوح/ساعة لأنجز العمل نفسه في 4 ساعات أقل. فما معدله الأصلي؟
>
> — RATE_H_RATE_FROM_GAP · hard · listed/given · answer A) 30 وحدة/ساعة

> ينجز جهاز 800 لوحًا بمعدل ثابت. ولو زاد معدله بمقدار 10 لوح/ساعة لأنجز العمل نفسه في 4 ساعات أقل. فما معدله الأصلي؟
>
> — RATE_H_RATE_FROM_GAP · hard · sequential/given · answer D) 40 وحدة/ساعة

### family:unit_rate|scenario:press_pages|asks:originalRate|direction:forward

- occurrences in the sample: **19** of 360
- reasoning signature: `{askedUnknown:originalRate,derivedFrom:operationKinds,family:unit_rate,operationKinds:[divide,add,multiply,ratio],reasoningDirection:originalRate,templateId:RATE_H_RATE_FROM_GAP}`
- requested target: `originalRate`
- scenario: `unit_rate/press_pages`
- stem skeleton: `المعطيات: ينجز جهاز # صفحة بمعدل ثابت؛ ولو زاد معدله بمقدار # صفحة/ساعة لأنجز العمل نفسه في ساعتين أقل. فما معدله الأصلي؟`

> المعطيات: ينجز جهاز 120 صفحة بمعدل ثابت؛ ولو زاد معدله بمقدار 10 صفحة/ساعة لأنجز العمل نفسه في ساعتين أقل. فما معدله الأصلي؟
>
> — RATE_H_RATE_FROM_GAP · hard · listed/given · answer B) 20 وحدة/ساعة

> ينجز جهاز 180 صفحة بمعدل ثابت، ولو زاد معدله بمقدار 6 صفحة/ساعة لأنجز العمل نفسه في ساعة واحدة أقل. فما معدله الأصلي؟
>
> — RATE_H_RATE_FROM_GAP · hard · compact/given · answer D) 30 وحدة/ساعة

> المعطيات: ينجز جهاز 48 صفحة بمعدل ثابت؛ ولو زاد معدله بمقدار 4 صفحة/ساعة لأنجز العمل نفسه في ساعة واحدة أقل. فما معدله الأصلي؟
>
> — RATE_H_RATE_FROM_GAP · hard · listed/given · answer F) 12 وحدة/ساعة

### family:unit_rate|scenario:abstract_pieces|asks:originalRate|direction:forward

- occurrences in the sample: **18** of 360
- reasoning signature: `{askedUnknown:originalRate,derivedFrom:operationKinds,family:unit_rate,operationKinds:[divide,add,multiply,ratio],reasoningDirection:originalRate,templateId:RATE_H_RATE_FROM_GAP}`
- requested target: `originalRate`
- scenario: `unit_rate/abstract_pieces`
- stem skeleton: `ينجز جهاز # قطعة بمعدل ثابت. ولو زاد معدله بمقدار # قطعة/ساعة لأنجز العمل نفسه في ساعة واحدة أقل. فما معدله الأصلي؟`

> ينجز جهاز 60 قطعة بمعدل ثابت. ولو زاد معدله بمقدار 5 قطعة/ساعة لأنجز العمل نفسه في ساعة واحدة أقل. فما معدله الأصلي؟
>
> — RATE_H_RATE_FROM_GAP · hard · sequential/given · answer C) 15 وحدة/ساعة

> ينجز جهاز 80 قطعة بمعدل ثابت، ولو زاد معدله بمقدار 6 قطعة/ساعة لأنجز العمل نفسه في 3 ساعات أقل. فما معدله الأصلي؟
>
> — RATE_H_RATE_FROM_GAP · hard · compact/given · answer D) 10 وحدة/ساعة

> ينجز جهاز 150 قطعة بمعدل ثابت، ولو زاد معدله بمقدار 10 قطعة/ساعة لأنجز العمل نفسه في 4 ساعات أقل. فما معدله الأصلي؟
>
> — RATE_H_RATE_FROM_GAP · hard · compact/given · answer D) 15 وحدة/ساعة

## combined_rate — المعدل المشترك

Sampled 360 questions across easy, medium, hard; 54 distinct constructions, largest group 20.

### family:combined_rate|scenario:bakery_loaves|asks:firstPumpSoloHours|direction:forward

- occurrences in the sample: **20** of 360
- reasoning signature: `{askedUnknown:firstPumpSoloHours,derivedFrom:operationKinds,family:combined_rate,operationKinds:[divide,subtract,ratio,multiply],reasoningDirection:firstPumpSoloHours,templateId:COMB_H_TWO_PUMPS}`
- requested target: `firstPumpSoloHours`
- scenario: `combined_rate/bakery_loaves`
- stem skeleton: `تملأ مضختان خزانًا معًا في # ساعات. ولو عملت الأولى وحدها # ساعة ثم أكملت الثانية وحدها ساعتين لامتلأ الخزان أيضًا. كم ساعة تحتاج الأولى وحدها لملئه؟`

> تملأ مضختان خزانًا معًا في 8 ساعات. ولو عملت الأولى وحدها 11 ساعة ثم أكملت الثانية وحدها ساعتين لامتلأ الخزان أيضًا. كم ساعة تحتاج الأولى وحدها لملئه؟
>
> — COMB_H_TWO_PUMPS · hard · sequential/given · answer A) 12 ساعة

> المعطيات: تملأ مضختان خزانًا معًا في 10 ساعات؛ ولو عملت الأولى وحدها 14 ساعة ثم أكملت الثانية وحدها ساعتين لامتلأ الخزان أيضًا. كم ساعة تحتاج الأولى وحدها لملئه؟
>
> — COMB_H_TWO_PUMPS · hard · listed/given · answer D) 15 ساعة

> تملأ مضختان خزانًا معًا في 8 ساعات. ولو عملت الأولى وحدها 10 ساعات ثم أكملت الثانية وحدها 4 ساعات لامتلأ الخزان أيضًا. كم ساعة تحتاج الأولى وحدها لملئه؟
>
> — COMB_H_TWO_PUMPS · hard · sequential/given · answer A) 12 ساعة

### family:combined_rate|scenario:press_pages|asks:firstPumpSoloHours|direction:forward

- occurrences in the sample: **18** of 360
- reasoning signature: `{askedUnknown:firstPumpSoloHours,derivedFrom:operationKinds,family:combined_rate,operationKinds:[divide,subtract,ratio,multiply],reasoningDirection:firstPumpSoloHours,templateId:COMB_H_TWO_PUMPS}`
- requested target: `firstPumpSoloHours`
- scenario: `combined_rate/press_pages`
- stem skeleton: `تملأ مضختان خزانًا معًا في # ساعات. ولو عملت الأولى وحدها # ساعة ثم أكملت الثانية وحدها # ساعات لامتلأ الخزان أيضًا. كم ساعة تحتاج الأولى وحدها لملئه؟`

> تملأ مضختان خزانًا معًا في 10 ساعات. ولو عملت الأولى وحدها 11 ساعة ثم أكملت الثانية وحدها 5 ساعات لامتلأ الخزان أيضًا. كم ساعة تحتاج الأولى وحدها لملئه؟
>
> — COMB_H_TWO_PUMPS · hard · sequential/given · answer A) 12 ساعة

> _(one rendered example withheld: this instance coincides with an item in a sealed holdout, and every example here is printed with its answer.)_

> المعطيات: تملأ مضختان خزانًا معًا في 4 ساعات؛ ولو عملت الأولى وحدها 12 ساعة ثم أكملت الثانية وحدها ساعتين لامتلأ الخزان أيضًا. كم ساعة تحتاج الأولى وحدها لملئه؟
>
> — COMB_H_TWO_PUMPS · hard · listed/given · answer F) 20 ساعة

### family:combined_rate|scenario:dairy_bottles|asks:firstPumpSoloHours|direction:forward

- occurrences in the sample: **18** of 360
- reasoning signature: `{askedUnknown:firstPumpSoloHours,derivedFrom:operationKinds,family:combined_rate,operationKinds:[divide,subtract,ratio,multiply],reasoningDirection:firstPumpSoloHours,templateId:COMB_H_TWO_PUMPS}`
- requested target: `firstPumpSoloHours`
- scenario: `combined_rate/dairy_bottles`
- stem skeleton: `تملأ مضختان خزانًا معًا في # ساعة. ولو عملت الأولى وحدها # ساعة ثم أكملت الثانية وحدها ساعتين لامتلأ الخزان أيضًا. كم ساعة تحتاج الأولى وحدها لملئه؟`

> تملأ مضختان خزانًا معًا في 12 ساعة. ولو عملت الأولى وحدها 32 ساعة ثم أكملت الثانية وحدها ساعتين لامتلأ الخزان أيضًا. كم ساعة تحتاج الأولى وحدها لملئه؟
>
> — COMB_H_TWO_PUMPS · hard · sequential/given · answer C) 36 ساعة

> _(one rendered example withheld: this instance coincides with an item in a sealed holdout, and every example here is printed with its answer.)_

> تملأ مضختان خزانًا معًا في 6 ساعات، ولو عملت الأولى وحدها 12 ساعة ثم أكملت الثانية وحدها 4 ساعات لامتلأ الخزان أيضًا. كم ساعة تحتاج الأولى وحدها لملئه؟
>
> — COMB_H_TWO_PUMPS · hard · compact/given · answer C) 24 ساعة

## relational — المقارنة والترتيب العلاقاتي

Sampled 360 questions across easy, medium, hard; 26 distinct constructions, largest group 43.

### family:relational|scenario:REL_M_BRANCH_UNRES|asks:undeterminedPair|direction:forward

- occurrences in the sample: **43** of 360
- reasoning signature: `{askedUnknown:undeterminedPair,derivedFrom:operationKinds,family:relational,operationKinds:[],reasoningDirection:undeterminedPair,templateId:REL_M_BRANCH_UNRES}`
- requested target: `undeterminedPair`
- scenario: `relational/REL_M_BRANCH_UNRES`
- stem skeleton: `@ أسرع من @. @ أسرع من @. @ أسرع من @. @ أسرع من @. @ أسرع من @. @ أسرع من @. أي مقارنة لا يمكن حسمها؟`

> فهد أسرع من حمد. حمد أسرع من ريم. بدر أسرع من ناصر. فهد أسرع من بدر. ريم أسرع من ماجد. ناصر أسرع من ماجد. أي مقارنة لا يمكن حسمها؟
>
> — REL_M_BRANCH_UNRES · hard · fixed/given · answer D) حمد وبدر

> هند أسرع من ناصر. علي أسرع من ناصر. بدر أسرع من سامي. بدر أسرع من حمد. حمد أسرع من ناصر. بدر أسرع من علي. سامي أسرع من هند. أي مقارنة لا يمكن حسمها؟
>
> — REL_M_BRANCH_UNRES · hard · fixed/given · answer F) علي وهند

> حمد أسرع من سارة. سارة أسرع من ناصر. فهد أسرع من ليان. حمد أسرع من فهد. أي مقارنة لا يمكن حسمها؟
>
> — REL_M_BRANCH_UNRES · hard · fixed/given · answer E) ليان وسارة

### family:relational|scenario:REL_H_GUARANTEE|asks:guaranteedDespiteBranches|direction:forward

- occurrences in the sample: **38** of 360
- reasoning signature: `{askedUnknown:guaranteedDespiteBranches,derivedFrom:operationKinds,family:relational,operationKinds:[],reasoningDirection:guaranteedDespiteBranches,templateId:REL_H_GUARANTEE}`
- requested target: `guaranteedDespiteBranches`
- scenario: `relational/REL_H_GUARANTEE`
- stem skeleton: `@ أسرع من @. @ أسرع من @. @ أسرع من @. @ أسرع من @. @ أسرع من @. أي عبارة يجب أن تكون صحيحة مهما كان ترتيب @ ونورة؟`

> مريم أسرع من علي. مريم أسرع من نورة. نورة أسرع من ليان. علي أسرع من ناصر. مريم أسرع من بدر. أي عبارة يجب أن تكون صحيحة مهما كان ترتيب علي ونورة؟
>
> — REL_H_GUARANTEE · medium · fixed/given · answer A) مريم أسرع من ناصر

> سامي أسرع من خالد. سارة أسرع من ماجد. ماجد أسرع من ناصر. سامي أسرع من نورة. خالد أسرع من سارة. أي عبارة يجب أن تكون صحيحة مهما كان ترتيب ناصر ونورة؟
>
> — REL_H_GUARANTEE · medium · fixed/given · answer F) خالد أسرع من ماجد

> نورة أسرع من سالم. سالم أسرع من ريم. فهد أسرع من راشد. نورة أسرع من فهد. ريم أسرع من ماجد. أي عبارة يجب أن تكون صحيحة مهما كان ترتيب ماجد وراشد؟
>
> — REL_H_GUARANTEE · medium · fixed/given · answer E) نورة أسرع من راشد

### family:relational|scenario:REL_H_COUNT_BRANCHED|asks:countAbove|direction:forward

- occurrences in the sample: **35** of 360
- reasoning signature: `{askedUnknown:countAbove,derivedFrom:operationKinds,family:relational,operationKinds:[ratio],reasoningDirection:countAbove,templateId:REL_H_COUNT_BRANCHED}`
- requested target: `countAbove`
- scenario: `relational/REL_H_COUNT_BRANCHED`
- stem skeleton: `@ أسرع من @. @ أسرع من @. @ أسرع من @. @ أسرع من @. @ أسرع من @. @ أسرع من @. @ أسرع من @. @ أسرع من @. @ أسرع من @. @ أسرع من @. @ أسرع من @. كم شخصًا نعرف يقي`

> فهد أسرع من سالم. خالد أسرع من ناصر. سالم أسرع من ماجد. بدر أسرع من هند. فهد أسرع من ناصر. هند أسرع من ماجد. خالد أسرع من بدر. ناصر أسرع من علي. فهد أسرع من بدر. علي أسرع من ماجد. خالد أسرع من سالم. كم شخصًا نعرف يقينًا أنهم أسرع من ناصر؟
>
> — REL_H_COUNT_BRANCHED · hard · fixed/given · answer D) شخصان

> راشد أسرع من علي. علي أسرع من سامي. سامي أسرع من خالد. نورة أسرع من سالم. نورة أسرع من علي. سالم أسرع من خالد. راشد أسرع من سالم. كم شخصًا نعرف يقينًا أنهم أسرع من خالد؟
>
> — REL_H_COUNT_BRANCHED · hard · fixed/given · answer F) خمسة أشخاص

> بدر أسرع من حمد. نورة أسرع من بدر. ليان أسرع من سالم. حمد أسرع من فهد. نورة أسرع من سالم. ليان أسرع من بدر. نورة أسرع من خالد. ليان أسرع من خالد. كم شخصًا نعرف يقينًا أنهم أسرع من سالم؟
>
> — REL_H_COUNT_BRANCHED · hard · fixed/given · answer F) شخصان

## calendar — الاستدلال الزمني وأيام الأسبوع

Sampled 360 questions across easy, medium, hard; 9 distinct constructions, largest group 120.

### family:calendar|scenario:CAL_H_CYCLE_MEET|asks:meetingWeekday|direction:forward

- occurrences in the sample: **120** of 360
- reasoning signature: `{askedUnknown:meetingWeekday,derivedFrom:operationKinds,family:calendar,operationKinds:[multiply,subtract,ratio],reasoningDirection:meetingWeekday,templateId:CAL_H_CYCLE_MEET}`
- requested target: `meetingWeekday`
- scenario: `calendar/CAL_H_CYCLE_MEET`
- stem skeleton: `يزور أحدهما المكتبة كل # أيام ويزورها الآخر كل # أيام، والتقيا فيها اليوم، وكان يوم الأحد. في أي يوم من أيام الأسبوع يلتقيان فيها مرة أخرى؟`

> يزور أحدهما المكتبة كل 4 أيام ويزورها الآخر كل 10 أيام، والتقيا فيها اليوم، وكان يوم الأحد. في أي يوم من أيام الأسبوع يلتقيان فيها مرة أخرى؟
>
> — CAL_H_CYCLE_MEET · medium · compact/given · answer A) السبت

> يزور أحدهما المكتبة كل 10 أيام ويزورها الآخر كل 15 يومًا. التقيا فيها اليوم، وكان يوم الأحد. في أي يوم من أيام الأسبوع يلتقيان فيها مرة أخرى؟
>
> — CAL_H_CYCLE_MEET · medium · sequential/given · answer D) الثلاثاء

> المعطيات: يزور أحدهما المكتبة كل 10 أيام ويزورها الآخر كل 8 أيام؛ التقيا فيها اليوم، وكان يوم الأحد. في أي يوم من أيام الأسبوع يلتقيان فيها مرة أخرى؟
>
> — CAL_H_CYCLE_MEET · medium · listed/given · answer E) الجمعة

### family:calendar|scenario:two_cycles_with_offset_starts|asks:firstSharedWeekday|direction:forward

- occurrences in the sample: **65** of 360
- reasoning signature: `{askedUnknown:firstSharedWeekday,derivedFrom:operationKinds,family:calendar,operationKinds:[multiply,subtract,ratio],reasoningDirection:firstSharedWeekday,templateId:CAL_H_OFFSET_CYCLES}`
- requested target: `firstSharedWeekday`
- scenario: `calendar/two_cycles_with_offset_starts`
- stem skeleton: `يتكرر الحدث الأول كل # أيام ابتداءً من يوم الخميس، ويتكرر الحدث الثاني كل # أيام ابتداءً بعد # أيام من بداية الأول. ما اليوم الذي يجتمع فيه الحدثان لأول مرة؟`

> يتكرر الحدث الأول كل 5 أيام ابتداءً من يوم الخميس، ويتكرر الحدث الثاني كل 7 أيام ابتداءً بعد 4 أيام من بداية الأول. ما اليوم الذي يجتمع فيه الحدثان لأول مرة؟
>
> — CAL_H_OFFSET_CYCLES · hard · sequential/given · answer E) الاثنين

> يتكرر الحدث الأول كل 8 أيام ابتداءً من يوم السبت، ويتكرر الحدث الثاني كل 10 أيام ابتداءً بعد يومين من بداية الأول. ما اليوم الذي يجتمع فيه الحدثان لأول مرة؟
>
> — CAL_H_OFFSET_CYCLES · hard · sequential/given · answer F) الأربعاء

> يتكرر الحدث الأول كل 8 أيام ابتداءً من يوم الأحد، ويتكرر الحدث الثاني كل 14 يومًا ابتداءً بعد 8 أيام من بداية الأول. ما اليوم الذي يجتمع فيه الحدثان لأول مرة؟
>
> — CAL_H_OFFSET_CYCLES · hard · sequential/given · answer C) الاثنين

### family:calendar|scenario:two_dated_weekdays_across_a_month_boundary|asks:daysBetweenDates|direction:reverse

- occurrences in the sample: **55** of 360
- reasoning signature: `{askedUnknown:daysBetweenDates,derivedFrom:operationKinds,family:calendar,operationKinds:[add,subtract],reasoningDirection:daysBetweenDates,templateId:CAL_H_MONTH_LENGTH}`
- requested target: `daysBetweenDates`
- scenario: `calendar/two_dated_weekdays_across_a_month_boundary`
- stem skeleton: `كان اليوم # من شهرٍ ما يوم الأحد، وكان اليوم # من الشهر الذي يليه يوم الاثنين. كم يومًا بين التاريخين؟`

> كان اليوم 11 من شهرٍ ما يوم الأحد، وكان اليوم 16 من الشهر الذي يليه يوم الاثنين. كم يومًا بين التاريخين؟
>
> — CAL_H_MONTH_LENGTH · hard · compact/given · answer A) 36 يومًا

> كان اليوم 17 من شهرٍ ما يوم الثلاثاء، وكان اليوم 18 من الشهر الذي يليه يوم الخميس. كم يومًا بين التاريخين؟
>
> — CAL_H_MONTH_LENGTH · hard · sequential/given · answer A) 30 يومًا

> كان اليوم 12 من شهرٍ ما يوم الجمعة، وكان اليوم 11 من الشهر الذي يليه يوم السبت. كم يومًا بين التاريخين؟
>
> — CAL_H_MONTH_LENGTH · hard · sequential/given · answer A) 29 يومًا

## odd_one_out — العدد الذي لا ينتمي

Sampled 240 questions across easy, medium; 7 distinct constructions, largest group 68.

### family:odd_one_out|scenario:ODD_H_SQ_MINUS|asks:outlier|direction:forward

- occurrences in the sample: **68** of 240
- reasoning signature: `{askedUnknown:outlier,derivedFrom:operationKinds,family:odd_one_out,operationKinds:[multiply,add],reasoningDirection:outlier,templateId:ODD_H_SQ_MINUS}`
- requested target: `outlier`
- scenario: `odd_one_out/ODD_H_SQ_MINUS`
- stem skeleton: `أي عدد لا ينتمي إلى المجموعة الآتية؟`

> أي عدد لا ينتمي إلى المجموعة الآتية؟
> 
> `80، 35، 99، 48، 63، 90`
>
> — ODD_H_SQ_MINUS · medium · fixed/given · answer E) 90

> أي عدد لا ينتمي إلى المجموعة الآتية؟
> 
> `80، 24، 35، 63، 30، 48`
>
> — ODD_H_SQ_MINUS · medium · fixed/given · answer A) 30

> أي عدد لا ينتمي إلى المجموعة الآتية؟
> 
> `99، 35، 80، 63، 19، 48`
>
> — ODD_H_SQ_MINUS · medium · fixed/given · answer F) 19

### family:odd_one_out|scenario:ODD_H_TRIANGULAR|asks:outlier|direction:forward

- occurrences in the sample: **52** of 240
- reasoning signature: `{askedUnknown:outlier,derivedFrom:operationKinds,family:odd_one_out,operationKinds:[multiply,divide],reasoningDirection:outlier,templateId:ODD_H_TRIANGULAR}`
- requested target: `outlier`
- scenario: `odd_one_out/ODD_H_TRIANGULAR`
- stem skeleton: `أي عدد لا ينتمي إلى المجموعة الآتية؟`

> أي عدد لا ينتمي إلى المجموعة الآتية؟
> 
> `85، 78، 91، 120، 105، 66`
>
> — ODD_H_TRIANGULAR · medium · fixed/given · answer F) 85

> أي عدد لا ينتمي إلى المجموعة الآتية؟
> 
> `78، 91، 120، 66، 98، 105`
>
> — ODD_H_TRIANGULAR · medium · fixed/given · answer A) 98

> أي عدد لا ينتمي إلى المجموعة الآتية؟
> 
> `88، 105، 153، 171، 120، 136`
>
> — ODD_H_TRIANGULAR · medium · fixed/given · answer F) 88

### family:odd_one_out|scenario:ODD_M_CUBES|asks:outlier|direction:forward

- occurrences in the sample: **26** of 240
- reasoning signature: `{askedUnknown:outlier,derivedFrom:operationKinds,family:odd_one_out,operationKinds:[multiply],reasoningDirection:outlier,templateId:ODD_M_CUBES}`
- requested target: `outlier`
- scenario: `odd_one_out/ODD_M_CUBES`
- stem skeleton: `أي عدد لا ينتمي إلى المجموعة الآتية؟`

> أي عدد لا ينتمي إلى المجموعة الآتية؟
> 
> `125، 27، 169، 8، 64، 216`
>
> — ODD_M_CUBES · easy · fixed/given · answer D) 169

> أي عدد لا ينتمي إلى المجموعة الآتية؟
> 
> `27، 216، 8، 125، 64، 100`
>
> — ODD_M_CUBES · easy · fixed/given · answer D) 100

> أي عدد لا ينتمي إلى المجموعة الآتية؟
> 
> `64، 216، 125، 27، 8، 4`
>
> — ODD_M_CUBES · easy · fixed/given · answer D) 4

## profit_loss — الربح والخسارة والأسعار

Sampled 360 questions across easy, medium, hard; 65 distinct constructions, largest group 13.

### family:profit_loss|scenario:garment|asks:costFromSellPrice|direction:forward

- occurrences in the sample: **13** of 360
- reasoning signature: `{askedUnknown:costFromSellPrice,derivedFrom:operationKinds,family:profit_loss,operationKinds:[add,multiply,divide],reasoningDirection:costFromSellPrice,templateId:PL_H_REVERSE}`
- requested target: `costFromSellPrice`
- scenario: `profit_loss/garment`
- stem skeleton: `باع متجر ملابس قميصًا بـ# درهمًا محققًا ربحًا قدره #% من تكلفة الشراء. فما تكلفة الشراء؟`

> باع متجر ملابس قميصًا بـ180 درهمًا محققًا ربحًا قدره 50% من تكلفة الشراء. فما تكلفة الشراء؟
>
> — PL_H_REVERSE · easy · sequential/given · answer E) 120 درهمًا

> باع متجر ملابس قميصًا بـ500 درهمًا محققًا ربحًا قدره 25% من تكلفة الشراء. فما تكلفة الشراء؟
>
> — PL_H_REVERSE · easy · sequential/given · answer F) 400 درهمًا

> باع متجر ملابس قميصًا بـ150 درهمًا محققًا ربحًا قدره 25% من تكلفة الشراء. فما تكلفة الشراء؟
>
> — PL_H_REVERSE · easy · compact/given · answer B) 120 درهمًا

### family:profit_loss|scenario:bookshop|asks:profitPercent|direction:forward

- occurrences in the sample: **12** of 360
- reasoning signature: `{askedUnknown:profitPercent,derivedFrom:operationKinds,family:profit_loss,operationKinds:[subtract,multiply,divide],reasoningDirection:profitPercent,templateId:PL_E_PROFIT}`
- requested target: `profitPercent`
- scenario: `profit_loss/bookshop`
- stem skeleton: `اشترت مكتبة كتابًا بـ# درهمًا وباعه بـ# درهمًا. ما نسبة الربح من سعر الشراء؟`

> اشترت مكتبة كتابًا بـ100 درهمًا وباعه بـ115 درهمًا. ما نسبة الربح من سعر الشراء؟
>
> — PL_E_PROFIT · easy · sequential/given · answer A) 15%

> اشترت مكتبة كتابًا بـ300 درهمًا وباعه بـ420 درهمًا. ما نسبة الربح من سعر الشراء؟
>
> — PL_E_PROFIT · easy · compact/given · answer E) 40%

> اشترت مكتبة كتابًا بـ100 درهمًا وباعه بـ112 درهمًا. ما نسبة الربح من سعر الشراء؟
>
> — PL_E_PROFIT · easy · compact/given · answer A) 12%

### family:profit_loss|scenario:garment|asks:profitPercent|direction:forward

- occurrences in the sample: **12** of 360
- reasoning signature: `{askedUnknown:profitPercent,derivedFrom:operationKinds,family:profit_loss,operationKinds:[subtract,multiply,divide],reasoningDirection:profitPercent,templateId:PL_E_PROFIT}`
- requested target: `profitPercent`
- scenario: `profit_loss/garment`
- stem skeleton: `اشترى متجر ملابس قميصًا بـ# درهمًا وباعه بـ# درهمًا. ما نسبة الربح من سعر الشراء؟`

> اشترى متجر ملابس قميصًا بـ200 درهمًا وباعه بـ250 درهمًا. ما نسبة الربح من سعر الشراء؟
>
> — PL_E_PROFIT · easy · compact/given · answer F) 25%

> اشترى متجر ملابس قميصًا بـ320 درهمًا وباعه بـ416 درهمًا. ما نسبة الربح من سعر الشراء؟
>
> — PL_E_PROFIT · easy · compact/given · answer B) 30%

> اشترى متجر ملابس قميصًا بـ180 درهمًا وباعه بـ261 درهمًا. ما نسبة الربح من سعر الشراء؟
>
> — PL_E_PROFIT · easy · compact/given · answer A) 45%

