import { NextResponse, type NextRequest } from 'next/server';

// DEPRECATED: This API route is no longer supported
// The current implementation uses client-side path computation via path-generator.ts
// This route returns 410 Gone to indicate the endpoint is deprecated

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'DEPRECATED: /api/query-schedule is no longer supported',
      message: 'Path is computed client-side using path-generator.ts'
    },
    { status: 410 }
  );
}
