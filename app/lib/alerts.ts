type AlertPayload = {
  event: string;
  text: string;
  fields?: Record<string, string | number | boolean | null | undefined>;
};

const WEBHOOK_TIMEOUT_MS = 4500;

function webhookUrl(): string | null {
  return process.env.TXLOOKUP_ALERT_WEBHOOK_URL?.trim() || null;
}

function truncate(value: string, max = 700): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export async function sendAlert(payload: AlertPayload): Promise<void> {
  const url = webhookUrl();
  if (!url) return;

  const body = {
    text: payload.text,
    content: payload.text,
    event: payload.event,
    fields: payload.fields ?? {},
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(`[alerts] webhook failed: HTTP ${res.status}`);
    }
  } catch (e) {
    console.warn("[alerts] webhook failed:", e instanceof Error ? e.message : String(e));
  }
}

export async function alertSuggestion({
  email,
  question,
}: {
  email: string;
  question: string;
}): Promise<void> {
  await sendAlert({
    event: "suggestion.created",
    text: `TXLookup suggestion: ${email} asked "${truncate(question, 220)}"`,
    fields: {
      email,
      question: truncate(question),
    },
  });
}

export async function alertByokEnabled(): Promise<void> {
  await sendAlert({
    event: "byok.enabled",
    text: "TXLookup BYOK activated: a visitor verified their own OpenAI key.",
  });
}
