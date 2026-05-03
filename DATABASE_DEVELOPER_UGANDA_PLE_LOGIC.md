# DATABASE DEVELOPER: Uganda Primary School Aggregates and Divisions Logic

## ⚠️ IMPORTANT: THIS APPLIES TO ALL PRIMARY CLASSES (P.1 - P.7)

**This is NOT just for Primary 7!**

The logic described in this document applies to **ALL PRIMARY CLASSES** from Primary 1 to Primary 7:
- ✅ Primary 1 (P.1)
- ✅ Primary 2 (P.2)
- ✅ Primary 3 (P.3)
- ✅ Primary 4 (P.4)
- ✅ Primary 5 (P.5)
- ✅ Primary 6 (P.6)
- ✅ Primary 7 (P.7)

While the Primary Leaving Examination (PLE) is taken at the end of Primary 7, the **same grading system, aggregate calculation, and division logic is used throughout all primary classes**.

---

## CRITICAL: ONLY 4 SUBJECTS COUNT

**IMPORTANT:** For ALL PRIMARY CLASSES (Primary 1 to Primary 7) in Uganda, ONLY these 4 subjects are used for aggregate and division calculation:

1. **English**
2. **Mathematics**
3. **Science**
4. **Social Studies (SST)**

**ALL OTHER SUBJECTS ARE IGNORED** for aggregate and division calculation, even if the class has more subjects.

---

## UGANDA PRIMARY SCHOOL SYSTEM (P.1 - P.7)

### 1. The 4 Core Subjects

**ALL PRIMARY STUDENTS (Primary 1 to Primary 7)** are evaluated using **ONLY 4 subjects:**
- English
- Mathematics
- Science
- Social Studies (SST)

Each subject is graded from **1 to 9**, where:
- **1 = best grade (Distinction)**
- **9 = worst grade (Fail)**

**CRITICAL:** Lower is better (1 is best, 9 is worst)

---

### 2. How Aggregates Are Calculated

**Aggregate = English grade + Math grade + Science grade + SST grade**

**Example:**

| Subject | Grade |
|---------|-------|
| English | 2 |
| Mathematics | 1 |
| Science | 3 |
| Social Studies | 2 |

**Aggregate = 2 + 1 + 3 + 2 = 8**

**Result:** Aggregate 8

---

### 3. Best and Worst Possible Aggregates

**Best possible aggregate:**
- 1 + 1 + 1 + 1 = **4 aggregates** (all Distinctions)

**Worst possible aggregate:**
- 9 + 9 + 9 + 9 = **36 aggregates** (all Fails)

**Summary:**
- **4 is the best**
- **36 is the worst**

---

### 4. How Divisions Are Calculated

After adding the four subject grades, determine division based on aggregate:

#### **Division One (D1)**
- **Aggregate: 4–12**
- Examples:
  * Aggregate 4 → Division 1
  * Aggregate 8 → Division 1
  * Aggregate 12 → Division 1

#### **Division Two (D2)**
- **Aggregate: 13–23**
- Examples:
  * Aggregate 15 → Division 2
  * Aggregate 18 → Division 2
  * Aggregate 22 → Division 2

#### **Division Three (D3)**
- **Aggregate: 24–29**
- Examples:
  * Aggregate 24 → Division 3
  * Aggregate 27 → Division 3
  * Aggregate 29 → Division 3

#### **Division Four (D4)**
- **Aggregate: 30–34**
- Examples:
  * Aggregate 31 → Division 4
  * Aggregate 33 → Division 4
  * Aggregate 34 → Division 4

#### **Fail (Ungraded / Result 9)**
- **Aggregate: 35–36** (or severe failure in subjects)
- Examples:
  * Aggregate 35 → Fail
  * Aggregate 36 → Fail

---

### 5. The Real Grading Logic Behind Each Subject

Each subject paper is marked **out of 100**, then converted into a grade:

**Percentage to Grade Conversion:**

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

**Important:** UNEB (Uganda National Examinations Board) may adjust grade boundaries based on performance (standardization), so exact cutoffs can vary.

**Note:** While the Primary Leaving Examination (PLE) is taken at the end of Primary 7, this same grading system and aggregate/division logic is used for **ALL PRIMARY CLASSES (P.1 through P.7)** throughout their primary education.

---

### 6. School Ranking Logic

Schools usually rank pupils like this:
1. **Lowest aggregate first** (4 is best, 36 is worst)
2. If same aggregate, compare stronger subject grades

**Example:**
- Student A = Aggregate 8 (grades: 1, 2, 2, 3)
- Student B = Aggregate 8 (grades: 2, 2, 2, 2)

Both are aggregate 8, but **Student A ranks higher** because of a Grade 1.

---

### 7. Logic for PwezaCore School Management System

**Step-by-Step Implementation for ALL PRIMARY CLASSES (P.1 - P.7):**

