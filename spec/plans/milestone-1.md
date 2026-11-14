# Milestone 1 · שלד מקצה לקצה · תוכנית

**סוג:** Walking Skeleton. **מקור:** MILESTONES.md (Milestone 1), ARCHITECTURE.md (סעיפים 1–4, 6–8), DESIGN.md (מסך כניסה, כללי מסכים, Style Guide).
**מצב הריפו בתחילת ה-Milestone:** אין קוד. יש רק `spec/`, `CLAUDE.md`, `.gitignore` ו-`.claude/settings.json`.

**המטרה בקצרה:** כל השכבות מחוברות ורצות (אתר, כניסה, מסד נתונים מוגן, תיקיית קבצים פרטית, פונקציה שקוראת ל-Gemini), בלי אף פיצ'ר של המוצר.

---

## 1. מה שני עושה בעצמה (חשבונות ומפתחות)

לפי CLAUDE.md, את החשבונות והמפתחות שני מחברת בעצמה. Claude עוצר בכל נקודה כזו ומדריך צעד אחר צעד בשפה פשוטה.

| # | פעולה | מתי בבנייה | למה צריך |
|---|---|---|---|
| A | פרויקט Supabase אחד (אם עוד אין). לוודא שה-MCP של Supabase מחובר אליו, או לתת ל-Claude את כתובת הפרויקט | לפני שלב 3 | טבלאות, כניסה וקבצים |
| B | יצירת המשתמשת היחידה ב-Authentication → Users, וכיבוי "Allow new users to sign up" | לפני שלב 3 (ה-seed צריך משתמשת) | כניסה, RLS ו-seed |
| C | מפתח Gemini לפיתוח, מודבק ב-`.env.local` (Claude יוצר את הקובץ עם שם המפתח בלבד) | לפני שלב 6 | הפונקציה |
| D | התקנת Vercel CLI, התחברות (`vercel login`) וחיבור התיקייה (`vercel link`) | לפני שלב 6 | הרצה מקומית (`vercel dev`) |
| E | הגדרת משתני הסביבה הלא-סודיים ב-Vercel, לכל סביבה: `ALLOWED_ORIGIN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`. ו-`GEMINI_API_KEY` כסוד ב-Production | לפני שלב 6 (Development), לפני שלב 8 (Production) | הפונקציה |
| F | כתובת ריפו ציבורי ב-GitHub | שלב 8 (פריסה) | GitHub Pages ו-Vercel |
| G | הפעלת GitHub Pages (ענף `main`, תיקיית השורש) וחיבור הריפו לפרויקט ב-Vercel | שלב 8, אחרי push באישור | אתר ופונקציה חיים |

---

## 2. קבצים שנוצרים

```
/
├─ index.html                 דף יחיד, lang="he" dir="rtl", טוען js/main.js כ-module
├─ .nojekyll                  כדי ש-GitHub Pages יגיש את כל הקבצים כמו שהם
├─ package.json               { "type": "module" }, בלי תלויות
├─ vercel.json                maxDuration: 60 ל-api/ask.js
├─ .env.example               GEMINI_API_KEY=  (שם בלבד)
├─ css/
│  ├─ tokens.css              כל הצבעים, הגופנים, הרדיוסים, הצללים והמרווחים מ-DESIGN.md חלק 2
│  ├─ base.css                @font-face ל-Heebo, RTL, טיפוגרפיה, פריסת טלפון/מחשב
│  └─ components.css          כפתורים (ראשי, משני, טקסט), שדות, כרטיס, סרגל ניווט, כפתור +
├─ js/
│  ├─ main.js                 עלייה: טעינת config/lists.json, התחלת router
│  ├─ router.js               hash routing, שומר ניווט (getSession), מעטפת עם ניווט
│  ├─ config.js               כתובת Supabase, מפתח ציבורי, כתובת הפונקציה לפי location.hostname
│  ├─ supabase.js             createClient מ-supabase-js (jsDelivr, גרסה נעולה)
│  ├─ auth.js                 signIn, signOut, getSession
│  ├─ strings.js              כל טקסטי הממשק של ה-Milestone
│  └─ screens/
│     ├─ login.js             מסך כניסה
│     ├─ dashboard.js         מעטפת ריקה: לוגו, "יציאה", כותרת, ניווט
│     ├─ issues.js            מעטפת ריקה
│     └─ tasks.js             מעטפת ריקה
├─ assets/
│  ├─ fonts/                  Heebo (woff2, רישיון OFL, כולל קובץ הרישיון)
│  └─ img/
│     └─ logo-mark.png        סמל הלוגו, חתוך מ-spec/LOGO AND COLOR PALLETTE.png (ראו שלב 2)
├─ config/
│  ├─ lists.json              כמו ב-ARCHITECTURE.md 2.9
│  └─ case.json               { "subject_name": "שם דמה", "manager_name": "שם דמה" }
├─ api/
│  └─ ask.js                  הפונקציה היחידה
├─ lib/
│  ├─ config.js               MODEL, MAX_FILE_BYTES (10MB), MAX_TEXT (20,000), מגבלות issues
│  ├─ prompt.js               גרסה ראשונה של הפרומפט (תפקיד ושלוש המגבלות)
│  ├─ schema.js               responseSchema לפי ARCHITECTURE.md 4.5
│  ├─ gemini.js               קריאת fetch ל-generateContent, מפתח בכותרת, AbortController של 50 שניות
│  ├─ validate.js             בדיקת מבנה בסיסית (ראו שלב 6)
│  └─ messages.js             הודעות השגיאה בעברית
└─ db/
   ├─ schema.sql              טבלאות, אילוצים, indexes, RLS, bucket ו-policies
   └─ seed.sql                נתוני דמה
```

