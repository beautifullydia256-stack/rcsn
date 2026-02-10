# Identity Module Testing Guide

## Pre-Testing Setup

### 1. Install Dependencies
```bash
npm install jsbarcode html2canvas canvas @types/jsbarcode
```

### 2. Restart Development Server
```bash
npm run dev
```

### 3. Prepare Test Data
Ensure you have:
- At least 5 active students in the database
- Students with profile pictures
- Students without profile pictures
- Various classes represented
- School logo uploaded (optional)

## Testing Checklist

### Phase 1: Navigation & Access

- [ ] **Admin Login**
  - Log in with admin credentials
  - Verify redirect to admin dashboard

- [ ] **Sidebar Navigation**
  - Locate "Identity" menu item in sidebar
  - Verify IdCard icon displays correctly
  - Click "Identity" menu item
  - Verify navigation to `/dashboard/admin/identity`

### Phase 2: Student List View

- [ ] **Initial Load**
  - Page loads without errors
  - Student list displays correctly
  - Loading state shows briefly
  - All active students appear

- [ ] **Search Functionality**
  - Search by student name (partial match)
  - Search by admission number
  - Search by class name
  - Verify results update in real-time
  - Test with no results

- [ ] **Class Filter**
  - Dropdown shows all unique classes
  - Select a class
  - Verify filtered results
  - Select "All Classes"
  - Verify all students return

- [ ] **Student Cards**
  - Each card shows student initial or photo
  - Name displays correctly
  - Admission number visible
  - Current class shown
  - "View ID Card" button present

- [ ] **Interactions**
  - Click on student card
  - Verify navigation to ID card page
  - Click "View ID Card" button
  - Verify same navigation

### Phase 3: ID Card Generation

- [ ] **Page Load**
  - ID card page loads successfully
  - Loading state displays
  - Card renders completely

- [ ] **Header Section**
  - "STUDENT ID CARD" title visible
  - Gradient background displays
  - Text is readable

