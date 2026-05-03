# Summary: Uganda Primary School Logic for Database Developer (P.1 - P.7)

## WHAT I'VE DONE ✅

Created a comprehensive document for your database developer: **`DATABASE_DEVELOPER_UGANDA_PLE_LOGIC.md`**

**IMPORTANT:** This logic applies to **ALL PRIMARY CLASSES (P.1 - P.7)**, not just Primary 7!

This document contains:
- ✅ Your exact specifications
- ✅ Your exact examples
- ✅ Clear explanation of the 4-subject rule
- ✅ Aggregate calculation logic
- ✅ Division calculation logic
- ✅ SQL implementation examples
- ✅ Testing examples with expected results

---

## KEY POINTS FOR ALL PRIMARY CLASSES (P.1 - P.7)

**This applies to Primary 1, Primary 2, Primary 3, Primary 4, Primary 5, Primary 6, AND Primary 7!**

### ONLY 4 SUBJECTS COUNT:
1. **English**
2. **Mathematics**
3. **Science**
4. **Social Studies (SST)**

**ALL OTHER SUBJECTS ARE IGNORED** for aggregate and division calculation.

---

### AGGREGATE CALCULATION:
**Aggregate = English grade + Math grade + Science grade + SST grade**

**Example:**
- English: Grade 2
- Math: Grade 1
- Science: Grade 3
- SST: Grade 2
- **Aggregate = 2 + 1 + 3 + 2 = 8**

**Important:**
- Lower is better (1 is best, 9 is worst)
- Best possible: 4 (all 1s)
- Worst possible: 36 (all 9s)
- Missing subject = Grade 9

---

### DIVISION CALCULATION:
Based on aggregate:
- **4–12** = Division 1
- **13–23** = Division 2
- **24–29** = Division 3
- **30–34** = Division 4
- **35–36** = Fail / U (Ungraded)

**Example:**
- Aggregate = 8
- **Division = Division 1** (because 8 is in 4–12 range)

---

### PERCENTAGE TO GRADE CONVERSION:
| Percentage | Grade |
|------------|-------|
| 90–100 | 1 |
| 80–89 | 2 |
| 70–79 | 3 |
| 60–69 | 4 |
| 50–59 | 5 |
| 40–49 | 6 |
| 30–39 | 7 |
| 20–29 | 8 |
| 0–19 | 9 |

---

## COMPLETE EXAMPLE (Works for ANY Primary Class)

**Student:** Mary Nakato, **Primary 3** (same logic for P.1, P.2, P.4, P.5, P.6, P.7)

**Student Marks:**
- English = 65%
- Mathematics = 82%
- Science = 75%
- Social Studies = 90%

**Convert to Grades:**
- English: 65% → Grade 4 (60–69 range)
- Math: 82% → Grade 2 (80–89 range)
- Science: 75% → Grade 3 (70–79 range)
- SST: 90% → Grade 1 (90–100 range)

**Calculate Aggregate:**
- Aggregate = 4 + 2 + 3 + 1 = **10**

**Determine Division:**
- 10 falls in 4–12 range
- **Result = Division 1**

---

## WHAT DATABASE DEVELOPER NEEDS TO DO

1. ✅ Update aggregate calculation to use ONLY 4 subjects (English, Math, Science, SST) for **ALL PRIMARY CLASSES (P.1 - P.7)**
2. ✅ Ignore all other subjects for aggregate/division for **ALL PRIMARY CLASSES**
3. ✅ Use correct division ranges (4–12, 13–23, 24–29, 30–34, 35–36) for **ALL PRIMARY CLASSES**
4. ✅ Treat missing subjects as Grade 9 for **ALL PRIMARY CLASSES**
5. ✅ Test with examples in the document using different primary classes (P.1, P.3, P.5, P.7)

---

## DOCUMENT TO GIVE DATABASE DEVELOPER

**File:** `DATABASE_DEVELOPER_UGANDA_PLE_LOGIC.md`

**Contains:**
- Complete explanation of Uganda PLE logic
- Your exact specifications
- Your exact examples
- SQL implementation code
- Testing examples with expected results
- Critical rules highlighted

---

## TESTING AFTER FIX

### Test 1: Division 1
- English: 90% (Grade 1)
- Math: 85% (Grade 2)
- Science: 88% (Grade 2)
- SST: 92% (Grade 1)
- **Expected Aggregate:** 1 + 2 + 2 + 1 = 6
- **Expected Division:** Division 1

### Test 2: Division 2
- English: 75% (Grade 3)
- Math: 68% (Grade 4)
- Science: 72% (Grade 3)
- SST: 65% (Grade 4)
- **Expected Aggregate:** 3 + 4 + 3 + 4 = 14
- **Expected Division:** Division 2

### Test 3: Missing Subject
- English: 75% (Grade 3)
- Math: 68% (Grade 4)
- Science: MISSING (Grade 9)
- SST: 72% (Grade 3)
- **Expected Aggregate:** 3 + 4 + 9 + 3 = 19
- **Expected Division:** Division 2

---

## CRITICAL RULES (ALL PRIMARY CLASSES P.1 - P.7)

1. ✅ **ONLY 4 subjects count** (English, Math, Science, SST)
2. ✅ **ALL other subjects ignored** for aggregate/division
3. ✅ **Lower aggregate is better** (4 is best, 36 is worst)
4. ✅ **Missing subjects = Grade 9**
5. ✅ **Division ranges:**
   - 4–12 = Division 1
   - 13–23 = Division 2
   - 24–29 = Division 3
   - 30–34 = Division 4
   - 35–36 = Fail
6. ✅ **Applies to ALL PRIMARY CLASSES** from P.1 to P.7

---

## SUMMARY

**What's wrong:** Current aggregate/division logic is incorrect for ALL PRIMARY CLASSES

**Who fixes it:** Database developer

**What to give them:** `DATABASE_DEVELOPER_UGANDA_PLE_LOGIC.md`

**What they need to do:**
- Use ONLY 4 subjects (English, Math, Science, SST) for ALL PRIMARY CLASSES (P.1 - P.7)
- Calculate aggregate as sum of 4 grades for ALL PRIMARY CLASSES
- Calculate division based on correct ranges for ALL PRIMARY CLASSES
- Ignore all other subjects for ALL PRIMARY CLASSES

**Priority:** 🔴 CRITICAL (affects all P.1 - P.7 report cards)
