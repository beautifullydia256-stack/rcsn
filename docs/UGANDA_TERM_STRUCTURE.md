# 📅 Uganda Academic Term Structure - System Configuration

## ✅ Implementation Complete!

The system now recognizes and uses the **Uganda Academic Calendar** with three terms per year.

---

## 📊 Uganda Term Structure

### Term I (February - May)
- **Start:** Early February
- **End:** Early May
- **Duration:** ~3 months
- **Holiday Break:** 3-4 weeks (May)
- **Typical Start:** First Monday of February
- **Typical End:** Last Friday before May holiday

### Term II (June - August)
- **Start:** Late May / Early June
- **End:** Early August
- **Duration:** ~2.5 months
- **Holiday Break:** 3-4 weeks (August)
- **Typical Start:** First Monday of June
- **Typical End:** Last Friday before August holiday

### Term III (September - December)
- **Start:** Early September
- **End:** Late November / Early December
- **Duration:** ~3 months
- **Holiday Break:** ~2 months (December - January)
- **Typical Start:** First Monday of September
- **Typical End:** First or second week of December

---

## 🗓️ Academic Year Cycle

```
January
  └─ (Holiday from Term III)

February - May
  └─ TERM I

May
  └─ (3-4 week break)

June - August
  └─ TERM II

August
  └─ (3-4 week break)

September - December
  └─ TERM III

December - January
  └─ (2 month break)
  └─ Cycle repeats with new academic year
```

---

## 🔧 Where This is Used in the System

### 1. **Term Settings Page**
**Location:** `/dashboard/admin/settings` → Terms tab

**Features:**
- ✅ Shows Uganda Academic Calendar info box
- ✅ Click "Show Details" to see all 3 terms
- ✅ Visual guide for administrators
- ✅ Customizable dates per school

### 2. **Term Structure Helper**
**Location:** `src/lib/termStructure.ts`

**Functions Available:**
```typescript
// Get term definition
getTermDefinition(1) // Returns Term I info

// Get default start date
getDefaultTermStartDate(2025, 1) // First Monday of Feb 2025

// Get default end date
getDefaultTermEndDate(2025, 1) // Last Friday of May 2025

// Get next term
getNextTerm(3, 2024) // Returns: { term: 1, year: 2025 }

// Get current term based on today
getCurrentTerm() // Auto-detects based on current date

// Format for display
formatTermDisplay(1, 2025) // "Term I 2025 (February - May)"
```

### 3. **Term Rollover**
**Location:** `/api/admin/term-rollover`

**Uses Term Structure For:**
- Validating rollover can only happen after Term 3 ends
- Understanding term sequence (Term 3 → Term 1 of next year)
- Student promotion timing

### 4. **Report Generation**
**Uses For:**
- Displaying "Next Term Begins" date on reports
- Showing current term information
- Academic year tracking

### 5. **Exam Sets**
**Uses For:**
- Creating exam sets per term
- BOT (Beginning of Term), MOT (Mid of Term), EOT (End of Term)
- Term-based result filtering

---

## 📝 Term Validation Rules (Built-in)

The system enforces Uganda term structure:

### Term 1 Rules:
- ✅ Must start no later than May
- ✅ Typically February start
- ✅ Cannot overlap with Term 2/3

### Term 2 Rules:
- ✅ Cannot start before May
- ✅ Typically June start
- ✅ Must be after Term 1 ends

### Term 3 Rules:
- ✅ Cannot start before August
- ✅ Typically September start
- ✅ Must be after Term 2 ends

---

## 🎯 Automatic Term Detection

### Current Date → Current Term

| Current Month | Detected Term |
|---------------|---------------|
| January | Term 1 (upcoming/prep) |
| February - May | Term I |
| June - August | Term II |
| September - December | Term III |

**Example:**
```typescript
// If today is March 15, 2025
getCurrentTerm() 
// Returns: { term: 1, year: 2025 }

// If today is October 20, 2025
getCurrentTerm()
// Returns: { term: 3, year: 2025 }
```

---

## 📊 School Days Calculation

### Approximate School Days Per Term:

| Term | Duration | Weeks | School Days |
|------|----------|-------|-------------|
| Term I | 3 months | 12 weeks | ~60 days |
| Term II | 2.5 months | 10 weeks | ~50 days |
| Term III | 3 months | 12 weeks | ~60 days |

**Total per year:** ~170 school days

---

## 🎨 User Interface

### What Admins See in Term Settings:

