// supabase/functions/_shared/cors.ts
// CORS handler for Edge Functions
// Reference: backend.md Section 6

export interface CorsOptions {
  origin?: string | string[];
  methods?: string[];
  headers?: string[];
  credentials?: boolean;
}

const DEFAULT_OPTIONS: CorsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  headers: ['Content-Type', 'Authorization'],
  credentials: false,
};

/**
 * Creates CORS headers for Edge Function responses
 */
export function createCorsHeaders(options: CorsOptions = {}): Headers {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const headers = new Headers();

  // Handle origin
  if (opts.origin) {
    if (Array.isArray(opts.origin)) {
      headers.set('Access-Control-Allow-Origin', opts.origin[0]);
    } else {
      headers.set('Access-Control-Allow-Origin', opts.origin);
    }
  }

  // Handle methods
  if (opts.methods) {
    headers.set('Access-Control-Allow-Methods', opts.methods.join(', '));
  }

  // Handle headers
  if (opts.headers) {
    headers.set('Access-Control-Allow-Headers', opts.headers.join(', '));
  }

  // Handle credentials
  if (opts.credentials) {
    headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return headers;
}

/**
 * Handles OPTIONS preflight requests
 */
export function handleCorsPreflight(request: Request, options: CorsOptions = {}): Response | null {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: createCorsHeaders(options),
    });
  }
  return null;
}
