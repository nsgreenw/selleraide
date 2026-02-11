import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signupSchema } from "@/lib/api/contracts";
import { jsonError, jsonSuccess } from "@/lib/api/response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid signup data", 400);
    }

    const { email, password, full_name } = parsed.data;
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: full_name ?? "",
        },
      },
    });

    if (error) {
      return jsonError("Unable to create account", 400);
    }

    return jsonSuccess({ user: data.user }, 201);
  } catch {
    return jsonError("Internal server error", 500);
  }
}
