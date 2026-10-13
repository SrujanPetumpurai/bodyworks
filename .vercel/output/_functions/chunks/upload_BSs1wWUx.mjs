import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { t as json } from "./recipe-input_DJkkYCV-.mjs";
import { put } from "@vercel/blob";
//#region src/pages/api/upload.ts
var upload_exports = /* @__PURE__ */ __exportAll({
	POST: () => POST,
	prerender: () => false
});
var TYPES = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
	"image/gif": "gif"
};
var MAX_BYTES = 4194304;
var POST = async ({ request, locals }) => {
	if (!locals.user) return json({ error: "Sign in to upload images." }, 401);
	const file = (await request.formData().catch(() => null))?.get("file");
	if (!(file instanceof File)) return json({ error: "No file received." }, 400);
	const ext = TYPES[file.type];
	if (!ext) return json({ error: "Use a JPG, PNG, WebP or GIF image." }, 400);
	if (file.size > MAX_BYTES) return json({ error: "Image is too large (max 4 MB)." }, 400);
	try {
		const blob = await put(`uploads/${locals.user.id}/${crypto.randomUUID()}.${ext}`, file, {
			access: "public",
			contentType: file.type,
			token: void 0
		});
		return json({ url: blob.url });
	} catch (err) {
		console.error("upload failed", err);
		return json({ error: "Upload failed. Check the Blob token is configured." }, 500);
	}
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/upload@_@ts
var page = () => upload_exports;
//#endregion
export { page };
