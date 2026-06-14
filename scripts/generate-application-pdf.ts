import {
  PDFDocument,
  PDFPage,
  PDFFont,
  PDFForm,
  PDFRadioGroup,
  rgb,
  StandardFonts,
  RGB,
} from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = path.join(__dirname, '..', 'public', 'documents', 'Arkline_Trust_Application_Form_cleaned.pdf');

// ─── Brand palette ────────────────────────────────────────────────────────────
const GREEN  = rgb(0x1B / 255, 0x3A / 255, 0x2D / 255); // #1B3A2D
const GOLD   = rgb(0xB8 / 255, 0x93 / 255, 0x4A / 255); // #B8934A
const CREAM  = rgb(0xF5 / 255, 0xF2 / 255, 0xEE / 255); // #F5F2EE
const WHITE  = rgb(1, 1, 1);
const TEXT   = rgb(0x1A / 255, 0x1A / 255, 0x1A / 255); // #1A1A1A
const SUBTLE = rgb(0x4A / 255, 0x4A / 255, 0x4A / 255); // #4A4A4A
const BORDER = rgb(0.78, 0.78, 0.78);

// ─── Page layout (A4) ────────────────────────────────────────────────────────
const PW = 595.28;  // page width
const PH = 841.89;  // page height
const ML = 50;       // margin left
const MB = 55;       // margin bottom
const CW = PW - ML - 50; // content width ≈ 495pt

// ─── Types ───────────────────────────────────────────────────────────────────
interface Fonts { r: PDFFont; b: PDFFont; }

interface St {
  doc: PDFDocument;
  form: PDFForm;
  f: Fonts;
  page: PDFPage;
  y: number;
  n: number;
}

// ─── Page management ─────────────────────────────────────────────────────────

function newPage(st: St): void {
  const p = st.doc.addPage([PW, PH]);
  st.page = p;
  st.n += 1;
  st.y = PH - 32;
  slimHeader(st);
}

function ensure(st: St, h: number): void {
  if (st.y - h < MB) newPage(st);
}

// ─── Headers ─────────────────────────────────────────────────────────────────

function coverHeader(page: PDFPage, f: Fonts): void {
  page.drawRectangle({ x: 0, y: PH - 72, width: PW, height: 72, color: GREEN });
  drawDiamond(page, 68, PH - 36, 14);
  page.drawText('ARKLINE TRUST', { x: 90, y: PH - 30, size: 13, font: f.b, color: CREAM, characterSpacing: 2 });
  page.drawText('Investor Application Form  |  Wholesale Investors Only  |  Version 2026.1', {
    x: 90, y: PH - 47, size: 8, font: f.r, color: GOLD,
  });
  page.drawLine({ start: { x: 0, y: PH - 72 }, end: { x: PW, y: PH - 72 }, thickness: 1, color: GOLD });
}

function slimHeader(st: St): void {
  const { page, f, n } = st;
  page.drawRectangle({ x: 0, y: PH - 24, width: PW, height: 24, color: GREEN });
  drawDiamond(page, 18, PH - 12, 7);
  page.drawText('ARKLINE TRUST  -  Investor Application Form', { x: 30, y: PH - 16, size: 7.5, font: f.r, color: CREAM, characterSpacing: 0.3 });
  page.drawText(`Page ${n}`, { x: PW - 70, y: PH - 16, size: 7, font: f.r, color: CREAM });
}

function drawDiamond(page: PDFPage, cx: number, cy: number, r: number): void {
  page.drawLine({ start: { x: cx, y: cy + r }, end: { x: cx + r, y: cy }, thickness: 1.5, color: GOLD });
  page.drawLine({ start: { x: cx + r, y: cy }, end: { x: cx, y: cy - r }, thickness: 1.5, color: GOLD });
  page.drawLine({ start: { x: cx, y: cy - r }, end: { x: cx - r, y: cy }, thickness: 1.5, color: GOLD });
  page.drawLine({ start: { x: cx - r, y: cy }, end: { x: cx, y: cy + r }, thickness: 1.5, color: GOLD });
  page.drawCircle({ x: cx, y: cy, size: r * 0.25, color: GOLD });
}

// ─── Text helpers ─────────────────────────────────────────────────────────────

function wrap(text: string, maxW: number, font: PDFFont, size: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) > maxW && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function body(st: St, text: string, indent = 0, bold = false, size = 8.5, color: RGB = TEXT): void {
  const font = bold ? st.f.b : st.f.r;
  const lines = wrap(text, CW - indent - 4, font, size);
  for (const l of lines) {
    ensure(st, 13);
    st.page.drawText(l, { x: ML + indent, y: st.y - 9, size, font, color });
    st.y -= 12;
  }
}

function gap(st: St, pts = 6): void { st.y -= pts; }

function hline(st: St): void {
  st.page.drawLine({ start: { x: ML, y: st.y }, end: { x: ML + CW, y: st.y }, thickness: 0.4, color: BORDER });
  st.y -= 6;
}

// ─── Section bars ─────────────────────────────────────────────────────────────

function secBar(st: St, num: string, title: string): void {
  ensure(st, 28);
  gap(st, 6);
  st.page.drawRectangle({ x: ML, y: st.y - 18, width: CW, height: 18, color: GREEN });
  const label = num ? `${num}   ${title.toUpperCase()}` : title.toUpperCase();
  st.page.drawText(label, { x: ML + 8, y: st.y - 13, size: 8.5, font: st.f.b, color: CREAM });
  st.y -= 22;
}

