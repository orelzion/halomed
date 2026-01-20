import { Metadata } from 'next';
import Link from 'next/link';
import { AccessibilityFeedbackForm } from '@/components/ui/AccessibilityFeedbackForm';

export const metadata: Metadata = {
  title: 'הצהרת נגישות - הלומד',
  description: 'הצהרת הנגישות של הלומד (HaLomeid)',
};

export default function AccessibilityPage() {
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
        הצהרת נגישות
      </h1>

      <div className="text-[var(--text-secondary)] mb-6">
        <p><strong>גרסה</strong>: 1.0</p>
        <p><strong>תאריך עדכון אחרון</strong>: 20 בינואר 2026</p>
      </div>

      <section className="mb-8">
        <h2 className="text-2xl font-source font-bold text-[var(--text-primary)] mb-4">
          הצהרת מחויבות
        </h2>
        <p className="text-[var(--text-secondary)] font-explanation leading-relaxed">
          הלומד (HaLomeid) מחויבת להנגיש את האפליקציה לכל המשתמשים, כולל אנשים עם מוגבלויות. אנו שואפים להבטיח שכל אחד יוכל ללמוד וליהנות מהתוכן שלנו.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-source font-bold text-[var(--text-primary)] mb-4">
          תקנים
        </h2>
        <p className="text-[var(--text-secondary)] font-explanation leading-relaxed mb-4">
          האפליקציה עומדת בתקנים הבאים:
        </p>
        <ul className="list-disc list-inside text-[var(--text-secondary)] font-explanation space-y-2">
          <li><strong>תקן ישראלי 5568</strong> (SI 5568)</li>
          <li><strong>WCAG 2.2 רמה AA</strong> (Web Content Accessibility Guidelines)</li>
          <li><strong>ADA Title II</strong> (Americans with Disabilities Act)</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-source font-bold text-[var(--text-primary)] mb-4">
          תכונות נגישות
        </h2>

        <h3 className="text-xl font-source font-semibold text-[var(--text-primary)] mb-3 mt-6">
          תמיכה בעברית וב-RTL
        </h3>
        <ul className="list-disc list-inside text-[var(--text-secondary)] font-explanation space-y-2 mb-4">
          <li>תמיכה מלאה בכיוון ימין-לשמאל</li>
          <li>תצוגה נכונה של טקסט עברי</li>
        </ul>

        <h3 className="text-xl font-source font-semibold text-[var(--text-primary)] mb-3 mt-6">
          ניווט מקלדת
        </h3>
        <ul className="list-disc list-inside text-[var(--text-secondary)] font-explanation space-y-2 mb-4">
          <li>כל האלמנטים האינטראקטיביים נגישים במקלדת</li>
          <li>מחווני פוקוס ברורים ונראים</li>
          <li>קישורי דילוג לתוכן הראשי</li>
        </ul>

        <h3 className="text-xl font-source font-semibold text-[var(--text-primary)] mb-3 mt-6">
          תאימות לקוראי מסך
        </h3>
        <ul className="list-disc list-inside text-[var(--text-secondary)] font-explanation space-y-2 mb-4">
          <li>תמיכה ב-VoiceOver (macOS/iOS)</li>
          <li>תמיכה ב-TalkBack (Android)</li>
          <li>תמיכה ב-NVDA (Windows)</li>
          <li>תיאורים חלופיים לתמונות</li>
          <li>מבנה HTML סמנטי</li>
        </ul>

        <h3 className="text-xl font-source font-semibold text-[var(--text-primary)] mb-3 mt-6">
          עיצוב נגיש
        </h3>
        <ul className="list-disc list-inside text-[var(--text-secondary)] font-explanation space-y-2">
          <li>יחס ניגודיות צבעים עומד ב-WCAG AA (מינימום 4.5:1)</li>
          <li>גודל אזורי מגע מינימלי 44px</li>
          <li>תמיכה בהגדלת טקסט עד 200%</li>
          <li>מצב כהה זמין</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-source font-bold text-[var(--text-primary)] mb-4">
          דפדפנים וטכנולוגיות נתמכים
        </h2>

        <h3 className="text-xl font-source font-semibold text-[var(--text-primary)] mb-3 mt-6">
          דפדפנים
        </h3>
        <ul className="list-disc list-inside text-[var(--text-secondary)] font-explanation space-y-2 mb-4">
          <li>Google Chrome (מומלץ)</li>
          <li>Safari</li>
          <li>Mozilla Firefox</li>
          <li>Microsoft Edge</li>
        </ul>

        <h3 className="text-xl font-source font-semibold text-[var(--text-primary)] mb-3 mt-6">
          קוראי מסך נתמכים
        </h3>
        <ul className="list-disc list-inside text-[var(--text-secondary)] font-explanation space-y-2 mb-4">
          <li>VoiceOver (macOS, iOS)</li>
          <li>TalkBack (Android)</li>
          <li>NVDA (Windows)</li>
        </ul>

        <h3 className="text-xl font-source font-semibold text-[var(--text-primary)] mb-3 mt-6">
          פלטפורמות
        </h3>
        <ul className="list-disc list-inside text-[var(--text-secondary)] font-explanation space-y-2">
          <li>אינטרנט (דפדפן)</li>
          <li>נייד (iOS, Android) - בקרוב</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-source font-bold text-[var(--text-primary)] mb-4">
          מגבלות ידועות
        </h2>
        <p className="text-[var(--text-secondary)] font-explanation leading-relaxed">
          אנו עובדים באופן מתמיד לשפר את הנגישות. אם נתקלת בבעיה, אנא דווח לנו.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-source font-bold text-[var(--text-primary)] mb-4">
          רכז נגישות
        </h2>
        <div className="text-[var(--text-secondary)] font-explanation space-y-2">
          <p>
            <strong>דוא"ל</strong>:{' '}
            <a
              href="mailto:orelzion@gmail.com"
              className="text-desert-oasis-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-desert-oasis-accent rounded"
            >
              orelzion@gmail.com
            </a>
          </p>
        </div>
        <div className="mt-4">
          <a
            href="mailto:orelzion@gmail.com?subject=פנייה בנושא נגישות"
            className="inline-flex items-center gap-2 px-6 py-3 bg-desert-oasis-accent hover:bg-desert-oasis-accent/90 text-white rounded-xl font-explanation font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-desert-oasis-accent"
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
              aria-hidden="true"
            >
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            צור קשר בנושא נגישות
          </a>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-source font-bold text-[var(--text-primary)] mb-4">
          דיווח על בעיות נגישות
        </h2>
        <p className="text-[var(--text-secondary)] font-explanation leading-relaxed mb-4">
          אם נתקלת בבעיית נגישות, אנא דווח לנו. אנו מחויבים לטפל בכל דיווח ולשפר את הנגישות של האפליקציה.
        </p>
        
        <h3 className="text-xl font-source font-semibold text-[var(--text-primary)] mb-3 mt-6">
          איך לדווח
        </h3>
        <p className="text-[var(--text-secondary)] font-explanation leading-relaxed mb-4">
          תוכל לדווח על בעיית נגישות באחת מהדרכים הבאות:
        </p>
        <ol className="list-decimal list-inside text-[var(--text-secondary)] font-explanation space-y-2 mb-6 ml-4">
          <li>השתמש בטופס למטה למילוי פרטים מפורטים</li>
          <li>שלח דוא"ל ישירות ל-<a href="mailto:orelzion@gmail.com?subject=דיווח על בעיית נגישות" className="text-desert-oasis-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-desert-oasis-accent rounded">orelzion@gmail.com</a></li>
        </ol>
        
        <p className="text-[var(--text-secondary)] font-explanation leading-relaxed mb-4">
          <strong>מידע שימושי לכלול בדיווח:</strong>
        </p>
        <ul className="list-disc list-inside text-[var(--text-secondary)] font-explanation space-y-2 mb-6 ml-4">
          <li>תיאור מפורט של הבעיה</li>
          <li>באיזה עמוד או מסך הבעיה מתרחשת</li>
          <li>המכשיר והדפדפן בהם השתמשת</li>
          <li>אם השתמשת בקורא מסך, ציין איזה</li>
          <li>צילומי מסך או הקלטות אם רלוונטי</li>
        </ul>

        <div className="bg-desert-oasis-card dark:bg-desert-oasis-dark-card rounded-xl p-6 border border-desert-oasis-muted/50 dark:border-gray-600/30">
          <h3 className="text-xl font-source font-semibold text-[var(--text-primary)] mb-4">
            טופס דיווח על בעיית נגישות
          </h3>
          <AccessibilityFeedbackForm />
        </div>

        <div className="mt-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <p className="text-[var(--text-secondary)] font-explanation">
            <strong>זמן תגובה צפוי</strong>: עד 14 ימי עסקים
          </p>
          <p className="text-[var(--text-secondary)] font-explanation text-sm mt-2">
            נבדוק כל דיווח ונעדכן אותך על ההתקדמות בטיפול בבעיה.
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-source font-bold text-[var(--text-primary)] mb-4">
          משוב
        </h2>
        <p className="text-[var(--text-secondary)] font-explanation leading-relaxed">
          אנו מעריכים משוב על נגישות האפליקציה. המשוב שלך עוזר לנו להשתפר.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-source font-bold text-[var(--text-primary)] mb-4">
          פרטי ההצהרה
        </h2>
        <div className="text-[var(--text-secondary)] font-explanation">
          <p><strong>תאריך ההצהרה</strong>: 20 בינואר 2026</p>
          <p className="mt-2 text-sm">
            הערה: האפליקציה פותחה תוך התחשבות בעקרונות נגישות WCAG 2.2 AA. 
            בדיקות נגישות מקיפות עם קוראי מסך ומשתמשים עם מוגבלויות טרם בוצעו.
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-source font-bold text-[var(--text-primary)] mb-4">
          תאימות לחוק
        </h2>
        <p className="text-[var(--text-secondary)] font-explanation leading-relaxed mb-4">
          האפליקציה עומדת בדרישות:
        </p>
        <ul className="list-disc list-inside text-[var(--text-secondary)] font-explanation space-y-2">
          <li>חוק שוויון זכויות לאנשים עם מוגבלות, התשנ"ח-1998</li>
          <li>תקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע"ג-2013</li>
        </ul>
      </section>
    </article>
  );
}
