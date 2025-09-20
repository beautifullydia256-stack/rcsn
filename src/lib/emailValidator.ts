import { supabase, supabaseAdmin } from './supabase';

/**
 * Checks if an email address is already in use by any user
 * @param email - The email address to check
 * @returns Promise<boolean> - true if email is available, false if already in use
 */
export async function isEmailAvailable(email: string): Promise<boolean> {
  try {
    // Check in our users table (this works for both client and server)
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('user_id, email')
      .eq('email', email)
      .single();

    // If no user record found, email is available
    if (userError && userError.message.includes('No rows found')) {
      return true;
    }

    // If user record exists, check if it's orphaned (no corresponding auth user)
    if (userRecord && !userError) {
      // For now, we'll assume the email is not available if a user record exists
      // The server-side APIs will handle orphaned record cleanup
      return false;
    }

    return true; // Email is available
  } catch (error) {
    console.error('Error checking email availability:', error);
    return false; // Assume not available if there's an error
  }
}

/**
 * Validates email format
 * @param email - The email address to validate
 * @returns boolean - true if email format is valid
 */
export function isValidEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Comprehensive email validation
 * @param email - The email address to validate
 * @returns Promise<{isValid: boolean, error?: string}>
 */
export async function validateEmail(email: string): Promise<{isValid: boolean, error?: string}> {
  // Check format
  if (!isValidEmailFormat(email)) {
    return {
      isValid: false,
      error: 'Please enter a valid email address'
    };
  }

  // Check availability
  const isAvailable = await isEmailAvailable(email);
  if (!isAvailable) {
    return {
      isValid: false,
      error: 'This email address is already in use. Please use a different email address.'
    };
  }

  return {
    isValid: true
  };
}

/**
 * Gets all existing emails in the system (for admin reference)
 * @returns Promise<string[]> - Array of existing email addresses
 */
export async function getAllExistingEmails(): Promise<string[]> {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('email')
      .not('email', 'is', null);

    if (error) {
      console.error('Error fetching existing emails:', error);
      return [];
    }

    return users?.map(user => user.email) || [];
  } catch (error) {
    console.error('Error in getAllExistingEmails:', error);
    return [];
  }
}