function subBar(st: St, title: string): void {
  ensure(st, 22);
  gap(st, 4);
  st.page.drawRectangle({ x: ML, y: st.y - 15, width: CW, height: 15, color: CREAM });
  st.page.drawLine({ start: { x: ML, y: st.y - 15 }, end: { x: ML + CW, y: st.y - 15 }, thickness: 0.5, color: GOLD });
  st.page.drawLine({ start: { x: ML, y: st.y }, end: { x: ML + CW, y: st.y }, thickness: 0.5, color: GOLD });
  st.page.drawText(title, { x: ML + 6, y: st.y - 11, size: 8, font: st.f.b, color: GREEN });
  st.y -= 19;
}

// ─── Field primitives ─────────────────────────────────────────────────────────

function tf(st: St, name: string, label: string, x: number, w: number, multi = false, fh = 14): void {
  ensure(st, 30);
  st.page.drawText(label, { x, y: st.y - 8, size: 7, font: st.f.r, color: SUBTLE });
  const fy = st.y - 11 - fh;
  st.page.drawLine({ start: { x, y: fy + 2 }, end: { x: x + w, y: fy + 2 }, thickness: 0.5, color: GOLD });
  const field = st.form.createTextField(name);
  field.addToPage(st.page, { x, y: fy, width: w, height: fh, borderWidth: 0, backgroundColor: WHITE });
  if (multi) field.enableMultiline();
}

// Single full-width field, advances y
function fld(st: St, name: string, label: string, w = CW, multi = false, fh = 14): void {
  ensure(st, 30);
  tf(st, name, label, ML, w, multi, fh);
  st.y -= (fh + 11 + 5);
}

// Two fields side by side, advances y
function fld2(st: St, n1: string, l1: string, n2: string, l2: string, r1 = 0.5): void {
  const w1 = Math.floor(CW * r1) - 4;
  const w2 = CW - w1 - 8;
  const startY = st.y;
  tf(st, n1, l1, ML, w1);
  // draw second field at same row
  st.page.drawText(l2, { x: ML + w1 + 8, y: startY - 8, size: 7, font: st.f.r, color: SUBTLE });
  const fy = startY - 11 - 14;
  st.page.drawLine({ start: { x: ML + w1 + 8, y: fy + 2 }, end: { x: ML + w1 + 8 + w2, y: fy + 2 }, thickness: 0.5, color: GOLD });
  const f2 = st.form.createTextField(n2);
  f2.addToPage(st.page, { x: ML + w1 + 8, y: fy, width: w2, height: 14, borderWidth: 0, backgroundColor: WHITE });
  st.y -= (14 + 11 + 5);
}

// Three (or four) fields in one row — pass array of [name, label, widthRatio]
function fld3(st: St, fields: [string, string, number][]): void {
  ensure(st, 30);
  const startY = st.y;
  let x = ML;
  for (const [name, label, ratio] of fields) {
    const w = Math.floor(CW * ratio) - 4;
    tf(st, name, label, x, w);
    x += w + 8;
  }
  st.y -= (14 + 11 + 5);
}

// Checkbox — draws border + AcroForm widget, advances y
function cbx(st: St, name: string, label: string, indent = 0): void {
  ensure(st, 16);
  const bx = ML + indent;
  const by = st.y - 13;
  st.page.drawRectangle({ x: bx, y: by, width: 11, height: 11, borderColor: GOLD, borderWidth: 0.75, color: WHITE });
  const cb = st.form.createCheckBox(name);
  cb.addToPage(st.page, { x: bx, y: by, width: 11, height: 11, borderWidth: 0.5, borderColor: GOLD, backgroundColor: WHITE });
  const labelLines = wrap(label, CW - indent - 18, st.f.r, 8.5);
  st.page.drawText(labelLines[0] ?? '', { x: bx + 15, y: by + 2, size: 8.5, font: st.f.r, color: TEXT });
  st.y -= 16;
  for (let i = 1; i < labelLines.length; i++) {
    ensure(st, 12);
    st.page.drawText(labelLines[i], { x: bx + 15, y: st.y - 8, size: 8.5, font: st.f.r, color: TEXT });
    st.y -= 12;
  }
}

// Radio option — part of a named group
function rad(st: St, group: string, value: string, label: string, indent = 0): void {
  ensure(st, 16);
  const bx = ML + indent;
  const by = st.y - 13;
  st.page.drawCircle({ x: bx + 5.5, y: by + 5.5, size: 5.5, borderColor: GOLD, borderWidth: 0.75, color: WHITE });
  let rg: PDFRadioGroup;
  try { rg = st.form.getRadioGroup(group); } catch { rg = st.form.createRadioGroup(group); }
  rg.addOptionToPage(value, st.page, { x: bx, y: by, width: 11, height: 11, borderWidth: 0 });
  const labelLines = wrap(label, CW - indent - 18, st.f.r, 8.5);
  st.page.drawText(labelLines[0] ?? '', { x: bx + 15, y: by + 2, size: 8.5, font: st.f.r, color: TEXT });
  st.y -= 16;
  for (let i = 1; i < labelLines.length; i++) {
    ensure(st, 12);
    st.page.drawText(labelLines[i], { x: bx + 15, y: st.y - 8, size: 8.5, font: st.f.r, color: TEXT });
    st.y -= 12;
  }
}

