import { useState } from "react";
import ImageUpload from "./ImageUpload";
import VoiceRecorder from "./VoiceRecorder";

const UNITS = ["g", "ml", "tsp", "tbsp", "cup", "piece"];

export type RecipeFormValues = {
  name: string;
  description: string;
  cuisine: string;
  prepTimeMinutes: string;
  servings: string;
  difficulty: string;
  imageUrl: string | null;
  videoUrl: string;
  voiceNoteUrl: string | null;
  ingredients: { name: string; amount: string; unit: string }[];
  steps: string[];
  communityId: string; // "" = standalone recipe
  dishName: string;
  visibility: Visibility;
};

type Visibility = "private" | "community" | "public";
export type PostingTarget = { id: number; slug: string; name: string; visibility: "public" | "private"; dishes: string[] };

// Mirrors resolveRecipePlacement on the server, which is what actually enforces it.
//   standalone: private | public     private community: private | community     public community: all three
function allowedVisibilities(target: PostingTarget | undefined): Visibility[] {
  if (!target) return ["private", "public"];
  return target.visibility === "private" ? ["private", "community"] : ["private", "community", "public"];
}
const defaultVisibility = (target: PostingTarget | undefined): Visibility => (target ? "community" : "public");

const VIS_LABELS: Record<Visibility, [string, string]> = {
  private: ["Only me", "A draft or personal copy. Nobody else can see it."],
  community: ["Community members", "Everyone in the community can see it."],
  public: ["Anyone", "Visible to everyone, and shown on the main recipes page."],
};

export const EMPTY_RECIPE: RecipeFormValues = {
  name: "",
  description: "",
  cuisine: "",
  prepTimeMinutes: "",
  servings: "",
  difficulty: "",
  imageUrl: null,
  videoUrl: "",
  voiceNoteUrl: null,
  ingredients: [{ name: "", amount: "", unit: "g" }],
  steps: [""],
  communityId: "",
  dishName: "",
  visibility: "public",
};

