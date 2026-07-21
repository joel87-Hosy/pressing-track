import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const outputPath = resolve("docs/reglage-nouveau-pressing-supabase.pdf");

const lines = [
  { text: "Reglage Supabase pour creer un nouveau pressing", size: 18, gap: 22 },
  { text: "Objectif", size: 13, gap: 16 },
  {
    text:
      "Chaque pressing doit avoir son propre pressing_id. Le compte admin et le compte superviseur du meme pressing doivent partager exactement ce meme pressing_id.",
    size: 11,
    gap: 18
  },
  { text: "1. Creer le pressing", size: 13, gap: 16 },
  { text: "Dans Supabase > SQL Editor, executer :", size: 11, gap: 12 },
  { text: "insert into pressings (name, owner_email)", size: 10, gap: 10 },
  { text: "values ('NOM_DU_PRESSING', 'admin@nouveaupressing.com')", size: 10, gap: 10 },
  { text: "returning id;", size: 10, gap: 16 },
  {
    text:
      "Copier l'id retourne par Supabase. Exemple : 8f3b2c10-4a9e-41e3-8f21-123456789abc",
    size: 11,
    gap: 18
  },
  { text: "2. Creer les utilisateurs", size: 13, gap: 16 },
  { text: "Aller dans Authentication > Users, puis creer deux utilisateurs :", size: 11, gap: 12 },
  { text: "admin@nouveaupressing.com", size: 10, gap: 10 },
  { text: "superviseur@nouveaupressing.com", size: 10, gap: 18 },
  { text: "3. Donner le role admin", size: 13, gap: 16 },
  { text: "Remplacer l'id, le nom et l'email, puis executer :", size: 11, gap: 12 },
  { text: "update auth.users", size: 10, gap: 10 },
  { text: "set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)", size: 10, gap: 10 },
  {
    text:
      "  || '{\"role\":\"admin\",\"pressing_id\":\"8f3b2c10-4a9e-41e3-8f21-123456789abc\",\"pressing_name\":\"NOM_DU_PRESSING\"}'::jsonb",
    size: 10,
    gap: 10
  },
  { text: "where email = 'admin@nouveaupressing.com';", size: 10, gap: 18 },
  { text: "4. Donner le role superviseur", size: 13, gap: 16 },
  { text: "Remplacer l'id, le nom et l'email, puis executer :", size: 11, gap: 12 },
  { text: "update auth.users", size: 10, gap: 10 },
  { text: "set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)", size: 10, gap: 10 },
  {
    text:
      "  || '{\"role\":\"supervisor\",\"pressing_id\":\"8f3b2c10-4a9e-41e3-8f21-123456789abc\",\"pressing_name\":\"NOM_DU_PRESSING\"}'::jsonb",
    size: 10,
    gap: 10
  },
  { text: "where email = 'superviseur@nouveaupressing.com';", size: 10, gap: 18 },
  { text: "5. Verifier", size: 13, gap: 16 },
  { text: "Executer :", size: 11, gap: 12 },
  { text: "select email, raw_app_meta_data", size: 10, gap: 10 },
  { text: "from auth.users", size: 10, gap: 10 },
  { text: "where email in ('admin@nouveaupressing.com', 'superviseur@nouveaupressing.com');", size: 10, gap: 16 },
  {
    text:
      "Les deux comptes doivent avoir le meme pressing_id. Si les pressing_id sont differents, ils ne verront pas les memes tickets.",
    size: 11,
    gap: 14
  }
];

function escapePdfText(text) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapText(text, maxChars) {
  const words = text.split(" ");
  const wrapped = [];
  let line = "";

  for (const word of words) {
    if ((line + " " + word).trim().length > maxChars) {
      if (line) {
        wrapped.push(line);
      }
      line = word;
    } else {
      line = (line + " " + word).trim();
    }
  }

  if (line) {
    wrapped.push(line);
  }

  return wrapped;
}

const pageWidth = 595;
const pageHeight = 842;
const marginX = 48;
const startY = 790;
const bottomY = 54;
const pages = [];
let commands = [];
let y = startY;

function newPage() {
  pages.push(commands.join("\n"));
  commands = [];
  y = startY;
}

for (const item of lines) {
  const wrapped = wrapText(item.text, item.size <= 10 ? 88 : 76);

  for (const text of wrapped) {
    if (y < bottomY) {
      newPage();
    }

    commands.push(`BT /F1 ${item.size} Tf ${marginX} ${y} Td (${escapePdfText(text)}) Tj ET`);
    y -= item.gap;
  }
}

if (commands.length) {
  pages.push(commands.join("\n"));
}

const objects = [];

function addObject(body) {
  objects.push(body);
  return objects.length;
}

const catalogId = addObject("<< /Type /Catalog /Pages 2 0 R >>");
const pagesId = addObject("");
const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
const pageIds = [];

for (const pageCommands of pages) {
  const stream = pageCommands;
  const contentId = addObject(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);
  const pageId = addObject(
    `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`
  );
  pageIds.push(pageId);
}

objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

let pdf = "%PDF-1.4\n";
const offsets = [0];

for (let index = 0; index < objects.length; index += 1) {
  offsets.push(Buffer.byteLength(pdf, "latin1"));
  pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
}

const xrefOffset = Buffer.byteLength(pdf, "latin1");
pdf += `xref\n0 ${objects.length + 1}\n`;
pdf += "0000000000 65535 f \n";

for (let index = 1; index < offsets.length; index += 1) {
  pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
}

pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, pdf, "latin1");
console.log(outputPath);
