// Erzeugt public/portal-qr.svg für die echte Website-Adresse:
//   node scripts/make-qr.mjs https://deine-domain.example/portal
import QRCode from "qrcode";
import { writeFileSync } from "node:fs";
const url = process.argv[2];
if (!url?.startsWith("https://")) throw new Error("Bitte die https-Adresse des Portals angeben.");
const svg = await QRCode.toString(url, { type: "svg", margin: 4, errorCorrectionLevel: "M" });
writeFileSync(new URL("../public/portal-qr.svg", import.meta.url), svg);
console.log("public/portal-qr.svg geschrieben für", url);
