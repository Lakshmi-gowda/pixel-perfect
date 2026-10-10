import { afterEach, describe, expect, it, vi } from "vitest";
import { modelBaseUrl, modelRequest } from "@/api/transport";

afterEach(() => vi.unstubAllGlobals());
const respond = (body: string, status = 200, type = "application/json") => vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, { status, headers: { "Content-Type": type } })));

describe("real model transport", () => {
  it("rejects missing and development-only production URLs", () => {
    expect(() => modelBaseUrl(undefined, false)).toThrow("not connected");
    expect(() => modelBaseUrl("/model-api", false)).toThrow("local model proxy");
    expect(() => modelBaseUrl("http://localhost:8000", false)).toThrow("HTTPS");
    expect(modelBaseUrl(undefined, true)).toBe("/model-api");
    expect(modelBaseUrl("https://model.example/", false)).toBe("https://model.example");
  });
  it("reads successful JSON envelopes and direct responses", async () => {
    respond('{"success":true,"data":{"feature_count":52}}');
    expect(await modelRequest("https://model.example", "/model-info")).toEqual({ feature_count: 52 });
    respond('{"feature_count":52}');
    expect(await modelRequest("https://model.example", "/model-info")).toEqual({ feature_count: 52 });
  });
  it("explains HTML fallback responses and preserves HTTP status", async () => {
    respond("<html>Website</html>", 404, "text/html");
    await expect(modelRequest("https://model.example", "/model-info")).rejects.toMatchObject({ code: "non_json_response", message: expect.stringContaining("HTTP 404") });
  });
  it("handles plain-text access errors, empty bodies and invalid JSON", async () => {
    respond("Unauthorized", 401, "text/plain");
    await expect(modelRequest("https://model.example", "/health")).rejects.toMatchObject({ code: "non_json_response" });
    respond("", 502);
    await expect(modelRequest("https://model.example", "/health")).rejects.toMatchObject({ code: "empty_response" });
    respond("{broken", 500);
    await expect(modelRequest("https://model.example", "/health")).rejects.toMatchObject({ code: "invalid_json" });
    respond("null");
    await expect(modelRequest("https://model.example", "/health")).rejects.toMatchObject({ code: "invalid_response" });
  });
  it("retains real backend validation errors without displaying HTML", async () => {
    respond('{"success":false,"error":{"code":"VALIDATION_ERROR","message":"Correct inputs.","fields":{"Age":["Required."]}}}', 422);
    await expect(modelRequest("https://model.example", "/predict", { features: {} })).rejects.toMatchObject({ code: "VALIDATION_ERROR", fields: { Age: "Required." } });
    respond('{"detail":"failed"}', 503);
    await expect(modelRequest("https://model.example", "/health")).rejects.toMatchObject({ code: "http_error", message: expect.stringContaining("HTTP 503") });
  });
  it("distinguishes timeouts and unreachable services", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("Timeout", "TimeoutError")));
    await expect(modelRequest("https://model.example", "/health")).rejects.toMatchObject({ code: "timeout" });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(modelRequest("https://model.example", "/health")).rejects.toMatchObject({ code: "offline" });
  });
});