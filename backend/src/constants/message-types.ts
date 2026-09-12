export const MESSAGE_TYPES = {
  TEXT: "TEXT",
  IMAGE: "IMAGE",
  PDF: "PDF",
  DOCUMENT: "DOCUMENT",
  AUDIO: "AUDIO"
} as const;

export type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];
