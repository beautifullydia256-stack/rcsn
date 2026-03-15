import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Email sending function (using a service like SendGrid, Mailgun, or AWS SES)
async function sendEmail(to: string, subject: string, body: string) {
  try {
    // For now, this is a placeholder
    // In production, you would integrate with an email service:
    
    // Example with SendGrid:
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // await sgMail.send({ to, from: 'noreply@yourschool.com', subject, html: body });
    
    // Example with Nodemailer:
    // const transporter = nodemailer.createTransport({ ... });
    // await transporter.sendMail({ from: 'noreply@yourschool.com', to, subject, html: body });
    
    console.log(`[EMAIL] Sending to ${to}: ${subject}`);
    console.log(`Body: ${body.substring(0, 100)}...`);
    
    // Simulate successful send for now
    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: String(error) };
  }
}

import { sendAfricaTalkingSMS } from '@/lib/africastalking';

async function sendSMS(to: string, message: string) {
  const result = await sendAfricaTalkingSMS(to, message);
  if (!result.success) console.warn('[SMS]', result.error);
  return result;
}

// WhatsApp sending function (using Twilio WhatsApp API)
async function sendWhatsApp(to: string, message: string) {
  try {
    // For now, this is a placeholder
    // In production, you would integrate with WhatsApp Business API:
    
    // Example with Twilio WhatsApp:
    // const twilio = require('twilio');
    // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    // await client.messages.create({
    //   body: message,
    //   from: 'whatsapp:' + process.env.TWILIO_WHATSAPP_NUMBER,
    //   to: 'whatsapp:' + to
    // });
    
    console.log(`[WhatsApp] Sending to ${to}: ${message.substring(0, 100)}...`);
    
    // Simulate successful send for now
    return { success: true };
  } catch (error) {
    console.error('WhatsApp send error:', error);
    return { success: false, error: String(error) };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get pending notifications
    const { data: pendingNotifications, error } = await supabaseAdmin
      .from('notification_logs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(100); // Process 100 at a time

    if (error) throw error;

    if (!pendingNotifications || pendingNotifications.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No pending notifications',
        processed: 0 
      });
    }

    let successCount = 0;
    let failCount = 0;

    // Process each notification
    for (const notif of pendingNotifications) {
      let result;
      
      try {
        if (notif.notification_type === 'email') {
          result = await sendEmail(notif.recipient, notif.subject || 'School Notification', notif.message);
        } else if (notif.notification_type === 'sms') {
          result = await sendSMS(notif.recipient, notif.message);
        } else if (notif.notification_type === 'whatsapp') {
          result = await sendWhatsApp(notif.recipient, notif.message);
        }

        // Update notification log status
        if (result?.success) {
          await supabaseAdmin
            .from('notification_logs')
            .update({ 
              status: 'sent', 
              sent_at: new Date().toISOString() 
            })
            .eq('log_id', notif.log_id);
          successCount++;
        } else {
          await supabaseAdmin
            .from('notification_logs')
            .update({ 
              status: 'failed', 
              error_message: result?.error || 'Unknown error' 
            })
            .eq('log_id', notif.log_id);
          failCount++;
        }
      } catch (err) {
        await supabaseAdmin
          .from('notification_logs')
          .update({ 
            status: 'failed', 
            error_message: String(err) 
          })
          .eq('log_id', notif.log_id);
        failCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      processed: pendingNotifications.length,
      sent: successCount,
      failed: failCount
    });
  } catch (error) {
    console.error('Notification processing error:', error);
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 });
  }
}

// GET endpoint to check notification stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id');

    let query = supabaseAdmin
      .from('notification_logs')
      .select('status, notification_type, category', { count: 'exact' });

    if (schoolId) {
      query = query.eq('school_id', schoolId);
    }

    const { data, count, error } = await query;

    if (error) throw error;

    // Group by status
    const stats = {
      total: count || 0,
      pending: data?.filter(n => n.status === 'pending').length || 0,
      sent: data?.filter(n => n.status === 'sent').length || 0,
      failed: data?.filter(n => n.status === 'failed').length || 0,
      byType: {
        email: data?.filter(n => n.notification_type === 'email').length || 0,
        sms: data?.filter(n => n.notification_type === 'sms').length || 0,
        whatsapp: data?.filter(n => n.notification_type === 'whatsapp').length || 0,
      },
      byCategory: {
        academic: data?.filter(n => n.category === 'academic').length || 0,
        attendance: data?.filter(n => n.category === 'attendance').length || 0,
        financial: data?.filter(n => n.category === 'financial').length || 0,
        behavior: data?.filter(n => n.category === 'behavior').length || 0,
        announcement: data?.filter(n => n.category === 'announcement').length || 0,
        event: data?.filter(n => n.category === 'event').length || 0,
      }
    };

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error('Stats fetch error:', error);
    return NextResponse.json({ 
      success: false, 
      error: String(error) 
    }, { status: 500 });
  }
}
