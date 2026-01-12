// supabase/tests/logic/scheduling.test.ts
// Tests for scheduling logic (weekday detection, Jewish holiday detection)
// Reference: TDD Section 6.3, scheduling.md

import { assertEquals } from 'https://deno.land/std@0.208.0/testing/asserts.ts';
import { isScheduledDay, isScheduledDaySync, isJewishHoliday, isJewishHolidaySync } from '../../functions/_shared/calendar.ts';

// ============================================================================
// WEEKDAY SCHEDULING TESTS
// ============================================================================

Deno.test('scheduling: Saturday is not a scheduled day', async () => {
  const saturday = new Date('2024-01-20'); // Saturday, Jan 20, 2024
  const result = await isScheduledDay(saturday, 'DAILY_WEEKDAYS_ONLY');
  assertEquals(result, false, 'Saturday should not be scheduled');
});

Deno.test('scheduling: Sunday is a scheduled day (Hebrew calendar weekdays)', async () => {
  const sunday = new Date('2024-01-21'); // Sunday, Jan 21, 2024
  const result = await isScheduledDay(sunday, 'DAILY_WEEKDAYS_ONLY');
  assertEquals(result, true, 'Sunday should be scheduled (Hebrew calendar weekdays are Sun-Fri)');
});

Deno.test('scheduling: Monday is a scheduled day', async () => {
  const monday = new Date('2024-01-15'); // Monday, Jan 15, 2024
  const result = await isScheduledDay(monday, 'DAILY_WEEKDAYS_ONLY');
  assertEquals(result, true, 'Monday should be scheduled');
});

Deno.test('scheduling: Tuesday is a scheduled day', async () => {
  const tuesday = new Date('2024-01-16'); // Tuesday, Jan 16, 2024
  const result = await isScheduledDay(tuesday, 'DAILY_WEEKDAYS_ONLY');
  assertEquals(result, true, 'Tuesday should be scheduled');
});

Deno.test('scheduling: Wednesday is a scheduled day', async () => {
  const wednesday = new Date('2024-01-17'); // Wednesday, Jan 17, 2024
  const result = await isScheduledDay(wednesday, 'DAILY_WEEKDAYS_ONLY');
  assertEquals(result, true, 'Wednesday should be scheduled');
});

Deno.test('scheduling: Thursday is a scheduled day', async () => {
  const thursday = new Date('2024-01-18'); // Thursday, Jan 18, 2024
  const result = await isScheduledDay(thursday, 'DAILY_WEEKDAYS_ONLY');
  assertEquals(result, true, 'Thursday should be scheduled');
});

Deno.test('scheduling: Friday is a scheduled day', async () => {
  const friday = new Date('2024-01-19'); // Friday, Jan 19, 2024
  const result = await isScheduledDay(friday, 'DAILY_WEEKDAYS_ONLY');
  assertEquals(result, true, 'Friday should be scheduled');
});

// ============================================================================
// JEWISH HOLIDAY DETECTION TESTS
// ============================================================================

Deno.test('scheduling: Passover is detected as holiday', async () => {
  // First day of Passover 2024: April 22 (Monday)
  const passover = new Date('2024-04-22');
  const result = await isJewishHoliday(passover);
  assertEquals(result, true, 'Passover should be detected as a holiday');
});

Deno.test('scheduling: Second day of Passover is detected as holiday', async () => {
  // Second day of Passover 2024: April 23 (Tuesday)
  const passover2 = new Date('2024-04-23');
  const result = await isJewishHoliday(passover2);
  assertEquals(result, true, 'Second day of Passover should be detected as a holiday');
});

Deno.test('scheduling: Rosh Hashana is detected as holiday', async () => {
  // First day of Rosh Hashana 2024: October 2 (Wednesday)
  const roshHashana = new Date('2024-10-02');
  const result = await isJewishHoliday(roshHashana);
  assertEquals(result, true, 'Rosh Hashana should be detected as a holiday');
});

Deno.test('scheduling: Yom Kippur is detected as holiday', async () => {
  // Yom Kippur 2024: October 11 (Friday)
  const yomKippur = new Date('2024-10-11');
  const result = await isJewishHoliday(yomKippur);
  assertEquals(result, true, 'Yom Kippur should be detected as a holiday');
});

Deno.test('scheduling: Sukkot is detected as holiday', async () => {
  // First day of Sukkot 2024: October 16 (Wednesday)
  const sukkot = new Date('2024-10-16');
  const result = await isJewishHoliday(sukkot);
  assertEquals(result, true, 'Sukkot should be detected as a holiday');
});

Deno.test('scheduling: Shavuot is detected as holiday', async () => {
  // First day of Shavuot 2024: June 11 (Tuesday)
  const shavuot = new Date('2024-06-11');
  const result = await isJewishHoliday(shavuot);
  assertEquals(result, true, 'Shavuot should be detected as a holiday');
});

Deno.test('scheduling: regular weekday is not a holiday', async () => {
  const regularDay = new Date('2024-06-15'); // Regular Saturday (but we check holiday, not weekday)
  const result = await isJewishHoliday(regularDay);
  assertEquals(result, false, 'Regular day should not be detected as a holiday');
});

Deno.test('scheduling: regular weekday (Monday) is not a holiday', async () => {
  const regularDay = new Date('2024-06-17'); // Regular Monday
  const result = await isJewishHoliday(regularDay);
  assertEquals(result, false, 'Regular weekday should not be detected as a holiday');
});

// ============================================================================
// COMBINED SCHEDULING TESTS (Weekday + Holiday)
// ============================================================================

Deno.test('scheduling: weekday that is a holiday is not scheduled', async () => {
  // Passover 2024 first day is a Monday (weekday but holiday)
  const passoverMonday = new Date('2024-04-22'); // Monday, but Passover
  const result = await isScheduledDay(passoverMonday, 'DAILY_WEEKDAYS_ONLY');
  assertEquals(result, false, 'Weekday that is a holiday should not be scheduled');
});

Deno.test('scheduling: weekday that is not a holiday is scheduled', async () => {
  const regularMonday = new Date('2024-06-17'); // Regular Monday
  const result = await isScheduledDay(regularMonday, 'DAILY_WEEKDAYS_ONLY');
  assertEquals(result, true, 'Regular weekday should be scheduled');
});

Deno.test('scheduling: Saturday that is not a holiday is not scheduled', async () => {
  const regularSaturday = new Date('2024-06-15'); // Regular Saturday
  const result = await isScheduledDay(regularSaturday, 'DAILY_WEEKDAYS_ONLY');
  assertEquals(result, false, 'Saturday should not be scheduled even if not a holiday');
});