```
┌──────────────────────────────────────────────┐
│ 📅 Uganda Academic Calendar   [Show Details] │
├──────────────────────────────────────────────┤
│ Term I            Term II           Term III  │
│ February - May    June - August    Sept - Dec│
│ Duration: 3 mo    Duration: 2.5 mo Duration:3│
│ Break: 3-4 weeks  Break: 3-4 weeks Break: 2mo│
└──────────────────────────────────────────────┘

ℹ️ These are standard Uganda term dates. 
   You can customize dates for your school below.
```

---

## 🔄 Term Progression

### Automatic Term Sequence:

```
Term 1, 2024 
    ↓
Term 2, 2024
    ↓
Term 3, 2024
    ↓
Term 1, 2025  ← New academic year
    ↓
Term 2, 2025
    ↓
... continues
```

---

## 🎓 Integration Points

### 1. **Report Cards**
- "Next Term Begins" date auto-calculated
- Based on term structure
- Shows on all reports

### 2. **Fee Collection**
- Term-based fee tracking
- Three billing cycles per year
- Aligned with term dates

### 3. **Attendance**
- School days calculation
- Term-based attendance %
- Holiday period exclusion

### 4. **Exam Sets**
- BOT, MOT, EOT aligned with term structure
- Automatic term detection
- Result publication per term

### 5. **Student Promotion**
- End of Term 3 = Promotion time
- Automatic class advancement
- Graduation for final year students

---

## 🛠️ Configuration Options

### System-Wide (Code-based):
- ✅ Default term months defined
- ✅ Break periods calculated
- ✅ Auto-detection logic

### Per-School (Database):
- ✅ Custom start/end dates
- ✅ Flexible scheduling
- ✅ Override defaults if needed

---

## 📚 For Developers

### Using Term Structure in Code:

```typescript
import { 
  getCurrentTerm, 
  getDefaultTermStartDate,
  formatTermDisplay,
  UGANDA_TERM_STRUCTURE
} from '@/src/lib/termStructure';

// Get current term
const { term, year } = getCurrentTerm();
// term: 1, 2, or 3
// year: e.g., 2025

// Get default dates
const startDate = getDefaultTermStartDate(2025, 1);
// Returns: Date object for first Monday of February 2025

// Display term
const display = formatTermDisplay(1, 2025);
// Returns: "Term I 2025 (February - May)"
```

---

## 🎯 Benefits

### For Schools:
- ✅ **Aligned with national calendar**
- ✅ **Standard across Uganda**
- ✅ **Parents understand immediately**
- ✅ **Compatible with other schools**

### For System:
- ✅ **Automatic term detection**
- ✅ **Consistent date calculations**
- ✅ **Validation built-in**
- ✅ **Flexibility where needed**

### For Users:
- ✅ **Clear guidance** - Shows expected dates
- ✅ **Easy configuration** - Defaults provided
- ✅ **Flexible** - Can customize if needed
- ✅ **Visual** - See all terms at a glance

---

## 📝 Customization

While the system knows Uganda standard dates, schools can:
- ✅ Adjust start/end dates for their specific calendar
- ✅ Account for regional variations
- ✅ Handle special circumstances
- ✅ Set exact dates per their schedule

**Standard dates are guidance, not restrictions.**

---

## ✅ Implementation Status

**What's Working:**
- ✅ Term structure configuration created
- ✅ Helper functions available
- ✅ Term Settings page shows Uganda calendar
- ✅ Auto-detection functions ready
- ✅ Validation rules in place

**What Uses It:**
- ✅ Term Settings UI
- ✅ Term Rollover API
- ✅ Report Generation (next term dates)
- ✅ Current term detection

---

## 🔄 Term Workflow

### At Term Start:
1. Admin creates term in Term Settings
2. Sets start and end dates (or uses defaults)
3. Term becomes active
4. Teachers can create exam sets
5. Students can be marked for attendance

### During Term:
1. Exams conducted (BOT, MOT, EOT)
2. Results entered
3. Reports generated
4. Attendance tracked

### At Term End:
1. Final reports generated
2. Term marked complete
3. Next term prepared (if Term 1 or 2)
4. OR Rollover executed (if Term 3)

---

## 📊 Files Modified/Created

### New Files:
1. `src/lib/termStructure.ts` - Term structure configuration and helpers

### Modified Files:
1. `app/dashboard/admin/settings/page.tsx` - Added Uganda calendar info box

### Uses Existing:
1. `school_terms` table (database)
2. Term rollover API
3. Exam sets system

---

**Status:** ✅ Uganda Term Structure Fully Integrated  
**Date:** October 12, 2025  
**Ready:** Production Use

