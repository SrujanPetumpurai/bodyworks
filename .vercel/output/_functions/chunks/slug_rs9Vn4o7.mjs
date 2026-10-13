//#region src/lib/slug.ts
function slugify(text, fallback = "recipe") {
	return text.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || fallback;
}
//#endregion
export { slugify as t };
