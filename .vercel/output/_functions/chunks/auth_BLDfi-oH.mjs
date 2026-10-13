import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { A as renderTemplate, M as renderHead, w as renderComponent, z as createAstro } from "./sequence_CK-B6CjN.mjs";
import { t as createComponent } from "./compiler_J__uvMUs.mjs";
import { r as signUp, t as signIn } from "./forms_qss2n2i2.mjs";
import { useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/components/forms/AuthForm.tsx
function safeNext(next) {
	return next.startsWith("/") && !next.startsWith("//") ? next : "/recipes";
}
function AuthForm({ next }) {
	const [mode, setMode] = useState("in");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState(null);
	const [busy, setBusy] = useState(false);
	async function submit(e) {
		e.preventDefault();
		setError(null);
		setBusy(true);
		const res = mode === "up" ? await signUp.email({
			name: name.trim(),
			email: email.trim(),
			password
		}) : await signIn.email({
			email: email.trim(),
			password
		});
		setBusy(false);
		if (res.error) {
			setError(res.error.message || "Something went wrong. Try again.");
			return;
		}
		location.href = safeNext(next);
	}
	return /* @__PURE__ */ jsxs("div", {
		className: "rb-page af-page",
		children: [/* @__PURE__ */ jsx("a", {
			href: "/recipes",
			className: "af-logo rb-wordmark",
			children: "bodyworks"
		}), /* @__PURE__ */ jsxs("form", {
			className: "af-card",
			onSubmit: submit,
			children: [
				/* @__PURE__ */ jsx("h1", { children: mode === "in" ? "Sign in" : "Create account" }),
				/* @__PURE__ */ jsx("p", {
					className: "rb-muted",
					children: mode === "in" ? "Welcome back — sign in to post and rate recipes." : "Join to post your own recipes."
				}),
				mode === "up" && /* @__PURE__ */ jsxs("label", {
					className: "af-field",
					children: ["Name", /* @__PURE__ */ jsx("input", {
						value: name,
						onChange: (e) => setName(e.target.value),
						required: true,
						maxLength: 60,
						autoComplete: "name"
					})]
				}),
				/* @__PURE__ */ jsxs("label", {
					className: "af-field",
					children: ["Email", /* @__PURE__ */ jsx("input", {
						type: "email",
						value: email,
						onChange: (e) => setEmail(e.target.value),
						required: true,
						autoComplete: "email"
					})]
				}),
				/* @__PURE__ */ jsxs("label", {
					className: "af-field",
					children: [
						"Password",
						/* @__PURE__ */ jsx("input", {
							type: "password",
							value: password,
							onChange: (e) => setPassword(e.target.value),
							required: true,
							minLength: 8,
							autoComplete: mode === "in" ? "current-password" : "new-password"
						}),
						mode === "up" && /* @__PURE__ */ jsx("small", { children: "At least 8 characters." })
					]
				}),
				error && /* @__PURE__ */ jsx("p", {
					className: "rb-msg",
					role: "alert",
					children: error
				}),
				/* @__PURE__ */ jsx("button", {
					className: "rb-btn rb-btn-solid af-submit",
					disabled: busy,
					children: busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"
				}),
				/* @__PURE__ */ jsx("button", {
					type: "button",
					className: "af-switch",
					onClick: () => {
						setMode(mode === "in" ? "up" : "in");
						setError(null);
					},
					children: mode === "in" ? "New here? Create an account" : "Already have an account? Sign in"
				})
			]
		})]
	});
}
//#endregion
//#region src/pages/auth.astro
var auth_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Auth,
	file: () => $$file,
	prerender: () => false,
	url: () => $$url
});
createAstro("https://astro.build");
var $$Auth = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Auth;
	if (Astro.locals.user) return Astro.redirect("/recipes");
	const next = Astro.url.searchParams.get("next") ?? "/recipes";
	return renderTemplate`<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Sign in — bodyworks</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@600;700;800&display=swap" rel="stylesheet">${renderHead($$result)}</head><body>${renderComponent($$result, "AuthForm", AuthForm, {
		"next": next,
		"client:load": true,
		"client:component-hydration": "load",
		"client:component-path": "/home/claude/bodyworks/src/components/forms/AuthForm.tsx",
		"client:component-export": "default"
	})}</body></html>`;
}, "/home/claude/bodyworks/src/pages/auth.astro", void 0);
var $$file = "/home/claude/bodyworks/src/pages/auth.astro";
var $$url = "/auth";
//#endregion
//#region \0virtual:astro:page:src/pages/auth@_@astro
var page = () => auth_exports;
//#endregion
export { page };
