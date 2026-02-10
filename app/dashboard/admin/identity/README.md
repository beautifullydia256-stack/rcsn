# Identity Module - Student ID Card System

## Overview
The Identity module allows administrators to generate digital and printable student ID cards with barcode verification.

## Features
- **Student List View**: Browse all active students with search and filter capabilities
- **ID Card Generation**: Create professional ID cards with student photos and information
- **Multiple Export Options**: Download as PDF or PNG, or print directly
- **Barcode Verification**: Each ID card includes a scannable barcode for verification
- **Public Verification Page**: Security personnel can scan barcodes to verify student identity

## Installation

### Required Dependencies
Install the following npm packages:

```bash
npm install jsbarcode html2canvas canvas @types/jsbarcode
```

### Dependencies Explanation
- `jsbarcode`: Generates CODE128 barcodes for student IDs
- `html2canvas`: Converts ID card HTML to PNG images
- `canvas`: Server-side canvas for PDF barcode generation
- `@types/jsbarcode`: TypeScript type definitions

## Usage

### Accessing the Module
1. Navigate to the Admin Dashboard
2. Click on "Identity" in the sidebar
3. Browse the list of students
4. Click on any student to view their ID card

### Generating ID Cards
1. Select a student from the list
2. The ID card will be displayed with:
   - Student photo (or initial if no photo)
   - School name and logo
   - Student name and admission number
   - Date of birth and expiry date
   - Barcode for verification
3. Use the action buttons:
   - **Download PNG**: Save as image file
   - **Download PDF**: Save as PDF document
   - **Print**: Print directly from browser

### Verification System
The barcode on each ID card links to: `https://yourschool.com/verify?id={student_id}`

When scanned, the verification page displays:
- Student photo
- Full name
- Admission number
- Current class
- Active/Inactive status
- Date of birth and gender

## ID Card Specifications

### Dimensions
- Width: 1011px
- Height: 638px
- Format: Landscape orientation

### Design Elements
- **Header**: Gradient background with "STUDENT ID CARD" title
- **Photo**: Circular student photo (280x280px) with blue border
- **Body**: School name, student name, and key information
- **Footer**: School logo and barcode

### Barcode Format
- Type: CODE128
- Content: Student admission number or student ID
- Scannable with standard barcode readers

## API Endpoints

### POST /api/identity/generate-pdf
Generates a PDF version of the student ID card.

**Request Body:**
```json
{
  "studentId": "uuid",
  "schoolId": "uuid"
}
```

**Response:**
- Content-Type: application/pdf
- Binary PDF file

## Database Requirements

### Students Table
Required fields:
- `student_id` (UUID)
- `name` (string)
- `admission_number` (string)
- `current_class` (string)
- `date_of_birth` (date)
- `gender` (string)
- `status` (string: "active" or "inactive")
- `profile_picture_url` (string, optional)
- `school_id` (UUID)

### Schools Table
Required fields:
- `school_id` (UUID)
- `name` (string)
- `logo_url` (string, optional)

## Customization

### Changing ID Card Design
Edit `app/dashboard/admin/identity/components/IDCard.tsx` to modify:
- Colors and gradients
- Layout and spacing
- Font sizes and styles
- Border styles

### Expiry Date Logic
By default, ID cards expire 1 year from generation. To change:
```typescript
// In IDCard.tsx
const expiryDate = new Date();
expiryDate.setFullYear(expiryDate.getFullYear() + 1); // Change to desired years
```

### Barcode Format
To use QR codes instead of CODE128:
```typescript
// Install qrcode package
npm install qrcode @types/qrcode

// Replace JsBarcode with QRCode in IDCard.tsx
import QRCode from 'qrcode';
const qrDataUrl = await QRCode.toDataURL(verificationUrl);
```

## Security Considerations

1. **Verification Page**: Public but read-only
2. **Authentication**: ID card generation requires admin authentication
3. **Data Privacy**: Only essential information displayed on verification page
4. **Barcode Security**: Links to verification page, not sensitive data

## Troubleshooting

### PDF Generation Fails
- Ensure Puppeteer and Chromium are properly installed
- Check server memory limits
- Verify image URLs are accessible

### Barcode Not Displaying
- Confirm jsbarcode is installed
- Check browser console for errors
- Verify admission number format

### PNG Download Not Working
- Ensure html2canvas is installed
- Check for CORS issues with images
- Try PDF download as alternative

## Future Enhancements

- Bulk ID card generation
- Custom templates per school
- QR code option
- Back side of ID card with emergency contacts
- Digital wallet integration (Apple Wallet, Google Pay)
- Expiry date notifications
- ID card reprint tracking
