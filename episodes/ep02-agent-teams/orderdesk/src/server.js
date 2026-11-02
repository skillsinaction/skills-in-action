import http from "node:http";
import fs from "node:fs";
import { isAuthorized } from "./auth.js";
import { listOrders, findOrder, applyDiscount } from "./orders.js";
import { sendInvoice } from "./files.js";
import { customerReport } from "./report.js";

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (!isAuthorized(req)) {
    res.writeHead(401);
    return res.end("unauthorized");
  }
  if (url.pathname === "/orders") {
    const page = Number(url.searchParams.get("page") || 1);
    return json(res, listOrders(page));
  }
  if (url.pathname === "/discount") {
    const order = findOrder(url.searchParams.get("id"));
    const percent = Number(url.searchParams.get("percent"));
    return json(res, { total: applyDiscount(order.total, percent) });
  }
  if (url.pathname === "/invoices") {
    return sendInvoice(res, url.searchParams.get("name"));
  }
  if (url.pathname === "/report") {
    const template = fs.readFileSync("templates/report.html", "utf8");
    const rows = customerReport().map((r) => `<tr><td>${r.customer}</td><td>${r.revenue}</td></tr>`);
    res.writeHead(200, { "content-type": "text/html" });
    return res.end(template.replace("{{rows}}", rows.join("")));
  }
  res.writeHead(404);
  res.end("not found");
});

function json(res, data) {
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify(data));
}

server.listen(3000, () => console.log("orderdesk on http://localhost:3000"));
