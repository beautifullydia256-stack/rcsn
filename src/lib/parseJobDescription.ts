export interface StructuredJobDescription {
  isStructured: boolean;
  jobTitle?: string;
  reportsTo?: string;
  jobPurpose?: string;
  duties?: string[];
  qualifications?: string[];
  raw: string;
}

export function parseJobDescription(raw?: string | null): StructuredJobDescription {
  if (!raw || !raw.trim()) {
    return { isStructured: false, raw: '' };
  }

  const clean = raw.replace(/\r\n/g, '\n').trim();

  // Check if text has typical structured markers
  const hasStructured =
    /(?:JOB\s*TITLE\s*:|REPORTS\s*TO\s*:|JOB\s*PURPOSE)/i.test(clean);

  if (!hasStructured) {
    return { isStructured: false, raw: clean };
  }

  let jobTitle = '';
  let reportsTo = '';
  let jobPurpose = '';
  let duties: string[] = [];
  let qualifications: string[] = [];

  const titleMatch = clean.match(/(?:JOB\s*TITLE)\s*:\s*([^\n]+)/i);
  if (titleMatch) jobTitle = titleMatch[1].trim();

  const reportsMatch = clean.match(/(?:REPORTS\s*TO)\s*:\s*([^\n]+)/i);
  if (reportsMatch) reportsTo = reportsMatch[1].trim();

  const purposeMatch = clean.match(
    /JOB\s*PURPOSE\s*:?\s*\n*([\s\S]*?)(?=(?:KEY\s*DUTIES|DUTIES\s*AND\s*RESPONSIBILITIES|DUTIES|RESPONSIBILITIES|QUALIFICATIONS|REQUIREMENTS|$))/i
  );
  if (purposeMatch) {
    jobPurpose = purposeMatch[1].trim();
  }

  const dutiesMatch = clean.match(
    /(?:KEY\s*DUTIES\s*AND\s*RESPONSIBILITIES|DUTIES\s*AND\s*RESPONSIBILITIES|KEY\s*DUTIES|RESPONSIBILITIES)\s*:?\s*\n*([\s\S]*?)(?=(?:QUALIFICATIONS\s*AND\s*REQUIREMENTS|QUALIFICATIONS\s*AND\s*SKILLS|QUALIFICATIONS|REQUIREMENTS|$))/i
  );
  if (dutiesMatch) {
    const rawDuties = dutiesMatch[1].trim();
    duties = rawDuties
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => line.replace(/^(\d+\.|\*|-|•)\s*/, ''));
  }

  const qualMatch = clean.match(
    /(?:QUALIFICATIONS\s*AND\s*REQUIREMENTS|QUALIFICATIONS\s*AND\s*SKILLS|QUALIFICATIONS|REQUIREMENTS)\s*:?\s*\n*([\s\S]*$)/i
  );
  if (qualMatch) {
    const rawQual = qualMatch[1].trim();
    qualifications = rawQual
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => line.replace(/^(\d+\.|\*|-|•)\s*/, ''));
  }

  return {
    isStructured: true,
    jobTitle,
    reportsTo,
    jobPurpose,
    duties,
    qualifications,
    raw: clean,
  };
}
