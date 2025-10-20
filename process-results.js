// Simple script to process exam results after database setup
// Run this in your browser console or as a Node.js script

async function processExamResults() {
  try {
    console.log('Processing exam results...');
    
    const response = await fetch('http://localhost:3000/api/debug/fix-database', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });

    const result = await response.json();
    console.log('Processing result:', result);
    
    if (result.success) {
      console.log('✅ Exam results processed successfully!');
      console.log('You can now test the report generator.');
    } else {
      console.log('❌ Processing failed:', result.message);
    }
  } catch (error) {
    console.error('Error processing results:', error);
  }
}

// Run the processing
processExamResults();
