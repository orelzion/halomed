import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'מדיניות פרטיות - הלומד',
  description: 'מדיניות הפרטיות של הלומד (HaLomeid)',
};

export default function PrivacyPolicyPage() {
  return (
    <article className="prose prose-lg max-w-none dark:prose-invert">
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-desert-oasis-accent hover:text-desert-oasis-accent/80 transition-colors mb-6"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transform: 'scaleX(-1)' }}
            aria-hidden="true"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          חזור לדף הבית
        </Link>
      </div>

      <h1 className="text-3xl font-source font-bold text-[var(--text-primary)] mb-4">
        מדיניות פרטיות
      </h1>

      <div className="text-[var(--text-secondary)] mb-6">
        <p><strong>גרסה</strong>: 1.0</p>
        <p><strong>תאריך תחילה</strong>: 20 בינואר 2026</p>
      </div>

      <section className="mb-8">
        <h2 className="text-2xl font-source font-bold text-[var(--text-primary)] mb-4">
          מבוא
        </h2>
        <p className="text-[var(--text-secondary)] font-explanation leading-relaxed">
          ברוכים הבאים להלומד (HaLomeid). אנו מחויבים להגן על פרטיותך ולנהל את המידע האישי שלך באחריות.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-source font-bold text-[var(--text-primary)] mb-4">
          בעל השליטה בנתונים
        </h2>
        <div className="text-[var(--text-secondary)] font-explanation">
          <p><strong>שם</strong>: אוראל ציון קאריוף</p>
          <p><strong>דוא"ל</strong>: <a href="mailto:orelzion@gmail.com" className="text-desert-oasis-accent hover:underline">orelzion@gmail.com</a></p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-source font-bold text-[var(--text-primary)] mb-4">
          סוגי המידע שאנו אוספים
        </h2>
        
        <h3 className="text-xl font-source font-semibold text-[var(--text-primary)] mb-3 mt-6">
          מידע שאתה מספק
        </h3>
        <ul className="list-disc list-inside text-[var(--text-secondary)] font-explanation space-y-2 mb-4">
          <li>כתובת דוא"ל (אם בחרת להירשם)</li>
          <li>מזהה אנונימי (למשתמשים אנונימיים)</li>
        </ul>

        <h3 className="text-xl font-source font-semibold text-[var(--text-primary)] mb-3 mt-6">
          מידע שנאסף אוטומטית
        </h3>
        <ul className="list-disc list-inside text-[var(--text-secondary)] font-explanation space-y-2">
          <li>התקדמות בלימוד (שיעורים שהושלמו, ציוני חידונים)</li>
          <li>נתוני שימוש (תכונות בשימוש, זמן שהייה)</li>
          <li>מידע על המכשיר (סוג מכשיר, מערכת הפעלה, דפדפן)</li>
          <li>העדפות (ערכת נושא, הגדרות שפה)</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-source font-bold text-[var(--text-primary)] mb-4">
          הבסיס החוקי לעיבוד
        </h2>
        <p className="text-[var(--text-secondary)] font-explanation leading-relaxed mb-4">
          בהתאם לתקנה הכללית להגנת מידע (GDPR), אנו מעבדים את המידע שלך על בסיס:
        </p>
        <ul className="list-disc list-inside text-[var(--text-secondary)] font-explanation space-y-2">
          <li><strong>הסכמה</strong>: מעקב אנליטי (PostHog)</li>
          <li><strong>ביצוע חוזה</strong>: אספקת שירות הלמידה</li>
          <li><strong>אינטרס לגיטימי</strong>: שיפור האפליקציה, אבטחה</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-source font-bold text-[var(--text-primary)] mb-4">
          תקופות שמירת מידע
        </h2>
        <ul className="list-disc list-inside text-[var(--text-secondary)] font-explanation space-y-2">
          <li><strong>חשבונות פעילים</strong>: המידע נשמר כל עוד החשבון פעיל</li>
          <li><strong>יומני לימוד</strong>: נשמרים ללא הגבלת זמן למעקב התקדמות ורצף</li>
          <li><strong>אנליטיקה</strong>: שנתיים</li>
          <li><strong>חשבונות שנמחקו</strong>: 30 יום לגיבוי, לאחר מכן נמחקים לצמיתות</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-source font-bold text-[var(--text-primary)] mb-4">
          זכויותיך
        </h2>
        <p className="text-[var(--text-secondary)] font-explanation leading-relaxed mb-4">
          בהתאם ל-GDPR, יש לך את הזכויות הבאות:
        </p>
        <ul className="list-disc list-inside text-[var(--text-secondary)] font-explanation space-y-2">
          <li><strong>זכות גישה</strong>: להגיש בקשה לקבלת עותק מהמידע שלך</li>
          <li><strong>זכות לתיקון</strong>: לתקן מידע לא מדויק</li>
          <li><strong>זכות למחיקה</strong>: למחוק את החשבון והמידע שלך</li>
          <li><strong>זכות לניידות</strong>: להוריד את הנתונים שלך בפורמט קריא</li>
          <li><strong>זכות להתנגד</strong>: להתנגד לעיבוד מסוים</li>
          <li><strong>זכות לביטול הסכמה</strong>: לבטל הסכמה שניתנה בעבר</li>
        </ul>
        <p className="text-[var(--text-secondary)] font-explanation mt-4">
          למימוש זכויותיך, פנה אלינו בדוא"ל: <a href="mailto:orelzion@gmail.com" className="text-desert-oasis-accent hover:underline">orelzion@gmail.com</a>
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-source font-bold text-[var(--text-primary)] mb-4">
          צדדים שלישיים
        </h2>
        <p className="text-[var(--text-secondary)] font-explanation leading-relaxed mb-4">
          אנו משתפים מידע עם:
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-desert-oasis-muted dark:border-gray-700">
            <thead>
              <tr className="bg-desert-oasis-card dark:bg-desert-oasis-dark-card">
                <th className="border border-desert-oasis-muted dark:border-gray-700 px-4 py-2 text-right font-source font-semibold text-[var(--text-primary)]">ספק</th>
                <th className="border border-desert-oasis-muted dark:border-gray-700 px-4 py-2 text-right font-source font-semibold text-[var(--text-primary)]">מטרה</th>
                <th className="border border-desert-oasis-muted dark:border-gray-700 px-4 py-2 text-right font-source font-semibold text-[var(--text-primary)]">מיקום</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-desert-oasis-muted dark:border-gray-700 px-4 py-2 text-[var(--text-secondary)] font-explanation">Supabase</td>
                <td className="border border-desert-oasis-muted dark:border-gray-700 px-4 py-2 text-[var(--text-secondary)] font-explanation">אחסון נתונים ואימות</td>
                <td className="border border-desert-oasis-muted dark:border-gray-700 px-4 py-2 text-[var(--text-secondary)] font-explanation">EU/US</td>
              </tr>
              <tr className="bg-desert-oasis-card/50 dark:bg-desert-oasis-dark-card/50">
                <td className="border border-desert-oasis-muted dark:border-gray-700 px-4 py-2 text-[var(--text-secondary)] font-explanation">PostHog</td>
                <td className="border border-desert-oasis-muted dark:border-gray-700 px-4 py-2 text-[var(--text-secondary)] font-explanation">אנליטיקה (בהסכמה)</td>
                <td className="border border-desert-oasis-muted dark:border-gray-700 px-4 py-2 text-[var(--text-secondary)] font-explanation">EU</td>
              </tr>
              <tr>
                <td className="border border-desert-oasis-muted dark:border-gray-700 px-4 py-2 text-[var(--text-secondary)] font-explanation">Sefaria</td>
                <td className="border border-desert-oasis-muted dark:border-gray-700 px-4 py-2 text-[var(--text-secondary)] font-explanation">מקור תוכן (פירושים)</td>
                <td className="border border-desert-oasis-muted dark:border-gray-700 px-4 py-2 text-[var(--text-secondary)] font-explanation">US (אין שיתוף מידע אישי)</td>
              </tr>
              <tr className="bg-desert-oasis-card/50 dark:bg-desert-oasis-dark-card/50">
                <td className="border border-desert-oasis-muted dark:border-gray-700 px-4 py-2 text-[var(--text-secondary)] font-explanation">ויקיטקסט (Hebrew Wikisource)</td>
                <td className="border border-desert-oasis-muted dark:border-gray-700 px-4 py-2 text-[var(--text-secondary)] font-explanation">מקור תוכן (טקסט המשנה)</td>
                <td className="border border-desert-oasis-muted dark:border-gray-700 px-4 py-2 text-[var(--text-secondary)] font-explanation">US (אין שיתוף מידע אישי)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-source font-bold text-[var(--text-primary)] mb-4">
          העברות בינלאומיות
        </h2>
        <p className="text-[var(--text-secondary)] font-explanation leading-relaxed">
          המידע שלך עשוי להיות מעובד ב-EU וב-US. אנו משתמשים בסעיפים חוזיים סטנדרטיים (SCCs) להעברות.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-source font-bold text-[var(--text-primary)] mb-4">
          עוגיות
        </h2>
        <p className="text-[var(--text-secondary)] font-explanation leading-relaxed">
          אנו משתמשים בעוגיות לתפקוד האפליקציה ולאנליטיקה. לפרטים נוספים, ראה את{' '}
          <Link href="/cookies" className="text-desert-oasis-accent hover:underline">
            מדיניות העוגיות
          </Link>.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-source font-bold text-[var(--text-primary)] mb-4">
          פרטיות ילדים
        </h2>
        <p className="text-[var(--text-secondary)] font-explanation leading-relaxed">
          האפליקציה מתאימה לכל הגילאים. איננו אוספים ביודעין מידע מילדים מתחת לגיל 13 ללא הסכמת הורים.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-source font-bold text-[var(--text-primary)] mb-4">
          עדכונים למדיניות
        </h2>
        <p className="text-[var(--text-secondary)] font-explanation leading-relaxed">
          נודיע לך על שינויים מהותיים באמצעות הודעה באפליקציה. המשך השימוש לאחר השינויים מהווה הסכמה.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-source font-bold text-[var(--text-primary)] mb-4">
          יצירת קשר
        </h2>
        <p className="text-[var(--text-secondary)] font-explanation">
          לשאלות בנושא פרטיות:<br />
          <strong>דוא"ל</strong>: <a href="mailto:orelzion@gmail.com" className="text-desert-oasis-accent hover:underline">orelzion@gmail.com</a>
        </p>
      </section>
    </article>
  );
}
