// Test script to verify the referral validation API works
const testReferralAPI = async () => {
  try {
    const response = await fetch('/api/referral/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: 'INTELLIGENT'
      })
    });

    const result = await response.json();
    
    console.log('API Response Status:', response.status);
    console.log('API Response Body:', result);
    
    if (response.ok && result.success) {
      console.log('✅ SUCCESS: Referral code validation works!');
      console.log('Referral Details:', result.referral);
    } else {
      console.log('❌ FAILED: API returned error');
      console.log('Error:', result.error);
    }
  } catch (error) {
    console.log('❌ FAILED: Network or parsing error');
    console.error('Error:', error);
  }
};

// Run the test
testReferralAPI();