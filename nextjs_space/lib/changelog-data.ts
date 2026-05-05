export type ChangelogEntry = {
  version: string;
  date: string;
  title: string;
  type: 'feature' | 'fix' | 'major' | 'improvement';
  changes: string[];
};

export type MonthGroup = {
  month: string;
  entries: ChangelogEntry[];
};

export const changelogData: MonthGroup[] = [
  {
    month: 'May 2026',
    entries: [
      {
        version: 'v1.14.0',
        date: '5th May 2026',
        title: 'Password Reset',
        type: 'feature',
        changes: [
          'Added "Forgot Password?" option on the login screen',
          'Users receive a 6-digit reset code via email',
          'New Reset Password screen to enter code and set a new password',
          'Codes expire after 30 minutes for security',
        ],
      },
      {
        version: 'v1.13.19',
        date: '5th May 2026',
        title: 'Dismissible Warehouse Warning',
        type: 'improvement',
        changes: [
          'Warning banner on Add Product screen can now be dismissed with an X button',
          'Dismiss choice persists across sessions',
          'Automatically reappears if default warehouse is later removed',
        ],
      },
      {
        version: 'v1.13.18',
        date: '5th May 2026',
        title: 'No Default Warehouse Warning',
        type: 'feature',
        changes: [
          'Added amber warning banner when adding a product with no default warehouse configured',
          'Guides users to set up a warehouse before stock tracking begins',
        ],
      },
      {
        version: 'v1.13.17',
        date: '5th May 2026',
        title: 'Status Chip Text Fix',
        type: 'fix',
        changes: [
          'Fixed clipped text on status chips (Pending, Completed, etc.) across Stock Transfers, Stock Takes, Purchase Orders, Sales History, and License Keys screens',
        ],
      },
      {
        version: 'v1.13.16',
        date: '5th May 2026',
        title: 'Warehouse Creation Fix',
        type: 'fix',
        changes: ['Fixed 404 error when creating a new warehouse'],
      },
      {
        version: 'v1.13.15',
        date: '5th May 2026',
        title: 'Improved Duplicate Email Error',
        type: 'improvement',
        changes: ['Clearer error message when signing up with an already registered email address'],
      },
      {
        version: 'v1.13.14',
        date: '4th May 2026',
        title: 'Signup License Key Fix',
        type: 'fix',
        changes: ['Fixed signup flow not accepting license keys generated from the admin panel'],
      },
      {
        version: 'v1.13.12',
        date: '2nd May 2026',
        title: 'Unified License System',
        type: 'feature',
        changes: [
          'Both legacy product codes and new license keys now work for signup',
          'Code generation and deletion restricted to administrators only',
        ],
      },
      {
        version: 'v1.13.11',
        date: '2nd May 2026',
        title: 'Product Codes API Fix',
        type: 'fix',
        changes: ['Fixed server error when accessing product codes endpoints'],
      },
      {
        version: 'v1.13.10',
        date: '1st May 2026',
        title: 'Legal Pages Fix',
        type: 'fix',
        changes: ['Fixed Privacy Policy and EULA pages not loading in production'],
      },
    ],
  },
  {
    month: 'April 2026',
    entries: [
      {
        version: 'v1.13.9',
        date: '30th April 2026',
        title: 'iPad Support',
        type: 'feature',
        changes: ['Re-enabled iPad support for enterprise customers'],
      },
      {
        version: 'v1.13.7',
        date: '30th April 2026',
        title: 'Live Chat Fix',
        type: 'fix',
        changes: [
          'Fixed in-app live chat getting stuck on loading screen',
          'Added timeout fallback for better reliability',
        ],
      },
      {
        version: 'v1.13.4',
        date: '30th April 2026',
        title: 'Receive Goods Fix',
        type: 'fix',
        changes: ['Fixed blank screen and confirm receipt error on Receive Goods'],
      },
      {
        version: 'v1.13.2',
        date: '29th April 2026',
        title: 'Offline Product Cache Fix',
        type: 'fix',
        changes: ['Fixed stale data showing in product list when offline cache was outdated'],
      },
      {
        version: 'v1.13.0',
        date: '28th April 2026',
        title: 'Warehouse Access Control',
        type: 'major',
        changes: [
          'Per-user warehouse assignments \u2014 control who sees what',
          'Owners and managers automatically see all warehouses',
          'Staff and delivery clerks only see their assigned warehouses',
          'POS sales deduct stock from the user\'s assigned warehouse',
        ],
      },
      {
        version: 'v1.12.0',
        date: '28th April 2026',
        title: 'Multi-Site Inventory \u2014 Phase 2',
        type: 'major',
        changes: [
          'Warehouse dropdown pickers on stock transfers',
          'Dashboard multi-site overview with unit counts and low stock alerts',
          'Warehouse-aware stock adjustments for POs, POS sales, and refunds',
          'Inter-site transfers track movement between warehouses',
        ],
      },
      {
        version: 'v1.11.0',
        date: '28th April 2026',
        title: 'Multi-Site Inventory Management',
        type: 'major',
        changes: [
          'Create and manage multiple warehouse sites',
          'Per-site stock views and stock levels',
          'Site detail screen with stock search',
          'Edit site information and settings',
        ],
      },
      {
        version: 'v1.10.3',
        date: '27th April 2026',
        title: 'Purchase Order Stability',
        type: 'fix',
        changes: [
          'Fixed crash on PO detail screen caused by date formatting',
          'Fixed PO "not found" error from response data mismatch',
        ],
      },
      {
        version: 'v1.10.0',
        date: '24th April 2026',
        title: 'Reorder to Purchase Order',
        type: 'feature',
        changes: [
          'Create purchase orders directly from reorder list',
          'Items automatically grouped by supplier',
          'Collapsible supplier groups for easier navigation',
        ],
      },
      {
        version: 'v1.9.0',
        date: '24th April 2026',
        title: 'Stock Take & Price Display Fixes',
        type: 'fix',
        changes: [
          'Fixed \u00a3NaN displaying on stock take review and purchase orders',
          'Fixed stock take search to handle large product catalogues',
        ],
      },
      {
        version: 'v1.8.6',
        date: '23rd April 2026',
        title: 'Stock Transfer & Take Fixes',
        type: 'fix',
        changes: [
          'Fixed stock transfers showing 0 available stock',
          'Fixed stock take creation errors',
          'Fixed PO total showing \u00a30.00',
        ],
      },
      {
        version: 'v1.8.2',
        date: '21st April 2026',
        title: 'Manual Product Entry & Module Management',
        type: 'feature',
        changes: [
          'Manual product search picker for stock transfers and stock takes',
          'New manual purchase order creation screen',
          'Module Management moved to Profile tab for easier access',
        ],
      },
      {
        version: 'v1.7.19',
        date: '13th April 2026',
        title: 'Strict Stock Validation',
        type: 'feature',
        changes: ['Added validation to prevent negative inventory quantities'],
      },
      {
        version: 'v1.7.12',
        date: '9th April 2026',
        title: 'Accounting Integrations',
        type: 'major',
        changes: [
          'Xero, QuickBooks and Sage integration with OAuth 2.0 authentication',
          'Sales export to connected accounting software',
          'Token management and sync logging',
          'Privacy Policy and EULA legal documents added',
        ],
      },
      {
        version: 'v1.7.0',
        date: '3rd April 2026',
        title: 'Job Card Enhancements',
        type: 'feature',
        changes: [
          'Manual product selection for job card stock allocation',
          'Job card invoicing and Sage export',
          'Fixed labour costs and stock allocation display',
        ],
      },
    ],
  },
  {
    month: 'March 2026',
    entries: [
      {
        version: 'v1.6.0 \u2013 v1.5.0',
        date: 'March 2026',
        title: 'Job Cards, Deliveries & POS',
        type: 'major',
        changes: [
          'Full job card system \u2014 create, allocate stock, add labour, track status',
          'Delivery management with signature capture and PDF proof of delivery',
          'Point of Sale system with quick sales, receipts, and Z-reports',
          'Financial reports \u2014 daily, weekly, product analytics',
          'Branding customisation for receipts',
        ],
      },
    ],
  },
  {
    month: 'February 2026',
    entries: [
      {
        version: 'v1.3.0 \u2013 v1.4.0',
        date: 'February 2026',
        title: 'Multi-Tenant & Subscription System',
        type: 'major',
        changes: [
          'Full multi-tenant architecture \u2014 each company\'s data fully isolated',
          'Stripe subscription payments with tier-based feature limits',
          'Product code licensing system for company registration',
          'Admin panel for managing companies and users',
          'Invitation system \u2014 invite team members via code',
          'Super Admin management with audit logging',
          'Password change feature with account protection',
        ],
      },
      {
        version: 'v1.2.0',
        date: 'February 2026',
        title: 'Sage CSV Import',
        type: 'feature',
        changes: ['Bulk import products from Sage CSV exports'],
      },
      {
        version: 'v1.0.0',
        date: '14th February 2026',
        title: 'Initial Release',
        type: 'major',
        changes: [
          'Product management with barcode scanning',
          'Stock tracking with reorder alerts',
          'Supplier management',
          'User management with role-based access',
          'Dashboard with stock overview and analytics',
          'GBP currency and UK date formatting',
        ],
      },
    ],
  },
];
