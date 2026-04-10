'use client';

import Link from 'next/link';
import { Shield, ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link href="/login" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-4">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
              <p className="text-sm text-gray-500">Last updated: April 2026</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-8">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Introduction</h2>
            <p className="text-gray-600 leading-relaxed">
              StockScan (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our inventory management platform, including our web portal, mobile applications, and related services (collectively, the &quot;Service&quot;).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Information We Collect</h2>
            <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">2.1 Account Information</h3>
            <p className="text-gray-600 leading-relaxed">When you create an account, we collect your name, email address, company name, and role within your organisation.</p>
            
            <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">2.2 Inventory & Business Data</h3>
            <p className="text-gray-600 leading-relaxed">We store inventory records, product information, job cards, delivery details, transaction history, and invoices that you input into the Service. This data belongs to you and your organisation.</p>
            
            <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">2.3 Integration Data</h3>
            <p className="text-gray-600 leading-relaxed">When you connect third-party accounting platforms (Xero, QuickBooks, Sage), we process data necessary to synchronise your sales, invoices, and customer information. We only access the minimum data required for the integration to function.</p>

            <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">2.4 Usage Data</h3>
            <p className="text-gray-600 leading-relaxed">We automatically collect device information, IP addresses, browser type, and usage patterns to improve our Service and ensure security.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li>To provide, maintain, and improve the Service</li>
              <li>To process inventory transactions and generate reports</li>
              <li>To synchronise data with your connected accounting platforms</li>
              <li>To send important notifications about your account or the Service</li>
              <li>To detect, prevent, and address security issues</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Data Sharing & Third Parties</h2>
            <p className="text-gray-600 leading-relaxed">
              We do not sell your personal data. We share data only with:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
              <li><strong>Accounting platforms</strong> (Xero, QuickBooks, Sage) — only when you explicitly connect them via OAuth</li>
              <li><strong>Cloud infrastructure providers</strong> — for hosting and data storage</li>
              <li><strong>Legal authorities</strong> — when required by law or to protect our rights</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Data Security</h2>
            <p className="text-gray-600 leading-relaxed">
              We implement industry-standard security measures including:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
              <li>OAuth 2.0 with PKCE for third-party integrations (bank-level security)</li>
              <li>JWT token-based authentication with automatic refresh</li>
              <li>Encrypted data transmission (TLS/SSL)</li>
              <li>Role-based access control (RBAC)</li>
              <li>Regular security audits and monitoring</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Your Rights (GDPR)</h2>
            <p className="text-gray-600 leading-relaxed">Under the General Data Protection Regulation (GDPR), you have the right to:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-600 mt-2">
              <li><strong>Access</strong> — Request a copy of your personal data</li>
              <li><strong>Rectification</strong> — Request correction of inaccurate data</li>
              <li><strong>Erasure</strong> — Request deletion of your data (&quot;right to be forgotten&quot;)</li>
              <li><strong>Portability</strong> — Request your data in a machine-readable format</li>
              <li><strong>Restrict processing</strong> — Request limited use of your data</li>
              <li><strong>Object</strong> — Object to processing of your data</li>
              <li><strong>Withdraw consent</strong> — Withdraw previously given consent at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Data Retention</h2>
            <p className="text-gray-600 leading-relaxed">
              We retain your data for as long as your account is active. Upon account deletion, we will remove your personal data within 30 days, except where retention is required by law. Inventory and transaction records may be retained for up to 7 years to comply with financial regulations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Cookies</h2>
            <p className="text-gray-600 leading-relaxed">
              We use essential cookies for authentication and session management. We do not use third-party advertising cookies. Analytics cookies may be used to improve the Service, and you can disable these through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">9. Children&apos;s Privacy</h2>
            <p className="text-gray-600 leading-relaxed">
              The Service is not intended for individuals under 16 years of age. We do not knowingly collect personal data from children.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">10. Changes to This Policy</h2>
            <p className="text-gray-600 leading-relaxed">
              We may update this Privacy Policy periodically. We will notify you of material changes via email or through the Service. Continued use after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">11. Contact Us</h2>
            <p className="text-gray-600 leading-relaxed">
              If you have questions about this Privacy Policy or wish to exercise your rights, please contact us at:
            </p>
            <div className="mt-3 p-4 bg-gray-50 rounded-lg">
              <p className="font-semibold text-gray-900">StockScan Data Protection</p>
              <p className="text-gray-600 text-sm">Email: privacy@stockscan.uk</p>
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