// Yes / No radio pair on one row
function yesno(st: St, group: string, question: string, indent = 0): void {
  const lines = wrap(question, CW - indent - 90, st.f.r, 8.5);
  ensure(st, lines.length * 12 + 20);
  for (const l of lines) {
    st.page.drawText(l, { x: ML + indent, y: st.y - 9, size: 8.5, font: st.f.r, color: TEXT });
    st.y -= 12;
  }
  const bx = ML + indent;
  const by = st.y - 13;
  // Yes
  st.page.drawCircle({ x: bx + 5.5, y: by + 5.5, size: 5.5, borderColor: GOLD, borderWidth: 0.75, color: WHITE });
  let rg: PDFRadioGroup;
  try { rg = st.form.getRadioGroup(group); } catch { rg = st.form.createRadioGroup(group); }
  rg.addOptionToPage('yes', st.page, { x: bx, y: by, width: 11, height: 11, borderWidth: 0 });
  st.page.drawText('Yes', { x: bx + 14, y: by + 2, size: 8.5, font: st.f.r, color: TEXT });
  // No
  st.page.drawCircle({ x: bx + 50, y: by + 5.5, size: 5.5, borderColor: GOLD, borderWidth: 0.75, color: WHITE });
  rg.addOptionToPage('no', st.page, { x: bx + 44, y: by, width: 11, height: 11, borderWidth: 0 });
  st.page.drawText('No', { x: bx + 58, y: by + 2, size: 8.5, font: st.f.r, color: TEXT });
  st.y -= 18;
}

// ─── Reusable blocks ──────────────────────────────────────────────────────────

function addrBlock(st: St, prefix: string, heading: string): void {
  subBar(st, heading);
  fld(st, `${prefix}_street`, 'Street Address / PO Box');
  fld3(st, [
    [`${prefix}_suburb`,   'Suburb / City',      0.38],
    [`${prefix}_state`,    'State / Province',   0.22],
    [`${prefix}_postcode`, 'Postcode / ZIP',      0.18],
    [`${prefix}_country`,  'Country',             0.22],
  ]);
}

function taxBlock(st: St, prefix: string): void {
  subBar(st, 'Tax Residency');
  yesno(st, `${prefix}_aus_tax_resident`, 'Are you / is the entity an Australian resident for tax purposes?');
  gap(st, 2);
  body(st, 'If YES - provide TFN or TFN exemption code:', 0, false, 7.5, SUBTLE);
  fld(st, `${prefix}_tfn`, 'Tax File Number (TFN) / Exemption', CW * 0.45);
  gap(st, 2);
  body(st, 'If NO - provide foreign Tax Identification Number:', 0, false, 7.5, SUBTLE);
  yesno(st, `${prefix}_has_tin`, 'Do you have a Tax Identification Number (TIN) for another country?');
  fld2(st, `${prefix}_tin_country_1`, 'Country of Tax Residency', `${prefix}_tin_1`, 'TIN');
  fld2(st, `${prefix}_tin_country_2`, 'Country (if additional)', `${prefix}_tin_2`, 'TIN');
  gap(st, 2);
  body(st, 'Reason if no TIN is available:', 0, false, 7.5, SUBTLE);
  rad(st, `${prefix}_no_tin_reason`, 'not_issued',   'The country does not issue TINs');
  rad(st, `${prefix}_no_tin_reason`, 'no_tin',       'I have not been issued with a TIN');
  rad(st, `${prefix}_no_tin_reason`, 'not_required', 'The country does not require the TIN to be disclosed');
}

function wealthBlock(st: St, prefix: string): void {
  subBar(st, 'Source of Assets / Wealth Used for this Investment');
  body(st, 'Select all that apply:', 0, false, 7.5, SUBTLE);
  gap(st, 2);
  const opts: [string, string][] = [
    ['gainful_employment', 'Gainful employment'],
    ['business_activity',  'Business activity'],
    ['inheritance_gift',   'Inheritance / gift'],
    ['superannuation',     'Superannuation savings'],
    ['investments',        'Financial investments'],
    ['other',              'Other (please specify below)'],
  ];
  for (const [v, l] of opts) cbx(st, `${prefix}_wealth_${v}`, l, 0);
  fld(st, `${prefix}_wealth_other_detail`, 'If Other, please specify', CW * 0.7);
}

function personBlock(st: St, prefix: string, heading: string): void {
  subBar(st, heading);
  fld3(st, [
    [`${prefix}_title`,       'Title',         0.1],
    [`${prefix}_given_names`, 'Given Name(s)', 0.53],
    [`${prefix}_surname`,     'Surname',       0.37],
  ]);
  fld2(st, `${prefix}_dob`, 'Date of Birth (DD/MM/YYYY)', `${prefix}_email`, 'Email Address');
  addrBlock(st, `${prefix}_addr`, 'Residential Address (not a PO Box)');
  yesno(st, `${prefix}_pep`, 'Is this person a Politically Exposed Person (PEP)?');
  gap(st, 4);
}

function trusteeBlock(st: St, prefix: string, label: string): void {
  subBar(st, label);
  fld(st, `${prefix}_name`, 'Full Legal Name of Trustee');
  addrBlock(st, `${prefix}_addr`, 'Trustee Address');
  gap(st, 2);
}

function sigBlock(st: St, prefix: string, label: string): void {
  subBar(st, label);
  fld2(st, `${prefix}_name`, 'Full Name (print clearly)', `${prefix}_role`, 'Title / Role / Capacity');
  fld2(st, `${prefix}_date`, 'Date (DD/MM/YYYY)', `${prefix}_place`, 'Place of Signing');
  ensure(st, 65);
  // Signature area
  st.page.drawText('Signature:', { x: ML, y: st.y - 8, size: 7.5, font: st.f.r, color: SUBTLE });
  st.page.drawRectangle({ x: ML, y: st.y - 52, width: CW * 0.52, height: 44, borderColor: GOLD, borderWidth: 0.75, color: WHITE });
  st.page.drawText('Sign here (wet ink or electronic signature)', { x: ML + 6, y: st.y - 32, size: 7, font: st.f.r, color: BORDER });
  // Witness
  const wx = ML + CW * 0.56;
  st.page.drawText('Witness (not related to applicant):', { x: wx, y: st.y - 8, size: 7.5, font: st.f.r, color: SUBTLE });
  st.page.drawRectangle({ x: wx, y: st.y - 52, width: CW * 0.44, height: 44, borderColor: GOLD, borderWidth: 0.75, color: WHITE });
  st.page.drawText('Witness signature', { x: wx + 6, y: st.y - 32, size: 7, font: st.f.r, color: BORDER });
  st.y -= 56;
  fld2(st, `${prefix}_witness_name`, 'Witness Full Name (print)', `${prefix}_witness_addr`, 'Witness Address');
  fld2(st, `${prefix}_witness_date`, 'Witness Date (DD/MM/YYYY)', `${prefix}_witness_occ`, 'Witness Occupation');
  gap(st, 4);
}

