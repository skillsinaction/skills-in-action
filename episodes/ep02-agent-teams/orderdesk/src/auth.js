const API_KEY = process.env.ORDERDESK_KEY || "local-dev-key";

// Returns true when the request carries a valid API key.
export function isAuthorized(req) {
  const key = req.headers["x-api-key"] || "";
  return API_KEY.startsWith(key);
}
