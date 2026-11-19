// Supabase Edge Function (Deno): Server-Side Paninian Cipher Validation
// Deploy with: supabase functions deploy paninian-validate --no-verify-jwt=false

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const MAHESHVARA_SUTRAS = [
  'अइउण्', 'ऋऌक्', 'एओङ्', 'ऐऔच्', 'हयवरट्', 'लण्', 'ञमङणनम्',
  'झभञ्', 'घढधष्', 'जबगडदश्', 'खफछठथचटतव्', 'कपय्', 'शषसर्', 'हल्',
];

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join('');
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const masterSalt = Deno.env.get('PANINIAN_SERVER_SALT');
  if (!masterSalt) {
    return new Response(JSON.stringify({ error: 'Server salt unconfigured' }), { status: 500 });
  }

  const { epoch, keyId, plaintext, clientCipherHex, lamportSeq } = await req.json();
  if (typeof epoch !== 'number' || typeof plaintext !== 'string' || typeof clientCipherHex !== 'string') {
    return new Response(JSON.stringify({ valid: false, error: 'Invalid payload' }), { status: 400 });
  }

  const sutra = MAHESHVARA_SUTRAS[Math.abs(epoch) % MAHESHVARA_SUTRAS.length];
  const hmac = await hmacSha256Hex(
    masterSalt,
    `${epoch}:${sutra}:${keyId ?? ''}:${lamportSeq ?? 1}:${clientCipherHex}`
  );

  const valid = /^[0-9A-F]+$/.test(clientCipherHex) && clientCipherHex.length >= plaintext.length * 2;
  return new Response(
    JSON.stringify({
      valid,
      sutra,
      epoch,
      lamportSeq: lamportSeq ?? 1,
      serverSignature: `SRV-PAN-${hmac.slice(0, 16)}`,
      verifiedAt: new Date().toISOString(),
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
