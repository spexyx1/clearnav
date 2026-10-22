import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { auDate, buildPrefilledPdf, buildSignedPdf, sha256Hex, type Row, type SignerRow } from "./pdf.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = "Arkline Trust <applications@clearnav.cv>";
const INTERNAL_TO = ["noah@key13.co"];
const DEFAULT_ORIGIN = "https://www.arklinetrust.com";
const BUCKET = "investor-application-files";
const INVITE_DAYS = 30;
const SIGNER_DAYS = 14;
const EDITABLE = ["draft", "sent", "opened", "in_progress"];
const SIGNER_COLS = "id, application_id, tenant_id, role, name, email, title_capacity, token_expires_at, otp_hash, otp_expires_at, otp_attempts, otp_sent_count, otp_window_start, email_verified_at, verified_ip, verified_user_agent, signature_type, signature_data, place_of_signing, occupation, address, signed_at, signed_ip, signed_user_agent, cancelled_at";

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const pdfResponse = (bytes: Uint8Array, name: string) =>
  new Response(bytes, { status: 200, headers: { ...corsHeaders, "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${name}"` } });

function esc(v: unknown): string {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function randomToken(): string {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
}

function randomCode(): string {
  const b = new Uint32Array(1);
  crypto.getRandomValues(b);
  return String(b[0] % 1_000_000).padStart(6, "0");
}

const isEmail = (v: unknown): v is string => typeof v === "string" && v.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
const isToken = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const addDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

function clientIp(req: Request): string {
  return (req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("cf-connecting-ip") ?? req.headers.get("x-real-ip") ?? "").trim().slice(0, 64);
}

function applicantName(app: Row): string {
  return app.c_company_name || app.d_trust_name ||
    [app.a_given_names || app.contact_given_names, app.a_surname || app.contact_surname].filter(Boolean).join(" ") || "Applicant";
}

function classLines(app: Row): string[] {
  const names: Record<string, string> = { a: "Class A - Opportunistic Strategy Portfolio", b: "Class B - Quant Value Portfolio", c: "Class C - High Conviction Portfolio" };
  return (["a", "b", "c"] as const).filter((k) => app[`invest_class_${k}`])
    .map((k) => `${names[k]}: AUD ${Number(app[`amount_class_${k}`] || 0).toLocaleString("en-AU")}`);
}

function layout(title: string, body: string): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#f4f2ec;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e1d6;border-radius:8px;overflow:hidden;">
    <div style="background:#0f1f1a;padding:24px 32px;"><p style="margin:0;color:#c9a54b;font-size:12px;letter-spacing:.2em;text-transform:uppercase;">Arkline Trust</p>
    <h1 style="margin:8px 0 0;color:#f4f2ec;font-size:22px;font-weight:normal;">${esc(title)}</h1></div>
    <div style="padding:28px 32px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#1f2937;">${body}</div>
    <div style="background:#faf9f5;border-top:1px solid #e5e1d6;padding:16px 32px;font-family:Arial,sans-serif;font-size:11px;color:#6b7280;text-align:center;">
      Arkline Trust · Confidential · Wholesale investors only · applications@arklinetrust.com</div>
  </div></body></html>`;
}

const button = (href: string, label: string) =>
  `<p style="margin:24px 0;"><a href="${esc(href)}" style="display:inline-block;background:#0f1f1a;color:#f4f2ec;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:bold;">${esc(label)}</a></p>
   <p style="font-size:12px;color:#6b7280;word-break:break-all;">Or copy this link: ${esc(href)}</p>`;

async function sendEmail(msg: { to: string[]; subject: string; html: string; text: string; attachments?: { filename: string; content: string }[] }) {
  if (!RESEND_API_KEY) throw new HttpError(500, "Email sending is not configured");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, ...msg, subject: msg.subject.replace(/[\r\n]+/g, " ").slice(0, 160) }),
  });
  if (!res.ok) {
    console.error("Resend error", res.status, await res.text());
    throw new HttpError(502, "The email could not be sent. Please try again.");
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function appByResumeToken(db: SupabaseClient, token: unknown): Promise<Row> {
  if (!isToken(token)) throw new HttpError(400, "Invalid link");
  const { data, error } = await db.from("investor_applications").select("*").eq("resume_token_hash", await sha256Hex(token)).maybeSingle();
  if (error) throw error;
  if (!data || data.status === "cancelled") throw new HttpError(404, "This application link is no longer valid");
  return data;
}

async function signerByToken(db: SupabaseClient, token: unknown): Promise<SignerRow & Row> {
  if (!isToken(token)) throw new HttpError(400, "Invalid link");
  const { data, error } = await db.from("application_signers").select(SIGNER_COLS).eq("token_hash", await sha256Hex(token)).maybeSingle();
  if (error) throw error;
  if (!data || data.cancelled_at) throw new HttpError(404, "This signing link is no longer valid");
  if (data.token_expires_at && new Date(data.token_expires_at) < new Date()) throw new HttpError(410, "This signing link has expired. Please ask for a new one.");
  return data as SignerRow & Row;
}

async function loadApp(db: SupabaseClient, id: string): Promise<Row> {
  const { data, error } = await db.from("investor_applications").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, "Application not found");
  return data;
}

