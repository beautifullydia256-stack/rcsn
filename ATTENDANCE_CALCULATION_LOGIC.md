# Attendance Calculation Logic

## 📊 **Enhanced Attendance Calculation**

The Student Report feature now uses a sophisticated attendance calculation system that accurately reflects the actual school term period.

## 🎯 **How It Works**

### **Calculation Period**
Attendance is calculated based on the **complete term period**:

1. **Start Date**: First attendance record for the **class** (not just the student)
2. **End Date**: When the **LAST exam set for that term** was activated (e.g., "End of Term")
3. **School Days**: Only weekdays (Monday to Friday) are counted
4. **Attendance Records**: Only attendance within this complete term period is counted

### **Example Scenario**
```
First class attendance recorded: 15/01/2025
Last exam set for Term 1 activated: 16/04/2025 (End of Term)
Total school days: 65 days (weekdays only)
Student present: 58 days (within this complete term period)
Attendance percentage: 89.2%
```

**Important**: All exam sets for the same term (Beginning of Term, Mid Term, End of Term) will show the same attendance calculation based on the complete term period from first class attendance to when the LAST exam set for that term was activated.

## 🔧 **Technical Implementation**

### **Key Functions**

#### `calculateAttendancePercentage(attendance, examSet, allExamSets)`
- Calculates attendance percentage based on **complete term period**
- Uses first class attendance date to **LAST exam set for that term** activation date
- Only counts weekdays as school days
- Only counts attendance records within the complete term period

#### `calculateSchoolDaysBetween(startDate, endDate)`
- Counts weekdays between two dates
- Excludes weekends (Saturday and Sunday)
- Returns total school days in the period

#### `getAttendanceDetails(attendance, examSet, allExamSets)`
- Returns comprehensive attendance information for **complete term period**
- Includes total school days, present days, absent days
- Provides formatted dates, percentage, and last exam set name
- Filters attendance records to only include those within the complete term period

### **Data Structure**
```typescript
interface AttendanceDetails {
  totalSchoolDays: number;    // Total weekdays in complete term period
  presentDays: number;        // Days student was present
  absentDays: number;         // Days student was absent
  percentage: number;         // Attendance percentage
  firstAttendanceDate: string; // Formatted start date (first class attendance)
  lastSchoolDay: string;      // Formatted end date (last exam set activation)
  lastExamSetName: string;    // Name of the last exam set for the term
}
```

## 📋 **Report Display**

### **Summary Section**
- **Attendance**: `58/65 days (89.2%)`
- Shows present days vs total school days with percentage

### **Attendance Details Section**
- **Period**: `15 January 2025 to 16 April 2025`
- **Last Exam Set**: `End of Term`
- **Total School Days**: `65`
- **Days Present**: `58`
- **Days Absent**: `7`

## 🎨 **Visual Representation**

### **In Browser Preview**
```
ATTENDANCE DETAILS
Period: 15 January 2025 to 16 April 2025
Last Exam Set: End of Term
Total School Days: 65
Days Present: 58
Days Absent: 7
```

### **In DOCX Export**
Professional table format with all attendance details included.

## ⚡ **Benefits**

### **Accuracy**
- ✅ Based on actual school term period
- ✅ Excludes weekends automatically
- ✅ Uses real exam set activation dates
- ✅ Accounts for actual attendance records

### **Transparency**
- ✅ Shows exact period calculated
- ✅ Displays total school days
- ✅ Breaks down present vs absent days
- ✅ Provides clear percentage calculation

### **Flexibility**
- ✅ Works with any exam set
- ✅ Adapts to different term lengths
- ✅ Handles irregular attendance patterns
- ✅ Supports multiple exam sets per term

## 🔍 **Edge Cases Handled**

### **No Attendance Records**
- Returns 0% attendance
- Shows "No attendance data available"

### **No Exam Set**
- Uses current date as end date
- Calculates from first attendance to today

### **Weekend Dates**
- Automatically excludes weekends
- Only counts Monday to Friday

### **Invalid Dates**
- Handles date parsing errors gracefully
- Returns safe default values

## 📊 **Example Calculations**

### **Scenario 1: Term 1 with Multiple Exam Sets**
```
Exam Sets: "Beginning of Term", "Mid Term", "End of Term"
Last Exam Set: "End of Term" (activated 16/04/2025)
Period: 15/01/2025 to 16/04/2025 (complete term)
Total weekdays: 65
Present days: 58 (within complete term period)
Absent days: 7
Percentage: 89.2%

Note: All exam sets for Term 1 will show the same attendance calculation
```

### **Scenario 2: Term 2 with Different Period**
```
Exam Sets: "Beginning of Term", "Mid Term", "End of Term"
Last Exam Set: "End of Term" (activated 15/08/2025)
Period: 20/05/2025 to 15/08/2025 (complete term)
Total weekdays: 62
Present days: 60 (within complete term period)
Absent days: 2
Percentage: 96.8%
```

### **Scenario 3: Perfect Attendance**
```
Exam Sets: "Beginning of Term", "Mid Term", "End of Term"
Last Exam Set: "End of Term" (activated 10/12/2025)
Period: 15/09/2025 to 10/12/2025 (complete term)
Total weekdays: 60
Present days: 60 (within complete term period)
Absent days: 0
Percentage: 100%
```

## 🚀 **Usage in Reports**

The enhanced attendance calculation is automatically used in:

1. **Report Preview** - Shows detailed attendance information
2. **DOCX Export** - Includes attendance details table
3. **Print Reports** - Professional formatting for printing
4. **Bulk Reports** - Consistent calculation across all students

## 🔧 **Configuration**

### **School Days**
Currently set to Monday-Friday (5 days per week). Can be modified in `calculateSchoolDaysBetween()` function if needed.

### **Date Format**
Uses `formatDate()` function for consistent date display across the application.

### **Percentage Rounding**
Attendance percentages are rounded to the nearest whole number for clarity.

---

This enhanced attendance calculation provides accurate, transparent, and professional attendance reporting that meets the standards of Ugandan schools while providing detailed insights into student attendance patterns.
