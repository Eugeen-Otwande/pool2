import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Verify the caller is admin or staff
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data: { user: caller }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check caller role
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', caller.id)
      .single()

    if (!callerProfile || !['admin', 'staff', 'system_admin', 'pool_admin'].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { email, first_name, last_name, role, phone, emergency_contact, emergency_phone } = await req.json()

    if (!email || !role) {
      return new Response(JSON.stringify({ error: 'Email and role are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create auth user with default password
    const defaultPassword = 'pool123'
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: defaultPassword,
      email_confirm: true,
      user_metadata: {
        first_name,
        last_name,
        role,
      }
    })

    if (createError) {
      console.error('Error creating user:', createError)
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Create profile with active status, staff-created origin
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        user_id: newUser.user.id,
        email,
        first_name,
        last_name,
        role,
        status: 'active',
        phone,
        emergency_contact,
        emergency_phone,
        account_origin: callerProfile.role === 'admin' ? 'admin_created' : 'staff_created',
        created_by: caller.id,
        must_change_password: true,
      }, { onConflict: 'user_id' })

    if (profileError) {
      console.error('Error creating profile:', profileError)
    }

    // Create user_roles entry
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .upsert({
        user_id: newUser.user.id,
        role,
      }, { onConflict: 'user_id,role' })

    if (roleError) {
      console.error('Error creating role:', roleError)
    }

    // If role is resident, also insert into residents table
    if (role === 'resident') {
      const fullName = [first_name, last_name].filter(Boolean).join(' ') || email
      const { error: residentError } = await supabaseAdmin
        .from('residents')
        .upsert({
          user_id: newUser.user.id,
          name: fullName,
          full_name: fullName,
          email,
          phone: phone || null,
          status: 'active',
          created_by: caller.id,
        }, { onConflict: 'user_id' })

      if (residentError) {
        console.error('Error creating resident entry:', residentError)
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Account created for ${email} with default password. User will be prompted to change password on first login.`,
      user_id: newUser.user.id
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
