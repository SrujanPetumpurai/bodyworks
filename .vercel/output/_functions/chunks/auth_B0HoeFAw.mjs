import { h as verification, m as user, n as account, p as session, t as db } from "./db_Dofvrqwd.mjs";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
//#region src/lib/auth.ts
var isLocal = (url) => !url || /localhost|127\.0\.0\.1/.test(url);
var vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
var configured = "http://localhost:4321";
var baseURL = process.env.VERCEL && isLocal(configured) && vercelHost ? `https://${vercelHost}` : configured;
var trustedOrigins = [
	baseURL,
	process.env.VERCEL_URL,
	process.env.VERCEL_PROJECT_PRODUCTION_URL,
	process.env.VERCEL_BRANCH_URL
].filter((h) => Boolean(h)).map((h) => h.startsWith("http") ? h : `https://${h}`);
var auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: {
			user,
			session,
			account,
			verification
		}
	}),
	emailAndPassword: { enabled: true },
	secret: "x",
	baseURL,
	trustedOrigins
});
//#endregion
export { auth as t };