// ─── Section builders ─────────────────────────────────────────────────────────

function buildDefinitions(st: St): void {
  secBar(st, '1', 'Definitions');
  gap(st, 4);
  body(st, 'In this Application Form, the following terms have the meanings set out below unless the context otherwise requires.', 0, false, 8.5);
  gap(st, 8);

  const defs: [string, string][] = [
    ['Active NFE', 'A Non-Financial Entity (NFE) where, during the previous reporting period, less than 50% of its gross income was passive income and less than 50% of assets held produced passive income. Includes entities whose securities are regularly traded on an established securities market, or entities that are government entities, international organisations, central banks or their wholly-owned subsidiaries.'],
    ['Administrator', 'Grey Alpha LLC of 640 South Broadway Suite 40, Los Angeles, CA 90014, appointed as administrator to the Fund.'],
    ['AFSL', 'Australian financial services licence issued by ASIC under the Corporations Act 2001 (Cth).'],
    ['AML/CTF Law', 'Anti-Money Laundering and Counter-Terrorism Financing Act 2006 (Cth), associated regulations and applicable rules as amended from time to time.'],
    ['Applicant', 'The party named and known as the investor in this Application Form, whose details are set out herein.'],
    ['ASIC', 'Australian Securities and Investments Commission.'],
    ['ATO', 'Australian Taxation Office.'],
    ['AUSTRAC', 'Australian Transaction Reports and Analysis Centre, the Australian Government agency responsible for AML/CTF regulation.'],
    ['Beneficial Owner', 'An individual who ultimately owns or controls an entity through direct or indirect ownership of more than 25% of the interests, or who otherwise controls the entity. Also includes a person on whose behalf a transaction or activity is being conducted.'],
    ['Corporations Act', 'Corporations Act 2001 (Cth), as amended or replaced from time to time.'],
    ['CRS', 'Common Reporting Standard issued by the OECD for the automatic exchange of financial account information between tax authorities, adopted in Australia via the Tax Laws Amendment (Implementation of the Common Reporting Standard) Act 2016 (Cth).'],
    ['FATCA', 'The United States Foreign Account Tax Compliance Act and the intergovernmental agreement between Australia and the United States signed on 28 April 2014, and related regulations.'],
    ['Financial Institution', 'A custodial institution, a depository institution, an investment entity or a specified insurance company, as defined under the FATCA regulations and the CRS.'],
    ['Fund', 'The Arkline Trust, an unregistered managed investment scheme established under and governed by the Trust Deed.'],
    ['GIIN', 'Global Intermediary Identification Number, being a number assigned by the US Internal Revenue Service (IRS) to Financial Institutions that have registered to comply with FATCA.'],
    ['Information Memorandum (IM)', 'The offering document for the Fund issued by the Investment Manager and dated 21 May 2026, as updated or supplemented from time to time. The IM contains important risk disclosures and should be read in full.'],
    ['Investment Manager', 'Arkline Trust or such other entity as is appointed investment manager to the Fund from time to time in accordance with the Trust Deed.'],
    ['NFE', 'Non-Financial Entity, being an entity that is not a Financial Institution under FATCA or CRS.'],
    ['Passive NFE', 'A Non-Financial Entity that is not an Active NFE. A passive NFE holds assets that produce passive income (e.g. dividends, interest, royalties, rents) constituting 50% or more of gross income.'],
    ['PEP', 'Politically Exposed Person, meaning an individual who holds or has held in the last 2 years a prominent public position or function in a government body or international organisation (within Australia or overseas), or their immediate family members and known close associates.'],
    ['Regulated Trust', 'A trust that is a registerable managed investment scheme, an SMSF, a trust registered with ASIC, a trust regulated by APRA, or a trust registered with the Australian Charities and Not-for-profits Commission.'],
    ['SMSF', 'Self-managed superannuation fund as defined under the Superannuation Industry (Supervision) Act 1993 (Cth).'],
    ['TIN', 'Tax Identification Number - a number or code used to uniquely identify an individual or entity for tax purposes in a specific jurisdiction.'],
    ['Trust Deed', 'The trust deed constituting and governing the Fund, as amended or restated from time to time.'],
    ['Units', 'A unit or interest in the Fund conferring a proportionate beneficial interest in the assets of the Fund.'],
    ['Wholesale Client', 'Has the meaning given in section 761G of the Corporations Act. In summary, a person who invests AUD $500,000 or more, or who is a professional investor, or who satisfies the sophisticated investor test as certified by a qualified accountant.'],
  ];

  const termW = CW * 0.21;
  const defW  = CW - termW - 4;

  for (let i = 0; i < defs.length; i++) {
    const [term, def] = defs[i];
    const tLines = wrap(term, termW - 6, st.f.b, 8);
    const dLines = wrap(def, defW - 6, st.f.r, 8);
    const rowH = Math.max(tLines.length, dLines.length) * 11 + 6;

    ensure(st, rowH + 2);

    st.page.drawRectangle({ x: ML, y: st.y - rowH, width: CW, height: rowH, color: i % 2 === 0 ? WHITE : CREAM });
    st.page.drawLine({ start: { x: ML, y: st.y - rowH }, end: { x: ML + CW, y: st.y - rowH }, thickness: 0.25, color: BORDER });
    st.page.drawLine({ start: { x: ML + termW, y: st.y }, end: { x: ML + termW, y: st.y - rowH }, thickness: 0.25, color: BORDER });

    for (let t = 0; t < tLines.length; t++) {
      st.page.drawText(tLines[t], { x: ML + 3, y: st.y - 9 - t * 11, size: 8, font: st.f.b, color: GREEN });
    }
    for (let d = 0; d < dLines.length; d++) {
      st.page.drawText(dLines[d], { x: ML + termW + 4, y: st.y - 9 - d * 11, size: 8, font: st.f.r, color: TEXT });
    }
    st.y -= rowH;
  }
  gap(st, 10);
}

