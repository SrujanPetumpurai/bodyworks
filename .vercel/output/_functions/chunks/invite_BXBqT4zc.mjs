import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { d as regenerateInvite } from "./communities_xVE7pya1.mjs";
import { t as json } from "./recipe-input_DJkkYCV-.mjs";
//#region src/pages/api/communities/[slug]/invite.ts
var invite_exports = /* @__PURE__ */ __exportAll({
	POST: () => POST,
	prerender: () => false
});
var POST = async ({ params, locals }) => {
	if (!locals.user) return json({ error: "Sign in first." }, 401);
	const code = params.slug ? await regenerateInvite(params.slug, locals.user.id) : null;
	if (!code) return json({ error: "Community not found, or it isn't yours." }, 404);
	return json({ code });
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/communities/[slug]/invite@_@ts
var page = () => invite_exports;
//#endregion
export { page };