**לא נוצר ב-Milestone הזה:** `js/data.js`, `ai-client.js`, `image.js`, `calendar.js`, `format.js`, שאר המסכים, `lib/dates.js`, `ai-tests.md`, `n8n/`. הם שייכים ל-Milestones הבאים.

**מתעדכנים:** `CLAUDE.md` (סעיף "פקודות הרצה": `vercel dev`, בדיקות: אין), `MILESTONES.md` (🟡 בסיום), `ARCHITECTURE.md` (ADRs בלבד, אם תתקבל החלטה טכנית). `.gitignore` כבר כולל `.env`, `.env.*` ו-`.vercel/`, ולא צריך שינוי.

---

## 3. שלבי הבנייה

### שלב 1 · שלד הריפו
- `package.json`, `vercel.json`, `.nojekyll`, `.env.example`, ו-`.env.local` (העתק של `.env.example`, ריק. שני מדביקה את הערך).
- כל הנתיבים בקוד הלקוח **יחסיים** (`./css/...`, `./js/...`), כי באתר החי הכתובת היא `https://<user>.github.io/<repo>/`.

### שלב 2 · עיצוב בסיס
- `tokens.css`: כל ערכי הצבע מ-DESIGN.md חלק 2 כמשתני CSS (כולל Field Border #738283 ו-placeholder ב-Muted Ink), גדלי טקסט (Display עד Small, כולל גדלי מחשב), רדיוסים 8/12/16/18/pill, צללים בגוון Navy, מרווחים בכפולות 4.
- `base.css`: Heebo מקובץ מקומי (400, 500, 700, 800), רקע Warm Ivory, טקסט Slate Ink, כותרות Deep Navy. שוליים 16 בטלפון ו-32 במחשב. נקודת שבירה למחשב: 768 פיקסל (הנחה, ראו הנחות).
- `components.css`: רק מה שה-Milestone צריך: כפתור ראשי ומשני, שדה (רגיל, פוקוס עם הילה Mint, שגיאה), כרטיס, סרגל ניווט תחתון על Mint Zone עם פריט פעיל ב-Navy מלא, כפתור + עגול, ניווט עליון במחשב, ההבהרה הקבועה בתחתית. גובה מגע 48.
- **לוגו:** המקור הוא `spec/LOGO AND COLOR PALLETTE.png`. חותכים ממנו רק את הסמל (הדפים בשכבות), מסירים את רקע השנהב כך שיהיה שקוף, ושומרים כ-`assets/img/logo-mark.png` בגובה של כ-96 פיקסל (פי 2 מהתצוגה, לחדות במסכים צפופים). המילה "MedDo" לידו נכתבת כטקסט ב-Heebo 800 ב-Deep Navy, כמו ב-mockups ולפי DESIGN.md ("שם המוצר MedDo תמיד באותיות לטיניות, במשקל 800"). כך הוא נראה ב-header של שלושת המסכים ובמסך הכניסה (בגודל גדול יותר). לסמל יש `alt=""` כי השם כתוב לידו כטקסט.
- הגופן: הורדת Heebo (רישיון OFL) מ-Fontsource ב-jsDelivr. **לפני ההורדה Claude מבקש אישור** (שם קובץ, מקור, גודל).

### שלב 3 · Supabase: טבלאות, הרשאות ותיקיית קבצים (`db/schema.sql`)
- שלוש הטבלאות בדיוק לפי ARCHITECTURE.md 2.2–2.4, כולל:
  - `user_id default auth.uid()` בכל טבלה.
  - `documents.medical_issue_id` **not null**, `on delete restrict`.
  - `check ((file_path is not null) <> (input_text is not null))` ב-`documents`.
  - `check (status = 'waiting' or due_date is not null)` ב-`tasks`.
  - `check` על ערכי `status` ו-`type` (קודים מ-`lists.json`). (הנחה, ראו הנחות.)
  - `fields jsonb not null default '{}'`.
- ארבעת ה-indexes מסעיף 2.6.
- RLS בשלוש הטבלאות. `select`, `insert`, `update` לתפקיד `authenticated` לפי 2.8, ו-`delete` רק ב-`tasks`. אין policy ל-`anon`.
- Bucket `documents` פרטי, ו-policies על `storage.objects`: `select`, `insert`, `delete` כשהתיקייה הראשונה בנתיב שווה ל-`auth.uid()`. אין `update`.
- **איך מריצים:** דרך ה-MCP של Supabase (apply_migration) על הפרויקט היחיד, אם הוא מחובר. אחרת שני מדביקה את הקובץ ב-SQL Editor לפי הדרכה. הקובץ בריפו הוא המקור.

### שלב 4 · נתוני דמה (`db/seed.sql`)
- `user_id` מתוך `select id from auth.users limit 1`.
- 5 בעיות רפואיות (4 פתוחות, אחת סגורה), עם שמות דמה כמו בתמונות (למשל "כאבי גב תחתון", "בדיקות דם שנתיות").
- 5 מסמכים, אחד מכל סוג תוכן, כולם עם `input_text` (טקסט דמה מפוברק) ובלי קובץ, כדי שלא יידרשו קבצים ב-Storage. `extracted_text` זהה לטקסט, ו-`fields` מלא לפי המבנה ב-2.3.
- לפחות 7 משימות: בשלושת הסטטוסים, בכל חמשת הסוגים, חלקן ממסמך וחלקן ידניות (אחת בלי בעיה), משימה `waiting` אחת בלי תאריך, תור אחד עם שעה ואחד בלי. תאריכים יחסיים להיום (`current_date + n`), כדי שהדשבורד ב-Milestone 4 יראה את כל האזורים.
- אין שום מידע רפואי אמיתי.

### שלב 5 · אתר: כניסה, שומר ניווט ומעטפת
- `config.js`: כתובת Supabase והמפתח הציבורי. כתובת הפונקציה: `/api/ask` ב-`localhost`, והכתובת המלאה ב-Vercel באתר החי (תמולא כשהפרויקט ב-Vercel ייווצר).
- `supabase.js`: `supabase-js` v2 מ-jsDelivr (`+esm`), גרסה מדויקת נעולה.
- `router.js`: routes `#/login`, `#/`, `#/issues`, `#/tasks`. כל route אחר מפנה ל-`#/`. בכל ניווט: `getSession`. בלי session → `#/login`. עם session ב-`#/login` → `#/`.
- **כניסה** (DESIGN מסך 1): לוגו, כותרת "כניסה", "אימייל", "סיסמה" (עם `<label>`), כפתור "כניסה". שגיאה מציגה הודעה כללית אחת. בלי הרשמה ובלי סרגל ניווט.
- **מעטפת** לשלושת המסכים: לוגו MedDo וכפתור "יציאה" למעלה, כותרת המסך בלבד (בית: "שלום, הנה מה שדורש תשומת לב היום", "נושאים", "משימות ומעקבים"), ההבהרה הקבועה בתחתית. בטלפון סרגל תחתון (בית, נושאים, משימות) עם הפריט הפעיל מסומן. במחשב כרטיסיות עליונות. בלי תוכן של פיצ'ר.
- כפתור + **לא נכנס** ב-Milestone הזה, כי מסך "הוספת מידע" עוד לא קיים (הנחה, ראו הנחות).
- "יציאה" קורא ל-`signOut` ומפנה ל-`#/login`.
- `main.js` טוען את `config/lists.json` ב-`fetch` בעלייה (גם אם עוד אין לו שימוש במסכים), כדי שהתשתית מוכנה.
- כל טקסט ממשק מגיע מ-`strings.js`.

### שלב 6 · הפונקציה `api/ask.js`
לפי ARCHITECTURE.md 4.2, בסדר הזה:
1. **CORS:** `OPTIONS` → 204 עם הכותרות. מקור שאינו `ALLOWED_ORIGIN` → 403 `forbidden_origin`. בקשה בלי כותרת `Origin` נחשבת מקור לא מורשה (החלטה, תתועד כ-ADR).
2. **שיטה:** רק `POST`, אחרת 405.
3. **אימות:** `GET {SUPABASE_URL}/auth/v1/user` עם `apikey` ו-`Authorization` מהבקשה. אחרת 401 `unauthorized`.
4. **ולידציה:** `mode`, `file_url` (חייב להתחיל בנתיב ה-sign של ה-bucket), `mime_type`, `text` (עד 20,000), `issues` (עד 50, שם עד 100). כשל → 400 `bad_request`.
5. **קובץ:** `fetch` ל-signed URL, דחייה מעל 10MB → 413 `too_large`. המרה ל-base64.
6. **Gemini:** `lib/gemini.js`, REST בלי SDK, המפתח בכותרת `x-goog-api-key`, `temperature: 0`, `responseMimeType: application/json`, `responseSchema` מ-`lib/schema.js`, `systemInstruction` מ-`lib/prompt.js`. עצירה אחרי 50 שניות. שגיאה / חריגת מכסה / זמן → 502/504 `unavailable`.
7. **בדיקת מבנה (`lib/validate.js`, גרסה בסיסית):** JSON תקין, כל השדות הצפויים קיימים ובסוג הנכון, `tasks` הוא מערך. כשל → 422 `unreadable`.
8. **תשובה:** תמיד JSON. `{ ok: true, data }` או `{ ok: false, error: { code, message } }`, עם ההודעות מ-`lib/messages.js`. בלוג רק קוד וסטטוס, בלי תוכן.

**מה נדחה ל-Milestone 2:** הפרומפט המלא (כל 8 הסעיפים ב-4.4), הנרמולים בקוד (קודים מ-`lists.json`, תאריכים, אורכים, `issue_id`), וחישוב תאריך יחסי (`lib/dates.js`). ב-Milestone 1 הפרומפט הוא גרסה ראשונה שכבר כוללת את התפקיד ואת שלוש המגבלות, והסכמה כבר בצורה הסופית של 4.5, כך שהפלט במבנה הצפוי כבר עכשיו.

**מודל:** `MODEL = "gemini-3.8-flash"` ב-`lib/config.js`. השם נבדק מול התיעוד של Gemini בזמן הבנייה (ARCHITECTURE.md 4.3). אם השם השתנה, Claude עוצר ושואל.

### שלב 7 · הרצה מקומית ובדיקה עצמית
`vercel dev` ב-`http://localhost:3000`. Claude בודק בעצמו את כל תנאי ה-DoD שאפשר לבדוק מקומית (סעיף 4 למטה), וסוגר את ההרצה בסיום.

### שלב 8 · פריסה (דורש אישור push)
- תנאי 6 ותנאי 4/5 באתר החי דורשים push ל-`main`. לפי CLAUDE.md, **Claude עוצר כאן ומבקש אישור** לפני commit ו-push.
- אחרי ה-push, שני מפעילה GitHub Pages ומחברת את הריפו ל-Vercel, לפי הדרכה (פעולות F, G, E).
- Claude ממלא ב-`js/config.js` את כתובת הפונקציה החיה, ובודק את האתר החי.
- אם שני מעדיפה לבדוק קודם מקומית ולדחוף רק בסוף ("דחוף שינויים לגיטהאב"), תנאי 6 ייבדק אז. ה-🟡 מסמן שהבנייה הושלמה, והאישור הסופי מגיע עם הדחיפה.

---

## 4. איך כל תנאי ב-Definition of Done ייבדק

| # | תנאי | בדיקה |
|---|---|---|
| 1 | כניסה, הפניה בלי session, יציאה | בדפדפן: פתיחת `#/` בלי session → `#/login`. כניסה עם המשתמשת → מעטפת הבית. סיסמה שגויה → הודעה כללית. "יציאה" → `#/login`, ו-`#/tasks` שוב מפנה לכניסה |
| 2 | אורחת לא קוראת ולא כותבת | קריאות REST ל-Supabase עם המפתח הציבורי ובלי טוקן: `select` משלוש הטבלאות מחזיר רשימה ריקה, `insert`/`update`/`delete` נכשלים. בנוסף, עם טוקן של המשתמשת: `select` מחזיר את נתוני ה-seed |
| 3 | קובץ נגיש רק דרך signed URL | העלאת קובץ דמה קטן לתיקיית המשתמשת. הכתובת הציבורית (`/object/public/...`) והכתובת הרגילה בלי טוקן נכשלות. `createSignedUrl` נפתח. הקובץ נמחק בסוף הבדיקה |
| 4 | 401, 403, ו-`ok: true` | `curl` לפונקציה: בלי `Authorization` → 401 JSON. עם `Origin` זר → 403 JSON. `OPTIONS` → 204. עם טוקן תקין וטקסט מפוברק (`mode: "text"`) → `ok: true` עם כל השדות של 4.5 |
| 5 | המפתח לא בקוד, בריפו או בדפדפן | חיפוש בריפו (`git grep`) אחרי ערך המפתח ואחרי `AIza`. בכלי המפתחים: אין קריאה ל-`googleapis.com` מהדפדפן, ואין מפתח בתשובות |
| 6 | push מעדכן אתר ופונקציה | אחרי push באישור: שינוי קטן מופיע גם באתר ב-GitHub Pages וגם ב-deployment חדש ב-Vercel |
| 7 | RTL, 375 ומחשב | בדפדפן המובנה: רוחב 375 ורוחב מחשב. הכיוון מימין לשמאל, אין גלילה לרוחב, הגופן Heebo נטען מהקובץ המקומי |

---

## 5. פערים ושאלות פתוחות

1. **לוגו (נסגר):** נוסף `spec/LOGO AND COLOR PALLETTE.png`. הסמל נחתך ממנו (שלב 2). **הצבע Soft Mint בתמונה הזו** (קוד שמתחיל ב-`#D...EFEA`, לא קריא עד הסוף) שונה מ-DESIGN.md ומ-style-guide.png (`#C7E4D8`). לפי כללי הסתירות, ה-Style Guide וה-DESIGN קובעים, ולכן נשאר `#C7E4D8`. התמונה משמשת רק כמקור לסמל.
2. **שם המודל:** `gemini-3.8-flash` נבחר ב-25.10. אם בזמן הבנייה הוא לא קיים או הוחלף, אעצור ואשאל.
3. **פריסה בתוך ה-Milestone:** תנאי 6 דורש push. אעצור לאישור, כמו שמוגדר ב-CLAUDE.md.

## 6. הנחות

1. **הנחה:** נקודת השבירה בין טלפון למחשב היא 768 פיקסל. היא לא מופיעה ב-DESIGN.md.
2. **הנחה:** כפתור + וה-route `#/add` לא נכנסים עכשיו, אלא ב-Milestone 3, כדי לא לבנות כפתור שמוביל למסך ריק. כפתור "יציאה" והניווט כן נכנסים.
3. **הנחה:** אילוצי `check` על ערכי `status` ו-`type` בטבלאות, לפי הקודים ב-`lists.json`. זה לא כתוב במפורש ב-ARCHITECTURE.md, אבל שומר על נתונים נקיים בלי לוגיקה ב-Supabase.
4. **הנחה:** המסמכים ב-seed הם טקסט חופשי בלבד, כדי שלא יידרשו קבצים ב-Storage. "מסמך אחד מכל סוג תוכן" מתקיים דרך `content_type`.
5. **הנחה:** ההבהרה הקבועה בתחתית המסכים נכנסת כבר עכשיו, כי היא חלק מהמעטפת. הבדיקה הסופית שלה ב-Milestone 7.
6. **החלטה שתתועד כ-ADR:** בקשה לפונקציה בלי כותרת `Origin` נדחית ב-403, כמו מקור זר. כלי הבדיקה של Milestone 2 ישלח `Origin` מתאים.