function buildInvestment(st: St): void {
  secBar(st, '2', 'Investment Details');
  gap(st, 4);
  body(st, 'Select the class or classes of Units you wish to invest in. You must select at least one class. Provide the AUD dollar amount of committed capital for each selected class.');
  gap(st, 8);

  const classes: [string, string, string][] = [
    ['a', 'Class A', 'Opportunistic Strategy Portfolio'],
    ['b', 'Class B', 'Quant Value Portfolio'],
    ['c', 'Class C', 'High Conviction Portfolio'],
  ];

  for (const [k, cls, desc] of classes) {
    ensure(st, 24);
    const bx = ML + 2;
    const by = st.y - 14;
    st.page.drawRectangle({ x: bx, y: by, width: 12, height: 12, borderColor: GOLD, borderWidth: 0.75, color: WHITE });
    const cb = st.form.createCheckBox(`invest_${k}`);
    cb.addToPage(st.page, { x: bx, y: by, width: 12, height: 12, borderWidth: 0.5, borderColor: GOLD, backgroundColor: WHITE });
    st.page.drawText(`${cls}`, { x: bx + 18, y: by + 2, size: 9, font: st.f.b, color: GREEN });
    st.page.drawText(`- ${desc}`, { x: bx + 18 + 42, y: by + 2, size: 8.5, font: st.f.r, color: TEXT });

    const ax = ML + CW - 185;
    st.page.drawText('Committed Capital AUD $', { x: ax, y: by + 2, size: 8, font: st.f.r, color: SUBTLE });
    st.page.drawLine({ start: { x: ax + 116, y: by + 1 }, end: { x: ax + 185, y: by + 1 }, thickness: 0.5, color: GOLD });
    const amt = st.form.createTextField(`amount_${k}`);
    amt.addToPage(st.page, { x: ax + 116, y: by, width: 69, height: 13, borderWidth: 0, backgroundColor: WHITE });
    st.y -= 22;
    gap(st, 2);
  }

  gap(st, 4);
  body(st, '* Minimum initial investment is AUD $500,000 per class. At least one class must be selected for this application to be processed.', 0, false, 8, GOLD);
  gap(st, 8);
}

function buildContact(st: St): void {
  secBar(st, '3', 'Contact Details');
  gap(st, 4);
  body(st, 'Provide the contact details of the primary person submitting this application. These details will be used for all correspondence.');
  gap(st, 8);

  fld3(st, [
    ['contact_title',       'Title',         0.12],
    ['contact_given_names', 'Given Name(s)', 0.53],
    ['contact_surname',     'Surname',       0.35],
  ]);
  fld2(st, 'contact_phone', 'Phone Number (include country code)', 'contact_email', 'Email Address');
  addrBlock(st, 'postal', 'Postal Address');
  gap(st, 8);
}

function buildInvestorType(st: St): void {
  secBar(st, '4', 'Investor Type');
  gap(st, 4);
  body(st, 'Select the ONE investor type that applies. Complete ONLY the section(s) corresponding to your investor type - leave all others blank.');
  gap(st, 8);

  const types: [string, string][] = [
    ['individual',                         'Individual / Joint Holding'],
    ['aus_proprietary_company',            'Australian Proprietary Company'],
    ['aus_public_company',                 'Australian Public Company'],
    ['regulated_trust_individual_trustee', 'Regulated Trust - Individual Trustee(s) (e.g. SMSF with individual trustees)'],
    ['regulated_trust_corporate_trustee',  'Regulated Trust - Corporate Trustee (e.g. SMSF with corporate trustee)'],
    ['unregulated_trust_individual_trustee','Unregulated Trust - Individual Trustee(s) (e.g. Family Trust with individuals as trustees)'],
    ['unregulated_trust_corporate_trustee', 'Unregulated Trust - Corporate Trustee (e.g. Family Trust with a company as trustee)'],
  ];

  for (const [v, l] of types) { rad(st, 'investor_type', v, l); gap(st, 2); }
  gap(st, 8);
}

function buildSectionA(st: St): void {
  secBar(st, 'A', 'Individual Investor / Individual Trustee');
  gap(st, 4);
  body(st, 'Complete this section if you are an individual investor or an individual trustee of a trust. For joint applications, this section covers the Primary Investor - complete Section B for the second investor.');
  gap(st, 8);

  personBlock(st, 'a', 'Personal Details - Primary Individual');
  taxBlock(st, 'a');
  subBar(st, 'Sole Trader (if applicable)');
  yesno(st, 'a_sole_trader', 'Are you applying as a sole trader?');
  body(st, 'If YES, complete the following:', 0, false, 7.5, SUBTLE);
  gap(st, 2);
  fld2(st, 'a_business_name', 'Business / Trading Name', 'a_abn', 'ABN');
  addrBlock(st, 'a_business', 'Business Address');
  wealthBlock(st, 'a');
  gap(st, 8);
}

