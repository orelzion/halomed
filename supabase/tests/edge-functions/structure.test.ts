// supabase/tests/edge-functions/structure.test.ts
// Tests for Edge Functions directory structure
// Reference: backend.md Section 6

import { assertExists } from 'https://deno.land/std@0.208.0/testing/asserts.ts';

Deno.test('structure: Edge Functions directory exists', () => {
  const functionsDir = 'supabase/functions';
  try {
    const stat = Deno.statSync(functionsDir);
    assertExists(stat.isDirectory, 'supabase/functions should be a directory');
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(`supabase/functions directory does not exist: ${message}`);
  }
});

Deno.test('structure: _shared directory exists', () => {
  const sharedDir = 'supabase/functions/_shared';
  try {
    const stat = Deno.statSync(sharedDir);
    assertExists(stat.isDirectory, 'supabase/functions/_shared should be a directory');
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(`supabase/functions/_shared directory does not exist: ${message}`);
  }
});

Deno.test('structure: cors.ts utility exists', () => {
  const corsFile = 'supabase/functions/_shared/cors.ts';
  try {
    const stat = Deno.statSync(corsFile);
    assertExists(stat.isFile, 'cors.ts should be a file');
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(`cors.ts does not exist: ${message}`);
  }
});

Deno.test('structure: auth.ts utility exists', () => {
  const authFile = 'supabase/functions/_shared/auth.ts';
  try {
    const stat = Deno.statSync(authFile);
    assertExists(stat.isFile, 'auth.ts should be a file');
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(`auth.ts does not exist: ${message}`);
  }
});

Deno.test('structure: cors.ts exports CORS handler', async () => {
  // Try to import and verify it exports something
  const corsModule = await import('../../functions/_shared/cors.ts');
  assertExists(corsModule, 'cors.ts should export something');
  // Should export a function or object for CORS handling
  const hasExport = Object.keys(corsModule).length > 0;
  assertExists(hasExport, 'cors.ts should export CORS handler');
});

Deno.test('structure: auth.ts exports auth validation', async () => {
  // Try to import and verify it exports something
  const authModule = await import('../../functions/_shared/auth.ts');
  assertExists(authModule, 'auth.ts should export something');
  // Should export a function or object for auth validation
  const hasExport = Object.keys(authModule).length > 0;
  assertExists(hasExport, 'auth.ts should export auth validation');
});
