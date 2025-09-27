const puppeteer = require('puppeteer');

async function testPuppeteer() {
  console.log('Testing Puppeteer installation...');
  
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    
    console.log('Puppeteer browser launched successfully');
    
    const page = await browser.newPage();
    await page.setContent('<html><body><h1>Test PDF</h1></body></html>');
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        right: '15mm',
        bottom: '15mm',
        left: '15mm'
      }
    });
    
    console.log('PDF generated successfully, size:', pdfBuffer.length);
    
    await browser.close();
    console.log('Test completed successfully');
    
  } catch (error) {
    console.error('Puppeteer test failed:', error);
  }
}

testPuppeteer();

