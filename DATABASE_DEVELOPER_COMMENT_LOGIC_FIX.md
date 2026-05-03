# DATABASE DEVELOPER: Comment Resolution Logic Fix

## CRITICAL ISSUE: Average Calculation is WRONG

The current average calculation in `PrimaryReportGenerator.tsx` is incorrect. It needs to be fixed.

---

## NURSERY OLD FORMAT (Marks-based System)

### Current Implementation (WRONG):
```typescript
// WRONG: Divides by total possible marks or subjects taken
const totalMarks = resultsForCalculation.reduce((sum, result) => sum + (result.marks_obtained || 0), 0);
const totalPossibleMarks = resultsForCalculation.reduce((sum, result) => sum + (result.total_marks || 100), 0);
const average = (totalMarks / totalPossibleMarks) * 100;
```

### Required Implementation (CORRECT):
```typescript
// CORRECT: Divide by TOTAL CLASS SUBJECTS (not subjects taken)
const totalMarks = resultsForCalculation.reduce((sum, result) => sum + (result.marks_obtained || 0), 0);
const totalClassSubjects = getTotalClassSubjects(className); // Get from database or count all subjects for this class
const average = totalMarks / totalClassSubjects;
```

### Examples:

**Example 1: Student completes all subjects**
- Class has 5 subjects
- Student gets: 50, 50, 50, 50, 50
- Total marks: 250
- **Average = 250 ÷ 5 = 50**
- Use comment for 50%

**Example 2: Student misses some subjects**
- Class has 5 subjects
- Student gets: 50, 50, 50 (missed 2 subjects)
- Total marks: 150
- **Average = 150 ÷ 5 = 30** (NOT 150 ÷ 3 = 50)
- Use comment for 30%
- **We don't care if student missed exams - always divide by total class subjects**

### Database Query Needed:
You need to provide the **total number of subjects for each class** so the frontend can calculate average correctly.

**Option 1: Add to exam results query**
```sql
-- Add total_class_subjects to the result
SELECT 
  er.*,
  (SELECT COUNT(DISTINCT subject) 
   FROM exam_results 
   WHERE class_name = er.class_name 
   AND school_id = er.school_id) as total_class_subjects
FROM exam_results er
```

**Option 2: Separate query**
```sql
-- Query to get total subjects per class
SELECT class_name, COUNT(DISTINCT subject) as total_subjects
FROM exam_results
WHERE school_id = ?
GROUP BY class_name
```

---

## NURSERY LATEST FORMAT (Ratings-based System)

### Current Implementation:
**DOES NOT EXIST** - needs to be created

### Required Implementation:

**Step 1: Count rating occurrences**
```typescript
// Count how many times each rating appears
const ratingCounts = {
  'Very Good': 0,
  'Good': 0,
  'Needs Improvement': 0,
  'Tries': 0
};

// Loop through all nursery_skill_performance data
allStudentResults.forEach(result => {
  if (result.nursery_skill_performance) {
    const performance = JSON.parse(result.nursery_skill_performance);
    Object.values(performance).forEach(rating => {
      if (ratingCounts[rating] !== undefined) {
        ratingCounts[rating]++;
      }
    });
  }
});
```

**Step 2: Find most frequent rating**
```typescript
// Find the rating with highest count
let maxCount = 0;
let mostFrequentRating = null;

Object.entries(ratingCounts).forEach(([rating, count]) => {
  if (count > maxCount) {
    maxCount = count;
    mostFrequentRating = rating;
  }
});
```

**Step 3: Handle ties (choose best rating)**
```typescript
// If there's a tie, choose the best rating
const ratingPriority = {
  'Very Good': 1,
  'Good': 2,
  'Needs Improvement': 3,
  'Tries': 4
};

// Find all ratings with max count
const topRatings = Object.entries(ratingCounts)
  .filter(([rating, count]) => count === maxCount)
  .map(([rating]) => rating);

// If multiple ratings have same count, choose the best one
if (topRatings.length > 1) {
  mostFrequentRating = topRatings.sort((a, b) => 
    ratingPriority[a] - ratingPriority[b]
  )[0];
}
```

**Step 4: Get comment for that rating**
```typescript
// Query database for comment based on rating
// You need to create a mapping table or use existing comment settings

// Option 1: Use existing comment settings with special ranges
// Map ratings to percentage ranges:
// - "Very Good" → 75-100%
// - "Good" → 50-74%
// - "Needs Improvement" → 25-49%
// - "Tries" → 0-24%

const ratingToPercentage = {
  'Very Good': 87.5,      // midpoint of 75-100
  'Good': 62,             // midpoint of 50-74
  'Needs Improvement': 37, // midpoint of 25-49
  'Tries': 12             // midpoint of 0-24
};

const equivalentPercentage = ratingToPercentage[mostFrequentRating];

// Then use existing comment resolution logic with this percentage
```

### Examples:

**Example 1: Clear winner**
- 15 skills total
- "Very Good": 8 times
- "Good": 4 times
- "Needs Improvement": 2 times
- "Tries": 1 time
- **Result: Use "Very Good" comment**

