import { google } from "googleapis";
import { analyzeEmailLLM } from "./analyzeEmailLLM";
import { adminDb } from "./firebase-admin"; // Use adminDb from firebase-admin
import { extractPlainText } from "./utils/extractPlainText";
import { getAuth } from "firebase-admin/auth"; // Import getAuth for custom claims

export async function scanEmailsLLM(oauthToken: any, userId: string) {
  const gmail = google.gmail({ version: "v1", auth: oauthToken });
  const res = await gmail.users.messages.list({ userId: "me", maxResults: 50 });
  if (!res.data.messages) return;

  for (const msg of res.data.messages) {
    if (!msg.id) continue; // Skip messages without ID
    
    const full = await gmail.users.messages.get({ userId: "me", id: msg.id, format: "full" });
    const { subject, from } = extractHeaders(full);
    const emailText = extractPlainText(full);

    // Check cache (Firestore)
    const cacheDoc = await adminDb.collection("scannedMessages").doc(msg.id).get();
    if (cacheDoc.exists) continue;

    const result = await analyzeEmailLLM(emailText, subject, from);

    if (result.is_deal && result.confidence >= 0.7) {
      await adminDb.collection("deals").doc(msg.id).set({
        userId,
        messageId: msg.id,
        ...result.fields,
        type: result.type,
        confidence: result.confidence,
        reason: result.reason,
        source: "LLM_ONLY",
        createdAt: new Date().toISOString(),
      });
    }

    await adminDb.collection("scannedMessages").doc(msg.id).set({
      hash: hash(emailText),
      scannedAt: new Date().toISOString(),
    });
  }
}

function extractHeaders(full: any) {
  const headers = full.data.payload.headers;
  const subject = headers.find((h: any) => h.name === "Subject")?.value || "";
  const from = headers.find((h: any) => h.name === "From")?.value || "";
  return { subject, from };
}

function hash(text: string) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
  return h.toString();
}