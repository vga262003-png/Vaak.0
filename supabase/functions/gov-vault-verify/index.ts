// Supabase Edge Function (Deno): Dual-Key /gov-vault Master Verification
// Keeps FOUNDER_AUTH_KEY and GOV_OFFICER_CODE strictly inside server environment secrets

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) {
    diff |= ab[i] ^ bb[i];
  }
  return diff === 0;
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const founderSecret = Deno.env.get('FOUNDER_AUTH_KEY') ?? '';
  const govSecret = Deno.env.get('GOV_OFFICER_CODE') ?? '';
  if (!founderSecret || !govSecret) {
    return new Response(JSON.stringify({ authorized: false, error: 'Secrets unconfigured' }), { status: 500 });
  }

  const { founderKey, govOfficerCode } = await req.json();
  if (typeof founderKey !== 'string' || typeof govOfficerCode !== 'string') {
    return new Response(JSON.stringify({ authorized: false, error: 'Dual-key credentials required' }), { status: 400 });
  }

  const founderOk = timingSafeEqual(founderKey.trim(), founderSecret);
  const govOk = timingSafeEqual(govOfficerCode.trim(), govSecret);

  if (!founderOk || !govOk) {
    return new Response(
      JSON.stringify({ authorized: false, error: 'Dual-key authorization rejected' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      authorized: true,
      founderAccountId: 'FOUNDER-ROOT-001',
      rlsEnforced: true,
      verifiedAt: new Date().toISOString(),
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