export default function RecipeForm({
  foods,
  communities = [],
  initial = EMPTY_RECIPE,
  editSlug,
  userId,
}: {
  foods: string[];
  communities?: PostingTarget[];
  initial?: RecipeFormValues;
  editSlug?: string;
  userId: string;
}) {
  const [v, setV] = useState<RecipeFormValues>(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // "Import from YouTube": fills the form below from a video link; nothing is saved until you press save
  const [ytUrl, setYtUrl] = useState("");
  const [ytBusy, setYtBusy] = useState(false);
  const [ytError, setYtError] = useState<string | null>(null);
  const [ytDone, setYtDone] = useState<{ title: string; channel: string; fromComments: boolean; guesses: string[] } | null>(null);

  const set = <K extends keyof RecipeFormValues>(key: K, value: RecipeFormValues[K]) =>
    setV((s) => ({ ...s, [key]: value }));

  const target = communities.find((c) => String(c.id) === v.communityId);
  const allowed = allowedVisibilities(target);

  function pickCommunity(id: string) {
    const next = communities.find((c) => String(c.id) === id);
    // keep the current choice if the new place still allows it, else fall back to the default
    const visibility = allowedVisibilities(next).includes(v.visibility) ? v.visibility : defaultVisibility(next);
    setV((s) => ({ ...s, communityId: id, dishName: id === s.communityId ? s.dishName : "", visibility }));
  }

  const setIng = (i: number, patch: Partial<RecipeFormValues["ingredients"][number]>) =>
    set("ingredients", v.ingredients.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const setStep = (i: number, text: string) => set("steps", v.steps.map((x, j) => (j === i ? text : x)));

  async function importYoutube() {
    const url = ytUrl.trim();
    if (!url || ytBusy) return;
    const hasWork = v.name.trim() || v.steps.some((x) => x.trim()) || v.ingredients.some((i) => i.name.trim());
    if (hasWork && !confirm("Importing will replace the name, ingredients and steps you've typed. Continue?")) return;
    setYtError(null);
    setYtDone(null);
    setYtBusy(true);
    const res = await fetch("/api/recipes/import-youtube", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setYtBusy(false);
    if (!res || !res.ok) return setYtError(data?.error || "Couldn't import that video. Check your connection and try again.");

    const r = data.recipe;
    setV((s) => ({
      ...s,
      name: r.name,
      description: r.description,
      cuisine: r.cuisine,
      prepTimeMinutes: r.prepTimeMinutes,
      servings: r.servings,
      difficulty: r.difficulty,
      imageUrl: r.imageUrl ?? s.imageUrl,
      videoUrl: r.videoUrl,
      ingredients: r.ingredients,
      steps: r.steps,
    }));
    setYtDone({ ...data.source, guesses: r.guesses ?? [] });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch(editSlug ? `/api/recipes/${editSlug}` : "/api/recipes", {
      method: editSlug ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...v,
        ingredients: v.ingredients.map((i) => ({ ...i, amount: Number(i.amount) })),
      }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res || !res.ok) {
      setBusy(false);
      return setError(data?.error || "Couldn't save. Check your connection and try again.");
    }
    location.href = target ? `/communities/${target.slug}` : `/profile/${userId}?tab=recipes`;
  }

  return (
    <form className="rf" onSubmit={submit}>
      <h1>{editSlug ? "Edit recipe" : "Add a recipe"}</h1>

      {!editSlug && (
        <section className="rf-import" aria-label="Import from YouTube">
          <label className="af-field" htmlFor="rf-yt">
            Import from YouTube
            <span className="rf-import-hint">Paste a video or Short link. We read the description and the creator's pinned comment, then fill in the form for you to check.</span>
          </label>
          <div className="rf-import-row">
            <input
              id="rf-yt"
              type="url"
              inputMode="url"
              placeholder="https://youtube.com/shorts/…"
              value={ytUrl}
              onChange={(e) => setYtUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  importYoutube();
                }
              }}
            />
            <button type="button" className="rb-btn rb-btn-solid" onClick={importYoutube} disabled={ytBusy || !ytUrl.trim()}>
              {ytBusy ? "Reading video…" : "Import"}
            </button>
          </div>
          {ytError && <p className="rb-msg" role="alert">{ytError}</p>}
          {ytDone && (
            <div className="rf-import-done" role="status">
              <p>
                Filled in from “{ytDone.title}” by {ytDone.channel}
                {ytDone.fromComments ? " (including the creator's comment)" : ""}. Check the amounts and steps, then save.
              </p>
              {ytDone.guesses.length > 0 && (
                <p>Worth a second look: {ytDone.guesses.join("; ")}.</p>
              )}
            </div>
          )}
        </section>
      )}

      <label className="af-field">
        Name
        <input value={v.name} onChange={(e) => set("name", e.target.value)} required maxLength={100} />
      </label>

      <label className="af-field">
        Description
        <textarea value={v.description} onChange={(e) => set("description", e.target.value)} required maxLength={1000} rows={3} />
      </label>

      <fieldset className="rf-group rf-place">
        <legend>Who can see it</legend>

        {communities.length > 0 && (
          <label className="af-field">
            Post to
            <select value={v.communityId} onChange={(e) => pickCommunity(e.target.value)}>
              <option value="">My profile only (not in a community)</option>
              {communities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.visibility === "private" ? " (private)" : ""}
                </option>
              ))}
            </select>
          </label>
        )}

        {target && (
          <label className="af-field">
            Dish (optional)
            <input
              list="rf-dishes"
              value={v.dishName}
              onChange={(e) => set("dishName", e.target.value)}
              maxLength={60}
              placeholder="e.g. Chicken Biryani — groups versions of the same dish"
            />
            <datalist id="rf-dishes">
              {target.dishes.map((d) => <option key={d} value={d} />)}
            </datalist>
          </label>
        )}

        <div className="rf-vis" role="radiogroup" aria-label="Visibility">
          {(["private", "community", "public"] as Visibility[])
            .filter((o) => o !== "community" || target)
            .map((o) => {
              const ok = allowed.includes(o);
              return (
                <label key={o} className={ok ? "" : "off"}>
                  <input
                    type="radio"
                    name="visibility"
                    value={o}
                    checked={v.visibility === o}
                    disabled={!ok}
                    onChange={() => set("visibility", o)}
                  />
                  <span>
                    <strong>{VIS_LABELS[o][0]}</strong>
                    {ok ? VIS_LABELS[o][1] : "Not available: this community is private, so recipes in it can't be public."}
                  </span>
                </label>
              );
            })}
        </div>
      </fieldset>

      <ImageUpload label="Photo" value={v.imageUrl} onChange={(url) => set("imageUrl", url)} />

      <div className="rf-row">
        <label className="af-field">
          Cuisine
          <input value={v.cuisine} onChange={(e) => set("cuisine", e.target.value)} maxLength={40} placeholder="e.g. Indian" />
        </label>
        <label className="af-field">
          Prep time (min)
          <input type="number" min={1} value={v.prepTimeMinutes} onChange={(e) => set("prepTimeMinutes", e.target.value)} />
        </label>
        <label className="af-field">
          Servings
          <input type="number" min={1} value={v.servings} onChange={(e) => set("servings", e.target.value)} />
        </label>
        <label className="af-field">
          Difficulty
          <select value={v.difficulty} onChange={(e) => set("difficulty", e.target.value)}>
            <option value="">—</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
      </div>

      <label className="af-field">
        Video link (optional)
        <input type="url" value={v.videoUrl} onChange={(e) => set("videoUrl", e.target.value)} placeholder="https://youtube.com/…" />
      </label>

      <VoiceRecorder
        label="Voice note (optional)"
        value={v.voiceNoteUrl}
        onChange={(url) => set("voiceNoteUrl", url)}
      />

      <fieldset className="rf-group">
        <legend>Ingredients</legend>
        <datalist id="rf-foods">
          {foods.map((f) => <option key={f} value={f} />)}
        </datalist>
        {v.ingredients.map((ing, i) => (
          <div className="rf-ing" key={i}>
            <input
              list="rf-foods"
              placeholder="Ingredient (pick or type a new one)"
              aria-label={`Ingredient ${i + 1} name`}
              value={ing.name}
              onChange={(e) => setIng(i, { name: e.target.value })}
              maxLength={60}
            />
            <input
              type="number"
              min="0"
              step="any"
              placeholder="Amount"
              aria-label={`Ingredient ${i + 1} amount`}
              value={ing.amount}
              onChange={(e) => setIng(i, { amount: e.target.value })}
            />
            <select aria-label={`Ingredient ${i + 1} unit`} value={ing.unit} onChange={(e) => setIng(i, { unit: e.target.value })}>
              {UNITS.map((u) => <option key={u}>{u}</option>)}
            </select>
            <button
              type="button"
              className="rf-x"
              aria-label={`Remove ingredient ${i + 1}`}
              disabled={v.ingredients.length === 1}
              onClick={() => set("ingredients", v.ingredients.filter((_, j) => j !== i))}
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="rb-btn"
          onClick={() => set("ingredients", [...v.ingredients, { name: "", amount: "", unit: "g" }])}
        >
          + Add ingredient
        </button>
      </fieldset>

      <fieldset className="rf-group">
        <legend>Steps</legend>
        {v.steps.map((s, i) => (
          <div className="rf-step" key={i}>
            <span className="rf-num">{i + 1}</span>
            <textarea
              rows={2}
              aria-label={`Step ${i + 1}`}
              value={s}
              maxLength={1000}
              onChange={(e) => setStep(i, e.target.value)}
            />
            <button
              type="button"
              className="rf-x"
              aria-label={`Remove step ${i + 1}`}
              disabled={v.steps.length === 1}
              onClick={() => set("steps", v.steps.filter((_, j) => j !== i))}
            >
              ×
            </button>
          </div>
        ))}
        <button type="button" className="rb-btn" onClick={() => set("steps", [...v.steps, ""])}>
          + Add step
        </button>
      </fieldset>

      {error && <p className="rb-msg" role="alert">{error}</p>}

      <div className="rf-actions">
        <button className="rb-btn rb-btn-solid" disabled={busy}>
          {busy ? "Saving…" : editSlug ? "Save changes" : "Publish recipe"}
        </button>
        <a className="rb-btn" href={`/profile/${userId}?tab=recipes`}>Cancel</a>
      </div>
    </form>
  );
}