async function loadSigners(db: SupabaseClient, appId: string): Promise<SignerRow[]> {
  const { data, error } = await db.from("application_signers").select(SIGNER_COLS).eq("application_id", appId).is("cancelled_at", null).order("role");
  if (error) throw error;
  return (data ?? []) as SignerRow[];
}

async function requireManager(req: Request, db: SupabaseClient, appId: unknown): Promise<{ app: Row; userId: string }> {
  if (typeof appId !== "string" || !/^[0-9a-f-]{36}$/.test(appId)) throw new HttpError(400, "Invalid application");
  const auth = req.headers.get("Authorization") ?? "";
  const user = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
  const { data: u } = await user.auth.getUser();
  if (!u?.user) throw new HttpError(401, "Please sign in again");
  const app = await loadApp(db, appId);
  const { data: ok, error } = await user.rpc("can_manage_investor_apps", { p_tenant_id: app.tenant_id });
  if (error || ok !== true) throw new HttpError(403, "Not allowed");
  return { app, userId: u.user.id };
}

function validOrigin(v: unknown): string | null {
  if (typeof v !== "string") return null;
  try {
    const u = new URL(v);
    if (u.protocol === "https:" || (u.protocol === "http:" && u.hostname === "localhost")) return u.origin;
  } catch { /* invalid */ }
  return null;
}

// Links in emails triggered by the public may only point at origins Arkline itself has used or registered.
async function trustedOrigin(db: SupabaseClient, req: Request, app: Row): Promise<string> {
  const requested = validOrigin(req.headers.get("origin"));
  const allowed = new Set<string>();
  if (app.link_origin) allowed.add(app.link_origin);
  const [{ data: domains }, { data: used }] = await Promise.all([
    db.from("tenant_domains").select("domain").eq("tenant_id", app.tenant_id).eq("is_verified", true),
    db.from("investor_applications").select("link_origin").eq("tenant_id", app.tenant_id).not("link_origin", "is", null).limit(50),
  ]);
  for (const d of domains ?? []) allowed.add(`https://${d.domain}`);
  for (const r of used ?? []) allowed.add(r.link_origin);
  if (requested && allowed.has(requested)) return requested;
  return app.link_origin || DEFAULT_ORIGIN;
}

function nextStatus(signers: SignerRow[]): string {
  const by = (r: string) => signers.find((s) => s.role === r);
  const s1 = by("signer_1"), s2 = by("signer_2"), w1 = by("witness_1"), w2 = by("witness_2");
  if (!s1?.signed_at) return "in_progress";
  if (!w1?.signed_at) return "awaiting_witness";
  if (s2 && !s2.signed_at) return "awaiting_second_signer";
  if (s2 && !w2?.signed_at) return "awaiting_witness";
  return "signed";
}

function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object") {
    return `{${Object.keys(v as Row).sort().map((k) => `${JSON.stringify(k)}:${canonical((v as Row)[k])}`).join(",")}}`;
  }
  return JSON.stringify(v ?? null);
}

const NON_CONTENT = new Set(["status", "updated_at", "resume_token_hash", "notified_at", "reviewed_at", "reviewer_id", "reviewer_notes",
  "reviewed_by_email", "review_decision", "opened_at", "last_reminder_at", "invite_sent_at", "invite_expires_at", "link_origin",
  "signed_pdf_path", "signed_pdf_sha256", "content_sha256", "signed_at", "accepted_email_sent_at", "acceptance_payment_details",
  "paper_scan_path", "paper_received_at", "paper_checked_at", "paper_checked_by", "submitted_at", "cancelled_at"]);

async function contentHash(app: Row, signers: SignerRow[]): Promise<string> {
  const answers = Object.fromEntries(Object.entries(app).filter(([k]) => !NON_CONTENT.has(k)));
  const sigs = signers.map((s) => ({
    role: s.role, name: s.name, email: s.email, title: s.title_capacity, place: s.place_of_signing, occupation: s.occupation,
    address: s.address, verified: s.email_verified_at, signed: s.signed_at, type: s.signature_type, signature: s.signature_data,
  }));
  return sha256Hex(canonical({ answers, signatures: sigs }));
}

