import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  AlertCircle,
  ArrowUp,
  Bot,
  Check,
  HeartPulse,
  LoaderCircle,
  MessageCircle,
  RotateCcw,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import { sendChatMessage } from "@/api/client";
import {
  ApiError,
  type ChatAssessment,
  type ChatTurn,
  type Prediction,
  type VesselId,
} from "@/api/types";
import { useAssessment } from "@/store/assessment";
import { pageHead } from "@/config/brand";

export const Route = createFileRoute("/chatbot")({
  head: () =>
    pageHead(
      "AI Heart Health Assistant",
      "Ask Aurapulse's AI assistant educational questions about cardiovascular health and CAD model outputs.",
    ),
  component: HeartHealthChat,
});

const suggestions = [
  "What is coronary artery disease?",
  "What are LAD, LCX, and RCA?",
  "Explain my CAD assessment results.",
  "What do predicted probabilities mean?",
  "What lifestyle habits support heart health?",
];

interface DisplayMessage extends ChatTurn {
  id: number;
  failed?: boolean;
}

interface FailedTurn {
  id: number;
  message: string;
  assessment?: ChatAssessment;
}

function assessmentForChat(prediction: Prediction): ChatAssessment {
  const arteryPredictions: ChatAssessment["artery_predictions"] = {};
  for (const vessel of ["LAD", "LCX", "RCA"] as const satisfies readonly VesselId[]) {
    const result = prediction.arteryPredictions?.[vessel];
    if (result) arteryPredictions[vessel] = result;
  }
  return {
    cad_prediction: prediction.prediction,
    probabilities: prediction.probabilities,
    artery_predictions: arteryPredictions,
  };
}

