import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, tenant_id } = await req.json()
    
    // Check if requester is super admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing authorization header')
    const token = authHeader.replace('Bearer ', '')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    if (userError || !user) throw new Error('Unauthorized')
    
    const { data: profile } = await supabaseClient.from('user_profiles').select('is_super_admin').eq('id', user.id).single()
    if (!profile?.is_super_admin) throw new Error('Forbidden: Only super admins can invite tenant admins')

    // Use Service Role to invite
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Invite the user
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { tenant_id: tenant_id, role: 'coordenador_nacional' } // Store in auth metadata
    })
    
    if (inviteError) throw inviteError

    // Sometimes the trigger creates the profile before we can update it, so we force update the profile
    if (inviteData.user?.id) {
       await supabaseAdmin.from('user_profiles').update({ 
           tenant_id: tenant_id, 
           role: 'coordenador_nacional',
           can_register_users: true
       }).eq('id', inviteData.user.id)
    }

    return new Response(JSON.stringify({ success: true, message: 'Invite sent successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
