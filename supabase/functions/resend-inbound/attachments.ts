import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04];
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];

type FileRule = {
  matches: (bytes: Uint8Array) => boolean;
  requiredText?: string[];
  forbiddenText?: string[];
};

const RULES: Record<string, FileRule> = {
  pdf: { matches: (b) => startsWithAscii(b, "%PDF-") },
  png: { matches: (b) => startsWithBytes(b, PNG_SIGNATURE) },
  jpg: { matches: (b) => startsWithBytes(b, JPEG_SIGNATURE) },
  jpeg: { matches: (b) => startsWithBytes(b, JPEG_SIGNATURE) },
  gif: { matches: (b) => startsWithAscii(b, "GIF87a") || startsWithAscii(b, "GIF89a") },
  docx: {
    matches: (b) => startsWithBytes(b, ZIP_SIGNATURE),
    requiredText: ["[Content_Types].xml", "word/document.xml"],
    forbiddenText: ["vbaProject.bin"],
  },
  xlsx: {
    matches: (b) => startsWithBytes(b, ZIP_SIGNATURE),
    requiredText: ["[Content_Types].xml", "xl/workbook.xml"],
    forbiddenText: ["vbaProject.bin"],
  },
  txt: { matches: isPlainText },
  csv: { matches: isPlainText },
};

export type AttachmentDecision =
  | { allowed: true; extension: string }
  | { allowed: false; reason: string };

function startsWithBytes(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

function startsWithAscii(bytes: Uint8Array, text: string): boolean {
  return text.split("").every((char, index) => bytes[index] === char.charCodeAt(0));
}

function containsAscii(bytes: Uint8Array, text: string): boolean {
  const needle = new TextEncoder().encode(text);
  outer: for (let i = 0; i <= bytes.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (bytes[i + j] !== needle[j]) continue outer;
    }
    return true;
  }
  return false;
}

function isPlainText(bytes: Uint8Array): boolean {
  if (bytes.includes(0)) return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return true;
  } catch {
    return false;
  }
}

export function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot > 0 ? filename.slice(dot + 1).toLowerCase() : "";
}

export function checkFileName(filename: string, sizeBytes: number): AttachmentDecision {
  const extension = extensionOf(filename);
  if (!RULES[extension]) {
    return { allowed: false, reason: "This file type is not allowed." };
  }
  if (sizeBytes > MAX_ATTACHMENT_BYTES) {
    return { allowed: false, reason: "This file is larger than 10 MB." };
  }
  return { allowed: true, extension };
}

export function checkFileContents(extension: string, bytes: Uint8Array): AttachmentDecision {
  const rule = RULES[extension];
  if (!rule) {
    return { allowed: false, reason: "This file type is not allowed." };
  }
  if (!rule.matches(bytes)) {
    return { allowed: false, reason: "The file contents do not match its file type." };
  }
  if (rule.forbiddenText?.some((text) => containsAscii(bytes, text))) {
    return { allowed: false, reason: "This document contains macros and is not allowed." };
  }
  if (rule.requiredText && !rule.requiredText.every((text) => containsAscii(bytes, text))) {
    return { allowed: false, reason: "The file contents do not match its file type." };
  }
  return { allowed: true, extension };
}

type ResendAttachmentMeta = {
  id?: string;
  filename?: string;
  size?: number;
  content_type?: string;
  download_url?: string;
};

type StoreOptions = {
  supabase: SupabaseClient;
  apiKey: string;
  messageId: string;
  accountId: string;
  providerEmailId: string;
};

type AttachmentRow = {
  id: string;
  message_id: string;
  provider_attachment_id: string | null;
  file_name: string;
  file_size: number;
  content_type: string;
  status: "safe" | "blocked" | "failed";
  status_reason: string | null;
  storage_path: string | null;
};

async function insertRow(supabase: SupabaseClient, row: AttachmentRow): Promise<boolean> {
  const { error } = await supabase.from("email_attachments").insert(row);
  if (error) {
    console.error("Failed to record attachment:", error.message);
    return false;
  }
  return true;
}

function failureRow(
  messageId: string,
  meta: ResendAttachmentMeta,
  reason: string
): AttachmentRow {
  return {
    id: crypto.randomUUID(),
    message_id: messageId,
    provider_attachment_id: meta.id ?? null,
    file_name: meta.filename || "attachment",
    file_size: meta.size ?? 0,
    content_type: meta.content_type || "application/octet-stream",
    status: "failed",
    status_reason: reason,
    storage_path: null,
  };
}

async function storeOne(options: StoreOptions, meta: ResendAttachmentMeta): Promise<AttachmentRow> {
  const { supabase, messageId, accountId } = options;
  const filename = meta.filename || "attachment";
  const size = meta.size ?? 0;
  const contentType = meta.content_type || "application/octet-stream";
  const attachmentId = crypto.randomUUID();
  const base = {
    id: attachmentId,
    message_id: messageId,
    provider_attachment_id: meta.id ?? null,
    file_name: filename,
    file_size: size,
    content_type: contentType,
  };

  const nameCheck = checkFileName(filename, size);
  if (!nameCheck.allowed) {
    return { ...base, status: "blocked", status_reason: nameCheck.reason, storage_path: null };
  }

  if (!meta.download_url) {
    return failureRow(messageId, meta, "The file could not be fetched.");
  }

  const download = await fetch(meta.download_url);
  if (!download.ok) {
    return failureRow(messageId, meta, "The file could not be fetched.");
  }
  const bytes = new Uint8Array(await download.arrayBuffer());
  if (bytes.length > MAX_ATTACHMENT_BYTES) {
    return { ...base, status: "blocked", status_reason: "This file is larger than 10 MB.", storage_path: null };
  }

  const contentCheck = checkFileContents(nameCheck.extension, bytes);
  if (!contentCheck.allowed) {
    return { ...base, file_size: bytes.length, status: "blocked", status_reason: contentCheck.reason, storage_path: null };
  }

  const storagePath = `${accountId}/${messageId}/${attachmentId}.${nameCheck.extension}`;
  const { error: uploadError } = await supabase.storage
    .from("email-attachments")
    .upload(storagePath, bytes, { contentType, upsert: false });
  if (uploadError) {
    console.error("Failed to store attachment:", uploadError.message);
    return failureRow(messageId, meta, "The file could not be saved.");
  }

  return {
    ...base,
    file_size: bytes.length,
    status: "safe",
    status_reason: null,
    storage_path: storagePath,
  };
}

/** Fetches, checks, and stores the attachments of one received email. Returns how many rows were recorded. */
export async function storeInboundAttachments(options: StoreOptions): Promise<number> {
  const { supabase, apiKey, messageId, providerEmailId } = options;

  const listRes = await fetch(`https://api.resend.com/emails/receiving/${providerEmailId}/attachments`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!listRes.ok) {
    console.error(`Attachment list failed (${listRes.status}) for ${providerEmailId}`);
    return 0;
  }
  const listBody = await listRes.json();
  const attachments: ResendAttachmentMeta[] = Array.isArray(listBody?.data) ? listBody.data : [];
  if (attachments.length === 0) return 0;

  let recorded = 0;
  for (const meta of attachments) {
    let row: AttachmentRow;
    try {
      row = await storeOne(options, meta);
    } catch (err) {
      console.error("Attachment processing error:", err);
      row = failureRow(messageId, meta, "The file could not be fetched.");
    }
    if (await insertRow(supabase, row)) recorded++;
  }

  if (recorded > 0) {
    await supabase.from("email_messages").update({ has_attachments: true }).eq("id", messageId);
  }
  return recorded;
}
