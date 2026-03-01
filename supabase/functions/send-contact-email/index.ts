import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const { name, email, phone, company, industry, service, budget, timeline, message } = await req.json();

    const htmlTable = `
      <h2 style="color:#333;font-family:sans-serif;">New Contact Form Submission</h2>
      <table style="border-collapse:collapse;width:100%;max-width:600px;font-family:sans-serif;">
        <tr style="background:#f4f4f4;"><td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Name</td><td style="padding:10px;border:1px solid #ddd;">${name}</td></tr>
        <tr><td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Email</td><td style="padding:10px;border:1px solid #ddd;">${email}</td></tr>
        <tr style="background:#f4f4f4;"><td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Phone</td><td style="padding:10px;border:1px solid #ddd;">${phone || 'N/A'}</td></tr>
        <tr><td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Company</td><td style="padding:10px;border:1px solid #ddd;">${company}</td></tr>
        <tr style="background:#f4f4f4;"><td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Industry</td><td style="padding:10px;border:1px solid #ddd;">${industry || 'N/A'}</td></tr>
        <tr><td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Service Interest</td><td style="padding:10px;border:1px solid #ddd;">${service || 'N/A'}</td></tr>
        <tr style="background:#f4f4f4;"><td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Budget</td><td style="padding:10px;border:1px solid #ddd;">${budget || 'N/A'}</td></tr>
        <tr><td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Timeline</td><td style="padding:10px;border:1px solid #ddd;">${timeline || 'N/A'}</td></tr>
        <tr style="background:#f4f4f4;"><td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Message</td><td style="padding:10px;border:1px solid #ddd;">${message}</td></tr>
      </table>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Ziiro Contact Form <onboarding@resend.dev>',
        to: ['aniket@ziiro.work', 'govind@ziiro.work'],
        subject: `New Contact: ${name} from ${company}`,
        html: htmlTable,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Resend API error: ${JSON.stringify(data)}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Email send error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