async function finalize(db: SupabaseClient, appId: string) {
  const { data: claimed, error } = await db.from("investor_applications")
    .update({ status: "signed", updated_at: new Date().toISOString() })
    .eq("id", appId).is("signed_pdf_path", null).in("status", ["in_progress", "awaiting_witness", "awaiting_second_signer"])
    .select("*").maybeSingle();
  if (error) throw error;
  if (!claimed) return;
  const signers = await loadSigners(db, appId);
  try {
    const completedAt = new Date().toISOString();
    const hash = await contentHash(claimed, signers);
    const pdf = await buildSignedPdf(claimed, signers, hash, completedAt);
    const fileHash = await sha256Hex(pdf);
    const path = `${claimed.tenant_id}/${appId}/signed-application-${completedAt.slice(0, 10)}.pdf`;
    const up = await db.storage.from(BUCKET).upload(path, pdf, { contentType: "application/pdf", upsert: false });
    if (up.error) throw up.error;
    const { error: uErr } = await db.from("investor_applications").update({
      signed_pdf_path: path, signed_pdf_sha256: fileHash, content_sha256: hash, signed_at: completedAt, submitted_at: completedAt,
    }).eq("id", appId);
    if (uErr) throw uErr;

    const name = applicantName(claimed);
    const recipients = [...new Set([claimed.contact_email, ...signers.filter((s) => s.role.startsWith("signer")).map((s) => s.email)]
      .filter(isEmail).map((e) => e.toLowerCase()))];
    const attachment = { filename: "Arkline_Trust_Signed_Application.pdf", content: bytesToBase64(pdf) };
    await sendEmail({
      to: recipients,
      subject: "Your signed Arkline Trust application",
      html: layout("Your application is signed", `<p>Dear ${esc(name)},</p>
        <p>Every signature and witness on your Arkline Trust application is now complete. Your signed copy, including the signing record, is attached.</p>
        <p style="font-size:12px;color:#6b7280;">File fingerprint (SHA-256):<br><code>${fileHash}</code></p>
        <p>Arkline will now review your application. <strong>Please do not transfer any funds until you receive written confirmation that your application has been accepted.</strong></p>`),
      text: `Dear ${name},\n\nYour Arkline Trust application is fully signed. Your signed copy is attached.\nFile fingerprint (SHA-256): ${fileHash}\n\nPlease do not transfer any funds until you receive written confirmation that your application has been accepted.`,
      attachments: [attachment],
    });
    await sendEmail({
      to: INTERNAL_TO,
      subject: `Signed application - ${name}`,
      html: layout("Application signed", `<p>${esc(name)} has completed signing. ${classLines(claimed).map(esc).join("<br>")}</p>
        <p>Open the Onboarding section of the manager console to review and accept it.</p>`),
      text: `${name} has completed signing. Review it in the Onboarding section of the manager console.`,
    }).catch((e) => console.error("internal notice failed", e));
    await db.from("investor_applications").update({ notified_at: new Date().toISOString() }).eq("id", appId);
  } catch (e) {
    console.error("finalize failed", e);
    await db.from("investor_applications").update({ status: "awaiting_witness" }).eq("id", appId).is("signed_pdf_path", null);
    throw new HttpError(500, "Your signature was saved, but the final document could not be produced. Arkline has been notified.");
  }
}

async function issueSignerLink(db: SupabaseClient, req: Request, app: Row, s: { role: string; name: string; email: string; title?: string }, invitedBy: string, origin?: string) {
  const token = randomToken();
  const { error } = await db.from("application_signers").insert({
    application_id: app.id, tenant_id: app.tenant_id, role: s.role, name: s.name, email: s.email.toLowerCase(),
    title_capacity: s.title || null, token_hash: await sha256Hex(token), token_expires_at: addDays(SIGNER_DAYS),
    invited_at: new Date().toISOString(),
  });
  if (error) throw error;
  if (s.role === "signer_1") return token;
  await emailSignerLink(app, s, token, invitedBy, origin ?? await trustedOrigin(db, req, app));
  return null;
}

