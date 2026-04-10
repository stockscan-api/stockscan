'use client';

import Link from 'next/link';
import { FileText, ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link href="/login" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-4">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <FileText className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">End User Licence Agreement</h1>
              <p className="text-sm text-gray-500">Last updated: April 2026</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-8">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Agreement to Terms</h2>
            <p className="text-gray-600 leading-relaxed">
              By accessing or using StockScan (&quot;the Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, you must not use the Service. These Terms constitute a legally binding agreement between you (&quot;User&quot;, &quot;you&quot;) and StockScan (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Description of Service</h2>
            <p className="text-gray-600 leading-relaxed">
              StockScan is a cloud-based inventory management platform that provides:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
              <li>Inventory tracking and stock management</li>
              <li>Point of Sale (POS) processing</li>
              <li>Job card management for service-based workflows</li>
              <li>Delivery management and tracking</li>
              <li>Reporting and analytics</li>
              <li>Integration with third-party accounting platforms (Xero, QuickBooks, Sage)</li>
              <li>Mobile application for iOS and Android</li>
              <li>Barcode scanning and offline capabilities</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. Account Registration</h2>
            <p className="text-gray-600 leading-relaxed">
              You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your login credentials and for all activities under your account. You must immediately notify us of any unauthorised use.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Subscription & Payments</h2>
            <p className="text-gray-600 leading-relaxed">
              Access to certain features requires a paid subscription. Subscription plans, pricing, and features are described on our platform. We reserve the right to modify pricing with 30 days&apos; notice. Refunds are handled on a case-by-case basis.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Licence Grant</h2>
            <p className="text-gray-600 leading-relaxed">
              We grant you a limited, non-exclusive, non-transferable, revocable licence to use the Service for your internal business purposes. You may not:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
              <li>Sublicense, sell, or redistribute the Service</li>
              <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
              <li>Use the Service for illegal purposes</li>
              <li>Attempt to gain unauthorised access to other users&apos; accounts or data</li>
              <li>Use automated tools to scrape or extract data from the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Data Ownership</h2>
            <p className="text-gray-600 leading-relaxed">
              You retain full ownership of all data you input into the Service, including inventory records, customer information, transaction data, and reports. We do not claim ownership of your data. We act as a data processor on your behalf.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Third-Party Integrations</h2>
            <p className="text-gray-600 leading-relaxed">
              The Service allows integration with third-party accounting platforms (Xero, QuickBooks, Sage). These integrations are governed by the respective third-party&apos;s terms of service and privacy policies. We are not responsible for the actions or policies of third-party services. You authorise us to transmit your data to connected platforms as necessary for the integration to function.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Service Availability</h2>
            <p className="text-gray-600 leading-relaxed">
              We strive to maintain 99.9% uptime but do not guarantee uninterrupted service. We may perform scheduled maintenance with advance notice. We are not liable for service interruptions caused by factors beyond our reasonable control.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">9. Limitation of Liability</h2>
            <p className="text-gray-600 leading-relaxed">
              To the maximum extent permitted by law, StockScan shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or business opportunities, arising from your use of the Service. Our total liability shall not exceed the amount you paid for the Service in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">10. Termination</h2>
            <p className="text-gray-600 leading-relaxed">
              Either party may terminate this agreement at any time. Upon termination, your right to use the Service ceases immediately. We will retain your data for 30 days following termination to allow for data export, after which it may be permanently deleted.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">11. Governing Law</h2>
            <p className="text-gray-600 leading-relaxed">
              These Terms are governed by and construed in accordance with the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">12. Changes to Terms</h2>
            <p className="text-gray-600 leading-relaxed">
              We reserve the right to modify these Terms at any time. Material changes will be communicated via email or through the Service with at least 30 days&apos; notice. Your continued use of the Service after such changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">13. Contact</h2>
            <p className="text-gray-600 leading-relaxed">
              For questions regarding these Terms, please contact:
            </p>
            <div className="mt-3 p-4 bg-gray-50 rounded-lg">
              <p className="font-semibold text-gray-900">StockScan Legal</p>
              <p className="text-gray-600 text-sm">Email: legal@stockscan.uk</p>
            </div>
          </section>
        </div>

        <div className="mt-6 text-center text-sm text-gray-400">
          © {new Date().getFullYear()} StockScan. All rights reserved.
        </div>
      </div>
    </div>
  );
}
