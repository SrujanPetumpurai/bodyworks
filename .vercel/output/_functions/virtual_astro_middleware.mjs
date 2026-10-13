import { st as defineMiddleware, t as sequence } from "./chunks/sequence_CK-B6CjN.mjs";
import { t as auth } from "./chunks/auth_B0HoeFAw.mjs";
//#region src/middleware.ts
var onRequest$1 = defineMiddleware(async (context, next) => {
	const result = await auth.api.getSession({ headers: context.request.headers });
	context.locals.user = result?.user ?? null;
	context.locals.session = result?.session ?? null;
	return next();
});
//#endregion
//#region \0virtual:astro:middleware
var onRequest = sequence(onRequest$1);
//#endregion
export { onRequest };
