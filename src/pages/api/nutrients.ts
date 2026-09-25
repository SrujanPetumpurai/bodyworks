import type { APIRoute } from "astro";
import { getNutrientProfiles } from "../../db/nutrient-profile";

export const GET: APIRoute = async ({ url }) => {
  const bodyTypeSlug = url.searchParams.get("bodyType");
  const ageBracketSlug = url.searchParams.get("ageBracket");
  const weightKgParam = url.searchParams.get("weightKg");
  const heightCmParam = url.searchParams.get("heightCm");

  if (!bodyTypeSlug || !ageBracketSlug) {
    return new Response(
      JSON.stringify({ error: "bodyType and ageBracket query params are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const weightKg = weightKgParam !== null ? Number(weightKgParam) : undefined;
  const heightCm = heightCmParam !== null ? Number(heightCmParam) : undefined;

  if ((weightKg !== undefined && Number.isNaN(weightKg)) || (heightCm !== undefined && Number.isNaN(heightCm))) {
    return new Response(
      JSON.stringify({ error: "weightKg and heightCm must be numbers" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const profiles = await getNutrientProfiles({
      bodyTypeSlug,
      ageBracketSlug,
      weightKg,
      heightCm,
    });
    return new Response(JSON.stringify(profiles), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
};