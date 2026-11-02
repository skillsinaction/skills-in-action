import fs from "node:fs";
import path from "node:path";

const INVOICE_DIR = path.resolve("invoices");

// Stream an invoice PDF to the client: GET /invoices?name=2026-10-001.pdf
export function sendInvoice(res, name) {
  const file = path.join(INVOICE_DIR, name);
  if (!fs.existsSync(file)) {
    res.writeHead(404);
    return res.end("not found");
  }
  res.writeHead(200, { "content-type": "application/pdf" });
  fs.createReadStream(file).pipe(res);
}
