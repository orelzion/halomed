'use client';

import { useEffect, useState } from 'react';

export interface ScheduledUnit {
  id: string;
  study_date: string;
  content_id: string | null;
  is_completed: boolean;
  completed_at: string | null;
  content_ref_id: string | null;
  content_he_ref: string | null;
}

export function useSchedule(trackId: string | null) {
  const [units, setUnits] = useState<ScheduledUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!trackId) {
      setUnits([]);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadSchedule = async () => {
      try {
        setLoading(true);
        setError(null);

        const { supabase } = await import('@/lib/supabase/client');
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          if (isMounted) {
            setUnits([]);
            setLoading(false);
          }
          return;
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (!supabaseUrl) {
          throw new Error('Missing Supabase URL');
        }

        const response = await fetch('/api/query-schedule', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ track_id: trackId }),
        });

        if (!response.ok) {
          const responseText = await response.text();
          let errorData: any = {};
          try {
            errorData = JSON.parse(responseText);
          } catch {
            errorData = { error: responseText || `HTTP ${response.status}` };
          }
          console.error('Schedule query error:', {
            status: response.status,
            statusText: response.statusText,
            body: responseText,
            parsed: errorData,
          });
          throw new Error(errorData.error || errorData.details || `Failed to load schedule (${response.status})`);
        }

        const data = await response.json();
        
        // Check if any units have missing content (content_id but no content_ref_id)
        // This happens when content_cache was deleted but user_study_log still references it
        const unitsWithMissingContent = (data.scheduled_units || []).filter(
          (unit: ScheduledUnit) => unit.content_id && !unit.content_ref_id
        );
        
        // If we have units with missing content, trigger schedule regeneration
        // This will regenerate the missing content
        if (unitsWithMissingContent.length > 0 && isMounted) {
          console.log(`Detected ${unitsWithMissingContent.length} units with missing content, triggering regeneration...`);
          
          // Trigger schedule generation to regenerate missing content
          // We'll generate for a window that covers all affected dates
          const dates = unitsWithMissingContent.map((u: ScheduledUnit) => u.study_date).sort();
          const minDate = dates[0];
          const maxDate = dates[dates.length - 1];
          
          // Calculate days_ahead to cover the range
          const startDate = new Date(minDate);
          const endDate = new Date(maxDate);
          const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          
          fetch('/api/generate-schedule', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              track_id: trackId,
              start_date: minDate,
              days_ahead: Math.max(daysDiff, 14), // At least 14 days to ensure full coverage
            }),
          }).catch((err) => {
            console.error('Failed to trigger content regeneration:', err);
          });
        }
        
        if (isMounted) {
          setUnits(data.scheduled_units || []);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading schedule:', err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
          setLoading(false);
        }
      }
    };

    loadSchedule();

    return () => {
      isMounted = false;
    };
  }, [trackId]);

  return { units, loading, error };
}