function buildSectionB(st: St): void {
  secBar(st, 'B', 'Joint Investor (complete only for joint applications)');
  gap(st, 4);
  body(st, 'Complete this section only if there is a second investor. The joint investor must be an individual - entities cannot hold jointly with individuals.');
  gap(st, 8);

  fld3(st, [
    ['b_title',       'Title',         0.12],
    ['b_given_names', 'Given Name(s)', 0.53],
    ['b_surname',     'Surname',       0.35],
  ]);
  fld2(st, 'b_dob', 'Date of Birth (DD/MM/YYYY)', 'b_email', 'Email Address');
  cbx(st, 'b_same_address', 'Residential address is the same as Investor A (Primary Investor)');
  gap(st, 2);
  body(st, 'If address differs from Investor A, complete below:', 0, false, 7.5, SUBTLE);
  gap(st, 2);
  addrBlock(st, 'b_addr', 'Residential Address');
  taxBlock(st, 'b');
  yesno(st, 'b_pep', 'Is the Joint Investor a Politically Exposed Person (PEP)?');
  gap(st, 4);
  wealthBlock(st, 'b');
  gap(st, 8);
}

function buildSectionC(st: St): void {
  secBar(st, 'C', 'Australian Company / Corporate Trustee');
  gap(st, 4);
  body(st, 'Complete this section if investing as an Australian company, or if you are a corporate trustee. If you are a corporate trustee, also complete Section D (Trust Details).');
  gap(st, 8);

  subBar(st, 'Company Details');
  fld(st, 'c_company_name', 'Full Company / Corporate Trustee Name (as registered with ASIC)');
  fld3(st, [
    ['c_abn_tfn', 'ABN / TFN / TFN Exemption', 0.32],
    ['c_acn',     'ACN',                        0.2],
    ['c_arbn',    'ARBN (if applicable)',        0.22],
    ['c_afsl',    'AFSL Number (if applicable)', 0.26],
  ]);

  subBar(st, 'Company Type');
  rad(st, 'c_company_type', 'proprietary', 'Proprietary Company (Pty Ltd)');
  rad(st, 'c_company_type', 'public',      'Public Company (Ltd)');
  gap(st, 4);

  addrBlock(st, 'c_registered', 'Registered Office Address');
  taxBlock(st, 'c');

  personBlock(st, 'c_dir1', 'Director 1');
  personBlock(st, 'c_dir2', 'Director 2 (if applicable)');

  wealthBlock(st, 'c');
  gap(st, 8);
}

function buildSectionD(st: St): void {
  secBar(st, 'D', 'Trust Details');
  gap(st, 4);
  body(st, 'Complete this section if investing via a trust (including an SMSF). Complete Section A or Section C (as applicable) for trustee details.');
  gap(st, 8);

  trusteeBlock(st, 'd_t1', 'Trustee 1');
  trusteeBlock(st, 'd_t2', 'Trustee 2 (if applicable)');
  trusteeBlock(st, 'd_t3', 'Trustee 3 (if applicable)');

  subBar(st, 'Trust Information');
  fld(st, 'd_trust_name', 'Full Name of Trust');
  fld(st, 'd_business_name', 'Business / Trading Name (if different from Trust Name)');
  fld2(st, 'd_abn_tfn', 'Trust ABN / TFN / TFN Exemption', 'd_settlor', 'Settlor of the Trust');
  fld2(st, 'd_trust_type', 'Type of Trust (e.g. Family Trust, SMSF, Unit Trust)', 'd_country_est', 'Country in which Trust was Established');

  subBar(st, 'Beneficiaries');
  yesno(st, 'd_beneficiary_by_class', 'Do the terms of the trust identify beneficiaries by reference to membership of a class?');
  body(st, 'If YES - describe the class (e.g. "all children of the settlor"):', 0, false, 7.5, SUBTLE);
  fld(st, 'd_beneficiary_class', 'Class of Beneficiaries', CW, true, 30);
  gap(st, 2);
  body(st, 'If NO - list the full names of all individual beneficiaries:', 0, false, 7.5, SUBTLE);
  gap(st, 2);
  for (let i = 1; i <= 4; i++) fld(st, `d_beneficiary_${i}`, `Beneficiary ${i} - Full Name`);

  taxBlock(st, 'd');
  wealthBlock(st, 'd');
  gap(st, 8);
}

function buildSectionE(st: St): void {
  secBar(st, 'E', 'Beneficial Ownership');
  gap(st, 4);
  body(st, 'Complete this section for each individual who, directly or indirectly, owns or controls 25% or more of the entity. For trusts, include any individual with significant influence or control. If none exist, write "None" in the name field.');
  gap(st, 8);

  for (let i = 1; i <= 2; i++) {
    const p = `e_bo${i}`;
    subBar(st, `Beneficial Owner ${i}`);
    body(st, 'Entity type of beneficial owner:', 0, false, 7.5, SUBTLE);
    rad(st, `${p}_type`, 'individual', 'Individual', 0);
    rad(st, `${p}_type`, 'corporate',  'Corporate entity', 0);
    rad(st, `${p}_type`, 'trust',      'Trust', 0);
    gap(st, 4);
    fld2(st, `${p}_name`, 'Full Name', `${p}_dob`, 'Date of Birth (DD/MM/YYYY)');
    addrBlock(st, `${p}_addr`, 'Residential / Registered Address');
    yesno(st, `${p}_pep`, 'Is this person a Politically Exposed Person (PEP)?');
    gap(st, 2);
    yesno(st, `${p}_aus_tax`, 'Australian tax resident?');
    fld2(st, `${p}_tin_country`, 'Foreign Country of Tax Residency (if applicable)', `${p}_tin`, 'TIN (if applicable)');
    gap(st, 4);
  }

  body(st, 'If there are more than two beneficial owners, attach a separate sheet with the same details as above.', 0, false, 8, SUBTLE);
  gap(st, 8);
}

