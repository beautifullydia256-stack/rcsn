# Identity Module Setup Instructions

## Quick Start

The Identity module has been successfully created! Follow these steps to complete the setup:

## 1. Install Required Dependencies

Run the following command in your terminal:

```bash
npm install jsbarcode html2canvas canvas @types/jsbarcode
```

### Package Purposes:
- **jsbarcode**: Generates CODE128 barcodes on ID cards
- **html2canvas**: Converts ID cards to PNG images for download
- **canvas**: Server-side canvas for PDF generation
- **@types/jsbarcode**: TypeScript type definitions

## 2. Verify Database Schema

Ensure your Supabase database has the following tables and columns:

### Students Table
```sql
-- Required columns
student_id UUID PRIMARY KEY
name TEXT
admission_number TEXT
current_class TEXT
date_of_birth DATE
gender TEXT
status TEXT (should contain 'active' or 'inactive')
profile_picture_url TEXT (optional)
school_id UUID
created_at TIMESTAMP
```

### Schools Table
```sql
-- Required columns
school_id UUID PRIMARY KEY
name TEXT
logo_url TEXT (optional)
type TEXT
```

## 3. Test the Module

1. **Access the Identity Module**:
   - Log in as an admin
   - Navigate to Admin Dashboard
   - Click "Identity" in the sidebar

2. **Generate an ID Card**:
   - Click on any student from the list
   - View the generated ID card
   - Test the download and print buttons

3. **Test Verification**:
   - Scan the barcode or manually visit: `/verify?id={student_id}`
   - Verify student information displays correctly

## 4. File Structure

The following files have been created:

```
app/dashboard/admin/
├── components/
│   └── Sidebar.tsx (updated - added Identity menu item)
└── identity/
    ├── page.tsx (student list view)
    ├── [id]/
    │   └── page.tsx (individual ID card view)
    ├── components/
    │   └── IDCard.tsx (ID card component)
    └── README.md (detailed documentation)

app/verify/
└── page.tsx (public verification page)

app/api/identity/
└── generate-pdf/
    └── route.ts (PDF generation endpoint)
```

## 5. Configuration

### Update Verification URL
In `app/dashboard/admin/identity/components/IDCard.tsx`, the verification URL is automatically generated as:
```typescript
const verificationUrl = `${window.location.origin}/verify?id=${student.student_id}`;
```

For production, you may want to use a custom domain:
```typescript
const verificationUrl = `https://yourschool.com/verify?id=${student.student_id}`;
```

### Customize ID Card Design
Edit `app/dashboard/admin/identity/components/IDCard.tsx` to:
- Change colors (currently blue/indigo gradient)
- Modify layout dimensions
- Update fonts and styling
- Add school-specific branding

### Set Expiry Period
Default is 1 year. To change, edit in `IDCard.tsx`:
```typescript
const expiryDate = new Date();
expiryDate.setFullYear(expiryDate.getFullYear() + 1); // Change this number
```

## 6. Features Overview

### Admin Features
- ✅ Browse all active students
- ✅ Search by name, admission number, or class
- ✅ Filter by class
- ✅ View individual ID cards
- ✅ Download as PDF
- ✅ Download as PNG
- ✅ Print directly
- ✅ Barcode generation

### Verification Features
- ✅ Public verification page
- ✅ Scan barcode to verify
- ✅ Display student photo
- ✅ Show active/inactive status
- ✅ Read-only access
- ✅ Timestamp of verification

## 7. Testing Checklist

- [ ] Dependencies installed successfully
- [ ] Identity menu item appears in admin sidebar
- [ ] Student list loads correctly
- [ ] Search and filter work properly
- [ ] ID card displays with correct information
- [ ] Student photo or initial shows correctly
- [ ] School logo displays (if available)
- [ ] Barcode generates successfully
- [ ] Download PNG works
- [ ] Download PDF works
- [ ] Print function works
- [ ] Verification page accessible
- [ ] Verification shows correct student data
- [ ] Active/Inactive status displays correctly

## 8. Troubleshooting

### Issue: "npm not recognized"
**Solution**: Ensure Node.js and npm are installed. Download from https://nodejs.org/

### Issue: PDF generation fails
**Solution**: 
- Verify Puppeteer is installed: `npm list puppeteer-core`
- Check Chromium: `npm list @sparticuz/chromium`
- Ensure sufficient server memory

### Issue: Barcode not showing
**Solution**:
- Verify jsbarcode is installed: `npm list jsbarcode`
- Check browser console for errors
- Ensure admission_number field exists in database

### Issue: Images not loading
**Solution**:
- Check image URLs are publicly accessible
- Verify CORS settings for external images
- Ensure Supabase storage bucket is public (if using Supabase storage)

### Issue: PNG download not working
**Solution**:
- Verify html2canvas is installed: `npm list html2canvas`
- Check for CORS issues with images
- Use PDF download as alternative

## 9. Production Deployment

Before deploying to production:

1. **Environment Variables**: Ensure all Supabase credentials are set
2. **Image Storage**: Configure proper image hosting (Supabase Storage, S3, etc.)
3. **Performance**: Test with large student lists (100+ students)
4. **Security**: Verify authentication on all admin routes
5. **Mobile**: Test responsive design on mobile devices
6. **Printing**: Test print layout on different printers
7. **Barcode Scanning**: Test with physical barcode scanners

## 10. Optional Enhancements

Consider adding these features:

- **Bulk Generation**: Generate ID cards for entire classes
- **Email Distribution**: Send ID cards to parents via email
- **Expiry Notifications**: Alert when ID cards are about to expire
- **Audit Log**: Track who generated which ID cards
- **Custom Templates**: Different designs for different grade levels
- **QR Codes**: Alternative to barcodes with more data
- **Digital Wallets**: Export to Apple Wallet or Google Pay
- **Back Side**: Add emergency contacts and school rules

## Support

For issues or questions:
1. Check the README.md in `app/dashboard/admin/identity/`
2. Review the code comments in each file
3. Test with sample data first
4. Check browser console for errors

## Next Steps

1. Run `npm install jsbarcode html2canvas canvas @types/jsbarcode`
2. Restart your development server
3. Log in as admin and test the Identity module
4. Customize the design to match your school branding
5. Test the verification page with a barcode scanner

---

**Module Status**: ✅ Ready for testing after dependency installation
**Last Updated**: February 10, 2026
