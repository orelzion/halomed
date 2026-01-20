'use client';

import { useState, FormEvent } from 'react';

export function AccessibilityFeedbackForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    issueDescription: '',
    pageScreen: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Create mailto link with form data
    const subject = encodeURIComponent('דיווח על בעיית נגישות');
    const body = encodeURIComponent(
      `שם: ${formData.name}\n` +
      `דוא"ל: ${formData.email}\n` +
      `עמוד/מסך: ${formData.pageScreen || 'לא צוין'}\n\n` +
      `תיאור הבעיה:\n${formData.issueDescription}`
    );

    const mailtoLink = `mailto:orelzion@gmail.com?subject=${subject}&body=${body}`;
    
    // Open email client
    window.location.href = mailtoLink;
    
    // Show success message
    setTimeout(() => {
      setIsSubmitting(false);
      setShowSuccess(true);
      // Reset form
      setFormData({
        name: '',
        email: '',
        issueDescription: '',
        pageScreen: '',
      });
      // Hide success message after 5 seconds
      setTimeout(() => setShowSuccess(false), 5000);
    }, 500);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="mt-6">
      {showSuccess && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-4 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
        >
          <p className="text-green-700 dark:text-green-300 font-explanation">
            תודה! נפתחה תיבת דוא"ל עם הפרטים שלך. אנא שלח את ההודעה.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="feedback-name"
            className="block text-sm font-explanation font-semibold text-[var(--text-primary)] mb-2"
          >
            שם <span className="text-red-500" aria-label="שדה חובה">*</span>
          </label>
          <input
            id="feedback-name"
            name="name"
            type="text"
            required
            value={formData.name}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-[var(--text-primary)] font-explanation focus:outline-none focus:ring-2 focus:ring-desert-oasis-accent focus:border-transparent"
            placeholder="הכנס את שמך"
            dir="rtl"
          />
        </div>

        <div>
          <label
            htmlFor="feedback-email"
            className="block text-sm font-explanation font-semibold text-[var(--text-primary)] mb-2"
          >
            דוא"ל <span className="text-red-500" aria-label="שדה חובה">*</span>
          </label>
          <input
            id="feedback-email"
            name="email"
            type="email"
            required
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-[var(--text-primary)] font-explanation focus:outline-none focus:ring-2 focus:ring-desert-oasis-accent focus:border-transparent"
            placeholder="your.email@example.com"
            dir="ltr"
          />
        </div>

        <div>
          <label
            htmlFor="feedback-page"
            className="block text-sm font-explanation font-semibold text-[var(--text-primary)] mb-2"
          >
            עמוד/מסך
          </label>
          <input
            id="feedback-page"
            name="pageScreen"
            type="text"
            value={formData.pageScreen}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-[var(--text-primary)] font-explanation focus:outline-none focus:ring-2 focus:ring-desert-oasis-accent focus:border-transparent"
            placeholder="לדוגמה: דף הבית, מסך לימוד, וכו'"
            dir="rtl"
          />
        </div>

        <div>
          <label
            htmlFor="feedback-description"
            className="block text-sm font-explanation font-semibold text-[var(--text-primary)] mb-2"
          >
            תיאור הבעיה{' '}
            <span className="text-red-500" aria-label="שדה חובה">*</span>
          </label>
          <textarea
            id="feedback-description"
            name="issueDescription"
            required
            rows={5}
            value={formData.issueDescription}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-[var(--text-primary)] font-explanation focus:outline-none focus:ring-2 focus:ring-desert-oasis-accent focus:border-transparent resize-y"
            placeholder="תאר את בעיית הנגישות שנתקלת בה..."
            dir="rtl"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-6 py-3 bg-desert-oasis-accent hover:bg-desert-oasis-accent/90 text-white rounded-xl font-explanation font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-desert-oasis-accent"
        >
          {isSubmitting ? 'שולח...' : 'שלח דיווח'}
        </button>
      </form>

      <p className="mt-4 text-sm text-[var(--text-secondary)] font-explanation text-center">
        לחלופין, תוכל לשלוח דוא"ל ישירות ל-{' '}
        <a
          href="mailto:orelzion@gmail.com?subject=דיווח על בעיית נגישות"
          className="text-desert-oasis-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-desert-oasis-accent rounded"
        >
          orelzion@gmail.com
        </a>
      </p>
    </div>
  );
}
