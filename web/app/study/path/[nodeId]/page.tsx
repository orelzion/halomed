'use client';

import { useParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { Mascot } from '@/components/ui/Mascot';
import { ChapterStudyPage } from '@/components/study/ChapterStudyPage';
import { TOTAL_MISHNAYOT } from '@shared/lib/mishnah-structure';

/**
 * Parses a position-based node id ("computed-12") into the index of the
 * mishna it opens, or null when the id is anything else.
 */
function parseNodeIndex(nodeId: string | undefined): number | null {
  if (!nodeId?.startsWith('computed-')) return null;
  const index = parseInt(nodeId.replace('computed-', ''), 10);
  return Number.isInteger(index) && index >= 0 && index < TOTAL_MISHNAYOT ? index : null;
}

export default function PathStudyPage() {
  const params = useParams();
  const { t } = useTranslation();
  const startIndex = parseNodeIndex(params.nodeId as string | undefined);

  if (startIndex === null) {
    console.error('[PathStudyPage] Invalid node ID format:', params.nodeId);
    return (
      <div className="flex min-h-screen items-center justify-center bg-desert-oasis-primary dark:bg-desert-oasis-dark-primary">
        <div className="text-center">
          <Mascot mood="sad" size="md" />
          <p className="mt-4 font-explanation text-[var(--text-primary)]">{t('study_load_error')}</p>
        </div>
      </div>
    );
  }

  return <ChapterStudyPage key={startIndex} startIndex={startIndex} />;
}
