import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";
import { user, session, account, verification } from "../db/schema";

const isLocal = (url?: string) => !url || /localhost|127\.0\.0\.1/.test(url);

// On Vercel, a BETTER_AUTH_URL that still points at localhost (or is unset)
// would make every sign-in fail the origin check, so fall back to the
// deployment's own domain. Set BETTER_AUTH_URL to your real URL (custom
// domain included) to override this.
const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
const configured = import.meta.env.BETTER_AUTH_URL as string | undefined;
const baseURL = process.env.VERCEL && isLocal(configured) && vercelHost ? `https://${vercelHost}` : configured;

// Also trust this deployment's own hostnames (production + the current preview).
const trustedOrigins = [baseURL, process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_BRANCH_URL]
  .filter((h): h is string => Boolean(h))
  .map((h) => (h.startsWith("http") ? h : `https://${h}`));

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
  },
  secret: import.meta.env.BETTER_AUTH_SECRET,
  baseURL,
  trustedOrigins,
});