async function emailSignerLink(app: Row, s: { role: string; name: string; email: string }, token: string, invitedBy: string, origin: string) {
  const link = `${origin}/vault/sign?t=${token}`;
  const witness = s.role.startsWith("witness");
  const subject = witness ? `Please witness a signature for ${invitedBy}` : "Please co-sign an Arkline Trust application";
  const intro = witness
    ? `<p>${esc(invitedBy)} has signed an Arkline Trust investor application and has named you as their witness. A witness must not be related to the applicant.</p>
       <p>You will confirm your email with a one-time code, then add your name, address, occupation and signature.</p>`
    : `<p>${esc(invitedBy)} has completed an Arkline Trust investor application for <strong>${esc(applicantName(app))}</strong> and has named you as the second signatory.</p>
       <p>You can review the application, confirm your email with a one-time code and sign online. You will then be asked to nominate a witness.</p>`;
  await sendEmail({
    to: [s.email],
    subject,
    html: layout(witness ? "Witness request" : "Signature requested", `<p>Dear ${esc(s.name)},</p>${intro}${button(link, witness ? "Witness the signature" : "Review and sign")}
      <p style="font-size:12px;color:#6b7280;">This private link expires on ${auDate(addDays(SIGNER_DAYS))}. If you were not expecting this email you can ignore it.</p>`),
    text: `Dear ${s.name},\n\n${witness ? `${invitedBy} has asked you to witness their signature on an Arkline Trust application.` : `${invitedBy} has asked you to co-sign an Arkline Trust application.`}\n\n${link}\n\nThis private link expires in ${SIGNER_DAYS} days.`,
  });
}

async function startSigning(db: SupabaseClient, req: Request, body: Row) {
  const app = await appByResumeToken(db, body.resume_token);
  if (!EDITABLE.includes(app.status) || app.locked_at) throw new HttpError(409, "Signing has already started for this application");
  if (app.invite_expires_at && new Date(app.invite_expires_at) < new Date()) throw new HttpError(410, "This link has expired. Please ask Arkline for a new one.");
  const method = body.method === "paper" ? "paper" : body.method === "electronic" ? "electronic" : null;
  if (!method) throw new HttpError(400, "Choose how you will sign");

  const { count } = await db.from("application_change_requests").select("id", { count: "exact", head: true }).eq("application_id", app.id).eq("status", "pending");
  if ((count ?? 0) > 0) throw new HttpError(409, "Arkline still needs to review your requested changes before you can sign");
  const ticks = Array.isArray(app.declaration_ticks) ? app.declaration_ticks : [];
  if (ticks.length < 14 || ticks.slice(0, 14).some((t: unknown) => t !== true) || app.declaration_agreed !== true) {
    throw new HttpError(400, "Please tick all 14 declarations and the final agreement before signing");
  }
  if (!app.investor_type) throw new HttpError(400, "Please choose an investor type");
  const anyClass = (["a", "b", "c"] as const).some((k) => app[`invest_class_${k}`] && Number(app[`amount_class_${k}`]) > 0);
  if (!anyClass) throw new HttpError(400, "Please choose at least one class and enter an amount");
  if (!isEmail(app.contact_email)) throw new HttpError(400, "Please enter a valid contact email");

  const raw = Array.isArray(body.signers) ? body.signers.slice(0, 2) : [];
  const signers = raw.map((s: Row) => ({ name: str(s?.name, 120), email: str(s?.email, 254).toLowerCase(), title: str(s?.title, 120) }));
  if (signers.length === 0 || signers.some((s: Row) => !s.name || !isEmail(s.email))) throw new HttpError(400, "Enter a name and valid email for each signatory");
  if (app.investor_type === "joint" && signers.length < 2) throw new HttpError(400, "Joint applications need both investors to sign");
  if (signers.length === 2 && signers[0].email === signers[1].email) throw new HttpError(400, "Each signatory needs their own email address");

  const now = new Date().toISOString();
  const { data: locked, error } = await db.from("investor_applications").update({
    locked_at: now, sign_method: method, status: "in_progress", updated_at: now,
    multi_signatory: signers.length > 1 ? body.authority === "all" : null,
  }).eq("id", app.id).is("locked_at", null).in("status", EDITABLE).select("*").maybeSingle();
  if (error) throw error;
  if (!locked) throw new HttpError(409, "Signing has already started for this application");

  if (method === "paper") return json({ ok: true, method });
  try {
    const signerToken = await issueSignerLink(db, req, locked, { role: "signer_1", ...signers[0] }, signers[0].name);
    if (signers[1]) await issueSignerLink(db, req, locked, { role: "signer_2", ...signers[1] }, signers[0].name);
    return json({ ok: true, method, signer_token: signerToken });
  } catch (e) {
    await db.from("application_signers").update({ cancelled_at: new Date().toISOString(), token_hash: null }).eq("application_id", app.id).is("cancelled_at", null);
    await db.from("investor_applications").update({ locked_at: null, sign_method: null }).eq("id", app.id);
    throw e;
  }
}

