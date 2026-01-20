import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'מדיניות עוגיות - הלומד',
  description: 'מדיניות העוגיות של הלומד (HaLomeid)',
};

export default function CookiePolicyPage() {
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
        מדיניות עוגיות
      </h1>

      <div className="text-[var(--text-secondary)] mb-6">
        <p><strong>גרסה</strong>: 1.0</p>
        <p><strong>תאריך תחילה</strong>: 20 בינואר 2026</p>
      </div>

      <section className="mb-8">
        <h2 className="text-2xl font-source font-bold text-[var(--text-primary)] mb-4">
          מהן עוגיות?
        </h2>
        <p className="text-[var(--text-secondary)] font-explanation leading-relaxed">
          עוגיות הן קבצי טקסט קטנים שנשמרים במכשיר שלך כאשר אתה משתמש באפליקציה. הן עוזרות לנו לזכור את ההעדפות שלך ולהבין כיצד אתה משתמש באפליקציה.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-source font-bold text-[var(--text-primary)] mb-4">
          למה אנחנו משתמשים בעוגיות?
        </h2>
        <ul className="list-disc list-inside text-[var(--text-secondary)] font-explanation space-y-2">
          <li><strong>תפקוד בסיסי</strong>: לשמור אותך מחובר ולסנכרן את הנתונים שלך</li>
          <li><strong>העדפות</strong>: לזכור את ערכת הנושא והשפה המועדפות עליך</li>
          <li><strong>אנליטיקה</strong>: להבין כיצד משתמשים באפליקציה כדי לשפר אותה</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-source font-bold text-[var(--text-primary)] mb-4">
          סוגי העוגיות שבשימוש
        </h2>

        <h3 className="text-xl font-source font-semibold text-[var(--text-primary)] mb-3 mt-6">
          עוגיות חיוניות (פעילות תמיד)
        </h3>
        <div className="overflow-x-auto mb-6">
          <table className="min-w-full border-collapse border border-desert-oasis-muted dark:border-gray-700">
            <thead>
              <tr className="bg-desert-oasis-card dark:bg-desert-oasis-dark-card">
                <th className="border border-desert-oasis-muted dark:border-gray-700 px-4 py-2 text-right font-source font-semibold text-[var(--text-primary)]">שם העוגייה</th>
                <th className="border border-desert-oasis-muted dark:border-gray-700 px-4 py-2 text-right font-source font-semibold text-[var(--text-primary)]">מטרה</th>
                <th className="border border-desert-oasis-muted dark:border-gray-700 px-4 py-2 text-right font-source font-semibold text-[var(--text-primary)]">משך</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-desert-oasis-muted dark:border-gray-700 px-4 py-2 text-[var(--text-secondary)] font-explanation">sb-access-token</td>
                <td className="border border-desert-oasis-muted dark:border-gray-700 px-4 py-2 text-[var(--text-secondary)] font-explanation">אימות Supabase</td>
                <td className="border border-desert-oasis-muted dark:border-gray-700 px-4 py-2 text-[var(--text-secondary)] font-explanation">סשן</td>
              </tr>
              <tr className="bg-desert-oasis-card/50 dark:bg-desert-oasis-dark-card/50">
                <td className="border border-desert-oasis-muted dark:border-gray-700 px-4 py-2 text-[var(--text-secondary)] font-explanation">sb-refresh-token</td>
                <td className="border border-desert-oasis-muted dark:border-gray-700 px-4 py-2 text-[var(--text-secondary)] font-explanation">אימות Supabase</td>
                <td className="border border-desert-oasis-muted dark:border-gray-700 px-4 py-2 text-[var(--text-secondary)] font-explanation">7 ימים</td>
              </tr>
              <tr>
                <td className="border border-desert-oasis-muted dark:border-gray-700 px-4 py-2 text-[var(--text-secondary)] font-explanation">powersync_*</td>
                <td className="border border-desert-oasis-muted dark:border-gray-700 px-4 py-2 text-[var(--text-secondary)] font-explanation">סנכרון לא מקוון</td>
                <td className="border border-desert-oasis-muted dark:border-gray-700 px-4 py-2 text-[var(--text-secondary)] font-explanation">סשן</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-xl font-source font-semibold text-[var(--text-primary)] mb-3 mt-6">
          עוגיות פונקציונליות (דורשות הסכמה)
        </h3>
        <div className="overflow-x-auto mb-6">
          <table className="min-w-full border-collapse border border-desert-oasis-muted dark:border-gray-700">
            <thead>
              <tr className="bg-desert-oasis-card dark:bg-desert-oasis-dark-card">
                <th className="border border-desert-oasis-muted dark:border-gray-700 px-4 py-2 text-right font-source font-semibold text-[var(--text-primary)]">שם העוגייה</th>
                <th className="border border-desert-oasis-muted dark:border-gray-700 px-4 py-2 text-right font-source font-semibold text-[var(--text-primary)]">מטרה</th>
                <th className="border border-desert-oasis-muted dark:border-gray-700 px-4 py-2 text-right font-source font-semibold text-[var(--text-primary)]">משך</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-desert-oasis-muted dark:border-gray-700 px-4 py-2 text-[var(--text-secondary)] font-explanation">theme</td>
                <td className="border border-desert-oasis-muted dark:border-gray-700 px-4 py-2 text-[var(--text-secondary)] font-explanation">זכירת מצב כהה/בהיר</td>
                <td className="border border-desert-oasis-muted dark:border-gray-700 px-4 py-2 text-[var(--text-secondary)] font-explanation">שנה</td>
              </tr>
              <tr className="bg-desert-oasis-card/50 dark:bg-desert-oasis-dark-card/50">
                <td className="border border-desert-oasis-muted dark:border-gray-700 px-4 py-2 text-[var(--text-secondary)] font-explanation">locale</td>
                <td className="border border-desert-oasis-muted dark:border-gray-700 px-4 py-2 text-[var(--text-secondary)] font-explanation">זכירת העדפת שפה</td>
                <td className="border border-desert-oasis-muted dark:border-gray-700 px-4 py-2 text-[var(--text-secondary)] font-explanation">שנה</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-xl font-source font-semibold text-[var(--text-primary)] mb-3 mt-6">
          עוגיות אנליטיקה (דורשות הסכמה)
        </h3>
        <div className="overflow-x-auto mb-6">
          <table className="min-w-full border-collapse border border-desert-oasis-muted dark:border-gray-700">
            <thead>
              <tr className="bg-desert-oasis-card dark:bg-desert-oasis-dark-card">
                <th className="border border-desert-oasis-muted dark:border-gray-700 px-4 py-2 text-right font-source font-semibold text-[var(--text-primary)]">שם העוגייה</th>
                <th className="border border-desert-oasis-muted dark:border-gray-700 px-4 py-2 text-right font-source font-semibold text-[var(--text-primary)]">מטרה</th>
                <th className="border border-desert-oasis-muted dark:border-gray-700 px-4 py-2 text-right font-source font-semibold text-[var(--text-primary)]">משך</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-desert-oasis-muted dark:border-gray-700 px-4 py-2 text-[var(--text-secondary)] font-explanation">ph_*</td>
                <td className="border border-desert-oasis-muted dark:border-gray-700 px-4 py-2 text-[var(--text-secondary)] font-explanation">PostHog אנליטיקה</td>
                <td className="border border-desert-oasis-muted dark:border-gray-700 px-4 py-2 text-[var(--text-secondary)] font-explanation">שנה</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-xl font-source font-semibold text-[var(--text-primary)] mb-3 mt-6">
          עוגיות שיווק
        </h3>
        <p className="text-[var(--text-secondary)] font-explanation">
          כרגע לא בשימוש.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-source font-bold text-[var(--text-primary)] mb-4">
          עוגיות צד שלישי
        </h2>
        <ul className="list-disc list-inside text-[var(--text-secondary)] font-explanation space-y-2">
          <li><strong>Supabase</strong>: אימות משתמשים</li>
          <li><strong>PostHog</strong>: אנליטיקה (בהסכמה בלבד)</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-source font-bold text-[var(--text-primary)] mb-4">
          ניהול עוגיות
        </h2>
        
        <h3 className="text-xl font-source font-semibold text-[var(--text-primary)] mb-3 mt-6">
          באמצעות באנר ההסכמה שלנו
        </h3>
        <p className="text-[var(--text-secondary)] font-explanation leading-relaxed mb-4">
          בביקור הראשון תוכל לבחור אילו עוגיות להפעיל. ניתן לשנות את ההעדפות בכל עת דרך הגדרות הפרטיות.
        </p>

        <h3 className="text-xl font-source font-semibold text-[var(--text-primary)] mb-3 mt-6">
          באמצעות הדפדפן
        </h3>
        <p className="text-[var(--text-secondary)] font-explanation leading-relaxed">
          רוב הדפדפנים מאפשרים לחסום או למחוק עוגיות. שים לב שחסימת עוגיות חיוניות עלולה לפגוע בתפקוד האפליקציה.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-source font-bold text-[var(--text-primary)] mb-4">
          הבחירות שלך
        </h2>
        <ul className="list-disc list-inside text-[var(--text-secondary)] font-explanation space-y-2">
          <li><strong>קבל הכל</strong>: מפעיל את כל העוגיות</li>
          <li><strong>חיוניים בלבד</strong>: רק עוגיות נחוצות לתפקוד</li>
          <li><strong>התאמה אישית</strong>: בחר לפי קטגוריה</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-source font-bold text-[var(--text-primary)] mb-4">
          השפעת חסימת עוגיות
        </h2>
        <ul className="list-disc list-inside text-[var(--text-secondary)] font-explanation space-y-2">
          <li><strong>עוגיות חיוניות</strong>: האפליקציה לא תפעל</li>
          <li><strong>עוגיות פונקציונליות</strong>: ההעדפות יאופסו בכל ביקור</li>
          <li><strong>עוגיות אנליטיקה</strong>: אין השפעה על התפקוד</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-source font-bold text-[var(--text-primary)] mb-4">
          עדכונים למדיניות
        </h2>
        <p className="text-[var(--text-secondary)] font-explanation leading-relaxed">
          נודיע על שינויים באמצעות הודעה באפליקציה.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-source font-bold text-[var(--text-primary)] mb-4">
          יצירת קשר
        </h2>
        <p className="text-[var(--text-secondary)] font-explanation">
          לשאלות בנושא עוגיות:<br />
          <strong>דוא"ל</strong>: <a href="mailto:orelzion@gmail.com" className="text-desert-oasis-accent hover:underline">orelzion@gmail.com</a>
        </p>
      </section>
    </article>
  );
}
