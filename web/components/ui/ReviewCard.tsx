/**
 * ReviewCard - Tinder-style swipeable review card
 * Swipe right = "Got it", swipe left = "Need practice"
 * Styled to match study page content display
 */

'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { formatContentRef } from '@/lib/utils/date-format';

interface ReviewCardProps {
  contentRef: string;
  tractate: string;
  tractateHebrew: string;
  chapter: number;
  mishna: number;
  sourceText?: string;
  explanation?: string;
  halakha?: string;
  heRef?: string;
  onNext: () => void;
  onDeeper: () => void;
  isTop: boolean;
}

export function ReviewCard({
  contentRef,
  tractate,
  tractateHebrew,
  chapter,
  mishna,
  sourceText,
  explanation,
  halakha,
  heRef,
  onNext,
  onDeeper,
  isTop,
}: ReviewCardProps) {
  const x = useMotionValue(0);
  
  // Color overlay for swipe direction indicator
  const overlayColor = useTransform(
    x,
    [0, 200],
    [
      'rgba(0, 0, 0, 0)',         // Transparent
      'rgba(34, 197, 94, 0.15)',  // Green tint for "next"
    ]
  );
  
  const rotate = useTransform(x, [-200, 200], [-15, 15]);

  // Indicator opacity based on swipe
  const nextOpacity = useTransform(x, [0, 100], [0, 1]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 100;
    // Swipe right (or any direction) moves to next
    if (Math.abs(info.offset.x) > threshold) {
      onNext();
    }
  };

  // Format title using the same function as study page
  const title = formatContentRef(contentRef, heRef);

  return (
    <motion.div
      className="absolute inset-0"
      style={{ 
        x: isTop ? x : 0, 
        rotate: isTop ? rotate : 0,
        zIndex: isTop ? 10 : 0,
        scale: isTop ? 1 : 0.95,
        y: isTop ? 0 : 10,
      }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      whileTap={isTop ? { cursor: 'grabbing' } : undefined}
    >
      <div className="w-full h-full rounded-3xl bg-[#FEFAE0] dark:bg-gray-800 shadow-xl overflow-hidden border border-[#DDA15E]/20 flex flex-col">
        {/* Color overlay for swipe feedback */}
        <motion.div 
          className="absolute inset-0 pointer-events-none rounded-3xl z-20"
          style={{ backgroundColor: overlayColor }}
        />
        
        {/* Swipe indicator */}
        {isTop && (
          <motion.div
            className="absolute top-6 left-6 z-30 px-4 py-2 rounded-lg border-2 border-green-500 bg-green-500/20"
            style={{ opacity: nextOpacity }}
          >
            <span className="text-green-600 font-bold text-lg">הבא</span>
          </motion.div>
        )}

        {/* Header */}
        <div className="text-center py-4 px-6 border-b border-[#DDA15E]/20">
          <h3 className="text-xl font-source font-bold text-desert-oasis-accent">
            {title || `${tractateHebrew} ${chapter}:${mishna}`}
          </h3>
        </div>

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4" dir="rtl">
          {sourceText ? (
            <>
              {/* Mishna Text - styled like study page */}
              <div className="text-xl font-source font-bold text-[var(--text-primary)] leading-relaxed">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-4">{children}</p>,
                    strong: ({ children }) => (
                      <strong className="text-[#D4A373] font-bold">{children}</strong>
                    ),
                    hr: () => (
                      <hr className="my-4 border-t border-[#D4A373] opacity-50" />
                    ),
                  }}
                >
                  {sourceText}
                </ReactMarkdown>
              </div>
              
              {/* Brief Explanation */}
              {explanation && (
                <div className="text-lg font-explanation text-[var(--text-secondary)] leading-relaxed">
                  {explanation}
                </div>
              )}

              {/* Halakha Section */}
              {halakha && halakha.trim() && (
                <div className="space-y-2 pt-2 border-t border-[#DDA15E]/20">
                  <h4 className="text-lg font-source font-bold text-[var(--text-primary)]">
                    הלכה
                  </h4>
                  <div className="text-base font-explanation text-[var(--text-secondary)] leading-relaxed">
                    {halakha}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-gray-400">טוען תוכן...</p>
            </div>
          )}
        </div>

        {/* Action Buttons - prominent like quiz */}
        {isTop && (
          <div className="p-4 border-t border-[#DDA15E]/20 flex gap-3">
            <button
              onClick={onDeeper}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-desert-oasis-accent to-orange-500 text-white rounded-2xl font-explanation text-lg font-semibold shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
            >
              צלילה עמוקה
            </button>
            <button
              onClick={onNext}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-2xl font-explanation text-lg font-semibold shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
            >
              הבא
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
