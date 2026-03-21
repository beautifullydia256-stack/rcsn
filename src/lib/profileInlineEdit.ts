/** Confirm before persisting profile changes from inline edit mode */
export function confirmProfileSave(): boolean {
  return window.confirm('Are you sure you want to save these changes?');
}

/** Escape for use inside double-quoted HTML attributes */
export function escapeAttr(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => reject(new Error('Failed to read file'));
    r.readAsDataURL(file);
  });
}
