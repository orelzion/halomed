import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'קרדיטים - הלומד',
  description: 'מקורות התוכן וקרדיטים של הלומד (HaLomeid)',
};

export default function CreditsPage() {
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
        קרדיטים ומקורות
      </h1>

      <p className="text-[var(--text-secondary)] font-explanation leading-relaxed mb-8">
        הלומד משתמש בתוכן ממקורות פתוחים ואיכותיים. אנו מודים לפרויקטים הבאים על תרומתם לשימור והפצת התורה:
      </p>

      <section className="mb-8">
        <h2 className="text-2xl font-source font-bold text-[var(--text-primary)] mb-4">
          מקורות התוכן
        </h2>
        
        <div className="space-y-6">
          <div className="bg-desert-oasis-card dark:bg-desert-oasis-dark-card rounded-lg p-6 border border-desert-oasis-accent/10">
            <h3 className="text-xl font-source font-semibold text-[var(--text-primary)] mb-3">
              ויקיטקסט (Hebrew Wikisource)
            </h3>
            <p className="text-[var(--text-secondary)] font-explanation leading-relaxed mb-3">
              טקסט המשנה מקורו מ<strong>ויקיטקסט</strong>, ספריית הטקסטים החופשית בעברית. 
              ויקיטקסט הוא פרויקט של קרן ויקימדיה המספק גישה חופשית לטקסטים היסטוריים ותורניים.
            </p>
            <a 
              href="https://he.wikisource.org/wiki/משנה" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-desert-oasis-accent hover:underline font-explanation"
            >
              he.wikisource.org/wiki/משנה ←
            </a>
          </div>

          <div className="bg-desert-oasis-card dark:bg-desert-oasis-dark-card rounded-lg p-6 border border-desert-oasis-accent/10">
            <h3 className="text-xl font-source font-semibold text-[var(--text-primary)] mb-3">
              ספריא (Sefaria)
            </h3>
            <p className="text-[var(--text-secondary)] font-explanation leading-relaxed mb-3">
              <strong>הפירושים והמפרשים</strong> מקורם מ<strong>ספריא</strong>, ספרייה חיה וחופשית של טקסטים יהודיים. 
              ספריא מספקת גישה לאלפי מקורות תורניים, כולל פירושי המשנה של רש"י, רמב"ם, ברטנורא ועוד.
            </p>
            <a 
              href="https://www.sefaria.org/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-desert-oasis-accent hover:underline font-explanation"
            >
              www.sefaria.org ←
            </a>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-source font-bold text-[var(--text-primary)] mb-4">
          רישיונות
        </h2>
        <ul className="list-disc list-inside text-[var(--text-secondary)] font-explanation space-y-2">
          <li>
            <strong>ויקיטקסט</strong>: התוכן זמין תחת רישיון{' '}
            <a 
              href="https://creativecommons.org/licenses/by-sa/4.0/deed.he" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-desert-oasis-accent hover:underline"
            >
              CC BY-SA 4.0
            </a>
          </li>
          <li>
            <strong>ספריא</strong>: התוכן זמין תחת רישיונות שונים, בהתאם למקור.{' '}
            <a 
              href="https://www.sefaria.org/terms" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-desert-oasis-accent hover:underline"
            >
              ראה תנאי השימוש של ספריא
            </a>
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-source font-bold text-[var(--text-primary)] mb-4">
          תודות מיוחדות
        </h2>
        <p className="text-[var(--text-secondary)] font-explanation leading-relaxed">
          תודה לכל המתנדבים והתורמים שעובדים על פרויקטים אלו ומאפשרים לכולנו ללמוד תורה בנגישות.
        </p>
      </section>
    </article>
  );
}