async function signerView(db: SupabaseClient, body: Row) {
  const s = await signerByToken(db, body.token);
  const app = await loadApp(db, s.application_id);
  if (["cancelled", "rejected"].includes(app.status)) throw new HttpError(404, "This application is no longer active");
  const signers = await loadSigners(db, app.id);
  const n = s.role.slice(-1);
  const principal = signers.find((x) => x.role === `signer_${n}`);
  const base = { role: s.role, name: s.name, email: s.email, title: s.title_capacity, verified: !!s.email_verified_at, signed_at: s.signed_at,
    applicant: applicantName(app), status: app.status };
  if (s.role.startsWith("witness")) {
    return json({ ...base, signer_name: principal?.name ?? "", signer_signed_at: principal?.signed_at ?? null, signer_place: principal?.place_of_signing ?? "" });
  }
  return json({ ...base, investor_type: app.investor_type, classes: classLines(app), signers: signers.map((x) => ({ role: x.role, name: x.name, signed_at: x.signed_at })) });
}

async function requestCode(db: SupabaseClient, body: Row) {
  const s = await signerByToken(db, body.token);
  if (s.signed_at) throw new HttpError(409, "You have already signed");
  const windowFresh = s.otp_window_start && Date.now() - new Date(s.otp_window_start).getTime() < 3_600_000;
  const sent = windowFresh ? s.otp_sent_count : 0;
  if (sent >= 5) throw new HttpError(429, "Too many codes requested. Please wait an hour and try again.");
  const code = randomCode();
  const { error } = await db.from("application_signers").update({
    otp_hash: await sha256Hex(`${s.id}:${code}`), otp_expires_at: new Date(Date.now() + 10 * 60_000).toISOString(), otp_attempts: 0,
    otp_sent_count: sent + 1, otp_window_start: windowFresh ? s.otp_window_start : new Date().toISOString(),
  }).eq("id", s.id);
  if (error) throw error;
  await sendEmail({
    to: [s.email],
    subject: `Your Arkline Trust signing code: ${code}`,
    html: layout("Your signing code", `<p>Use this code to confirm your email address before signing:</p>
      <p style="font-size:32px;letter-spacing:.3em;font-weight:bold;color:#0f1f1a;margin:16px 0;">${code}</p>
      <p style="font-size:12px;color:#6b7280;">The code expires in 10 minutes. If you did not request it, you can ignore this email.</p>`),
    text: `Your Arkline Trust signing code is ${code}. It expires in 10 minutes.`,
  });
  return json({ ok: true });
}

async function verifyCode(db: SupabaseClient, req: Request, body: Row) {
  const s = await signerByToken(db, body.token);
  if (s.email_verified_at) return json({ ok: true });
  const code = str(body.code, 6);
  if (!s.otp_hash || !s.otp_expires_at || new Date(s.otp_expires_at) < new Date()) throw new HttpError(400, "That code has expired. Please request a new one.");
  if (s.otp_attempts >= 5) throw new HttpError(429, "Too many incorrect attempts. Please request a new code.");
  if (!/^\d{6}$/.test(code) || (await sha256Hex(`${s.id}:${code}`)) !== s.otp_hash) {
    await db.from("application_signers").update({ otp_attempts: s.otp_attempts + 1 }).eq("id", s.id);
    throw new HttpError(400, "That code is not correct");
  }
  const { error } = await db.from("application_signers").update({
    email_verified_at: new Date().toISOString(), verified_ip: clientIp(req), verified_user_agent: str(req.headers.get("user-agent"), 400),
    otp_hash: null, otp_expires_at: null,
  }).eq("id", s.id);
  if (error) throw error;
  return json({ ok: true });
}