#### **Step 1: Store Raw Marks**
- Example: English = 78

#### **Step 2: Convert Marks to Grade**
- 78% → Grade 3 (70–79 range)

#### **Step 3: Sum Grades (ONLY 4 SUBJECTS)**
- English: Grade 3
- Math: Grade 2
- Science: Grade 1
- SST: Grade 2
- **Aggregate = 3 + 2 + 1 + 2 = 8**

#### **Step 4: Determine Division**

**Pseudo-logic:**
```
IF aggregate <= 12 THEN
  Division = "Division 1"
ELSE IF aggregate <= 23 THEN
  Division = "Division 2"
ELSE IF aggregate <= 29 THEN
  Division = "Division 3"
ELSE IF aggregate <= 34 THEN
  Division = "Division 4"
ELSE
  Division = "Fail" or "U (Ungraded)"
END IF
```

---

### 8. Example Full Student Result (Works for ANY Primary Class)

**Student:** John Doe, **Primary 4** (or any class P.1 - P.7)

**Raw Marks:**
- English = 65
- Mathematics = 82
- Science = 75
- Social Studies = 90

**Convert to Grades:**
- English: 65% → Grade 4 (60–69 range)
- Mathematics: 82% → Grade 2 (80–89 range)
- Science: 75% → Grade 3 (70–79 range)
- Social Studies: 90% → Grade 1 (90–100 range)

**Calculate Aggregate:**
- Aggregate = 4 + 2 + 3 + 1 = **10**

**Determine Division:**
- 10 falls in 4–12 range
- **Result = Division One (D1)**

---

## SQL IMPLEMENTATION

### Function to Calculate Aggregate (ONLY 4 SUBJECTS - ALL PRIMARY CLASSES)

```sql
CREATE OR REPLACE FUNCTION calculate_primary_aggregate(
  p_school_id UUID,
  p_student_id UUID,
  p_exam_set_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_english_grade INTEGER;
  v_math_grade INTEGER;
  v_science_grade INTEGER;
  v_sst_grade INTEGER;
  v_aggregate INTEGER;
BEGIN
  -- Get grades for the 4 core subjects ONLY
  -- This applies to ALL PRIMARY CLASSES (P.1 - P.7)
  
  -- English
  SELECT 
    CASE 
      WHEN marks_obtained >= 90 THEN 1
      WHEN marks_obtained >= 80 THEN 2
      WHEN marks_obtained >= 70 THEN 3
      WHEN marks_obtained >= 60 THEN 4
      WHEN marks_obtained >= 50 THEN 5
      WHEN marks_obtained >= 40 THEN 6
      WHEN marks_obtained >= 30 THEN 7
      WHEN marks_obtained >= 20 THEN 8
      ELSE 9
    END INTO v_english_grade
  FROM exam_results
  WHERE school_id = p_school_id
    AND student_id = p_student_id
    AND exam_set_id = p_exam_set_id
    AND subject = 'English'
  LIMIT 1;
  
  -- Mathematics
  SELECT 
    CASE 
      WHEN marks_obtained >= 90 THEN 1
      WHEN marks_obtained >= 80 THEN 2
      WHEN marks_obtained >= 70 THEN 3
      WHEN marks_obtained >= 60 THEN 4
      WHEN marks_obtained >= 50 THEN 5
      WHEN marks_obtained >= 40 THEN 6
      WHEN marks_obtained >= 30 THEN 7
      WHEN marks_obtained >= 20 THEN 8
      ELSE 9
    END INTO v_math_grade
  FROM exam_results
  WHERE school_id = p_school_id
    AND student_id = p_student_id
    AND exam_set_id = p_exam_set_id
    AND subject IN ('Mathematics', 'Math', 'Maths')
  LIMIT 1;
  
  -- Science
  SELECT 
    CASE 
      WHEN marks_obtained >= 90 THEN 1
      WHEN marks_obtained >= 80 THEN 2
      WHEN marks_obtained >= 70 THEN 3
      WHEN marks_obtained >= 60 THEN 4
      WHEN marks_obtained >= 50 THEN 5
      WHEN marks_obtained >= 40 THEN 6
      WHEN marks_obtained >= 30 THEN 7
      WHEN marks_obtained >= 20 THEN 8
      ELSE 9
    END INTO v_science_grade
  FROM exam_results
  WHERE school_id = p_school_id
    AND student_id = p_student_id
    AND exam_set_id = p_exam_set_id
    AND subject = 'Science'
  LIMIT 1;
  
  -- Social Studies (SST)
  SELECT 
    CASE 
      WHEN marks_obtained >= 90 THEN 1
      WHEN marks_obtained >= 80 THEN 2
      WHEN marks_obtained >= 70 THEN 3
      WHEN marks_obtained >= 60 THEN 4
      WHEN marks_obtained >= 50 THEN 5
      WHEN marks_obtained >= 40 THEN 6
      WHEN marks_obtained >= 30 THEN 7
      WHEN marks_obtained >= 20 THEN 8
      ELSE 9
    END INTO v_sst_grade
  FROM exam_results
  WHERE school_id = p_school_id
    AND student_id = p_student_id
    AND exam_set_id = p_exam_set_id
    AND subject IN ('Social Studies', 'SST', 'Social Studies (SST)')
  LIMIT 1;
  
  -- If any subject is missing, treat as Grade 9 (Fail)
  v_english_grade := COALESCE(v_english_grade, 9);
  v_math_grade := COALESCE(v_math_grade, 9);
  v_science_grade := COALESCE(v_science_grade, 9);
  v_sst_grade := COALESCE(v_sst_grade, 9);
  
  -- Calculate aggregate (sum of 4 grades)
  v_aggregate := v_english_grade + v_math_grade + v_science_grade + v_sst_grade;
  
  RETURN v_aggregate;
END;
$$ LANGUAGE plpgsql;
```

