import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const hostname = request.headers.get('host') || '';
    const url = request.nextUrl.clone();

    // Remove port if present
    const hostWithoutPort = hostname.split(':')[0];

    // Identify subdomain
    let subdomain: string | null = null;

    // Production check (*.deep-technologies.com)
    if (hostWithoutPort.endsWith('.deep-technologies.com')) {
        const parts = hostWithoutPort.split('.');
        if (parts.length >= 3 && parts[0] !== 'www' && parts[0] !== 'teamproject') {
            subdomain = parts[0];
        }
    }
    // Localhost check (*.localhost)
    else if (hostWithoutPort.endsWith('.localhost')) {
        const parts = hostWithoutPort.split('.');
        if (parts.length >= 2 && parts[0] !== 'www') {
            subdomain = parts[0];
        }
    }

    // Set request headers for downstream components
    const requestHeaders = new Headers(request.headers);
    if (subdomain) {
        requestHeaders.set('x-tenant-subdomain', subdomain);
    }

    const response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });

    if (subdomain) {
        response.cookies.set('tenant_subdomain', subdomain, { path: '/' });
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!_next/static|_next/image|favicon.ico|public/).*)',
    ],
};
