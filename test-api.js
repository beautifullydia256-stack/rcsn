// Test script to check if API routes work
// Run this with: node test-api.js

const testCreateStudentLogin = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/admin/create-student-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        admission_number: 'KPS-2025-KD-003',
        student_id: 'b1f3dd41-daf3-40e4-b8b1-d794ec654f09'
      })
    });

    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', data);
  } catch (error) {
    console.error('Error:', error);
  }
};

testCreateStudentLogin();

