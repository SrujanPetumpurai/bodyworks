import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { a as joinByInvite } from "./communities_xVE7pya1.mjs";
import { t as json } from "./recipe-input_DJkkYCV-.mjs";
//#region src/pages/api/communities/join/index.ts
var join_exports = /* @__PURE__ */ __exportAll({
	POST: () => POST,
	prerender: () => false
});
var POST = async ({ request, locals }) => {
	if (!locals.user) return json({ error: "Sign in to join." }, 401);
	const body = await request.json().catch(() => null);
	const code = typeof body?.code === "string" ? body.code.trim().slice(0, 64) : "";
	const slug = code ? await joinByInvite(code, locals.user.id) : null;
	if (!slug) return json({ error: "That invite link isn't valid any more." }, 404);
	return json({ slug });
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/communities/join/index@_@ts
var page = () => join_exports;
//#endregion
export { page };
