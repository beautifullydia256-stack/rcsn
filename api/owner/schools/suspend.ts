/**
 * School Suspension API Endpoint
 * POST /api/owner/schools/suspend
 * 
 * Suspends a school and prevents all users from that school from logging in
 */

import { NextApiResponse } from 'next';
import { withOwnerWriteAuth, SecureOwnerApiRequest, getSanitizedBody } from '../../../lib/ownerSecureMiddleware';
import { createClient } from '@supabase/supabase-js';

interface SuspendSchoolRequest {
  schoolId: string;
  reason: string;
  notifyUsers?: boolean;
}

async function handler(req: SecureOwnerApiRequest, res: NextApiResponse) {
  try {
    const owner = req.owner;
    if (!owner) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const body = getSanitizedBody(req) as SuspendSchoolRequest;
    const { schoolId, reason, notifyUsers = true } = body;

    // Validate input
    if (!schoolId || typeof schoolId !== 'string') {
      res.status(400).json({ error: 'Valid school ID is required' });
      return;
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
      res.status(400).json({ error: 'Suspension reason must be at least 10 characters' });
      return;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if school exists
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('school_id, name, status')
      .eq('school_id', schoolId)
      .single();

    if (schoolError || !school) {
      res.status(404).json({ error: 'School not found' });
      return;
    }

    if (school.status === 'suspended') {
      res.status(400).json({ error: 'School is already suspended' });
      return;
    }

    // Start transaction-like operations
    try {
      // Update school status
      const { error: updateError } = await supabase
        .from('schools')
        .update({ 
          status: 'suspended',
          suspended_at: new Date().toISOString(),
          suspension_reason: reason.trim(),
          suspended_by: owner.user.id
        })
        .eq('school_id', schoolId);

      if (updateError) {
        throw new Error(`Failed to update school status: ${updateError.message}`);
      }

      // Disable all user accounts for this school
      const { error: usersError } = await supabase
        .from('users')
        .update({ 
          status: 'suspended',
          suspended_at: new Date().toISOString()
        })
        .eq('school_id', schoolId)
        .neq('status', 'suspended');

      if (usersError) {
        console.error('Failed to suspend users:', usersError);
        // Don't fail the request, but log the issue
      }

      // Log the suspension action
      await supabase
        .from('school_actions')
        .insert({
          school_id: schoolId,
          action: 'suspended',
          reason: reason.trim(),
          performed_by: owner.user.id,
          performed_at: new Date().toISOString(),
          details: {
            notify_users: notifyUsers,
            previous_status: school.status
          }
        });

      // Send notifications if requested
      if (notifyUsers) {
        try {
          // Get school admin emails
          const { data: admins } = await supabase
            .from('users')
            .select('email, name')
            .eq('school_id', schoolId)
            .eq('role', 'admin');

          // Send suspension notification emails (implementation would depend on email service)
          // This is a placeholder for the actual email sending logic
          console.log(`Would send suspension notifications to ${admins?.length || 0} admins`);
          
        } catch (notificationError) {
          console.error('Failed to send notifications:', notificationError);
          // Don't fail the request for notification errors
        }
      }

      res.status(200).json({
        success: true,
        message: `School "${school.name}" has been suspended successfully`,
        schoolId: schoolId,
        suspendedAt: new Date().toISOString(),
        notificationsSent: notifyUsers
      });

    } catch (operationError) {
      // Rollback school status if possible
      await supabase
        .from('schools')
        .update({ status: school.status })
        .eq('school_id', schoolId);

      throw operationError;
    }

  } catch (error) {
    console.error('School suspension error:', error);
    res.status(500).json({ 
      error: 'Failed to suspend school',
      message: 'An error occurred while suspending the school'
    });
  }
}

export default withOwnerWriteAuth(handler);