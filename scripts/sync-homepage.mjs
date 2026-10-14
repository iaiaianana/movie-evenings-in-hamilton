import { readFileSync, writeFileSync } from "node:fs";
const html = readFileSync(new URL("../site.html", import.meta.url), "utf8");
writeFileSync(new URL("../app/site-html.ts", import.meta.url), "export const siteHtml = " + JSON.stringify(html) + ";\n");
console.log("Updated app/site-html.ts from site.html");
