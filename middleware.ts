import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

/**
 * Next.js middleware — runs on every route listed in `config.matcher`.
 *
 * Responsibilities:
 * 1. Refresh the Supabase session cookie on every request.
 * 2. Redirect unauthenticated users to /login.
 *
 * Public routes (NOT in the matcher — always accessible without a session):
 * - /login          auth
 * - /register       auth
 * - /verify-otp     auth  ← explicitly public: user must reach here unauthenticated
 * - /offline        PWA fallback
 * - /privacy        legal
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  // Always refresh session cookies, even if we later redirect
  const response = await updateSession(request);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Protected routes — middleware runs only on these paths.
     * Auth routes (/login, /register, /verify-otp) and /offline are
     * intentionally omitted so they remain publicly accessible.
     */
    "/profile/:path*",
    "/post/:path*",
    "/strikes",
    "/strikes/:path*",
    "/appeals/:path*",
    "/reports",
    "/reports/:path*",
  ],
};
