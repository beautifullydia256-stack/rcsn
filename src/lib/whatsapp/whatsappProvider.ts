/**
 * Provider-agnostic WhatsApp outbound API. Implement with Wasender now; swap for Meta Cloud API later.
 */
export type SendTextParams = {
  toE164: string;
  text: string;
};

export type SendDocumentParams = {
  toE164: string;
  documentUrl: string;
  fileName?: string;
  caption?: string;
};

export type SendResult = { ok: true; raw?: unknown } | { ok: false; error: string };

export interface WhatsAppProvider {
  sendText(params: SendTextParams): Promise<SendResult>;
  sendDocument(params: SendDocumentParams): Promise<SendResult>;
}
