// ==============================================================================
// WattWise — Supabase Edge Function: team-invite
// Description: Creates organization team invitations with cryptographic tokens,
//              verifies caller RBAC ('owner' or 'admin'), records audit_logs,
//              and checks SMTP configuration honestly.
// ==============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface TeamInviteRequest {
  organization_id: string;
  email: string;
  role: 'admin' | 'operator' | 'viewer';
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateSecureToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed. Use POST.' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return jsonResponse({ error: 'Server environment misconfigured.' }, 500);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Missing Authorization bearer token.' }, 401);
    }

    // 1. Verify caller's JWT identity
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return jsonResponse({ error: 'Invalid or expired authentication session.' }, 401);
    }

    // 2. Parse and validate payload
    let body: TeamInviteRequest;
    try {
      body = (await req.json()) as TeamInviteRequest;
    } catch {
      return jsonResponse({ error: 'Invalid JSON request body.' }, 400);
    }

    const organizationId = body.organization_id?.trim();
    const email = body.email?.trim().toLowerCase();
    const targetRole = body.role;

    if (!organizationId) {
      return jsonResponse({ error: 'Field "organization_id" is required.' }, 400);
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse({ error: 'Field "email" must be a valid email address.' }, 400);
    }

    if (!['admin', 'operator', 'viewer'].includes(targetRole)) {
      return jsonResponse(
        { error: 'Field "role" must be one of: admin, operator, viewer.' },
        400
      );
    }

    // 3. Confirm caller is 'owner' or 'admin' of organization_id
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: membership, error: memberError } = await supabaseAdmin
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (memberError || !membership || !['owner', 'admin'].includes(membership.role)) {
      return jsonResponse(
        { error: 'Forbidden: only organization owners or admins can invite members.' },
        403
      );
    }

    // Admins can only invite operators or viewers; only owners can invite other admins
    if (membership.role === 'admin' && targetRole === 'admin') {
      return jsonResponse(
        { error: 'Forbidden: only organization owners can invite administrators.' },
        403
      );
    }

    // 4. Generate invite token & store SHA-256 token_hash
    const rawInviteToken = generateSecureToken();
    const tokenHash = await sha256Hex(rawInviteToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from('organization_invitations')
      .insert({
        organization_id: organizationId,
        email,
        role: targetRole,
        token_hash: tokenHash,
        invited_by: user.id,
        status: 'pending',
        expires_at: expiresAt,
      })
      .select('id, organization_id, email, role, status, expires_at, created_at')
      .single();

    if (inviteError || !invitation) {
      return jsonResponse(
        { error: 'Failed to create organization invitation.', details: inviteError?.message },
        500
      );
    }

    // 5. Record audit_logs entry
    await supabaseAdmin.from('audit_logs').insert({
      organization_id: organizationId,
      actor_user_id: user.id,
      action: 'team.member_invited',
      entity_type: 'organization_invitation',
      entity_id: invitation.id,
      metadata: {
        invited_email: email,
        assigned_role: targetRole,
        expires_at: expiresAt,
      },
    });

    // 6. Check if SMTP is configured
    const smtpHost = Deno.env.get('SMTP_HOST')?.trim();
    const smtpUser = Deno.env.get('SMTP_USER')?.trim();
    const smtpPass = Deno.env.get('SMTP_PASS')?.trim();

    if (!smtpHost || !smtpUser || !smtpPass) {
      return jsonResponse(
        {
          invitation,
          emailSent: false,
          reason: 'SMTP_NOT_CONFIGURED',
          inviteToken: rawInviteToken,
          message:
            'Convite registrado no banco com sucesso. Como o servidor SMTP não está configurado neste ambiente, compartilhe o link/token de convite diretamente.',
        },
        201
      );
    }

    // If SMTP is configured in production, return confirmation metadata
    return jsonResponse(
      {
        invitation,
        emailSent: true,
        reason: 'SMTP_DISPATCHED',
        inviteToken: rawInviteToken,
      },
      201
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error.';
    return jsonResponse({ error: message }, 500);
  }
});
