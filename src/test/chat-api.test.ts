import { afterEach, describe, expect, it, vi } from "vitest";
import { sendChatMessage } from "@/api/client";

afterEach(() => vi.unstubAllGlobals());

describe("Gemini chat API contract", () => {
  it("sends consented conversation and only the selected assessment outputs to the shared backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: { reply: "CAD is a condition affecting the heart's arteries." },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const assessment = {
      cad_prediction: "CAD" as const,
      probabilities: { CAD: 0.8, Normal: 0.2 },
      artery_predictions: { LAD: { stenotic_probability: 0.63, predicted_class: "CAD" } },
    };

    await expect(
      sendChatMessage(
        "Explain my results.",
        [{ role: "user", content: "What is CAD?" }],
        assessment,
      ),
    ).resolves.toBe("CAD is a condition affecting the heart's arteries.");

    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/chat$/);
    expect(request.method).toBe("POST");
    expect(JSON.parse(String(request.body))).toEqual({
      message: "Explain my results.",
      history: [{ role: "user", content: "What is CAD?" }],
      assessment,
    });
    expect(request.credentials).toBe("omit");
  });

  it("rejects success-shaped responses without a genuine reply", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true, data: {} }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    await expect(sendChatMessage("What is CAD?", [])).rejects.toMatchObject({
      code: "invalid_chat_response",
    });
  });
});