async function sign(db: SupabaseClient, req: Request, body: Row) {
  const s = await signerByToken(db, body.token);
  if (s.signed_at) throw new HttpError(409, "You have already signed");
  if (!s.email_verified_at) throw new HttpError(403, "Please confirm your email with the one-time code first");
  const app = await loadApp(db, s.application_id);
  if (!["in_progress", "awaiting_witness", "awaiting_second_signer"].includes(app.status) || app.sign_method !== "electronic") {
    throw new HttpError(409, "This application is not waiting for signatures");
  }
  const signers = await loadSigners(db, app.id);
  const witness = s.role.startsWith("witness");
  const n = s.role.slice(-1);

  const type = body.signature_type === "draw" ? "draw" : body.signature_type === "type" ? "type" : null;
  const data = typeof body.signature_data === "string" ? body.signature_data : "";
  if (!type) throw new HttpError(400, "Please add your signature");
  if (type === "draw" && (!data.startsWith("data:image/png;base64,") || data.length > 300_000 || data.length < 200)) throw new HttpError(400, "Please draw your signature again");
  if (type === "type" && (data.trim().length < 2 || data.length > 80)) throw new HttpError(400, "Please type your full name as your signature");
  const place = str(body.place, 120);
  const occupation = str(body.occupation, 120);
  const address = str(body.address, 300);

  const update: Row = {
    signature_type: type, signature_data: type === "type" ? data.trim() : data, signed_at: new Date().toISOString(),
    signed_ip: clientIp(req), signed_user_agent: str(req.headers.get("user-agent"), 400),
  };
  let witnessInvite: { name: string; email: string } | null = null;
  if (witness) {
    const principal = signers.find((x) => x.role === `signer_${n}`);
    if (!principal?.signed_at) throw new HttpError(409, "The signatory has not signed yet");
    if (!occupation || !address) throw new HttpError(400, "Please enter your address and occupation");
    Object.assign(update, { occupation, address, place_of_signing: place || null });
  } else {
    if (!place) throw new HttpError(400, "Please enter the place of signing");
    const wName = str(body.witness_name, 120);
    const wEmail = str(body.witness_email, 254).toLowerCase();
    if (!wName || !isEmail(wEmail)) throw new HttpError(400, "Please enter your witness's name and email");
    const taken = new Set([app.contact_email, ...signers.map((x) => x.email)].filter(Boolean).map((e: string) => e.toLowerCase()));
    if (taken.has(wEmail)) throw new HttpError(400, "Your witness must be a different person with their own email address");
    if (wName.toLowerCase() === s.name.toLowerCase()) throw new HttpError(400, "You cannot witness your own signature");
    Object.assign(update, { place_of_signing: place, title_capacity: str(body.title, 120) || s.title_capacity });
    witnessInvite = { name: wName, email: wEmail };
  }

  const { data: done, error } = await db.from("application_signers").update(update).eq("id", s.id).is("signed_at", null).select("id").maybeSingle();
  if (error) throw error;
  if (!done) throw new HttpError(409, "You have already signed");

  if (witnessInvite) {
    const origin = await trustedOrigin(db, req, app);
    await db.from("application_signers").update({ cancelled_at: new Date().toISOString(), token_hash: null })
      .eq("application_id", app.id).eq("role", `witness_${n}`).is("cancelled_at", null);
    await issueSignerLink(db, req, app, { role: `witness_${n}`, ...witnessInvite }, s.name, origin);
  }

  const after = await loadSigners(db, app.id);
  const status = nextStatus(after);
  if (status === "signed") await finalize(db, app.id);
  else await db.from("investor_applications").update({ status, updated_at: new Date().toISOString() }).eq("id", app.id);
  return json({ ok: true, status });
}

async function uploadPaper(db: SupabaseClient, body: Row) {
  const app = await appByResumeToken(db, body.resume_token);
  if (app.sign_method !== "paper" || !app.locked_at || !["in_progress", "paper_received"].includes(app.status) || app.paper_checked_at) {
    throw new HttpError(409, "This application is not waiting for a paper copy");
  }
  const b64 = typeof body.file_base64 === "string" ? body.file_base64 : "";
  if (!b64 || b64.length > 14_000_000) throw new HttpError(400, "Please upload a file under 10 MB");
  const bytes = base64ToBytes(b64);
  const head = Array.from(bytes.subarray(0, 4)).map((x) => x.toString(16).padStart(2, "0")).join("");
  const kind = head.startsWith("25504446") ? { ext: "pdf", type: "application/pdf" }
    : head.startsWith("ffd8ff") ? { ext: "jpg", type: "image/jpeg" }
    : head === "89504e47" ? { ext: "png", type: "image/png" } : null;
  if (!kind) throw new HttpError(400, "Please upload a PDF, JPG or PNG scan");
  const now = new Date().toISOString();
  const path = `${app.tenant_id}/${app.id}/paper-scan-${Date.now()}.${kind.ext}`;
  const up = await db.storage.from(BUCKET).upload(path, bytes, { contentType: kind.type, upsert: false });
  if (up.error) throw up.error;
  const { error } = await db.from("investor_applications").update({
    paper_scan_path: path, paper_received_at: now, status: "paper_received", submitted_at: now, updated_at: now,
  }).eq("id", app.id);
  if (error) throw error;
  await sendEmail({
    to: INTERNAL_TO,
    subject: `Paper application received - ${applicantName(app)}`,
    html: layout("Paper copy received", `<p>${esc(applicantName(app))} has uploaded a signed paper copy. Check it in the Onboarding section of the manager console.</p>`),
    text: `${applicantName(app)} has uploaded a signed paper copy. Check it in the Onboarding section of the manager console.`,
  }).catch((e) => console.error("internal notice failed", e));
  return json({ ok: true });
}

