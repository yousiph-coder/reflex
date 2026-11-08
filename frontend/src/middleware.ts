import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Edge middleware passes through requests; route protection and session hydration
  // are delegated to the client-side AuthGuard / layout to prevent race conditions
  // between Edge cookies and async Supabase browser session hydration.
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
