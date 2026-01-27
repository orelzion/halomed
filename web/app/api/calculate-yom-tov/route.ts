/**
 * API endpoint to calculate Yom Tov dates
 * Uses @hebcal/core for accurate Jewish holiday calculations
 * Friday/Saturday are calculated client-side (trivial)
 */

import { NextRequest, NextResponse } from 'next/server';
import { HDate, HebrewCalendar, flags } from '@hebcal/core';

interface CalculateYomTovRequest {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  israelMode?: boolean; // true = Israel (1 day), false = Diaspora (2 days)
}

/**
 * Get all Yom Tov dates in a date range
 * Yom Tov = days when work is forbidden (similar to Shabbat)
 */
function getYomTovDates(
  startDate: Date, 
  endDate: Date, 
  israelMode: boolean
): string[] {
  const yomTovDates = new Set<string>();
  
  // Get the Hebrew years we need to check
  const startHDate = new HDate(startDate);
  const endHDate = new HDate(endDate);
  const startYear = startHDate.getFullYear();
  const endYear = endHDate.getFullYear();
  
  // Get holidays for each Hebrew year in range
  for (let year = startYear; year <= endYear + 1; year++) {
    const events = HebrewCalendar.calendar({
      year: year,
      isHebrewYear: true,
      il: israelMode,
    });
    
    for (const ev of events) {
      // Check if this is a Yom Tov (work forbidden)
      const evFlags = ev.getFlags();
      const isYomTov = (evFlags & flags.CHAG) !== 0;
      
      if (isYomTov) {
        const gregDate = ev.getDate().greg();
        // Format as local date to avoid timezone issues
        const year = gregDate.getFullYear();
        const month = String(gregDate.getMonth() + 1).padStart(2, '0');
        const day = String(gregDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        // Only include if within our range
        if (gregDate >= startDate && gregDate <= endDate) {
          yomTovDates.add(dateStr);
        }
      }
    }
  }
  
  // Return sorted array
  return Array.from(yomTovDates).sort();
}

export async function POST(request: NextRequest) {
  try {
    const body: CalculateYomTovRequest = await request.json();
    
    const {
      startDate,
      endDate,
      israelMode = true, // Default to Israel
    } = body;
    
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }
    
    const yomTovDates = getYomTovDates(start, end, israelMode);
    
    return NextResponse.json({
      yomTovDates,
      count: yomTovDates.length,
      startDate,
      endDate,
      israelMode,
    });
  } catch (error) {
    console.error('[calculate-yom-tov] Error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate Yom Tov dates' },
      { status: 500 }
    );
  }
}
