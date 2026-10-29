import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Auth routes - allow access without checking session first
  const authRoutes = ['/login', '/signup'];
  if (authRoutes.includes(pathname)) {
    try {
      const session = await auth();
      // Only redirect if session exists and is valid
      if (session?.user) {
        return NextResponse.redirect(new URL('/', request.url));
      }
    } catch (error) {
      // If auth check fails, allow access to auth pages
      console.error('Auth check error in middleware:', error);
    }
    // Allow access to auth pages
    return NextResponse.next();
  }

  // Try to get session for protected routes
  let session = null;
  try {
    session = await auth();
  } catch (error) {
    // If auth check fails, treat as no session
    console.error('Auth check error in middleware:', error);
  }

  // Public routes that don't require auth
  const publicRoutes = ['/', '/tours', '/how-it-works'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // Protected client routes
  const clientProtectedRoutes = ['/bookings', '/profile'];
  const isClientProtected = clientProtectedRoutes.some(route => pathname.startsWith(route));
  
  if (isClientProtected && !session) {
    const callbackUrl = encodeURIComponent(pathname);
    return NextResponse.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, request.url));
  }

  // Admin-only routes
  const adminRoutes = ['/dashboard'];
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));
  
  if (isAdminRoute) {
    if (!session?.user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (session.user.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except static files and api routes
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