### Function to Calculate Division from Aggregate (ALL PRIMARY CLASSES)

```sql
CREATE OR REPLACE FUNCTION calculate_primary_division(
  p_aggregate INTEGER
)
RETURNS TEXT AS $$
BEGIN
  -- This division logic applies to ALL PRIMARY CLASSES (P.1 - P.7)
  RETURN CASE
    WHEN p_aggregate <= 12 THEN 'Division 1'
    WHEN p_aggregate <= 23 THEN 'Division 2'
    WHEN p_aggregate <= 29 THEN 'Division 3'
    WHEN p_aggregate <= 34 THEN 'Division 4'
    ELSE 'U (Ungraded)'
  END;
END;
$$ LANGUAGE plpgsql;
```

---

## TESTING EXAMPLES

### Test 1: Division 1 (Primary 3 Student)
**Input:**
- English: 90% → Grade 1
- Math: 85% → Grade 2
- Science: 88% → Grade 2
- SST: 92% → Grade 1

**Expected:**
- Aggregate = 1 + 2 + 2 + 1 = **6**
- Division = **Division 1** (4–12 range)

### Test 2: Division 2 (Primary 5 Student)
**Input:**
- English: 75% → Grade 3
- Math: 68% → Grade 4
- Science: 72% → Grade 3
- SST: 65% → Grade 4

**Expected:**
- Aggregate = 3 + 4 + 3 + 4 = **14**
- Division = **Division 2** (13–23 range)

### Test 3: Division 3
**Input:**
- English: 55% → Grade 5
- Math: 62% → Grade 4
- Science: 58% → Grade 5
- SST: 68% → Grade 4

**Expected:**
- Aggregate = 5 + 4 + 5 + 4 = **18**
- Wait, 18 is in Division 2 range (13–23)
- Let me recalculate for Division 3:

**Corrected Test 3:**
- English: 55% → Grade 5
- Math: 48% → Grade 6
- Science: 52% → Grade 5
- SST: 62% → Grade 4

**Expected:**
- Aggregate = 5 + 6 + 5 + 4 = **20**
- Still Division 2... Let me try again:

**Corrected Test 3 (Division 3):**
- English: 45% → Grade 6
- Math: 42% → Grade 6
- Science: 48% → Grade 6
- SST: 52% → Grade 5

**Expected:**
- Aggregate = 6 + 6 + 6 + 5 = **23**
- Still Division 2 (13–23)

**Corrected Test 3 (Division 3):**
- English: 45% → Grade 6
- Math: 42% → Grade 6
- Science: 48% → Grade 6
- SST: 48% → Grade 6

**Expected:**
- Aggregate = 6 + 6 + 6 + 6 = **24**
- Division = **Division 3** (24–29 range)

### Test 4: Division 4
**Input:**
- English: 35% → Grade 7
- Math: 38% → Grade 7
- Science: 42% → Grade 6
- SST: 48% → Grade 6

**Expected:**
- Aggregate = 7 + 7 + 6 + 6 = **26**
- Wait, 26 is Division 3 (24–29)

**Corrected Test 4 (Division 4):**
- English: 35% → Grade 7
- Math: 32% → Grade 7
- Science: 38% → Grade 7
- SST: 42% → Grade 6

**Expected:**
- Aggregate = 7 + 7 + 7 + 6 = **27**
- Still Division 3 (24–29)

**Corrected Test 4 (Division 4):**
- English: 35% → Grade 7
- Math: 32% → Grade 7
- Science: 28% → Grade 8
- SST: 38% → Grade 7

**Expected:**
- Aggregate = 7 + 7 + 8 + 7 = **29**
- Still Division 3 (24–29)