async function sendInvite(db: SupabaseClient, req: Request, body: Row) {
  const { app } = await requireManager(req, db, body.application_id);
  if (!EDITABLE.includes(app.status) || app.locked_at) throw new HttpError(409, "This application can no longer be sent");
  if (!isEmail(app.invite_email || app.contact_email)) throw new HttpError(400, "The application needs a valid email address");
  const origin = validOrigin(body.origin);
  if (!origin) throw new HttpError(400, "Invalid site address");
  const token = randomToken();
  const now = new Date().toISOString();
  const reminder = app.status !== "draft";
  const expires = addDays(INVITE_DAYS);
  const { error } = await db.from("investor_applications").update({
    resume_token_hash: await sha256Hex(token), invite_expires_at: expires, link_origin: origin, updated_at: now,
    invite_sent_at: app.invite_sent_at ?? now, last_reminder_at: reminder ? now : app.last_reminder_at,
    status: app.status === "draft" ? "sent" : app.status,
  }).eq("id", app.id);
  if (error) throw error;
  const link = `${origin}/vault/apply?resume=${token}`;
  const first = app.contact_given_names || "there";
  await sendEmail({
    to: [app.invite_email || app.contact_email],
    subject: reminder ? "Reminder: your Arkline Trust application" : "Your Arkline Trust application is ready",
    html: layout(reminder ? "A reminder about your application" : "Your application is ready", `<p>Dear ${esc(first)},</p>
      <p>Arkline has prepared your investor application. The details we filled in are marked <em>Prepared by Arkline</em>. Please check them,
      complete the remaining sections (identity, tax, bank details, beneficial owners and FATCA/CRS) and sign. You can save and come back at any time.</p>
      ${classLines(app).length ? `<p>${classLines(app).map(esc).join("<br>")}</p>` : ""}
      ${button(link, "Open my application")}
      <p style="font-size:12px;color:#6b7280;">This private link expires on ${auDate(expires)}.${reminder ? " Any earlier link we sent you no longer works." : ""} Please do not forward it.</p>`),
    text: `Dear ${first},\n\nArkline has prepared your investor application. Please review, complete and sign it here:\n${link}\n\nThis private link expires on ${auDate(expires)}.`,
  });
  return json({ ok: true, expires_at: expires });
}

async function remindSigner(db: SupabaseClient, req: Request, body: Row) {
  if (typeof body.signer_id !== "string") throw new HttpError(400, "Invalid signer");
  const { data: s } = await db.from("application_signers").select(SIGNER_COLS).eq("id", body.signer_id).maybeSingle();
  if (!s || s.cancelled_at || s.signed_at) throw new HttpError(409, "This person cannot be reminded");
  const { app } = await requireManager(req, db, s.application_id);
  const token = randomToken();
  const { error } = await db.from("application_signers").update({ token_hash: await sha256Hex(token), token_expires_at: addDays(SIGNER_DAYS), invited_at: new Date().toISOString() }).eq("id", s.id);
  if (error) throw error;
  const signers = await loadSigners(db, app.id);
  const inviter = s.role.startsWith("witness") ? signers.find((x) => x.role === `signer_${s.role.slice(-1)}`)?.name ?? "The applicant" : signers.find((x) => x.role === "signer_1")?.name ?? "The applicant";
  await emailSignerLink(app, s, token, inviter, app.link_origin || await trustedOrigin(db, req, app));
  return json({ ok: true });
}

async function sendAcceptance(db: SupabaseClient, req: Request, body: Row) {
  const { app } = await requireManager(req, db, body.application_id);
  if (app.status !== "approved") throw new HttpError(409, "Accept the application first");
  const p = (body.payment ?? {}) as Row;
  const payment = { bank: str(p.bank, 120), account_name: str(p.account_name, 160), bsb: str(p.bsb, 20), account_number: str(p.account_number, 40), swift: str(p.swift, 20) };
  if (!payment.bank || !payment.account_name || !payment.bsb || !payment.account_number) throw new HttpError(400, "Enter the bank, account name, BSB and account number");
  const name = applicantName(app);
  const reference = name;
  const rows = [["Bank", payment.bank], ["Account name", payment.account_name], ["BSB", payment.bsb], ["Account number", payment.account_number],
    ...(payment.swift ? [["SWIFT", payment.swift]] : []), ["Payment reference", reference]];
  await sendEmail({
    to: [app.contact_email],
    subject: "Your Arkline Trust application has been accepted",
    html: layout("Application accepted", `<p>Dear ${esc(name)},</p>
      <p>We are pleased to confirm in writing that your application to invest in Arkline Trust has been accepted.</p>
      <p>${classLines(app).map(esc).join("<br>")}</p>
      <p><strong>Payment details</strong></p>
      <table style="border-collapse:collapse;font-size:14px;">${rows.map(([k, v]) => `<tr><td style="padding:3px 16px 3px 0;color:#6b7280;">${esc(k)}</td><td style="padding:3px 0;font-weight:bold;">${esc(v)}</td></tr>`).join("")}</table>
      <p>Please use your full legal name as the payment reference so we can match your transfer.</p>
      <p>Units are issued at the next monthly dealing date, at the unit price confirmed by our broker, Interactive Brokers. No units are issued before then, and we will confirm your holding once they are.</p>`),
    text: `Dear ${name},\n\nYour application to invest in Arkline Trust has been accepted.\n${classLines(app).join("\n")}\n\nPayment details:\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\nUnits are issued at the next monthly dealing date, at the unit price confirmed by Interactive Brokers.`,
  });
  const { error } = await db.from("investor_applications").update({ accepted_email_sent_at: new Date().toISOString(), acceptance_payment_details: { ...payment, reference } }).eq("id", app.id);
  if (error) throw error;
  return json({ ok: true });
}