function buildBank(st: St): void {
  secBar(st, '5', 'Bank Account Details');
  gap(st, 4);
  body(st, 'Provide the bank account into which distributions or redemption proceeds should be paid. This must be an account held in the name(s) of the Applicant(s).');
  gap(st, 8);

  subBar(st, 'Distribution Preference');
  yesno(st, 'bank_reinvest', 'Do you wish to reinvest your income distributions back into the Fund?');
  body(st, 'If NO, complete bank account details below:', 0, false, 7.5, SUBTLE);
  gap(st, 4);

  subBar(st, 'Account Details');
  fld(st, 'bank_institution', 'Name of Financial Institution');
  fld(st, 'bank_account_name', 'Account Name (must match investor name(s) exactly)');
  fld3(st, [
    ['bank_bsb',     'BSB Number',               0.22],
    ['bank_acc_num', 'Account Number',            0.33],
    ['bank_swift',   'SWIFT / BIC (international)', 0.45],
  ]);
  gap(st, 8);
}

function buildPayment(st: St): void {
  secBar(st, '6', 'Payment Information');
  gap(st, 4);
  body(st, 'Transfer your investment amount by Electronic Funds Transfer (EFT) to the Fund account below. Use your full legal name or entity name as the payment reference.');
  gap(st, 10);

  ensure(st, 85);
  st.page.drawRectangle({ x: ML, y: st.y - 76, width: CW, height: 76, color: CREAM, borderColor: GOLD, borderWidth: 0.75 });
  st.page.drawRectangle({ x: ML, y: st.y - 20, width: CW, height: 20, color: GREEN });
  st.page.drawText('Fund Bank Account - EFT Payment Details', { x: ML + 8, y: st.y - 14, size: 8.5, font: st.f.b, color: CREAM });

  const rows: [string, string][] = [
    ['Bank:',           'National Australia Bank (NAB)'],
    ['Account Name:',   'Arkline Trust'],
    ['BSB:',            '083-000'],
    ['Account Number:', 'Provided upon application acceptance'],
    ['Reference:',      'Your full legal name / entity name'],
  ];
  let ry = st.y - 30;
  for (const [l, v] of rows) {
    st.page.drawText(l, { x: ML + 10, y: ry, size: 8.5, font: st.f.b, color: SUBTLE });
    st.page.drawText(v, { x: ML + 110, y: ry, size: 8.5, font: st.f.r, color: TEXT });
    ry -= 11;
  }
  st.y -= 84;
  gap(st, 6);
  body(st, 'IMPORTANT: Do not transfer funds until you receive written confirmation from the Investment Manager that your application has been accepted.', 0, true, 8, GOLD);
  gap(st, 8);
}

function buildFATCA(st: St): void {
  secBar(st, '7', 'FATCA and CRS Declarations');
  gap(st, 4);
  body(st, 'The following information is required under FATCA and the Common Reporting Standard (CRS). Complete all applicable fields. This section applies to all applicants.');
  gap(st, 8);

  subBar(st, 'FATCA - Entity Tax Status (entities only - leave blank if individual)');
  body(st, 'Select the FATCA classification that applies to the entity:', 0, false, 7.5, SUBTLE);
  gap(st, 2);
  rad(st, 'fatca_type', 'financial_institution', 'Financial Institution (provide GIIN below)');
  rad(st, 'fatca_type', 'aus_listed',            'Australian Public Listed Company / Majority-Owned Subsidiary / Registered Charity');
  rad(st, 'fatca_type', 'active_nfe',            'Active Non-Financial Entity (NFE)');
  rad(st, 'fatca_type', 'passive_nfe',           'Passive Non-Financial Entity (NFE)');
  rad(st, 'fatca_type', 'other',                 'Other entity not previously listed');
  gap(st, 4);
  fld(st, 'fatca_giin', 'Global Intermediary Identification Number (GIIN) - if Financial Institution', CW * 0.6);
  gap(st, 6);

  subBar(st, 'CRS - Foreign Tax Residency');
  yesno(st, 'crs_foreign_tax', 'Are you / is the entity a tax resident of any country other than Australia?');
  body(st, 'If YES, provide all countries of tax residency and corresponding TINs:', 0, false, 7.5, SUBTLE);
  gap(st, 4);
  for (let i = 1; i <= 3; i++) {
    fld2(st, `crs_country_${i}`, `Country ${i} of Tax Residency`, `crs_tin_${i}`, `TIN for Country ${i}`);
  }
  body(st, 'If you have more than three countries of tax residency, attach a separate sheet.', 0, false, 7.5, SUBTLE);
  gap(st, 8);
}

