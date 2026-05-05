'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { RefreshCw, ArrowLeft, Tag, Bug, Sparkles, Rocket } from 'lucide-react';
import Link from 'next/link';
import { changelogData } from '@/lib/changelog-data';

const typeConfig = {
  feature: { label: 'Feature', color: 'bg-green-100 text-green-700', borderColor: 'border-green-500', icon: Sparkles },
  fix: { label: 'Bug Fix', color: 'bg-amber-100 text-amber-700', borderColor: 'border-amber-500', icon: Bug },
  major: { label: 'Major', color: 'bg-indigo-100 text-indigo-700', borderColor: 'border-indigo-500', icon: Rocket },
  improvement: { label: 'Improvement', color: 'bg-blue-100 text-blue-700', borderColor: 'border-blue-500', icon: Tag },
};

export default function ChangelogPage() {
  const totalEntries = changelogData.reduce((sum, group) => sum + group.entries.length, 0);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link
                href="/mobile-app"
                className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Mobile App
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <RefreshCw className="h-7 w-7 text-blue-600" />
              Full Changelog
            </h1>
            <p className="text-gray-600 mt-1">
              All updates, improvements and fixes to the StockScan mobile app
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
              {totalEntries} releases
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3">
          {Object.entries(typeConfig).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <div key={key} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
                <Icon className="h-3 w-3" />
                {config.label}
              </div>
            );
          })}
        </div>

        {/* Changelog grouped by month */}
        {changelogData.map((group) => (
          <div key={group.month}>
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 pb-2 border-b-2 border-gray-200">
              {group.month}
            </h2>
            <div className="space-y-3">
              {group.entries.map((entry) => {
                const config = typeConfig[entry.type];
                const Icon = config.icon;
                return (
                  <div
                    key={entry.version}
                    className={`bg-white border border-gray-200 rounded-xl p-5 border-l-4 ${config.borderColor} hover:shadow-md transition-shadow`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg font-bold text-gray-900">{entry.version}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${config.color}`}>
                          <Icon className="h-3 w-3" />
                          {config.label}
                        </span>
                      </div>
                      <span className="text-sm text-gray-400">{entry.date}</span>
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-2">{entry.title}</h3>
                    <ul className="space-y-1">
                      {entry.changes.map((change, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-gray-300 mt-1">\u2022</span>
                          {change}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Footer */}
        <div className="text-center text-sm text-gray-400 pt-4 border-t border-gray-200">
          \u00a9 2026 StockScan. All rights reserved.
        </div>
      </div>
    </DashboardLayout>
  );
}
