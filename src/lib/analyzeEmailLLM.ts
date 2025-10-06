import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function analyzeEmailLLM(emailText: string, subject: string, from: string): Promise<any> {
  const prompt = `
You are an intelligent email analyzer for a Gmail tool that helps social media content creators manage potential brand collaborations, UGC deals, and PR/gifting offers.

Your task:
1. Read the email carefully.
2. Decide if it's a brand collaboration, UGC deal, or PR/gifting offer.
3. If yes, extract the structured details.
4. If not, classify it as "None."

Guidelines:
- Base your decision ONLY on the text provided.
- Do not guess missing information.
- If uncertain, set confidence below 0.6.
- Return ONLY valid JSON (no explanations outside the JSON).

Output JSON Format:
{
  "is_deal": true | false,
  "type": "Brand Deal | UGC | PR/Gifting | None",
  "confidence": 0.0-1.0,
  "reason": "short reasoning",
  "fields": {
    "brand": "brand or company name, if mentioned",
    "compensation": "exact pay or gift details, if mentioned",
    "deliverables": "expected social media content or tasks, if mentioned",
    "deadline": "any mentioned deadline or posting date"
  }
}

EMAIL CONTENT:
Subject: ${subject}
From: ${from}
Body: ${emailText}
`;

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini", // swap for Gemini or Claude as needed
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    });

    const content = res.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content received from OpenAI");
    }
    
    return JSON.parse(content);
  } catch (err: any) {
    console.error("LLM parse error:", err);
    // Retry once with a "Please fix JSON" instruction if parse fails
    try {
      const retryPrompt = `The previous response was malformed JSON. Please provide ONLY valid JSON. ${prompt}`;
      const retryRes = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: retryPrompt }],
      });
      
      const retryContent = retryRes.choices[0]?.message?.content;
      if (!retryContent) {
        throw new Error("No content received from OpenAI retry");
      }
      
      return JSON.parse(retryContent);
    } catch (retryErr) {
      console.error("LLM retry parse error:", retryErr);
      return { is_deal: false, type: "None", confidence: 0, reason: "parse_error", fields: {} };
    }
  }
}