const SIGNING_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/application-signing`;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function post(action: string, body: Record<string, unknown>) {
  let res: Response;
  try {
    res = await fetch(SIGNING_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON}`, apikey: ANON },
      body: JSON.stringify({ action, ...body }),
    });
  } catch {
    throw new Error('We could not connect. Please check your internet connection and try again.');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => null) as { error?: string } | null;
    throw new Error(err?.error || 'Something went wrong. Please try again.');
  }
  return res;
}

export async function signingCall<T = Record<string, unknown>>(action: string, body: Record<string, unknown>): Promise<T> {
  return await (await post(action, body)).json() as T;
}

export async function downloadSigningPdf(action: string, body: Record<string, unknown>, filename: string) {
  const blob = await (await post(action, body)).blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function fileToBase64(file: File) {
  const buf = new Uint8Array(await file.arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}

export interface SignerSummary {
  role: 'signer_1' | 'signer_2' | 'witness_1' | 'witness_2';
  name: string;
  email: string;
  email_verified_at: string | null;
  signed_at: string | null;
}

export const ROLE_NAMES: Record<SignerSummary['role'], string> = {
  signer_1: 'Signatory 1', signer_2: 'Signatory 2', witness_1: 'Witness to signatory 1', witness_2: 'Witness to signatory 2',
};