function buildDeclaration(st: St): void {
  secBar(st, '8', 'Declaration');
  gap(st, 4);
  body(st, 'By submitting this Application Form, I/we acknowledge and agree to each of the following declarations. Please mark each checkbox to confirm you have read and agreed to each point.', 0, false, 8.5);
  gap(st, 8);

  const decls = [
    'I/we have received and read the Information Memorandum (IM) dated 21 May 2026 and agree to be bound by its terms.',
    'All information and statements in this Application Form are true and correct. I/we will notify the Investment Manager immediately of any change.',
    'I/we am/are a Wholesale Client as defined in section 761G of the Corporations Act 2001 (Cth) and satisfy one or more wholesale client tests.',
    'I/we agree to be bound by the provisions of the Trust Deed as amended from time to time and acknowledge receipt of the Trust Deed or its summary.',
    'I/we have legal power to invest in the Fund and this application has been duly authorised by all necessary parties.',
    'I/we am/are acting in accordance with all designated powers and authorities under applicable law, and nothing prevents me/us from making this investment.',
    'I/we have all regulatory approvals required under the laws of Australia and any other relevant jurisdiction to enter into this investment.',
    'I/we acknowledge that by executing this form I/we make a legally binding commitment to invest the stated amount, subject to acceptance by the Investment Manager.',
    'I/we acknowledge that investments in the Fund are subject to risk, including possible loss of income and principal, and that past performance is not indicative of future performance.',
    'I/we have relied solely on my/our own independent investigation and professional advice in deciding to apply and have not relied on any representations outside the IM.',
    'I/we acknowledge that an investment in the Fund does not represent a deposit with any bank and is not guaranteed by any government or government agency.',
    'I/we consent to the collection and use of my/our personal information by the Investment Manager and its service providers for the purpose of managing my/our investment.',
    'I/we agree and consent to the electronic delivery of all Investor Communications, notices and reports relating to my/our investment.',
    'This application is not the result of any unsolicited meeting or telephone call, and I/we was/were not approached unsolicited in connection with this investment.',
  ];

  for (let i = 0; i < decls.length; i++) {
    const lines = wrap(`${i + 1}.   ${decls[i]}`, CW - 22, st.f.r, 8.5);
    const rowH = lines.length * 12 + 6;
    ensure(st, rowH + 4);

    const bx = ML + 2;
    const by = st.y - 14;
    st.page.drawRectangle({ x: bx, y: by, width: 12, height: 12, borderColor: GOLD, borderWidth: 0.75, color: WHITE });
    const cb = st.form.createCheckBox(`decl_${i + 1}`);
    cb.addToPage(st.page, { x: bx, y: by, width: 12, height: 12, borderWidth: 0.5, borderColor: GOLD, backgroundColor: WHITE });

    for (let l = 0; l < lines.length; l++) {
      st.page.drawText(lines[l], { x: ML + 18, y: st.y - 9 - l * 12, size: 8.5, font: st.f.r, color: TEXT });
    }
    st.y -= rowH;
    gap(st, 3);
  }

  gap(st, 8);
  hline(st);
  ensure(st, 30);
  const abx = ML + 2;
  const aby = st.y - 18;
  st.page.drawRectangle({ x: abx, y: aby, width: 14, height: 14, borderColor: GREEN, borderWidth: 1.2, color: WHITE });
  const cbAll = st.form.createCheckBox('declaration_agreed_all');
  cbAll.addToPage(st.page, { x: abx, y: aby, width: 14, height: 14, borderWidth: 1, borderColor: GREEN, backgroundColor: WHITE });
  st.page.drawText('I/We have read, understood and agree to ALL of the above declarations.', {
    x: abx + 20, y: aby + 3, size: 9, font: st.f.b, color: GREEN,
  });
  st.y -= 28;
  gap(st, 8);
}

function buildExecution(st: St): void {
  secBar(st, '9', 'Execution - Signatures');
  gap(st, 4);
  body(st, 'The Applicant(s) must sign this form. For companies, sign in accordance with section 127 of the Corporations Act or by an authorised signatory. For trusts, all trustees must sign. All signatures must be witnessed by a person not related to the applicant.');
  gap(st, 8);

  subBar(st, 'Signatory Authority');
  rad(st, 'multi_signatory', 'any_one',      'Any one signatory may operate the account');
  rad(st, 'multi_signatory', 'all_required', 'All signatories must act together');
  gap(st, 8);

  sigBlock(st, 'sig1', 'Signatory 1');
  sigBlock(st, 'sig2', 'Signatory 2 (required for joint applications and company applications with 2 directors)');

  gap(st, 8);
  hline(st);
  gap(st, 6);
  body(st, 'RETURN COMPLETED APPLICATION TO:', 0, true, 8, SUBTLE);
  gap(st, 4);
  body(st, 'Arkline Trust', 10, true, 9, GREEN);
  body(st, 'Email:    applications@arklinetrust.com', 10, false, 8.5);
  body(st, 'Website:  www.arklinetrust.com', 10, false, 8.5);
  gap(st, 8);
  body(st, 'If you have any questions about completing this Application Form, please contact the Investment Manager at the email or website above, or speak to your licensed financial adviser.', 0, false, 8, SUBTLE);
  gap(st, 10);

  // Footer strip
  ensure(st, 22);
  st.page.drawRectangle({ x: 0, y: MB - 12, width: PW, height: 18, color: GREEN });
  st.page.drawText('Arkline Trust  |  ABN / AFSL: To Be Confirmed  |  Investor Application Form 2026.1  |  Confidential - Wholesale Investors Only', {
    x: ML, y: MB - 7, size: 6.5, font: st.f.r, color: CREAM, characterSpacing: 0.2,
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function generate(): Promise<void> {
  const doc = await PDFDocument.create();
  doc.setTitle('Arkline Trust - Investor Application Form 2026');
  doc.setAuthor('Arkline Trust');
  doc.setSubject('Wholesale Investor Application Form');
  doc.setKeywords(['Arkline', 'Trust', 'Investment', 'Application', 'Wholesale', 'Australia']);

  const form = doc.getForm();
  const r = await doc.embedFont(StandardFonts.Helvetica);
  const b = await doc.embedFont(StandardFonts.HelveticaBold);
  const f: Fonts = { r, b };

  const firstPage = doc.addPage([PW, PH]);
  coverHeader(firstPage, f);

  const st: St = { doc, form, f, page: firstPage, y: PH - 80, n: 1 };

  buildDefinitions(st);
  buildInvestment(st);
  buildContact(st);
  buildInvestorType(st);
  buildSectionA(st);
  buildSectionB(st);
  buildSectionC(st);
  buildSectionD(st);
  buildSectionE(st);
  buildBank(st);
  buildPayment(st);
  buildFATCA(st);
  buildDeclaration(st);
  buildExecution(st);

  const bytes = await doc.save();
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, bytes);
  console.log(`Generated: ${OUTPUT}  (${Math.round(bytes.length / 1024)} KB, ${st.n} pages)`);
}

generate().catch((err) => { console.error(err); process.exit(1); });
