import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple in-memory rate limiter for development
// In production, use Redis or Upstash Redis
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT = {
  // API endpoints: 10 requests per minute
  '/api/scrape': { requests: 10, window: 60 * 1000 }, // 1 minute
  // Auth endpoints: 5 requests per minute
  '/api/auth': { requests: 5, window: 60 * 1000 },
  // Default: 100 requests per minute
  default: { requests: 100, window: 60 * 1000 },
};

function getClientIdentifier(request: NextRequest): string {
  // Try to get user ID from auth header first
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    // Extract user ID from JWT token (simplified)
    return authHeader.substring(0, 20); // Use part of token as identifier
  }
  
  // Fallback to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 
               request.headers.get('x-real-ip') || 
               request.ip || 
               'unknown';
  return ip;
}

function getRateLimitForPath(pathname: string) {
  for (const [path, limit] of Object.entries(RATE_LIMIT)) {
    if (pathname.startsWith(path)) {
      return limit;
    }
  }
  return RATE_LIMIT.default;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // This middleware only runs on /api/scrape due to the matcher config
  const clientId = getClientIdentifier(request);
  const rateLimit = getRateLimitForPath(pathname);
  const now = Date.now();
  const key = `${pathname}:${clientId}`;

  // Clean up expired entries
  for (const [k, v] of rateLimitMap.entries()) {
    if (now > v.resetTime) {
      rateLimitMap.delete(k);
    }
  }

  // Check current rate limit
  const current = rateLimitMap.get(key);
  if (current && now < current.resetTime) {
    if (current.count >= rateLimit.requests) {
      return new NextResponse(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': rateLimit.requests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': current.resetTime.toString(),
          },
        }
      );
    }
    current.count++;
  } else {
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + rateLimit.window,
    });
  }

  // Add rate limit headers
  const response = NextResponse.next();
  const currentLimit = rateLimitMap.get(key);
  if (currentLimit) {
    response.headers.set('X-RateLimit-Limit', rateLimit.requests.toString());
    response.headers.set('X-RateLimit-Remaining', 
      Math.max(0, rateLimit.requests - currentLimit.count).toString());
    response.headers.set('X-RateLimit-Reset', currentLimit.resetTime.toString());
  }

  return response;
}

export const config = {
  matcher: [
    '/api/scrape/:path*',
  ],
};
