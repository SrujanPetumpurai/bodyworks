import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { A as renderTemplate, T as Fragment$2, j as maybeRenderHead, w as renderComponent, z as createAstro } from "./sequence_CK-B6CjN.mjs";
import { t as createComponent } from "./compiler_J__uvMUs.mjs";
import { i as getMembership, n as getCommunityByInvite } from "./communities_xVE7pya1.mjs";
/* empty css                      */
import { t as $$Page } from "./Page_C1K9D-k3.mjs";
import { useState } from "react";
import { Fragment as Fragment$1, jsx, jsxs } from "react/jsx-runtime";
//#region src/components/communities/JoinInvite.tsx
function JoinInvite({ code, name, signedIn }) {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState(null);
	async function join() {
		setBusy(true);
		setError(null);
		const res = await fetch("/api/communities/join", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ code })
		}).catch(() => null);
		const data = await res?.json().catch(() => null);
		if (!res || !res.ok) {
			setBusy(false);
			return setError(data?.error || "Couldn't join. Try again.");
		}
		location.href = `/communities/${data.slug}`;
	}
	return signedIn ? /* @__PURE__ */ jsxs(Fragment$1, { children: [/* @__PURE__ */ jsx("button", {
		className: "rb-btn rb-btn-solid af-submit",
		disabled: busy,
		onClick: join,
		children: busy ? "Joining…" : `Join ${name}`
	}), error && /* @__PURE__ */ jsx("p", {
		className: "rb-msg",
		role: "alert",
		children: error
	})] }) : /* @__PURE__ */ jsx("a", {
		className: "rb-btn rb-btn-solid af-submit",
		href: `/auth?next=/communities/join/${code}`,
		children: "Sign in to join"
	});
}
//#endregion
//#region src/pages/communities/join/[code].astro
var _code__exports = /* @__PURE__ */ __exportAll({
	default: () => $$Code,
	file: () => $$file,
	prerender: () => false,
	url: () => $$url
});
createAstro("https://astro.build");
var $$Code = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Code;
	const user = Astro.locals.user;
	const { code } = Astro.params;
	const community = code ? await getCommunityByInvite(code) : null;
	if (community && user) {
		if ((await getMembership(community.id, user.id))?.status === "active") return Astro.redirect(`/communities/${community.slug}`);
	}
	return renderTemplate`${renderComponent($$result, "Page", $$Page, { "title": "Join community" }, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<main class="af-page"><div class="af-card">${community ? renderTemplate`${renderComponent($$result, "Fragment", Fragment$2, {}, { "default": ($$result) => renderTemplate`<h1>${community.name}</h1><p>You've been invited to join this ${community.visibility} community.</p>${community.description && renderTemplate`<p class="rb-muted">${community.description}</p>`}${renderComponent($$result, "JoinInvite", JoinInvite, {
		"code": code,
		"name": community.name,
		"signedIn": !!user,
		"client:load": true,
		"client:component-hydration": "load",
		"client:component-path": "/home/claude/bodyworks/src/components/communities/JoinInvite.tsx",
		"client:component-export": "default"
	})}` })}` : renderTemplate`${renderComponent($$result, "Fragment", Fragment$2, {}, { "default": ($$result) => renderTemplate`<h1>Invite not valid</h1><p>This invite link has expired or was replaced. Ask the person who sent it for a new one.</p><a class="rb-btn" href="/communities">Browse communities</a>` })}`}</div></main>` })}`;
}, "/home/claude/bodyworks/src/pages/communities/join/[code].astro", void 0);
var $$file = "/home/claude/bodyworks/src/pages/communities/join/[code].astro";
var $$url = "/communities/join/[code]";
//#endregion
//#region \0virtual:astro:page:src/pages/communities/join/[code]@_@astro
var page = () => _code__exports;
//#endregion
export { page };
