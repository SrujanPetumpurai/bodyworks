import sharp from "sharp";

for (const f of [
  "public/squat2.png",
  "public/dailyRequirements/nutrients_nobg.png",
  "public/foodRecipes/landingPage_noBg.png",
]) {
  const buf = await sharp(f).trim({ threshold: 10 }).toBuffer();
  await sharp(buf).toFile(f);
}