function HeartHealthChat() {
  const { prediction } = useAssessment();
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [consented, setConsented] = useState(false);
  const [sharedAssessment, setSharedAssessment] = useState<ChatAssessment>();
  const [sharePrompt, setSharePrompt] = useState("");
  const [consentNotice, setConsentNotice] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [failedTurn, setFailedTurn] = useState<FailedTurn>();
  const requestInFlight = useRef(false);
  const messageId = useRef(0);
  const endOfMessages = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessages.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  const nextId = () => ++messageId.current;

  async function submitMessage(message: string, assessment?: ChatAssessment, existingId?: number) {
    const trimmed = message.trim();
    if (!trimmed || requestInFlight.current) return;
    if (!consented) {
      setConsentNotice(true);
      return;
    }

    requestInFlight.current = true;
    setBusy(true);
    setError("");
    setConsentNotice(false);
    setSharePrompt("");
    const userId = existingId ?? nextId();
    if (existingId === undefined) {
      setMessages((current) => [...current, { id: userId, role: "user", content: trimmed }]);
    } else {
      setMessages((current) =>
        current.map((item) => (item.id === existingId ? { ...item, failed: false } : item)),
      );
    }
    const recentTurns = messages.filter((item) => item.id !== userId && !item.failed).slice(-12);
    const history: ChatTurn[] = [];
    let historyLength = 0;
    for (const item of recentTurns.reverse()) {
      if (historyLength + item.content.length > 10000) break;
      history.unshift({ role: item.role, content: item.content });
      historyLength += item.content.length;
    }

    try {
      const reply = await sendChatMessage(trimmed, history, assessment ?? sharedAssessment);
      setMessages((current) => [...current, { id: nextId(), role: "assistant", content: reply }]);
      setFailedTurn(undefined);
      if (assessment) setSharedAssessment(assessment);
      setDraft("");
    } catch (cause) {
      const messageText =
        cause instanceof ApiError
          ? cause.message
          : "The assistant couldn't respond. Check your connection and try again.";
      setMessages((current) =>
        current.map((item) => (item.id === userId ? { ...item, failed: true } : item)),
      );
      setError(messageText);
      setFailedTurn({ id: userId, message: trimmed, ...(assessment ? { assessment } : {}) });
    } finally {
      requestInFlight.current = false;
      setBusy(false);
    }
  }

  function startNewConversation() {
    if (requestInFlight.current) return;
    setMessages([]);
    setDraft("");
    setSharedAssessment(undefined);
    setSharePrompt("");
    setError("");
    setFailedTurn(undefined);
    setConsentNotice(false);
    setConsented(false);
  }

  function handleSuggestion(question: string) {
    if (question === "Explain my CAD assessment results." && prediction) {
      setSharePrompt(question);
      setDraft(question);
      return;
    }
    setDraft(question);
    void submitMessage(question);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitMessage(draft);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!busy) void submitMessage(draft);
    }
  }

  const askWithoutResults = () => {
    if (!consented) {
      setConsentNotice(true);
      return;
    }
    void submitMessage(sharePrompt);
  };

  return (
    <div className="page chatbot-page">
      <div className="chatbot-heading">
        <div>
          <p className="eyebrow">
            <HeartPulse size={14} />
            Aurapulse · Heart health AI
          </p>
          <h1 className="page-title">AI Heart Health Assistant</h1>
          <p className="page-intro">
            A friendly place to ask questions and make sense of heart-health concepts.
          </p>
        </div>
        <div className="chat-heading-actions">
          {prediction && (
            <button
              type="button"
              className="chat-text-button"
              onClick={() => {
                setSharePrompt("Explain my CAD assessment results.");
                setDraft("Explain my CAD assessment results.");
              }}
              disabled={busy}
            >
              <Sparkles size={15} /> Explain my results
            </button>
          )}
          <button
            type="button"
            className="chat-icon-button"
            onClick={startNewConversation}
            disabled={busy}
            aria-label="Clear chat and start a new conversation"
          >
            <Trash2 size={16} />
            <span>New chat</span>
          </button>
        </div>
      </div>

      <section className="chat-panel" aria-label="AI heart health chat">
        <div className="chat-toolbar">
          <div className="chat-assistant-label">
            <span className="chat-avatar">
              <HeartPulse size={18} />
            </span>
            <div>
              <strong>Heart Health Assistant</strong>
              <span>
                <i />
                Educational support · AI-generated
              </span>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              type="button"
              className="chat-clear-button"
              onClick={startNewConversation}
              disabled={busy}
            >
              <RotateCcw size={14} />
              Clear chat
            </button>
          )}
        </div>

        <div
          className="chat-transcript"
          role="log"
          aria-label="Conversation"
          aria-live="polite"
          aria-relevant="additions text"
        >
          {messages.length === 0 ? (
            <div className="chat-welcome">
              <div className="chat-welcome-icon">
                <MessageCircle size={25} />
              </div>
              <h2>What would you like to know?</h2>
              <p>
                Ask about coronary artery disease, heart anatomy, prevention, or how to understand
                your model assessment. I’ll keep explanations clear and educational.
              </p>
              <div className="chat-suggestions" aria-label="Suggested questions">
                {suggestions.map((question) => (
                  <button
                    type="button"
                    key={question}
                    onClick={() => handleSuggestion(question)}
                    disabled={busy}
                  >
                    {question}
                    <ArrowUp size={14} />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="chat-messages">
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={`chat-message ${message.role === "user" ? "from-user" : "from-assistant"}${message.failed ? " message-failed" : ""}`}
                >
                  <span className="message-avatar" aria-hidden="true">
                    {message.role === "user" ? <UserRound size={16} /> : <Bot size={16} />}
                  </span>
                  <div className="message-content">
                    <span className="message-author">
                      {message.role === "user" ? "You" : "Aurapulse AI"}
                    </span>
                    <p>{message.content}</p>
                    {message.failed && (
                      <span className="message-retry-note">This message did not send yet.</span>
                    )}
                  </div>
                </article>
              ))}
              {busy && (
                <div className="chat-thinking" role="status">
                  <LoaderCircle size={17} className="spin" />
                  Thinking through your question…
                </div>
              )}
              <div ref={endOfMessages} />
            </div>
          )}
        </div>

        {sharePrompt && prediction && (
          <div
            className="assessment-consent"
            role="group"
            aria-label="Consent to share assessment results"
          >
            <div>
              <strong>Share your assessment output with Gemini?</strong>
              <p>
                Only the overall model label, its CAD/Normal probabilities, and available LAD, LCX,
                and RCA prediction outputs will be sent. Your assessment inputs and identifying
                details are not included. These are AI outputs, not a diagnosis or measured
                blockage.
              </p>
            </div>
            <div className="assessment-consent-actions">
              <button
                type="button"
                className="chat-share-button"
                onClick={() => void submitMessage(sharePrompt, assessmentForChat(prediction))}
                disabled={busy}
              >
                <Check size={15} />
                Share results and explain
              </button>
              <button
                type="button"
                className="chat-text-button"
                onClick={askWithoutResults}
                disabled={busy}
              >
                Ask without sharing
              </button>
              <button
                type="button"
                className="chat-text-button"
                onClick={() => setSharePrompt("")}
                disabled={busy}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="chat-error" role="alert">
            <AlertCircle size={17} />
            <span>{error}</span>
            {failedTurn && (
              <button
                type="button"
                onClick={() =>
                  void submitMessage(failedTurn.message, failedTurn.assessment, failedTurn.id)
                }
                disabled={busy}
              >
                <RotateCcw size={14} />
                Retry
              </button>
            )}
          </div>
        )}
        {consentNotice && (
          <p className="chat-consent-error" role="alert">
            Please confirm the data-sharing notice below before sending a message.
          </p>
        )}

        <form className="chat-composer" onSubmit={handleSubmit}>
          <label className="chat-consent-label">
            <input
              type="checkbox"
              checked={consented}
              onChange={(event) => {
                setConsented(event.target.checked);
                setConsentNotice(false);
              }}
              disabled={busy}
            />
            <span>
              I agree to send my messages and this conversation to Google Gemini for an educational
              answer. I will not include identifying details.
            </span>
          </label>
          <div className="chat-input-row">
            <label className="sr-only" htmlFor="heart-health-message">
              Your heart health question
            </label>
            <textarea
              id="heart-health-message"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={3000}
              rows={2}
              placeholder="Ask a heart-health question…"
              disabled={busy}
            />
            <button
              type="submit"
              className="chat-send-button"
              aria-label="Send message"
              disabled={busy || !draft.trim()}
            >
              {busy ? <LoaderCircle className="spin" size={18} /> : <ArrowUp size={19} />}
            </button>
          </div>
          <div className="chat-composer-footer">
            <span>Enter to send · Shift + Enter for a new line</span>
            <span>{draft.length}/3000</span>
          </div>
        </form>
      </section>
      <aside className="chat-medical-disclaimer">
        <AlertCircle size={17} />
        <p>
          <strong>Medical disclaimer:</strong> This assistant provides general education, not
          medical advice, diagnosis, or treatment. For chest pressure, severe shortness of breath,
          cold sweating, fainting, or pain spreading to the arm, jaw, back, or shoulder, seek
          emergency care now. In India call 112 or your local emergency service. Do not wait for a
          chat reply.
        </p>
      </aside>
    </div>
  );
}
