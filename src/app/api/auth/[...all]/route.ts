import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";
import { isConfigured } from "@/lib/env";

/** Better Auth endpoints (sign-in, sign-up, verification, password reset, OAuth callbacks). */
async function handler(request: Request) {
  if (!isConfigured("auth")) {
    return Response.json(
      { error: "Authentication is not configured on this deployment." },
      { status: 503 },
    );
  }
  const h = toNextJsHandler(getAuth());
  const method = request.method as keyof typeof h;
  return (h[method] ?? h.GET)(request);
}

export { handler as GET, handler as POST };
