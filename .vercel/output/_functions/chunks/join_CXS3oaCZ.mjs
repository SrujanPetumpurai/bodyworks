import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { o as joinPublicCommunity, s as leaveCommunity } from "./communities_xVE7pya1.mjs";
import { t as json } from "./recipe-input_DJkkYCV-.mjs";
//#region src/pages/api/communities/[slug]/join.ts
var join_exports = /* @__PURE__ */ __exportAll({
	DELETE: () => DELETE,
	POST: () => POST,
	prerender: () => false
});
var POST = async ({ params, locals }) => {
	if (!locals.user) return json({ error: "Sign in to join." }, 401);
	if (!(params.slug ? await joinPublicCommunity(params.slug, locals.user.id) : false)) return json({ error: "Community not found." }, 404);
	return json({ joined: true });
};
var DELETE = async ({ params, locals }) => {
	if (!locals.user) return json({ error: "Sign in first." }, 401);
	const result = params.slug ? await leaveCommunity(params.slug, locals.user.id) : "not_found";
	if (result === "owner") return json({ error: "Owners can't leave their own community." }, 400);
	if (result !== "left") return json({ error: "You're not in that community." }, 404);
	return json({ left: true });
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/communities/[slug]/join@_@ts
var page = () => join_exports;
//#endregion
export { page };
