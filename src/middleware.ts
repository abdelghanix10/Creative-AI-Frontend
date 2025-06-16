import { type NextRequest, NextResponse } from "next/server";
import { auth } from "./server/auth";

export async function middleware(request: NextRequest) {
  const session = await auth();
  const path = request.nextUrl.pathname;
  const isAuthRoute = path === "/app/sign-in" || path === "/app/sign-up";
  const isProtectedRoute = path.startsWith("/app/") && !isAuthRoute;
  const isAdminRoute = path.startsWith("/app/admin");

  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL("/app/dashboard", request.url));
  }

  if (!session && isProtectedRoute) {
    const signInUrl = new URL("/app/sign-in", request.url);
    signInUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(signInUrl);
  }

  // Check admin access for admin routes
  if (session && isAdminRoute) {
    // Check user role from session (which is already populated from the database during auth)
    if (session.user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/app/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
