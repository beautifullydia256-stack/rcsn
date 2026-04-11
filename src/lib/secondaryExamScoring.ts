/** O-Level (Senior 1–4) activity band labels — Basic / Moderate / Outstanding (ECS-style). */

export type SecondaryDescriptor = 'Basic' | 'Moderate' | 'Outstanding';

export function calculateActivityDescriptor(activityScore: number): SecondaryDescriptor {
  if (activityScore < 1) return 'Basic';
  if (activityScore < 2.5) return 'Moderate';
  return 'Outstanding';
}

export function calculateSecondaryLetterGrade(finalScore: number): 'A' | 'B' | 'C' | 'D' | 'E' {
  if (finalScore >= 80) return 'A';
  if (finalScore >= 70) return 'B';
  if (finalScore >= 60) return 'C';
  if (finalScore >= 50) return 'D';
  return 'E';
}
