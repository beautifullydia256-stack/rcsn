import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const AffiliateTerms = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-2xl prose prose-sm dark:prose-invert">
        <h1 className="font-display text-3xl font-bold mb-6">Affiliate Terms & Conditions</h1>
        <p className="text-muted-foreground">Last updated: February 2026</p>
        <h2 className="font-display">1. Eligibility</h2>
        <p>Anyone aged 18 or older may participate in the PwezaCore Affiliate Program. You must provide accurate information when registering.</p>
        <h2 className="font-display">2. Commission Structure</h2>
        <p>Affiliates earn 20% recurring commission on all referred school subscriptions for up to 12 months from the referral date.</p>
        <h2 className="font-display">3. Payment</h2>
        <p>Commissions are paid monthly via mobile money or bank transfer. Minimum payout threshold is $50.</p>
        <h2 className="font-display">4. Prohibited Activities</h2>
        <p>Spam, misleading claims, and unauthorized use of PwezaCore branding are strictly prohibited and may result in termination.</p>
        <h2 className="font-display">5. Termination</h2>
        <p>PwezaCore reserves the right to modify or terminate the program at any time with 30 days notice.</p>
      </div>
    </div>
    <Footer />
  </div>
);

export default AffiliateTerms;
