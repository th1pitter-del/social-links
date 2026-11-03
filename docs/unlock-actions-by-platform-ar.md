# كيف تعمل خطوات الفتح (Unlock Actions) حسب المنصّة

> تقرير قصير مبني على الكود الحالي. المراجع بمسار الملف ورقم السطر.

## الخلاصة

**المنصّة لا تغيّر آلية الفتح إطلاقًا.** الفرق الحقيقي الوحيد في التنفيذ هو حقل `behavior`
وله قيمتان: `URL` أو `EMAIL`. أما `platform` (يوتيوب، تيك توك، إنستغرام…) فتؤثّر على
**التسمية والأيقونة والواجهة والإتاحة فقط**، لا على منطق التحقق.

مصدر التقسيم: [src/lib/actions/unlock.ts:233](../src/lib/actions/unlock.ts#L233)

## طبقات البيانات

| الطبقة | الجدول | الدور |
|---|---|---|
| المنصّة | `Platform` | تجميع الإجراءات + إتاحتها (enabled) |
| نوع الإجراء | `ActionOption` | `key`, `label`, `icon`, `behavior`, الترتيب، مربوط بمنصّة |
| إجراء على رابط معيّن | `LinkAction` | `type` → `ActionOption.key`، و`target` (الرابط الذي يكتبه المُنشئ) |
| تنفيذ الزائر | `UnlockSession` + `UnlockActionCompletion` | الجلسة والخطوات المكتملة |

منصّات مُهيّأة افتراضيًا: **31** (30 منصّة اجتماعية + `none` باسم "Custom action")، و**101**
إجراء جاهز — منها إجراء واحد فقط بسلوك `EMAIL`.
[prisma/seed.ts:60](../prisma/seed.ts#L60) · [src/lib/action-defaults.ts:25](../src/lib/action-defaults.ts#L25)

## السلوكان الاثنتان

**1) `URL` — كل منصّات التواصل (96 إجراءً + `VISIT` + `FOLLOW`/`MUSIC`/`VIDEO`)**
- الزائر يضغط «افتح الخطوة» → `window.open(target, '_blank', 'noopener,noreferrer')`.
- ثم تُعلَّم الخطوة كمكتملة في قاعدة البيانات فورًا، بلا أي تحقّق من المنصّة.

[src/components/unlock/unlock-experience.tsx:139](../src/components/unlock/unlock-experience.tsx#L139)

**2) `EMAIL` — إجراء `EMAIL` فقط**
- يظهر حقل بريد + مربع موافقة (consent) بدل زر الفتح.
- التحقق من صيغة البريد وإلزام الموافقة في الخادم، ثم حفظ/تحديث `EmailLead`
  (قيد فريد لكل رابط + بريد) وتعليم الخطوة كمكتملة.

[src/lib/actions/unlock.ts:234](../src/lib/actions/unlock.ts#L234)

## تدفّق الفتح (مشترك لكل المنصّات)

1. `startUnlock(slug)` → جلسة بتوكن عشوائي (24 بايت base64url) وصلاحيّة **ساعتين**،
   ومحدّد بمعدل 30 محاولة/دقيقة على بصمة IP مشفّرة.
2. تُنشأ الجلسة `PENDING` إذا كان هناك إجراء واحد على الأقل، و`VERIFIED` مباشرة إن لم يكن.
3. `markActionComplete` لكل خطوة يسجّل `UnlockActionCompletion` + حدث `ACTION_DONE`.
4. عند اكتمال **كل** الإجراءات تتحوّل الجلسة إلى `VERIFIED`.
5. `claimContent` يعيد المحتوى (رابط / نص / ملف) ويسجّل `UNLOCK_COMPLETE`، ويضيف قيد
   «فتحاتي» للمستخدم المسجّل.
6. مسار التحميل `/api/unlock/[token]/download` يعيد فحص الجلسة من الخادم (410 عند الانتهاء،
   403 عند عدم اكتمال الخطوات) ولا يكتفي بالتحقق في الواجهة.

[src/lib/actions/unlock.ts:128](../src/lib/actions/unlock.ts#L128) · [src/app/api/unlock/[token]/download/route.ts:42](../src/app/api/unlock/[token]/download/route.ts#L42)

استثناء: رابط بدون إجراءات ونوعه `URL` يعمل كرابط قصير — يعيد التوجيه فورًا ويسجّل
`VIEW` + `UNLOCK_COMPLETE` بلا جلسة ظاهرة.
[src/app/u/[slug]/page.tsx:97](../src/app/u/[slug]/page.tsx#L97)

## ما الذي يختلف فعليًا بين منصّة ومنصّة

| العنصر | هل يختلف؟ | التفصيل |
|---|---|---|
| منطق التحقق | لا | الكل «إقرار من الزائر» |
| بناء الرابط تلقائيًا (intent/deep link) | لا | المُنشئ يلصق الرابط كما هو؛ لا توليد روابط مشاركة لكل منصّة |
| تقييد نطاق الرابط بالمنصّة | لا | التحقق `http(s)` فقط — يمكن ربط خطوة «اشترك على يوتيوب» بأي نطاق |
| الأيقونة/الشعار | نعم | `ActionGlyph` يرسم شعار المنصّة مع شارة صغيرة، وإلا أيقونة عامة |
| التسمية والترتيب | نعم | من `ActionOption`، وقابلة للتعديل في لوحة الإدارة |
| الإتاحة | نعم | `platform.enabled` + `actionOption.enabled` + قائمة `rules.socialPlatforms` |
| الإحصاءات | نعم | «توزيع الإجراءات» يجمع حسب اسم منصّة الإجراء |

مراجع: [src/lib/validation.ts:26](../src/lib/validation.ts#L26) · [src/lib/actions/links.ts:67](../src/lib/actions/links.ts#L67) · [src/lib/action-mix.ts:28](../src/lib/action-mix.ts#L28) · [src/lib/settings.ts:276](../src/lib/settings.ts#L276)

## الأدوار الإدارية

المدير يستطيع: تفعيل/تعطيل منصّة أو إجراء، وإنشاء منصّة وإجراء مخصّصين (مع اختيار
السلوك `URL`/`EMAIL` والأيقونة)، وتعديل وحذف الإجراءات غير المدمجة. الإجراءات المدمجة
`system: true` لا تُحذف.
[src/lib/actions/admin.ts:178](../src/lib/actions/admin.ts#L178) · [src/lib/actions/admin.ts:322](../src/lib/actions/admin.ts#L322)

## ملاحظتان

1. **الوصف صادق**: صفحة الأسئلة الشائعة تنصّ صراحة على أن الإجراءات يقرّها الزائر ولا تُتحقّق
   تلقائيًا لأن المنصّات لا تسمح بالتحقق من طرف ثالث.
   [src/lib/settings.ts:19](../src/lib/settings.ts#L19)
   عمود `LinkAction.verification` موجود في المخطط (`AUTO_PROMPT` / `EMAIL_SUBMITTED`) لكنه
   وصفي يظهر في شاشة تفاصيل الرابط بالإدارة، ولا يغيّر السلوك.
2. **معرّفات خام محتملة**: نموذج الرابط يبني أسماء مجموعات المنصّات من `option.platform`
   وهي مفتاح القاعدة (`youtube`، `none`) لا اسمها المعروض، فقد تظهر `none` بدل
   "Custom action". يلزم فتح محرّر الرابط في المتصفّح للتأكد قبل أي تعديل.
   [src/components/link-form.tsx:200](../src/components/link-form.tsx#L200)
