import {
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@/lib/supabase/server";

export async function GET(
  request: Request
) {
  const url =
    new URL(request.url);

  const code =
    url.searchParams.get("code");

  const origin =
    url.origin;

  if (!code) {
    return NextResponse.redirect(
      `${origin}/?auth_error=missing_code`
    );
  }

  const supabase =
    await createClient();

  const {
    data,
    error,
  } =
    await supabase.auth
      .exchangeCodeForSession(
        code
      );

  if (
    error ||
    !data.user
  ) {
    console.error(
      "OAuth callback error:",
      error
    );

    return NextResponse.redirect(
      `${origin}/?auth_error=oauth_failed`
    );
  }

  /*
    Look up the user's SurgiCare role.

    Google sign-in must NEVER grant
    coordinator/admin privileges by itself.
  */

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("role")
    .eq(
      "id",
      data.user.id
    )
    .maybeSingle();

  if (profileError) {
    console.error(
      "OAuth profile lookup error:",
      profileError
    );
  }

  if (
    profile?.role ===
      "coordinator" ||
    profile?.role ===
      "admin"
  ) {
    return NextResponse.redirect(
      `${origin}/coordinator`
    );
  }

  return NextResponse.redirect(
    `${origin}/dashboard`
  );
}
