import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toPlainText } from './mishnaText.ts';

test('removes emphasis markers', () => {
  assert.equal(toPlainText('דברי **רבי אליעזר**. וחכמים'), 'דברי רבי אליעזר. וחכמים');
});

test('joins paragraphs and horizontal rules onto one line', () => {
  assert.equal(toPlainText('פסקה ראשונה\n\n---\n\nפסקה שנייה'), 'פסקה ראשונה --- פסקה שנייה');
});

test('trims the result', () => {
  assert.equal(toPlainText('  משנה  \n'), 'משנה');
});
