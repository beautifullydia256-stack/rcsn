import { supabase } from './supabase';
import { markChatPresenceOffline } from './schoolChatApi';

export interface StudentProfileValidationResult {
  isValid: boolean;
  shouldLogout: boolean;
  reason?: string;
  studentData?: any;
}

/**
 * Validates if a student's profile still exists in the database
 * Returns validation result with logout recommendation if profile is deleted
 */
export async function validateStudentProfile(userId: string, userMetadata: any): Promise<StudentProfileValidationResult> {
  try {
    const studentId = userMetadata?.student_id;
    const admissionNumber = userMetadata?.admission_number;

    if (!studentId && !admissionNumber) {
      return {
        isValid: false,
        shouldLogout: true,
        reason: 'No student ID or admission number found in user metadata'
      };
    }

    // Check if student exists in the students table
    let studentQuery = supabase.from('students').select('*');
    
    if (studentId) {
      studentQuery = studentQuery.eq('student_id', studentId);
    } else if (admissionNumber) {
      studentQuery = studentQuery.eq('admission_number', admissionNumber);
    }

    const { data: studentData, error: studentError } = await studentQuery.single();

    if (studentError || !studentData) {
      return {
        isValid: false,
        shouldLogout: true,
        reason: 'Student profile not found in database - profile may have been deleted'
      };
    }

    if (studentData.deleted_at) {
      return {
        isValid: false,
        shouldLogout: true,
        reason: 'Student account has been archived — access denied',
      };
    }

    if (studentData.discipline_deactivated_at) {
      return {
        isValid: false,
        shouldLogout: true,
        reason: 'Student account is deactivated — access denied',
      };
    }

    if (studentData.suspension_open) {
      return {
        isValid: false,
        shouldLogout: true,
        reason: 'Student account is suspended — access denied',
      };
    }

    // Check if student is still active (enrollment / legacy status)
    if (studentData.status !== 'active') {
      return {
        isValid: false,
        shouldLogout: true,
        reason: `Student profile is ${studentData.status} - access denied`
      };
    }

    // Skip users table check to avoid 406 errors
    // If we have valid student data, we allow access
    console.log('Student profile validated successfully - allowing access');

    return {
      isValid: true,
      shouldLogout: false,
      studentData: studentData
    };

  } catch (error) {
    console.error('Error validating student profile:', error);
    return {
      isValid: false,
      shouldLogout: true,
      reason: 'Error validating student profile'
    };
  }
}

/**
 * Forces logout of a user by invalidating their session
 */
export async function forceLogout(userId: string): Promise<boolean> {
  try {
    await markChatPresenceOffline();
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Error signing out user:', error);
      return false;
    }

    // Optionally, you could also delete the user's auth record
    // But this might be too aggressive - signing out is usually sufficient
    
    return true;
  } catch (error) {
    console.error('Error in forceLogout:', error);
    return false;
  }
}

/**
 * Hook to validate student profile on component mount and periodically
 */
export function useStudentProfileValidation() {
  const checkProfile = async (): Promise<StudentProfileValidationResult> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          isValid: false,
          shouldLogout: true,
          reason: 'No authenticated user found'
        };
      }

      return await validateStudentProfile(user.id, user.user_metadata);
    } catch (error) {
      console.error('Error in useStudentProfileValidation:', error);
      return {
        isValid: false,
        shouldLogout: true,
        reason: 'Error checking user authentication'
      };
    }
  };

  return { checkProfile };
}
