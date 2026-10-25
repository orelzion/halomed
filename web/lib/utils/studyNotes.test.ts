import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildStudyNotes } from './studyNotes.ts';

test('returns an empty result when there is no explanation', () => {
  assert.deepEqual(buildStudyNotes(null), { explanation: null, notes: [], halakha: null });
  assert.deepEqual(buildStudyNotes('x'), { explanation: null, notes: [], halakha: null });
});

test('keeps the explanation and halakha apart from the notes', () => {
  const result = buildStudyNotes({
    mishna_modern: ' פסקה ראשונה\n\nפסקה שנייה ',
    halakha: ' הלכה למעשה ',
    opinions: [],
    expansions: [],
  });
  assert.equal(result.explanation, 'פסקה ראשונה\n\nפסקה שנייה');
  assert.equal(result.halakha, 'הלכה למעשה');
  assert.deepEqual(result.notes, []);
});

test('opinions come before expansions, each as a note with its own lead', () => {
  const result = buildStudyNotes({
    mishna_modern: 'x',
    halakha: '',
    opinions: [{ source: 'רבי אליעזר', details: 'עד סוף האשמורה הראשונה' }],
    expansions: [{ topic: 'אשמורה', explanation: 'משמרת של הלילה', source: 'ברטנורא' }],
  });
  assert.deepEqual(result.notes, [
    { lead: 'רבי אליעזר', text: 'עד סוף האשמורה הראשונה' },
    { lead: 'אשמורה', text: 'משמרת של הלילה', source: 'ברטנורא' },
  ]);
  assert.equal(result.halakha, null);
});

test('skips entries without text and tolerates missing fields', () => {
  const result = buildStudyNotes({
    mishna_modern: 'x',
    halakha: 'y',
    opinions: [{ source: 'a', details: '  ' }, null],
    expansions: [{ topic: 'b' }, { explanation: 'only text' }],
  });
  assert.deepEqual(result.notes, [{ lead: '', text: 'only text' }]);
});
