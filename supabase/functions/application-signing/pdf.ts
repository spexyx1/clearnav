import { PDFDocument, PDFCheckBox, PDFRadioGroup, PDFTextField, StandardFonts, rgb, type PDFPage, type PDFFont } from "npm:pdf-lib@1.17.1";
import { TEMPLATE_BASE64, TEMPLATE_SHA256 } from "./template.ts";

// deno-lint-ignore no-explicit-any
export type Row = Record<string, any>;

export interface SignerRow {
  id: string;
  role: "signer_1" | "signer_2" | "witness_1" | "witness_2";
  name: string;
  email: string;
  title_capacity: string | null;
  email_verified_at: string | null;
  verified_ip: string | null;
  verified_user_agent: string | null;
  signature_type: "draw" | "type" | null;
  signature_data: string | null;
  place_of_signing: string | null;
  occupation: string | null;
  address: string | null;
  signed_at: string | null;
  signed_ip: string | null;
  signed_user_agent: string | null;
}

export async function sha256Hex(data: Uint8Array | string): Promise<string> {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function auDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Sydney", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));
}

function auDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney", day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZoneName: "short",
  }).format(new Date(iso));
}

function money(v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return "";
  return n.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

const yn = (v: unknown) => (v === true ? "yes" : v === false ? "no" : "");

// Characters outside WinAnsi break the standard fonts, so swap them for safe equivalents.
function safe(text: unknown): string {
  return String(text ?? "")
    .replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

async function loadTemplate(): Promise<PDFDocument> {
  const bytes = base64ToBytes(TEMPLATE_BASE64);
  if ((await sha256Hex(bytes)) !== TEMPLATE_SHA256) throw new Error("Official form template failed its integrity check");
  return PDFDocument.load(bytes);
}

function fill(doc: PDFDocument, app: Row, signers: SignerRow[]) {
  const form = doc.getForm();
  const text = (name: string, value: unknown) => {
    const v = safe(value).trim();
    if (!v) return;
    try { (form.getField(name) as PDFTextField).setText(v); } catch { /* field absent */ }
  };
  const check = (name: string, on: unknown) => {
    if (on !== true) return;
    try { (form.getField(name) as PDFCheckBox).check(); } catch { /* field absent */ }
  };
  const radio = (name: string, value: string) => {
    if (!value) return;
    try { (form.getField(name) as PDFRadioGroup).select(value); } catch { /* option absent */ }
  };
  const tin = (list: unknown, i: number) => (Array.isArray(list) ? list[i] ?? {} : {}) as Row;
  const wealth = (prefix: string, sources: unknown, other: unknown) => {
    const list = Array.isArray(sources) ? sources : [];
    for (const s of list) check(`${prefix}_wealth_${s === "financial_investments" ? "investments" : s}`, true);
    text(`${prefix}_wealth_other_detail`, other);
  };
  const tax = (prefix: string) => {
    radio(`${prefix}_aus_tax_resident`, yn(app[`${prefix}_aus_tax_resident`]));
    radio(`${prefix}_has_tin`, yn(app[`${prefix}_has_tin`]));
    radio(`${prefix}_no_tin_reason`, app[`${prefix}_no_tin_reason`] ?? "");
    for (const i of [0, 1]) {
      text(`${prefix}_tin_country_${i + 1}`, tin(app[`${prefix}_tin_countries`], i).country);
      text(`${prefix}_tin_${i + 1}`, tin(app[`${prefix}_tin_countries`], i).tin);
    }
  };

  check("invest_a", app.invest_class_a); if (app.invest_class_a) text("amount_a", money(app.amount_class_a));
  check("invest_b", app.invest_class_b); if (app.invest_class_b) text("amount_b", money(app.amount_class_b));
  check("invest_c", app.invest_class_c); if (app.invest_class_c) text("amount_c", money(app.amount_class_c));

  text("contact_title", app.contact_title); text("contact_given_names", app.contact_given_names);
  text("contact_surname", app.contact_surname); text("contact_phone", app.contact_phone); text("contact_email", app.contact_email);
  text("postal_street", app.postal_address); text("postal_suburb", app.postal_suburb); text("postal_state", app.postal_state);
  text("postal_postcode", app.postal_postcode); text("postal_country", app.postal_country);
  radio("investor_type", app.investor_type === "joint" ? "individual" : app.investor_type ?? "");

  text("a_title", app.a_title); text("a_given_names", app.a_given_names); text("a_surname", app.a_surname);
  text("a_dob", app.a_dob); text("a_email", app.a_email);
  text("a_addr_street", app.a_residential_address); text("a_addr_suburb", app.a_suburb); text("a_addr_state", app.a_state);
  text("a_addr_postcode", app.a_postcode); text("a_addr_country", app.a_country);
  radio("a_pep", yn(app.a_pep)); tax("a"); text("a_tfn", app.a_tfn);
  radio("a_sole_trader", yn(app.a_sole_trader)); text("a_business_name", app.a_business_name); text("a_abn", app.a_abn);
  text("a_business_street", app.a_business_address); text("a_business_suburb", app.a_business_suburb);
  text("a_business_state", app.a_business_state); text("a_business_postcode", app.a_business_postcode);
  text("a_business_country", app.a_business_country);
  wealth("a", app.a_wealth_sources, app.a_wealth_other);

  text("b_title", app.b_title); text("b_given_names", app.b_given_names); text("b_surname", app.b_surname);
  text("b_dob", app.b_dob); text("b_email", app.b_email); check("b_same_address", app.b_same_address_as_a);
  text("b_addr_street", app.b_address); text("b_addr_suburb", app.b_suburb); text("b_addr_state", app.b_state);
  text("b_addr_postcode", app.b_postcode); text("b_addr_country", app.b_country);
  tax("b"); text("b_tfn", app.b_tfn); radio("b_pep", yn(app.b_pep));
  wealth("b", app.b_wealth_sources, app.b_wealth_other);

  text("c_company_name", app.c_company_name); text("c_abn_tfn", app.c_abn_tfn); text("c_acn", app.c_acn);
  text("c_arbn", app.c_arbn); text("c_afsl", app.c_afsl); radio("c_company_type", app.c_company_type ?? "");
  text("c_registered_street", app.c_registered_address); text("c_registered_suburb", app.c_suburb);
  text("c_registered_state", app.c_state); text("c_registered_postcode", app.c_postcode); text("c_registered_country", app.c_country);
  tax("c");
  const directors = Array.isArray(app.c_directors) ? app.c_directors : [];
  directors.slice(0, 2).forEach((d: Row, i: number) => {
    const p = `c_dir${i + 1}`;
    text(`${p}_given_names`, d.given_names); text(`${p}_surname`, d.surname); text(`${p}_dob`, d.dob);
    text(`${p}_addr_street`, d.address); text(`${p}_addr_suburb`, d.suburb); text(`${p}_addr_state`, d.state);
    text(`${p}_addr_postcode`, d.postcode); text(`${p}_addr_country`, d.country); radio(`${p}_pep`, yn(d.pep));
  });
  wealth("c", app.c_wealth_sources, app.c_wealth_other);

  const trustees = Array.isArray(app.d_trustees) ? app.d_trustees : [];
  trustees.slice(0, 3).forEach((t: Row, i: number) => {
    const p = `d_t${i + 1}`;
    text(`${p}_name`, t.name); text(`${p}_addr_street`, t.address); text(`${p}_addr_suburb`, t.suburb);
    text(`${p}_addr_state`, t.state); text(`${p}_addr_postcode`, t.postcode); text(`${p}_addr_country`, t.country);
  });
  text("d_trust_name", app.d_trust_name); text("d_business_name", app.d_business_name); text("d_abn_tfn", app.d_abn_tfn);
  text("d_settlor", app.d_settlor); text("d_trust_type", app.d_trust_type); text("d_country_est", app.d_country_established);
  radio("d_beneficiary_by_class", yn(app.d_beneficiary_by_class)); text("d_beneficiary_class", app.d_beneficiary_class_terms);
  const bens = Array.isArray(app.d_beneficiaries) ? app.d_beneficiaries : [];
  bens.slice(0, 4).forEach((b: Row, i: number) => text(`d_beneficiary_${i + 1}`, b.name));
  tax("d");
  wealth("d", app.d_wealth_sources, app.d_wealth_other);

  const owners = Array.isArray(app.e_beneficial_owners) ? app.e_beneficial_owners : [];
  owners.slice(0, 2).forEach((o: Row, i: number) => {
    const p = `e_bo${i + 1}`;
    radio(`${p}_type`, o.entity_type ?? ""); text(`${p}_name`, o.name); text(`${p}_dob`, o.dob);
    text(`${p}_addr_street`, o.address); text(`${p}_addr_suburb`, o.suburb); text(`${p}_addr_state`, o.state);
    text(`${p}_addr_postcode`, o.postcode); text(`${p}_addr_country`, o.country);
    radio(`${p}_pep`, yn(o.pep)); radio(`${p}_aus_tax`, yn(o.aus_tax_resident));
    text(`${p}_tin_country`, tin(o.tin_countries, 0).country); text(`${p}_tin`, tin(o.tin_countries, 0).tin);
  });

  radio("bank_reinvest", yn(app.bank_reinvest));
  if (app.bank_reinvest === false) {
    text("bank_institution", app.bank_institution_name); text("bank_account_name", app.bank_account_name);
    text("bank_bsb", app.bank_bsb); text("bank_acc_num", app.bank_account_number); text("bank_swift", app.bank_swift);
  }

  radio("fatca_type", app.fatca_entity_type ?? ""); text("fatca_giin", app.fatca_giin);
  radio("crs_foreign_tax", yn(app.crs_foreign_tax_resident));
  const crs = Array.isArray(app.crs_countries) ? app.crs_countries : [];
  crs.slice(0, 3).forEach((c: Row, i: number) => { text(`crs_country_${i + 1}`, c.country); text(`crs_tin_${i + 1}`, c.tin); });

  const ticks = Array.isArray(app.declaration_ticks) ? app.declaration_ticks : [];
  for (let i = 0; i < 14; i++) check(`decl_${i + 1}`, ticks[i] === true);
  check("declaration_agreed_all", app.declaration_agreed);

  const signerRows = signers.filter((s) => s.role === "signer_1" || s.role === "signer_2");
  if (signerRows.length > 1) radio("multi_signatory", app.multi_signatory ? "all_required" : "any_one");
  for (const n of [1, 2] as const) {
    const s = signers.find((x) => x.role === `signer_${n}`);
    const w = signers.find((x) => x.role === `witness_${n}`);
    if (s) {
      text(`sig${n}_name`, s.name); text(`sig${n}_role`, s.title_capacity);
      if (s.signed_at) { text(`sig${n}_date`, auDate(s.signed_at)); text(`sig${n}_place`, s.place_of_signing); }
    }
    if (w?.signed_at) {
      text(`sig${n}_witness_name`, w.name); text(`sig${n}_witness_addr`, w.address);
      text(`sig${n}_witness_date`, auDate(w.signed_at)); text(`sig${n}_witness_occ`, w.occupation);
    }
  }
}

async function drawSignature(doc: PDFDocument, page: PDFPage, font: PDFFont, s: SignerRow, x: number, y: number, w: number, h: number) {
  if (!s.signed_at || !s.signature_data) return;
  if (s.signature_type === "draw" && s.signature_data.startsWith("data:image/png;base64,")) {
    const img = await doc.embedPng(base64ToBytes(s.signature_data.slice("data:image/png;base64,".length)));
    const scale = Math.min(w / img.width, h / img.height);
    page.drawImage(img, { x, y, width: img.width * scale, height: img.height * scale });
  } else {
    page.drawText(safe(s.signature_data).slice(0, 60), { x, y: y + 6, size: 16, font, color: rgb(0.05, 0.1, 0.35) });
  }
}

// Coordinates of the signature boxes on page 11 of the official 2026.1 form.
const SIG_BOXES = {
  signer_1: { x: 54, y: 526 }, witness_1: { x: 333, y: 526 },
  signer_2: { x: 54, y: 323 }, witness_2: { x: 333, y: 323 },
} as const;

export async function buildPrefilledPdf(app: Row, signers: SignerRow[] = []): Promise<Uint8Array> {
  const doc = await loadTemplate();
  fill(doc, app, signers);
  return doc.save();
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const words = safe(text).split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > width && line) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

const ROLE_LABEL: Record<SignerRow["role"], string> = {
  signer_1: "Signatory 1", signer_2: "Signatory 2", witness_1: "Witness to Signatory 1", witness_2: "Witness to Signatory 2",
};

export async function buildSignedPdf(app: Row, signers: SignerRow[], contentHash: string, completedAt: string): Promise<Uint8Array> {
  const doc = await loadTemplate();
  fill(doc, app, signers);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const script = await doc.embedFont(StandardFonts.TimesRomanItalic);

  const execPage = doc.getPage(10);
  for (const s of signers) {
    const box = SIG_BOXES[s.role];
    if (!box || !s.signed_at) continue;
    execPage.drawRectangle({ x: box.x, y: box.y + 2, width: 212, height: 12, color: rgb(1, 1, 1) });
    await drawSignature(doc, execPage, script, s, box.x, box.y, 200, 24);
  }
  doc.getForm().flatten();

  let page = doc.addPage([595.28, 841.89]);
  let y = 790;
  const line = (t: string, opts: { size?: number; font?: PDFFont; color?: [number, number, number]; indent?: number } = {}) => {
    const size = opts.size ?? 9.5;
    const font = opts.font ?? regular;
    for (const l of wrap(t, font, size, 495 - (opts.indent ?? 0))) {
      if (y < 60) { page = doc.addPage([595.28, 841.89]); y = 790; }
      page.drawText(l, { x: 50 + (opts.indent ?? 0), y, size, font, color: rgb(...(opts.color ?? [0.1, 0.1, 0.12])) });
      y -= size * 1.5;
    }
  };

  line("SIGNING RECORD", { size: 16, font: bold });
  line("Arkline Trust - Investor Application Form, Version 2026.1", { size: 10, color: [0.35, 0.35, 0.4] });
  y -= 8;
  const applicant = app.c_company_name || app.d_trust_name ||
    [app.a_given_names || app.contact_given_names, app.a_surname || app.contact_surname].filter(Boolean).join(" ");
  line(`Application reference: ${app.id}`);
  line(`Applicant: ${applicant || "-"}`);
  line(`Signing completed: ${auDateTime(completedAt)}`);
  line(`Application content fingerprint (SHA-256): ${contentHash}`, { font: bold });
  line("The fingerprint is calculated from every answer in this application together with each signature below. " +
    "Any later change to the answers or signatures would produce a different fingerprint. The fingerprint of this PDF file " +
    "itself is recorded by Arkline and included in the email that delivered it.", { size: 8.5, color: [0.35, 0.35, 0.4] });
  y -= 10;

  for (const s of signers.filter((x) => x.signed_at)) {
    if (y < 200) { page = doc.addPage([595.28, 841.89]); y = 790; }
    line(ROLE_LABEL[s.role], { size: 11.5, font: bold });
    line(`Name: ${s.name}${s.title_capacity ? `  |  Capacity: ${s.title_capacity}` : ""}`, { indent: 8 });
    line(`Email address: ${s.email} (verified by one-time code ${auDateTime(s.email_verified_at)})`, { indent: 8 });
    if (s.place_of_signing) line(`Place of signing: ${s.place_of_signing}`, { indent: 8 });
    if (s.occupation) line(`Occupation: ${s.occupation}`, { indent: 8 });
    if (s.address) line(`Address: ${s.address}`, { indent: 8 });
    line(`Signed: ${auDateTime(s.signed_at)}  |  Method: ${s.signature_type === "draw" ? "drawn signature" : "typed signature"}`, { indent: 8 });
    line(`IP address: ${s.signed_ip || "unknown"}`, { indent: 8 });
    line(`Device: ${(s.signed_user_agent || "unknown").slice(0, 220)}`, { indent: 8, size: 8.5 });
    if (y < 110) { page = doc.addPage([595.28, 841.89]); y = 790; }
    page.drawRectangle({ x: 58, y: y - 44, width: 220, height: 50, borderColor: rgb(0.8, 0.8, 0.82), borderWidth: 0.6 });
    await drawSignature(doc, page, script, s, 64, y - 40, 208, 42);
    y -= 64;
  }

  y -= 6;
  line("Each person confirmed control of their email address by entering a one-time code sent to it before signing. " +
    "Witnesses signed through their own private link after the signatory had signed. This record forms part of the application.",
    { size: 8.5, color: [0.35, 0.35, 0.4] });

  doc.setTitle(`Arkline Trust Application - ${safe(applicant)}`);
  doc.setSubject("Signed Investor Application Form 2026.1");
  doc.setProducer("Arkline Trust signing service");
  doc.setCreationDate(new Date(completedAt));
  doc.setModificationDate(new Date(completedAt));
  return doc.save();
}
