'use client';

import { useState } from 'react';

interface DeleteAccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteAccountDialog({ isOpen, onClose, onConfirm }: DeleteAccountDialogProps) {
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const isConfirmEnabled = confirmationText === 'DELETE' && !isDeleting;

  const handleConfirm = async () => {
    if (!isConfirmEnabled) return;

    setIsDeleting(true);
    try {
      await onConfirm();
    } catch (error) {
      console.error('Error deleting account:', error);
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (isDeleting) return; // Prevent closing while deleting
    setConfirmationText('');
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-source font-bold text-[var(--text-primary)] mb-4">
          מחיקת חשבון
        </h2>

        <p className="text-[var(--text-secondary)] font-explanation mb-6">
          פעולה זו תמחק את כל הנתונים שלך לצמיתות ולא ניתן לבטלה.
        </p>

        <div className="mb-6">
          <label className="block text-sm font-explanation font-semibold text-[var(--text-primary)] mb-2">
            הקלד DELETE כדי לאשר
          </label>
          <input
            type="text"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            disabled={isDeleting}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-[var(--text-primary)] font-explanation disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="DELETE"
            dir="ltr"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-[var(--text-primary)] rounded-xl font-explanation font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ביטול
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isConfirmEnabled}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-explanation font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'מוחק...' : 'מחק לצמיתות'}
          </button>
        </div>
      </div>
    </div>
  );
}
