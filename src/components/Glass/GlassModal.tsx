import { ReactNode } from 'react';
import NativeModal from '../NativeModal';

export interface GlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

export function GlassModal({
  isOpen,
  onClose,
  children,
  title,
  size = 'md',
}: GlassModalProps) {
  return (
    <NativeModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
    >
      {children}
    </NativeModal>
  );
}

export default GlassModal;