async function fileUrl(db: SupabaseClient, req: Request, body: Row) {
  const { app } = await requireManager(req, db, body.application_id);
  const path = body.kind === "paper" ? app.paper_scan_path : app.signed_pdf_path;
  if (!path) throw new HttpError(404, "No file is available yet");
  const { data, error } = await db.storage.from(BUCKET).createSignedUrl(path, 600);
  if (error || !data) throw new HttpError(500, "Could not open the file");
  return json({ url: data.signedUrl });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const body = await req.json().catch(() => ({})) as Row;
    const db = createClient(SUPABASE_URL, SERVICE_KEY);
    switch (body.action) {
      case "start_signing": return await startSigning(db, req, body);
      case "signer_view": return await signerView(db, body);
      case "request_code": return await requestCode(db, body);
      case "verify_code": return await verifyCode(db, req, body);
      case "sign": return await sign(db, req, body);
      case "upload_paper": return await uploadPaper(db, body);
      case "resume_signing": {
        const app = await appByResumeToken(db, body.resume_token);
        if (app.sign_method !== "electronic" || !app.locked_at) throw new HttpError(409, "Signing has not started");
        const { data: s } = await db.from("application_signers").select("id, signed_at").eq("application_id", app.id).eq("role", "signer_1").is("cancelled_at", null).maybeSingle();
        if (!s || s.signed_at) throw new HttpError(409, "You have already signed");
        const token = randomToken();
        const { error } = await db.from("application_signers").update({ token_hash: await sha256Hex(token), token_expires_at: addDays(SIGNER_DAYS) }).eq("id", s.id);
        if (error) throw error;
        return json({ signer_token: token });
      }
      case "prefilled_pdf": {
        const app = await appByResumeToken(db, body.resume_token);
        return pdfResponse(await buildPrefilledPdf(app, await loadSigners(db, app.id)), "Arkline_Trust_Application_Form_2026.1.pdf");
      }
      case "signer_preview_pdf": {
        const s = await signerByToken(db, body.token);
        if (s.role.startsWith("witness")) throw new HttpError(403, "Witnesses cannot view the application");
        const app = await loadApp(db, s.application_id);
        return pdfResponse(await buildPrefilledPdf(app, await loadSigners(db, app.id)), "Arkline_Trust_Application_Form_2026.1.pdf");
      }
      case "signed_pdf": {
        const app = await appByResumeToken(db, body.resume_token);
        if (!app.signed_pdf_path) throw new HttpError(404, "The signed copy is not ready yet");
        const { data, error } = await db.storage.from(BUCKET).download(app.signed_pdf_path);
        if (error || !data) throw new HttpError(500, "Could not open the signed copy");
        return pdfResponse(new Uint8Array(await data.arrayBuffer()), "Arkline_Trust_Signed_Application.pdf");
      }
      case "send_invite": return await sendInvite(db, req, body);
      case "remind_signer": return await remindSigner(db, req, body);
      case "send_acceptance": return await sendAcceptance(db, req, body);
      case "file_url": return await fileUrl(db, req, body);
      case "manager_preview_pdf": {
        const { app } = await requireManager(req, db, body.application_id);
        return pdfResponse(await buildPrefilledPdf(app, await loadSigners(db, app.id)), "Arkline_Trust_Application_Form_2026.1.pdf");
      }
      case "retry_finalize": {
        const { app } = await requireManager(req, db, body.application_id);
        if (app.signed_pdf_path || nextStatus(await loadSigners(db, app.id)) !== "signed") throw new HttpError(409, "Nothing to finish");
        await finalize(db, app.id);
        return json({ ok: true });
      }
      default: return json({ error: "Unknown action" }, 400);
    }
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error(e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
