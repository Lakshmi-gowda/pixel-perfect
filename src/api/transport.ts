import { ApiError } from "./types";

export function modelBaseUrl(configured: string | undefined, development: boolean): string {
  const base = (configured || (development ? "/model-api" : "")).trim().replace(/\/+$/, "");
  if (!base) throw new ApiError("The model service is not connected. Deploy the Python service and configure its HTTPS address.", {}, "model_unavailable");
  if (development && base === "/model-api") return base;
  try {
    const url = new URL(base);
    if (url.username || url.password || url.search || url.hash || (url.protocol !== "https:" && !(development && url.protocol === "http:"))) throw new Error();
    return base;
  } catch {
    throw new ApiError("The model address is invalid. Use the deployed Python service’s full HTTPS address; the local model proxy does not work on the hosted website.", {}, "invalid_api_url");
  }
}

export function normalizeFieldErrors(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([name, reasons]) => [name, Array.isArray(reasons) ? reasons.filter(r => typeof r === "string").join(" ") : typeof reasons === "string" ? reasons : "Invalid value."]));
}

const object = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

export async function modelRequest(base: string, path: string, body?: unknown): Promise<unknown> {
  let response: Response;
  let text: string;
  try {
    response = await fetch(`${base}${path}`, { method: body === undefined ? "GET" : "POST", headers: body === undefined ? { Accept: "application/json" } : { Accept: "application/json", "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(20000), credentials: "omit" });
    text = await response.text();
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) throw new ApiError("The model service timed out. It may be starting up; try again shortly.", {}, "timeout");
    throw new ApiError("The model service could not be reached. Check its address, service availability, and allowed website origins.", {}, "offline");
  }
  const status = `HTTP ${response.status}`;
  if (!text.trim()) throw new ApiError(`The model service returned an empty response (${status}). Check the Python service logs.`, {}, "empty_response");
  const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() || "";
  if (contentType !== "application/json" && !contentType.endsWith("+json")) {
    const kind = contentType === "text/html" || /^\s*</.test(text) ? "a website page instead of model JSON" : "a non-JSON response";
    throw new ApiError(`The model address returned ${kind} (${status}). Check the deployed Python service URL and hosting access settings.`, {}, "non_json_response");
  }
  let json: unknown;
  try { json = JSON.parse(text); } catch { throw new ApiError(`The model service returned invalid JSON (${status}). Check the Python service logs.`, {}, "invalid_json"); }
  if (!object(json)) throw new ApiError(`The model service returned an invalid response (${status}).`, {}, "invalid_response");
  if (!response.ok || json['success'] === false) {
    const error = object(json['error']) ? json['error'] : {};
    throw new ApiError(typeof error['message'] === "string" ? error['message'] : `The model service could not complete the request (${status}).`, normalizeFieldErrors(error['fields']), typeof error['code'] === "string" ? error['code'] : "http_error");
  }
  return json['data'] ?? json;
}