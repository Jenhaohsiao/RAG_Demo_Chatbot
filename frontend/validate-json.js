import fs from "fs";

const locales = ["fr", "zh-CN", "zh-TW", "en"];
let allValid = true;

locales.forEach((lang) => {
  try {
    JSON.parse(fs.readFileSync(`src/i18n/locales/${lang}.json`, "utf-8"));
    console.log(`✓ ${lang}.json is valid`);
  } catch (e) {
    console.error(`✗ ${lang}.json error:`, e.message);
    allValid = false;
  }
});

if (allValid) {
  console.log("\n✓ All locale files are valid!");
  process.exit(0);
} else {
  console.error("\n✗ Some locale files have errors");
  process.exit(1);
}
