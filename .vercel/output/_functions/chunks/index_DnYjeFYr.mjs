import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { c as listMyCommunities, t as createCommunity, u as listPublicCommunities } from "./communities_xVE7pya1.mjs";
import { t as json } from "./recipe-input_DJkkYCV-.mjs";
//#region src/pages/api/communities/index.ts
var communities_exports = /* @__PURE__ */ __exportAll({
	GET: () => GET,
	POST: () => POST,
	prerender: () => false
});
var GET = async ({ url, locals }) => {
	if (url.searchParams.get("scope") === "mine") {
		if (!locals.user) return json({ error: "Sign in first." }, 401);
		return json(await listMyCommunities(locals.user.id));
	}
	return json(await listPublicCommunities(url.searchParams.get("q") ?? void 0));
};
var POST = async ({ request, locals }) => {
	if (!locals.user) return json({ error: "Sign in to create a community." }, 401);
	const body = await request.json().catch(() => null);
	const name = typeof body?.name === "string" ? body.name.trim().slice(0, 60) : "";
	const description = typeof body?.description === "string" ? body.description.trim().slice(0, 300) : "";
	const visibility = body?.visibility === "private" ? "private" : body?.visibility === "public" ? "public" : null;
	if (!name) return json({ error: "Give your community a name." }, 400);
	if (!visibility) return json({ error: "Choose public or private." }, 400);
	try {
		const created = await createCommunity(locals.user.id, {
			name,
			description: description || null,
			visibility,
			imageUrl: null
		});
		return json({ slug: created.slug }, 201);
	} catch (err) {
		console.error("createCommunity failed", err);
		return json({ error: "Couldn't create the community. Try again." }, 500);
	}
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/communities/index@_@ts
var page = () => communities_exports;
//#endregion
export { page };
