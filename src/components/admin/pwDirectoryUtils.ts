export const PW_DIRECTORY_GRADIENTS = [
  'linear-gradient(135deg,#ffb547,#ff4f6a)',
  'linear-gradient(135deg,#3d7eff,#9d7eff)',
  'linear-gradient(135deg,#27e09f,#3d7eff)',
  'linear-gradient(135deg,#9d7eff,#ff4f6a)',
  'linear-gradient(135deg,#ff4f6a,#ffb547)',
  'linear-gradient(135deg,#00e5c3,#9d7eff)',
  'linear-gradient(135deg,#9d7eff,#00e5c3)',
];

export function pwDirInitials(name: string): string {
  return (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function pwDirGrad(i: number): string {
  return PW_DIRECTORY_GRADIENTS[i % PW_DIRECTORY_GRADIENTS.length];
}

export type PwParChipTone = 'green' | 'amber' | 'rose' | 'teal' | 'violet' | 'muted';

export function pwRoleToChipTone(role: string): PwParChipTone {
  switch (role) {
    case 'admin':
    case 'owner':
      return 'violet';
    case 'head_teacher':
      return 'amber';
    case 'teacher':
      return 'teal';
    case 'accountant':
      return 'green';
    case 'parent':
      return 'violet';
    case 'student':
      return 'teal';
    case 'librarian':
      return 'teal';
    case 'lab_technician':
      return 'teal';
    case 'clinician':
      return 'rose';
    default:
      return 'muted';
  }
}
