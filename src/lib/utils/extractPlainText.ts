export function extractPlainText(message: any): string {
  function decodeBody(body: string) {
    return Buffer.from(body, "base64").toString("utf8");
  }

  const parts: string[] = [];
  function walk(node: any) {
    if (!node) return;
    if (node.mimeType === "text/plain" && node.body?.data) {
      parts.push(decodeBody(node.body.data));
    }
    if (node.parts) node.parts.forEach(walk);
  }
  walk(message.data.payload);
  return parts.join("\n").slice(0, 1500);
}