- [ ] **Student Photo**
  - Photo displays if available
  - Initial shows if no photo
  - Circular border renders correctly
  - Blue border (#5D8EB4) visible

- [ ] **Card Body**
  - School name displays
  - Student name shows correctly
  - Card ID (admission number) present
  - Date of birth formatted correctly (DD/MM/YYYY)
  - Expiry date shows (1 year from now)
  - All text is readable

- [ ] **Footer Section**
  - School logo displays (if available)
  - School name/brand shows
  - Barcode generates successfully
  - Barcode number matches admission number

### Phase 4: Download & Print

- [ ] **Download PNG**
  - Click "Download PNG" button
  - File downloads successfully
  - Filename format: `StudentName_ID_Card.png`
  - Open PNG file
  - Verify image quality
  - Check all elements visible
  - Verify dimensions (1011x638px)

- [ ] **Download PDF**
  - Click "Download PDF" button
  - PDF generation starts
  - File downloads successfully
  - Filename format: `StudentName_ID_Card.pdf`
  - Open PDF file
  - Verify print quality
  - Check colors render correctly
  - Verify barcode is scannable

- [ ] **Print Function**
  - Click "Print" button
  - Print dialog opens
  - Preview shows ID card
  - Landscape orientation set
  - Print or save as PDF
  - Verify output quality

### Phase 5: Barcode Verification

- [ ] **Barcode Scanning**
  - Use barcode scanner app on phone
  - Scan barcode from printed/screen ID card
  - Verify URL format: `/verify?id={student_id}`
  - Verify redirect to verification page

- [ ] **Manual Verification**
  - Copy student ID from database
  - Navigate to `/verify?id={student_id}`
  - Verify page loads

### Phase 6: Verification Page

- [ ] **Valid Student**
  - Page loads successfully
  - Student photo displays
  - Name shows correctly
  - "Active" status badge (green)
  - Admission number visible
  - Current class shown
  - Date of birth formatted
  - Gender displays
  - School name visible
  - Success message shows
  - Verification timestamp present

- [ ] **Invalid Student ID**
  - Navigate to `/verify?id=invalid-id`
  - Error page displays
  - Red X icon shows
  - "Verification Failed" message
  - Helpful error text present

- [ ] **Inactive Student**
  - Set a student status to "inactive"
  - Navigate to their verification page
  - Yellow warning badge shows
  - "Inactive" status visible
  - Warning message displays

- [ ] **Missing Student ID**
  - Navigate to `/verify` (no ID parameter)
  - Error page displays
  - "No student ID provided" message

### Phase 7: Responsive Design

- [ ] **Desktop (1920x1080)**
  - Layout looks professional
  - All elements properly spaced
  - No overflow issues

- [ ] **Laptop (1366x768)**
  - Content fits screen
  - Buttons accessible
  - Text readable

- [ ] **Tablet (768x1024)**
  - Grid adjusts to 2 columns
  - Cards stack properly
  - Navigation works

- [ ] **Mobile (375x667)**
  - Single column layout
  - Touch targets adequate
  - Text remains readable
  - Buttons accessible

### Phase 8: Edge Cases

- [ ] **Student Without Photo**
  - Initial displays correctly
  - Gradient background shows
  - Initial is centered

- [ ] **Long Student Names**
  - Name doesn't overflow
  - Text wraps or truncates
  - Card remains readable

- [ ] **Missing Date of Birth**
  - "N/A" displays
  - Card still generates

- [ ] **No Admission Number**
  - Falls back to student_id
  - Barcode still generates

- [ ] **School Without Logo**
  - Placeholder shows
  - Card still looks professional

- [ ] **Special Characters in Name**
  - Name displays correctly
  - Filename sanitizes properly
  - No encoding issues

### Phase 9: Performance

- [ ] **Large Student List (100+ students)**
  - Page loads in reasonable time (<3s)
  - Search remains responsive
  - Scrolling is smooth

- [ ] **Multiple ID Card Generations**
  - Generate 5 cards in succession
  - No memory leaks
  - Performance remains consistent

- [ ] **Concurrent Downloads**
  - Download PNG and PDF simultaneously
  - Both complete successfully
  - No conflicts

### Phase 10: Security

- [ ] **Authentication**
  - Log out
  - Try accessing `/dashboard/admin/identity`
  - Verify redirect to login

- [ ] **Authorization**
  - Log in as non-admin (teacher/parent)
  - Try accessing identity module
  - Verify access denied or redirect

- [ ] **Verification Page Access**
  - Access verification page without login
  - Verify public access works
  - Verify read-only (no edit buttons)

- [ ] **API Endpoint Security**
  - Try calling `/api/identity/generate-pdf` without auth
  - Verify 401 Unauthorized response

### Phase 11: Browser Compatibility

- [ ] **Chrome/Edge**
  - All features work
  - Barcode generates
  - Downloads work
  - Print works

- [ ] **Firefox**
  - All features work
  - Barcode generates
  - Downloads work
  - Print works

- [ ] **Safari**
  - All features work
  - Barcode generates
  - Downloads work
  - Print works

### Phase 12: Error Handling

- [ ] **Network Error**
  - Disconnect internet
  - Try loading student list
  - Verify error message

- [ ] **Database Error**
  - Simulate database down
  - Verify graceful error handling

- [ ] **PDF Generation Failure**
  - Check error logging
  - Verify user-friendly message

- [ ] **Image Load Failure**
  - Use invalid image URL
  - Verify fallback to initial

## Bug Reporting Template

If you find issues, report using this format:

```
**Bug Title**: [Brief description]

**Severity**: Critical / High / Medium / Low

**Steps to Reproduce**:
1. 
2. 
3. 

**Expected Result**:
[What should happen]

**Actual Result**:
[What actually happens]

**Environment**:
- Browser: 
- OS: 
- Screen Size: 

**Screenshots**:
[Attach if applicable]

**Console Errors**:
[Copy any errors from browser console]
```

## Success Criteria

The Identity Module is ready for production when:

✅ All checklist items pass
✅ No critical or high severity bugs
✅ Performance is acceptable (<3s load time)
✅ Works on all major browsers
✅ Mobile responsive
✅ Security checks pass
✅ Documentation is complete

## Post-Testing

After successful testing:

1. Document any configuration changes
2. Update README with any new findings
3. Create user training materials
4. Plan rollout to admin users
5. Set up monitoring for errors
6. Schedule follow-up review after 1 week of use

## Support Contacts

For testing questions or issues:
- Check README.md for documentation
- Review code comments
- Test with sample data first
- Document all findings
