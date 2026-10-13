import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { u as updateProfile } from "./recipes_Bev4MUNo.mjs";
import { t as json } from "./recipe-input_DJkkYCV-.mjs";
//#region src/pages/api/profile/index.ts
var profile_exports = /* @__PURE__ */ __exportAll({
	PATCH: () => PATCH,
	prerender: () => false
});
function httpsOrNull(v) {
	if (v === null || v === "") return null;
	if (typeof v !== "string") return "invalid";
	try {
		return new URL(v).protocol === "https:" ? v : "invalid";
	} catch {
		return "invalid";
	}
}
var PATCH = async ({ request, locals }) => {
	if (!locals.user) return json({ error: "Sign in first." }, 401);
	const body = await request.json().catch(() => null);
	const data = {};
	if (body && "name" in body) {
		const name = typeof body.name === "string" ? body.name.trim().slice(0, 60) : "";
		if (!name) return json({ error: "Name can't be empty." }, 400);
		data.name = name;
	}
	for (const key of ["image", "banner"]) if (body && key in body) {
		const v = httpsOrNull(body[key]);
		if (v === "invalid") return json({ error: `${key} must be an https link or an upload.` }, 400);
		data[key] = v;
	}
	if (Object.keys(data).length === 0) return json({ error: "Nothing to update." }, 400);
	await updateProfile(locals.user.id, data);
	return json({ ok: true });
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/profile/index@_@ts
var page = () => profile_exports;
//#endregion
export { page };
