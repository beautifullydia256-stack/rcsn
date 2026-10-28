import { GovRollingBox } from './GovLoadingIndicator';

/**
 * Clean loading view that matches the app theme.
 * Displays the signature institutional rolling box.
 */
export default function ThemedLoadingView() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F4F4F6] transition-colors duration-150">
      <GovRollingBox size="lg" tone="dark" />
    </div>
  );
}