**Corrected Test 4 (Division 4):**
- English: 35% → Grade 7
- Math: 32% → Grade 7
- Science: 28% → Grade 8
- SST: 28% → Grade 8

**Expected:**
- Aggregate = 7 + 7 + 8 + 8 = **30**
- Division = **Division 4** (30–34 range)

### Test 5: Fail (Ungraded)
**Input:**
- English: 25% → Grade 8
- Math: 22% → Grade 8
- Science: 18% → Grade 9
- SST: 28% → Grade 8

**Expected:**
- Aggregate = 8 + 8 + 9 + 8 = **33**
- Division = **Division 4** (30–34 range)

**Corrected Test 5 (Fail):**
- English: 25% → Grade 8
- Math: 22% → Grade 8
- Science: 18% → Grade 9
- SST: 18% → Grade 9

**Expected:**
- Aggregate = 8 + 8 + 9 + 9 = **34**
- Division = **Division 4** (30–34 range)

**Corrected Test 5 (Fail):**
- English: 18% → Grade 9
- Math: 22% → Grade 8
- Science: 18% → Grade 9
- SST: 18% → Grade 9

**Expected:**
- Aggregate = 9 + 8 + 9 + 9 = **35**
- Division = **U (Ungraded) / Fail** (35–36 range)

### Test 6: Missing Subject (Primary 2 Student - Treated as Grade 9)
**Input:**
- English: 75% → Grade 3
- Math: 68% → Grade 4
- Science: MISSING → Grade 9
- SST: 72% → Grade 3

**Expected:**
- Aggregate = 3 + 4 + 9 + 3 = **19**
- Division = **Division 2** (13–23 range)

---

## CRITICAL RULES (APPLIES TO ALL PRIMARY CLASSES P.1 - P.7)

1. **ONLY 4 subjects count:** English, Mathematics, Science, Social Studies (SST)
2. **ALL other subjects are ignored** for aggregate and division
3. **Lower aggregate is better** (4 is best, 36 is worst)
4. **Missing subjects = Grade 9** (Fail)
5. **Grades are 1–9** (not percentages on report card)
6. **Division ranges:**
   - 4–12 = Division 1
   - 13–23 = Division 2
   - 24–29 = Division 3
   - 30–34 = Division 4
   - 35–36 = Fail / U (Ungraded)
7. **This system applies to ALL PRIMARY CLASSES** from Primary 1 to Primary 7

---

## WHAT TO UPDATE

1. **Update aggregate calculation function** to use ONLY 4 subjects for ALL PRIMARY CLASSES (P.1 - P.7)
2. **Update division calculation function** to use correct ranges for ALL PRIMARY CLASSES
3. **Update `processed_primary_exam_results` table** to store correct aggregate and division for ALL PRIMARY CLASSES
4. **Ensure missing subjects are treated as Grade 9** for ALL PRIMARY CLASSES
5. **Test with examples above** using different primary classes (P.1, P.3, P.5, P.7, etc.)

---

## APPLIES TO WHICH CLASSES?

**ALL PRIMARY CLASSES:**
- Primary 1 (P.1)
- Primary 2 (P.2)
- Primary 3 (P.3)
- Primary 4 (P.4)
- Primary 5 (P.5)
- Primary 6 (P.6)
- Primary 7 (P.7)

**The same 4-subject aggregate and division logic applies to ALL of them.**

---

## PRIORITY

🔴 **CRITICAL** - Affects all Primary 1-7 report cards and student performance evaluation

---

## SUMMARY

- **Aggregate = English grade + Math grade + Science grade + SST grade**
- **ONLY these 4 subjects count** (ignore all others)
- **Lower is better** (4 is best, 36 is worst)
- **Division based on aggregate:**
  * 4–12 = Division 1
  * 13–23 = Division 2
  * 24–29 = Division 3
  * 30–34 = Division 4
  * 35–36 = Fail
- **Missing subjects = Grade 9**
- **Applies to ALL PRIMARY CLASSES (P.1 - P.7)**

---

## IMPORTANT CLARIFICATION

**This is NOT just for Primary 7 (P.7)!**

While the Primary Leaving Examination (PLE) is taken at the end of Primary 7, the **same grading system, aggregate calculation, and division logic is used for ALL PRIMARY CLASSES** from Primary 1 through Primary 7.

**Examples:**
- Primary 1 student: Uses 4 subjects (English, Math, Science, SST) for aggregate/division
- Primary 3 student: Uses 4 subjects (English, Math, Science, SST) for aggregate/division
- Primary 5 student: Uses 4 subjects (English, Math, Science, SST) for aggregate/division
- Primary 7 student: Uses 4 subjects (English, Math, Science, SST) for aggregate/division

**All other subjects** (Art, Music, Physical Education, Religious Education, etc.) **appear on the report card** but are **NOT included in aggregate or division calculations**.
