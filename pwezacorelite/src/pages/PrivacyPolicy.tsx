import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const PrivacyPolicy = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-2xl prose prose-sm dark:prose-invert">
        <h1 className="font-display text-3xl font-bold mb-6">Privacy Policy</h1>
        <p className="text-muted-foreground">Last updated: February 2026</p>
        <h2 className="font-display">Data Collection</h2>
        <p>We collect only the data necessary to provide school management services, including school information, staff details, student records, and financial data.</p>
        <h2 className="font-display">Data Security</h2>
        <p>All data is encrypted in transit and at rest. We use row-level security to ensure each school's data is completely isolated.</p>
        <h2 className="font-display">Data Sharing</h2>
        <p>We do not sell or share your data with third parties. Data is only accessed by authorized school staff based on their role permissions.</p>
        <h2 className="font-display">Your Rights</h2>
        <p>You have the right to access, correct, or delete your data at any time. Contact us at privacy@pwezacore.com for any requests.</p>
      </div>
    </div>
    <Footer />
  </div>
);

export default PrivacyPolicy;
