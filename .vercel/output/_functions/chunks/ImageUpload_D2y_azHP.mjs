import { useRef, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/components/forms/ImageUpload.tsx
function ImageUpload({ label, value, onChange, shape = "wide" }) {
	const input = useRef(null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState(null);
	async function pick(file) {
		if (!file) return;
		setError(null);
		if (file.size > 4194304) return setError("Image is too large (max 4 MB).");
		setBusy(true);
		const body = new FormData();
		body.append("file", file);
		const res = await fetch("/api/upload", {
			method: "POST",
			body
		}).catch(() => null);
		const data = await res?.json().catch(() => null);
		setBusy(false);
		if (!res || !res.ok || !data?.url) return setError(data?.error || "Upload failed.");
		onChange(data.url);
		if (input.current) input.current.value = "";
	}
	return /* @__PURE__ */ jsxs("div", {
		className: "iu",
		children: [
			/* @__PURE__ */ jsx("span", {
				className: "iu-label",
				children: label
			}),
			/* @__PURE__ */ jsx("div", {
				className: `iu-preview ${shape}`,
				style: value ? { backgroundImage: `url(${value})` } : void 0,
				children: !value && /* @__PURE__ */ jsx("span", { children: busy ? "Uploading…" : "No image" })
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "iu-actions",
				children: [/* @__PURE__ */ jsx("button", {
					type: "button",
					className: "rb-btn",
					disabled: busy,
					onClick: () => input.current?.click(),
					children: busy ? "Uploading…" : value ? "Replace" : "Upload"
				}), value && !busy && /* @__PURE__ */ jsx("button", {
					type: "button",
					className: "rb-btn",
					onClick: () => onChange(null),
					children: "Remove"
				})]
			}),
			/* @__PURE__ */ jsx("input", {
				ref: input,
				type: "file",
				accept: "image/jpeg,image/png,image/webp,image/gif",
				hidden: true,
				onChange: (e) => pick(e.target.files?.[0])
			}),
			error && /* @__PURE__ */ jsx("p", {
				className: "rb-msg",
				role: "alert",
				children: error
			})
		]
	});
}
//#endregion
export { ImageUpload as t };
