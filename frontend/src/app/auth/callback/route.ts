import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data?.session) {
      const response = NextResponse.redirect(`${origin}${next}`);
      // Set session cookie so Edge middleware and client components authenticate seamlessly
      response.cookies.set("autoheal_session_token", data.session.access_token, {
        path: "/",
        maxAge: 604800,
        sameSite: "lax",
      });
      return response;
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
