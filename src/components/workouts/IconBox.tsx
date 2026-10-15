import { useState } from "react";
import { GLYPH_KEYS, MAX_TYPE_NAME, SHADE_KEYS, type GlyphKey, type Shade } from "../../lib/workout-glyphs";
import { GLYPHS, type TypeDef } from "./icons";

type Props = {
  types: TypeDef[];
  signedIn: boolean;
  armed: string | null;
  onArm: (ref: string | null) => void;
  onDragStart: (ref: string) => void;
  onDragEnd: () => void;
  // resolves to an error message, or null on success
  onCreate: (input: { name: string; glyph: GlyphKey; shade: Shade }) => Promise<string | null>;
  onDelete: (t: TypeDef) => void;
};

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const pretty = (k: string) => cap(k.replace(/-/g, " "));

export default function IconBox({ types, signedIn, armed, onArm, onDragStart, onDragEnd, onCreate, onDelete }: Props) {
  const [tab, setTab] = useState<"all" | "create">("all");
  const [name, setName] = useState("");
  const [glyph, setGlyph] = useState<GlyphKey>("dumbbell");
  const [shade, setShade] = useState<Shade>("ember");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const Preview = GLYPHS[glyph];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMsg(null);
    const err = await onCreate({ name, glyph, shade });
    setBusy(false);
    if (err) return setMsg(err);
    setName("");
    setTab("all");
  }

  return (
    <aside className="wk-box" aria-label="Workout icons">
      <div className="wk-box-tabs" role="tablist">
        <button type="button" role="tab" id="wk-tab-all" aria-selected={tab === "all"} aria-controls="wk-panel-all" className={tab === "all" ? "on" : ""} onClick={() => setTab("all")}>
          All icons
        </button>
        <button type="button" role="tab" id="wk-tab-create" aria-selected={tab === "create"} aria-controls="wk-panel-create" className={tab === "create" ? "on" : ""} onClick={() => setTab("create")}>
          Create
        </button>
      </div>

      {tab === "all" && (
        <div role="tabpanel" id="wk-panel-all" aria-labelledby="wk-tab-all">
          <p className="wk-box-hint">Drag onto a date, or tap one then tap a date.</p>
          <div className="wk-box-grid">
            {types.map((t) => (
              <div className="wk-tile-wrap" key={t.ref}>
                <div
                  role="button"
                  tabIndex={0}
                  aria-pressed={armed === t.ref}
                  aria-label={t.name}
                  data-label={t.name}
                  className={`wk-tile wk-shade--${t.shade} ${armed === t.ref ? "armed" : ""}`}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "copy";
                    e.dataTransfer.setData("text/plain", t.ref);
                    onDragStart(t.ref);
                  }}
                  onDragEnd={onDragEnd}
                  onClick={() => onArm(armed === t.ref ? null : t.ref)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onArm(armed === t.ref ? null : t.ref);
                    }
                  }}
                >
                  <t.Icon size={24} />
                </div>
                {!t.builtin && (
                  <button type="button" className="wk-tile-del" aria-label={`Delete ${t.name}`} onClick={() => onDelete(t)}>
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          {types.every((t) => t.builtin) && (
            <p className="wk-box-hint">
              Want your own? Open <button type="button" className="wk-link" onClick={() => setTab("create")}>Create</button>.
            </p>
          )}
        </div>
      )}

      {tab === "create" && (
        <form role="tabpanel" id="wk-panel-create" aria-labelledby="wk-tab-create" className="wk-create" onSubmit={submit}>
          {!signedIn && <p className="wk-box-hint"><a href="/auth?next=%2Fworkouts">Sign in</a> to create icons.</p>}

          <div className="wk-create-preview">
            <div className={`wk-tile wk-tile--static wk-shade--${shade}`} aria-hidden="true">
              <Preview size={24} />
            </div>
            <span className={`wk-tag wk-shade--${shade}`}>{name.trim() || "Your icon"}</span>
          </div>

          <label className="wk-field">
            <span>Name</span>
            <input type="text" value={name} maxLength={MAX_TYPE_NAME} placeholder="e.g. Swimming" onChange={(e) => setName(e.target.value)} required />
          </label>

          <fieldset className="wk-fieldset">
            <legend>Symbol</legend>
            <div className="wk-glyphs" role="radiogroup" aria-label="Symbol">
              {GLYPH_KEYS.map((k) => {
                const G = GLYPHS[k];
                return (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={glyph === k}
                    aria-label={pretty(k)}
                    title={pretty(k)}
                    className={`wk-glyph ${glyph === k ? "on" : ""}`}
                    onClick={() => setGlyph(k)}
                  >
                    <G size={18} />
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="wk-fieldset">
            <legend>Colour</legend>
            <div className="wk-shades" role="radiogroup" aria-label="Colour">
              {SHADE_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={shade === k}
                  aria-label={cap(k)}
                  title={cap(k)}
                  className={`wk-swatch wk-shade--${k} ${shade === k ? "on" : ""}`}
                  onClick={() => setShade(k)}
                />
              ))}
            </div>
          </fieldset>

          {msg && <p className="wk-box-error" role="alert">{msg}</p>}
          <button type="submit" className="wk-create-btn" disabled={busy || !signedIn || !name.trim()}>
            {busy ? "Creating…" : "Create icon"}
          </button>
        </form>
      )}
    </aside>
  );
}
