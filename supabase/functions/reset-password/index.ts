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

    const { email } = await req.json()

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const trimmedEmail = email.trim().toLowerCase()

    // Find user by email
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      console.error('Error listing users:', listError)
      return new Response(JSON.stringify({ error: 'Failed to process request' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const user = users.find(u => u.email?.toLowerCase() === trimmedEmail)

    if (!user) {
      // Return success even if user not found to prevent email enumeration
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'If an account exists with this email, the password has been reset.' 
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Reset password to default
    const defaultPassword = 'pool123'
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: defaultPassword,
    })

    if (updateError) {
      console.error('Error resetting password:', updateError)
      return new Response(JSON.stringify({ error: 'Failed to reset password' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Set must_change_password flag
    await supabaseAdmin
      .from('profiles')
      .update({ must_change_password: true, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)

    // Send email notification via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (resendApiKey) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'RCMRD Pool <onboarding@resend.dev>',
            to: [trimmedEmail],
            subject: 'Your Password Has Been Reset - RCMRD Pool',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1a365d;">Password Reset - RCMRD Aquatic Facility</h2>
                <p>Hello,</p>
                <p>Your password has been reset to the default password:</p>
                <div style="background-color: #f0f4f8; padding: 16px; border-radius: 8px; text-align: center; margin: 20px 0;">
                  <strong style="font-size: 24px; color: #2d3748; letter-spacing: 2px;">pool123</strong>
                </div>
                <p>Please log in and change your password immediately for security purposes.</p>
                <p style="color: #718096; font-size: 14px;">If you did not request this reset, please contact the administration immediately.</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="color: #a0aec0; font-size: 12px;">RCMRD Aquatic Facility Management System</p>
              </div>
            `,
          }),
        })
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError)
        // Don't fail the request if email fails
      }
    } else {
      console.warn('RESEND_API_KEY not set, skipping email notification')
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'If an account exists with this email, the password has been reset and an email notification has been sent.' 
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
