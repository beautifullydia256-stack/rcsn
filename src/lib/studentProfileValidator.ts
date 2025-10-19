import { supabase } from './supabase';

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

    // Check if student is still active
    if (studentData.status !== 'active') {
      return {
        isValid: false,
        shouldLogout: true,
        reason: `Student profile is ${studentData.status} - access denied`
      };
    }

    // Check if user record exists in users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (userError || !userData) {
      // If user record is missing but we have valid student data, allow access
      // This handles cases where student logins were created before the user record system
      if (studentData) {
        console.warn('User record not found in users table, but student data exists. Allowing access.');
        return {
          isValid: true,
          shouldLogout: false,
          studentData: studentData,
          reason: 'User record missing but student profile valid'
        };
      }
      
      return {
        isValid: false,
        shouldLogout: true,
        reason: 'User record not found in users table'
      };
    }

    // Check if user record is for a student
    if (userData.role !== 'student') {
      return {
        isValid: false,
        shouldLogout: true,
        reason: 'User role mismatch - not a student'
      };
    }

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
    // Sign out the user
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
