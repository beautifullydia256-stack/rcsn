// Uganda Academic Term Structure
// This configuration is used across the system for term management

export interface TermDefinition {
  term: 1 | 2 | 3;
  name: string;
  startMonth: number; // 1-12
  endMonth: number; // 1-12
  durationMonths: number;
  breakWeeks: number;
  description: string;
}

// Uganda Standard Term Structure
export const UGANDA_TERM_STRUCTURE: TermDefinition[] = [
  {
    term: 1,
    name: 'Term I',
    startMonth: 2, // February
    endMonth: 5,   // May
    durationMonths: 3,
    breakWeeks: 4, // May break: ~3-4 weeks
    description: 'February - May (3 months)'
  },
  {
    term: 2,
    name: 'Term II',
    startMonth: 6, // June (Late May/Early June)
    endMonth: 8,   // August
    durationMonths: 2.5,
    breakWeeks: 4, // August break: ~3-4 weeks
    description: 'June - August (2.5 months)'
  },
  {
    term: 3,
    name: 'Term III',
    startMonth: 9,  // September
    endMonth: 12,   // December
    durationMonths: 3,
    breakWeeks: 8, // December-January break: ~2 months
    description: 'September - December (3 months)'
  }
];

// Get term definition by term number
export const getTermDefinition = (termNumber: 1 | 2 | 3): TermDefinition => {
  return UGANDA_TERM_STRUCTURE[termNumber - 1];
};

// Get default start date for a term in a given year
export const getDefaultTermStartDate = (year: number, term: 1 | 2 | 3): Date => {
  const termDef = getTermDefinition(term);
  
  // Default to first Monday of the start month
  const date = new Date(year, termDef.startMonth - 1, 1);
  
  // Find first Monday
  while (date.getDay() !== 1) {
    date.setDate(date.getDate() + 1);
  }
  
  return date;
};

// Get default end date for a term in a given year
export const getDefaultTermEndDate = (year: number, term: 1 | 2 | 3): Date => {
  const termDef = getTermDefinition(term);
  
  // Last Friday of the end month
  const date = new Date(year, termDef.endMonth, 0); // Last day of month
  
  // Find last Friday
  while (date.getDay() !== 5) {
    date.setDate(date.getDate() - 1);
  }
  
  return date;
};

// Get next term information
export const getNextTerm = (currentTerm: 1 | 2 | 3, currentYear: number): { term: 1 | 2 | 3; year: number } => {
  if (currentTerm === 3) {
    // After Term 3, next is Term 1 of next year
    return { term: 1, year: currentYear + 1 };
  } else {
    // Term 1 → Term 2, Term 2 → Term 3 (same year)
    return { term: (currentTerm + 1) as 1 | 2 | 3, year: currentYear };
  }
};

// Get next term start date
export const getNextTermStartDate = (currentTerm: 1 | 2 | 3, currentYear: number): Date => {
  const nextTerm = getNextTerm(currentTerm, currentYear);
  return getDefaultTermStartDate(nextTerm.year, nextTerm.term);
};

// Format term for display
export const formatTermDisplay = (term: 1 | 2 | 3, year: number): string => {
  const termDef = getTermDefinition(term);
  return `${termDef.name} ${year} (${termDef.description})`;
};

// Check if a date falls within a term
export const isDateInTerm = (date: Date, term: 1 | 2 | 3, year: number): boolean => {
  const startDate = getDefaultTermStartDate(year, term);
  const endDate = getDefaultTermEndDate(year, term);
  return date >= startDate && date <= endDate;
};

// Get current term based on today's date
export const getCurrentTerm = (): { term: 1 | 2 | 3; year: number } => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  
  // Determine term based on month
  if (currentMonth >= 2 && currentMonth <= 5) {
    return { term: 1, year: currentYear };
  } else if (currentMonth >= 6 && currentMonth <= 8) {
    return { term: 2, year: currentYear };
  } else if (currentMonth >= 9 && currentMonth <= 12) {
    return { term: 3, year: currentYear };
  } else {
    // January - still in Term 3 holiday of previous year, but new academic year started
    // Return Term 1 of current year (preparation period)
    return { term: 1, year: currentYear };
  }
};

// Get term info string for display
export const getCurrentTermInfo = (): string => {
  const { term, year } = getCurrentTerm();
  return formatTermDisplay(term, year);
};

// Calculate number of school days in a term (approximate)
export const getTermSchoolDays = (term: 1 | 2 | 3): number => {
  const termDef = getTermDefinition(term);
  // Approximate: 5 school days per week × 4 weeks per month
  const weeks = termDef.durationMonths * 4;
  const schoolDays = weeks * 5;
  return Math.round(schoolDays);
};

// Get all terms for a year
export const getYearTerms = (year: number) => {
  return [1, 2, 3].map(termNum => {
    const term = termNum as 1 | 2 | 3;
    return {
      ...getTermDefinition(term),
      term,
      year,
      startDate: getDefaultTermStartDate(year, term),
      endDate: getDefaultTermEndDate(year, term),
    };
  });
};

