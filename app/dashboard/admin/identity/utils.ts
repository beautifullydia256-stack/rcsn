// Utility functions for Identity Module

/**
 * Format a date to DD/MM/YYYY format
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Calculate expiry date (default: 1 year from now)
 */
export function calculateExpiryDate(yearsFromNow: number = 1): Date {
  const expiry = new Date();
  expiry.setFullYear(expiry.getFullYear() + yearsFromNow);
  return expiry;
}

/**
 * Generate verification URL for a student
 */
export function generateVerificationUrl(
  studentId: string,
  baseUrl?: string
): string {
  const base = baseUrl || window.location.origin;
  return `${base}/verify?id=${studentId}`;
}

/**
 * Get student initials from name
 */
export function getStudentInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Validate student data for ID card generation
 */
export function validateStudentData(student: any): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!student.student_id) errors.push("Student ID is required");
  if (!student.name) errors.push("Student name is required");
  if (!student.admission_number && !student.student_id)
    errors.push("Admission number or student ID is required");
  if (!student.school_id) errors.push("School ID is required");

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get status badge color
 */
export function getStatusColor(
  status: string
): { bg: string; text: string; border: string } {
  const normalizedStatus = status?.toLowerCase();

  switch (normalizedStatus) {
    case "active":
      return {
        bg: "bg-green-100",
        text: "text-green-800",
        border: "border-green-200",
      };
    case "inactive":
      return {
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        border: "border-yellow-200",
      };
    case "suspended":
      return {
        bg: "bg-red-100",
        text: "text-red-800",
        border: "border-red-200",
      };
    default:
      return {
        bg: "bg-gray-100",
        text: "text-gray-800",
        border: "border-gray-200",
      };
  }
}

/**
 * Download blob as file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Generate safe filename from student name
 */
export function generateFilename(
  studentName: string,
  extension: "pdf" | "png"
): string {
  const safeName = studentName
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return `${safeName}_ID_Card.${extension}`;
}

/**
 * Check if image URL is accessible
 */
export async function isImageAccessible(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get placeholder image data URL
 */
export function getPlaceholderImage(initial: string, size: number = 280): string {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  if (!ctx) return "";

  // Gradient background
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, "#667eea");
  gradient.addColorStop(1, "#764ba2");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Initial text
  ctx.fillStyle = "white";
  ctx.font = `bold ${size / 2}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(initial, size / 2, size / 2);

  return canvas.toDataURL();
}
