# Identity Module - Quick Reference Card

## 🚀 Installation (One Command)

```bash
npm install jsbarcode html2canvas canvas @types/jsbarcode
```

## 📍 Routes

| Route | Access | Purpose |
|-------|--------|---------|
| `/dashboard/admin/identity` | Admin | Student list |
| `/dashboard/admin/identity/[id]` | Admin | ID card view |
| `/verify?id={student_id}` | Public | Verification |
| `/api/identity/generate-pdf` | API | PDF generation |

## 🎨 Key Components

### IDCard Component
```typescript
import IDCard from './components/IDCard';

<IDCard student={studentData} school={schoolData} />
```

### Student List Page
- Search: Real-time filtering
- Filter: By class
- Grid: Responsive layout

## 🔧 Utility Functions

```typescript
import { 
  formatDate,           // Format dates to DD/MM/YYYY
  calculateExpiryDate,  // Get expiry date (default: +1 year)
  generateVerificationUrl, // Create verification URL
  getStudentInitials,   // Get initials from name
  validateStudentData,  // Validate student object
  getStatusColor,       // Get status badge colors
  downloadBlob,         // Download file helper
  generateFilename      // Create safe filename
} from './utils';
```

## 📘 TypeScript Types

```typescript
import { Student, School, IDCardData, VerificationResult } from './types';
```

## 🎯 Common Tasks

### Generate ID Card
```typescript
// 1. Fetch student data
const { data: student } = await supabase
  .from('students')
  .select('*')
  .eq('student_id', studentId)
  .single();

// 2. Fetch school data
const { data: school } = await supabase
  .from('schools')
  .select('*')
  .eq('school_id', schoolId)
  .single();

// 3. Render component
<IDCard student={student} school={school} />
```

### Download as PDF
```typescript
const response = await fetch('/api/identity/generate-pdf', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ studentId, schoolId })
});

const blob = await response.blob();
downloadBlob(blob, `${student.name}_ID_Card.pdf`);
```

### Download as PNG
```typescript
import html2canvas from 'html2canvas';

const canvas = await html2canvas(cardRef.current, {
  scale: 2,
  backgroundColor: '#ffffff'
});

canvas.toBlob((blob) => {
  downloadBlob(blob, `${student.name}_ID_Card.png`);
});
```

### Verify Student
```typescript
const { data: student } = await supabase
  .from('students')
  .select('*, schools(name, logo_url)')
  .eq('student_id', studentId)
  .single();

const isActive = student.status?.toLowerCase() === 'active';
```

## 🎨 Customization Points

### Change Colors
```typescript
// In IDCard.tsx
background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
border: "15px solid #5D8EB4"
```

### Change Expiry Period
```typescript
// In IDCard.tsx or utils.ts
const expiryDate = new Date();
expiryDate.setFullYear(expiryDate.getFullYear() + 2); // 2 years
```

### Change Barcode Format
```typescript
// Install qrcode
npm install qrcode @types/qrcode

// Replace in IDCard.tsx
import QRCode from 'qrcode';
const qrDataUrl = await QRCode.toDataURL(verificationUrl);
```

### Change Card Dimensions
```typescript
// In IDCard.tsx
width: "1011px"  // Change to desired width
height: "638px"  // Change to desired height
```

## 🔍 Database Queries

### Get All Active Students
```sql
SELECT * FROM students 
WHERE school_id = $1 
AND status = 'active' 
ORDER BY name ASC;
```

### Get Student with School
```sql
SELECT s.*, sc.name as school_name, sc.logo_url 
FROM students s 
JOIN schools sc ON s.school_id = sc.school_id 
WHERE s.student_id = $1;
```

### Search Students
```sql
SELECT * FROM students 
WHERE school_id = $1 
AND (
  name ILIKE '%' || $2 || '%' 
  OR admission_number ILIKE '%' || $2 || '%'
  OR current_class ILIKE '%' || $2 || '%'
);
```

## 🐛 Debug Checklist

- [ ] Dependencies installed?
- [ ] Server restarted?
- [ ] Student has required fields?
- [ ] School data exists?
- [ ] Images accessible?
- [ ] Console errors?
- [ ] Network tab shows requests?
- [ ] Authentication valid?

## 📊 Performance Tips

1. **Lazy Load Images**: Use Next.js Image component
2. **Debounce Search**: Wait 300ms before filtering
3. **Memoize Components**: Use React.memo for IDCard
4. **Cache School Data**: Fetch once, reuse
5. **Optimize Barcode**: Generate once, cache result

## 🔒 Security Checklist

- [ ] Admin authentication required
- [ ] School-specific data filtering
- [ ] Input sanitization
- [ ] API endpoint authentication
- [ ] Public verification read-only
- [ ] No sensitive data in barcode
- [ ] HTTPS in production

## 📱 Responsive Classes

```typescript
// Grid layout
"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"

// Search input
"w-full md:w-1/2"

// Buttons
"flex flex-col md:flex-row gap-2"
```

## 🎯 Testing Commands

```bash
# Run development server
npm run dev

# Type check
npm run type-check

# Build for production
npm run build

# Run tests (if configured)
npm test
```

## 📞 Quick Links

- **Setup Guide**: `IDENTITY_MODULE_SETUP.md`
- **Full Documentation**: `README.md`
- **Testing Guide**: `TESTING_GUIDE.md`
- **Module Structure**: `MODULE_STRUCTURE.md`
- **Summary**: `IDENTITY_MODULE_SUMMARY.md`

## 💡 Pro Tips

1. **Bulk Operations**: Map over student array for batch processing
2. **Error Boundaries**: Wrap components in error boundaries
3. **Loading States**: Always show loading indicators
4. **Fallbacks**: Provide defaults for missing data
5. **Accessibility**: Add ARIA labels to buttons
6. **Print Styles**: Use `@media print` for print optimization
7. **Mobile First**: Design for mobile, enhance for desktop
8. **Cache Barcodes**: Generate once, store in state

## 🔄 Common Workflows

### Add New Student Field to ID Card
1. Update `types.ts` with new field
2. Add field to database query
3. Update `IDCard.tsx` to display field
4. Update PDF generation in API route
5. Test with sample data

### Change ID Card Design
1. Edit `IDCard.tsx` styles
2. Update dimensions if needed
3. Test PNG export
4. Test PDF generation
5. Test print layout

### Add New Export Format
1. Create new handler function
2. Add button to ID card page
3. Implement export logic
4. Test download
5. Update documentation

---

**Keep this card handy for quick reference during development!**
