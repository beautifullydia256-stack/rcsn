import ParentPageScaffold, { parentPortal } from '@/components/parent/ParentPageScaffold';

export default function ParentSettingsPage() {
  return (
    <ParentPageScaffold
      title="Settings"
      description="Simple preferences for the parent portal."
    >
      <div className={parentPortal.card}>
        <h2 className="text-base font-semibold text-[#e8eeff]">Appearance</h2>
        <p className="mt-2 text-sm text-[#b0bdd8] leading-relaxed">
          The parent portal uses a fixed dark theme so it stays consistent with the school app and easy to read.
        </p>
      </div>
      <div className={`${parentPortal.card} mt-4`}>
        <h2 className="text-base font-semibold text-[#e8eeff]">Account</h2>
        <p className="mt-2 text-sm text-[#b0bdd8] leading-relaxed">
          To change your password, sign out and use the password recovery link on the login page, or ask the school to
          resend portal setup instructions.
        </p>
      </div>
    </ParentPageScaffold>
  );
}
