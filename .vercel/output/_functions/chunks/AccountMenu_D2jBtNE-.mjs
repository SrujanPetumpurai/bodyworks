import { i as useSession, n as signOut } from "./forms_qss2n2i2.mjs";
import { useEffect, useRef, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/components/recipes/Avatar.tsx
var TONES = [
	"#2d5a43",
	"#7a4a24",
	"#254f70",
	"#53406e",
	"#6b5612",
	"#2e4d47"
];
function hash(s) {
	let h = 0;
	for (let i = 0; i < s.length; i++) h = h * 31 + s.charCodeAt(i) >>> 0;
	return h;
}
function initials(name) {
	return name.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}
function Avatar({ name, image, size = 32 }) {
	const style = {
		width: size,
		height: size
	};
	return image ? /* @__PURE__ */ jsx("img", {
		className: "rb-avatar",
		src: image,
		alt: name,
		title: name,
		style
	}) : /* @__PURE__ */ jsx("span", {
		className: "rb-avatar",
		title: name,
		style: {
			...style,
			background: TONES[hash(name) % TONES.length],
			fontSize: size * .38
		},
		children: initials(name)
	});
}
//#endregion
//#region src/components/AccountMenu.tsx
function AccountMenu({ light = true }) {
	const { data: session, isPending } = useSession();
	const [open, setOpen] = useState(false);
	const ref = useRef(null);
	useEffect(() => {
		if (!open) return;
		const onDown = (e) => {
			if (ref.current && !ref.current.contains(e.target)) setOpen(false);
		};
		const onKey = (e) => e.key === "Escape" && setOpen(false);
		document.addEventListener("mousedown", onDown);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", onDown);
			document.removeEventListener("keydown", onKey);
		};
	}, [open]);
	if (isPending) return /* @__PURE__ */ jsx("div", {
		className: "rb-account",
		"aria-hidden": "true"
	});
	if (!session) {
		const next = encodeURIComponent(location.pathname + location.search);
		return /* @__PURE__ */ jsx("div", {
			className: `rb-account ${light ? "light" : ""}`,
			children: /* @__PURE__ */ jsx("a", {
				className: "rb-btn",
				href: `/auth?next=${next}`,
				children: "Sign in"
			})
		});
	}
	const u = session.user;
	return /* @__PURE__ */ jsxs("div", {
		className: `rb-account ${light ? "light" : ""}`,
		ref,
		children: [
			/* @__PURE__ */ jsx("a", {
				className: "rb-btn rb-btn-solid",
				href: "/recipes/new",
				children: "+ Add recipe"
			}),
			/* @__PURE__ */ jsx("button", {
				type: "button",
				className: "rb-account-btn",
				"aria-haspopup": "menu",
				"aria-expanded": open,
				"aria-label": "Account menu",
				onClick: () => setOpen((o) => !o),
				children: /* @__PURE__ */ jsx(Avatar, {
					name: u.name,
					image: u.image ?? null,
					size: 36
				})
			}),
			open && /* @__PURE__ */ jsxs("div", {
				className: "rb-menu",
				role: "menu",
				children: [
					/* @__PURE__ */ jsx("p", {
						className: "rb-menu-name",
						children: u.name
					}),
					/* @__PURE__ */ jsx("a", {
						role: "menuitem",
						href: `/profile/${u.id}`,
						children: "My profile"
					}),
					/* @__PURE__ */ jsx("a", {
						role: "menuitem",
						href: `/profile/${u.id}?tab=recipes`,
						children: "My recipes"
					}),
					/* @__PURE__ */ jsx("a", {
						role: "menuitem",
						href: "/recipes/new",
						children: "Add recipe"
					}),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						role: "menuitem",
						onClick: async () => {
							await signOut();
							location.href = "/recipes";
						},
						children: "Sign out"
					})
				]
			})
		]
	});
}
//#endregion
export { hash as i, Avatar as n, TONES as r, AccountMenu as t };
