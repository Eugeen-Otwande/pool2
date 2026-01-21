import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface GatePassEmailRequest {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  dateOfVisit: string;
  timeOfVisit: string;
  numGuests: number;
  bookingReference: string;
  pdfBase64: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      email,
      firstName,
      lastName,
      phone,
      dateOfVisit,
      timeOfVisit,
      numGuests,
      bookingReference,
      pdfBase64,
    }: GatePassEmailRequest = await req.json();

    console.log("Sending gate pass email to:", email);

    const formattedDate = new Date(dateOfVisit).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const emailResponse = await resend.emails.send({
      from: "RCMRD Aquatic Center <onboarding@resend.dev>",
      to: [email],
      subject: `Your Gate Pass - RCMRD Swimming Pool Booking Confirmed (${bookingReference})`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f7fa;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🏊 RCMRD Aquatic Center</h1>
              <p style="color: #bfdbfe; margin: 10px 0 0 0;">Swimming Pool Gate Pass</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <div style="text-align: center; margin-bottom: 25px;">
                <span style="background: #10b981; color: white; padding: 8px 20px; border-radius: 20px; font-weight: bold;">
                  ✓ BOOKING CONFIRMED
                </span>
              </div>
              
              <h2 style="color: #1e40af; margin: 0 0 20px 0;">Hello ${firstName}!</h2>
              
              <p style="color: #4b5563; line-height: 1.6;">
                Your swimming pool visit has been confirmed. Please find your gate pass attached to this email. 
                Present this pass at the entrance for verification.
              </p>
              
              <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <h3 style="color: #1e40af; margin: 0 0 15px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">
                  📋 Booking Details
                </h3>
                <table style="width: 100%; color: #4b5563;">
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Reference:</td>
                    <td style="padding: 8px 0; color: #1e40af; font-family: monospace; font-size: 14px;">${bookingReference}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Name:</td>
                    <td style="padding: 8px 0;">${firstName} ${lastName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Date:</td>
                    <td style="padding: 8px 0;">${formattedDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Time:</td>
                    <td style="padding: 8px 0;">${timeOfVisit}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Guests:</td>
                    <td style="padding: 8px 0;">${numGuests} ${numGuests === 1 ? 'person' : 'people'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Phone:</td>
                    <td style="padding: 8px 0;">${phone}</td>
                  </tr>
                </table>
              </div>
              
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  <strong>📌 Important:</strong> Please arrive 10 minutes before your scheduled time. 
                  Bring a valid ID for verification along with this gate pass.
                </p>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 30px;">
                If you have any questions, please contact us at the RCMRD Aquatic Center.
              </p>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
              <p>© ${new Date().getFullYear()} RCMRD Aquatic Center. All rights reserved.</p>
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: `RCMRD-Gate-Pass-${bookingReference}.pdf`,
          content: pdfBase64,
        },
      ],
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error sending gate pass email:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
