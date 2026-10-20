import { useState } from "react";

type Mode = "move" | "fuel";

const DATA = {
  move: {
    head: ["Plan every", "session."],
    sub: "Put workouts on a weekly calendar, repeat what works and keep your streak alive.",
    cta: "Open workouts",
    href: "/workouts",
    photo: "/workout.jpg",
    label: "Today · Pull day",
    list: [["Deadlift", "4 × 5"], ["Barbell row", "3 × 8"], ["Face pulls", "3 × 15"]],
    week: [["Mon", "Push"], ["Tue", "Legs"], ["Wed", "Rest"], ["Thu", "Pull"], ["Fri", "Core"], ["Sat", "Run"], ["Sun", "Rest"]],
    features: [
      ["Weekly calendar", "Drop sessions onto the days you plan to train."],
      ["Repeat in one tap", "Copy a workout forward instead of retyping it."],
      ["Your own types", "Create workout types that fit how you train."],
    ],
  },
  fuel: {
    head: ["Plan every", "meal."],
    sub: "Save recipes, lay out your week and cook without the nightly scramble.",
    cta: "Explore recipes",
    href: "/recipes",
    photo: "/kitchen.jpg",
    label: "Today · Thursday menu",
    list: [["Breakfast", "Berry oats"], ["Lunch", "Chickpea bowl"], ["Dinner", "Dal tadka"]],
    week: [["Mon", "Oats"], ["Tue", "Bowl"], ["Wed", "Salmon"], ["Thu", "Dal"], ["Fri", "Stir-fry"], ["Sat", "Wraps"], ["Sun", "Prep"]],
    features: [
      ["Meal planner", "Arrange breakfast, lunch, dinner and snacks for the week."],
      ["Import from YouTube", "Turn a cooking video into a saved recipe."],
      ["Cook log & communities", "Note how it turned out and share with your group."],
    ],
  },
} as const;

export default function LandingHero() {
  const [mode, setMode] = useState<Mode>("move");
  const d = DATA[mode];

  return (
    <>
      <section className="lp-hero" data-mode={mode} aria-labelledby="lp-title">
        <div className="lp-copy">
          <p className="lp-eyebrow">Your routine starts here</p>
          <h1 id="lp-title">{d.head[0]}<br /><em>{d.head[1]}</em></h1>
          <p className="lp-sub">{d.sub}</p>

          <div className="lp-switch" role="group" aria-label="Choose a space">
            <button type="button" aria-pressed={mode === "move"} onClick={() => setMode("move")}>Workouts</button>
            <button type="button" aria-pressed={mode === "fuel"} onClick={() => setMode("fuel")}>Recipes</button>
          </div>

          <div className="lp-cta-row">
            <a className="lp-cta" href={d.href}>{d.cta} →</a>
            <a className="lp-ghost" href={mode === "move" ? "/recipes" : "/workouts"}>
              or switch to {mode === "move" ? "recipes" : "workouts"}
            </a>
          </div>
        </div>

        <div className="lp-art" aria-hidden="true">
          <div className="lp-blob" />
          <div className="lp-photo" style={{ backgroundImage: `url(${d.photo})` }} />
          <div className="lp-sticker">
            <b>{d.label}</b>
            {d.list.map(([a, b]) => (
              <div key={a}><span>{a}</span><span>{b}</span></div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-week" aria-label="Example week">
        <h2>Your week, planned</h2>
        <div className="lp-week-grid">
          {d.week.map(([day, what], i) => (
            <div key={day} className={`lp-day ${i === 3 ? "on" : ""}`}>
              <small>{day}</small>
              <strong>{what}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-features" aria-label="What you can do">
        {d.features.map(([t, p], i) => (
          <article key={t} className="lp-feature" data-n={i + 1}>
            <span>{String(i + 1).padStart(2, "0")}</span>
            <h3>{t}</h3>
            <p>{p}</p>
          </article>
        ))}
      </section>
    </>
  );
}