**Example 2: Tie - choose best**
- 15 skills total
- "Very Good": 5 times
- "Good": 3 times
- "Needs Improvement": 5 times (TIE with Very Good)
- "Tries": 2 times
- **Result: Use "Very Good" comment** (best rating wins)

**Example 3: Three-way tie**
- 12 skills total
- "Very Good": 4 times
- "Good": 4 times (TIE)
- "Needs Improvement": 4 times (TIE)
- "Tries": 0 times
- **Result: Use "Very Good" comment** (highest priority)

---

## DATABASE CHANGES NEEDED

### 1. Add total_class_subjects to exam results
Update `generate_nursery_report_data_v2` and `get_nursery_report_data_v2` to include total class subjects count.

### 2. Create nursery rating comment settings (OPTIONAL)
If you want separate comment settings for nursery ratings:

```sql
CREATE TABLE nursery_rating_comments_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(school_id),
  rating TEXT NOT NULL, -- 'Very Good', 'Good', 'Needs Improvement', 'Tries'
  class_teacher_comment TEXT,
  head_teacher_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, rating)
);
```

**OR** use existing `class_teacher_comments_settings` and `headteacher_comments_settings` with percentage mapping as shown above.

---

## FRONTEND CHANGES NEEDED

### File: `app/dashboard/admin/reports/generate/components/PrimaryReportGenerator.tsx`

**Location: Lines 858-910 (comment resolution logic)**

### Change 1: Fix average calculation for Nursery Old Format
```typescript
// OLD (WRONG):
const average = totalPossibleMarks && totalPossibleMarks > 0 
  ? (totalMarks! / totalPossibleMarks) * 100 
  : null;

// NEW (CORRECT):
const totalClassSubjects = getTotalClassSubjects(className, allStudentResults);
const average = totalClassSubjects > 0 
  ? totalMarks! / totalClassSubjects 
  : null;

// Helper function to get total class subjects
function getTotalClassSubjects(className: string, results: any[]): number {
  // Get unique subjects for this class from all results
  const uniqueSubjects = new Set(
    results
      .filter(r => r.class_name === className)
      .map(r => r.subject)
  );
  return uniqueSubjects.size;
}
```

### Change 2: Add comment resolution for Nursery Latest Format
```typescript
// Add BEFORE existing comment resolution logic (around line 950)

// Special handling for Nursery Latest Format (ratings-based)
if (isNurseryClass && detectedNurseryFormat === 'latest') {
  const mostFrequentRating = getMostFrequentRating(allStudentResults);
  const equivalentPercentage = mapRatingToPercentage(mostFrequentRating);
  
  // Use equivalentPercentage for comment resolution
  boundedAverage = equivalentPercentage;
}

// Helper functions
function getMostFrequentRating(results: any[]): string {
  const ratingCounts = {
    'Very Good': 0,
    'Good': 0,
    'Needs Improvement': 0,
    'Tries': 0
  };
  
  results.forEach(result => {
    if (result.nursery_skill_performance) {
      const performance = JSON.parse(result.nursery_skill_performance);
      Object.values(performance).forEach((rating: any) => {
        if (ratingCounts[rating] !== undefined) {
          ratingCounts[rating]++;
        }
      });
    }
  });
  
  // Find max count
  const maxCount = Math.max(...Object.values(ratingCounts));
  
  // Get all ratings with max count
  const topRatings = Object.entries(ratingCounts)
    .filter(([_, count]) => count === maxCount)
    .map(([rating]) => rating);
  
  // If tie, choose best rating
  const ratingPriority = {
    'Very Good': 1,
    'Good': 2,
    'Needs Improvement': 3,
    'Tries': 4
  };
  
  return topRatings.sort((a, b) => 
    ratingPriority[a] - ratingPriority[b]
  )[0];
}

function mapRatingToPercentage(rating: string): number {
  const mapping = {
    'Very Good': 87.5,
    'Good': 62,
    'Needs Improvement': 37,
    'Tries': 12
  };
  return mapping[rating] || 50;
}
```

---

## SUMMARY

### Nursery Old Format (Marks):
- **Average = Total Marks ÷ Total Class Subjects**
- Always divide by total class subjects, even if student missed exams
- Use percentage-based comment settings

### Nursery Latest Format (Ratings):
- **Count rating occurrences**
- **Use most frequent rating**
- **If tie, choose best rating** (Very Good > Good > Needs Improvement > Tries)
- Map rating to percentage and use existing comment settings

---

## ACTION REQUIRED

**Database Developer:**
1. Provide total class subjects count in exam results query
2. Verify `nursery_skill_performance` JSON structure is accessible
3. Consider creating nursery rating comment settings table (optional)

**Frontend Developer:**
1. Fix average calculation to divide by total class subjects
2. Add rating-based comment resolution for Nursery Latest Format
3. Test with both nursery formats

---

**PRIORITY: HIGH**
**AFFECTS: All report card comments for Nursery classes**
