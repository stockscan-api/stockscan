'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useCurrency, CURRENCIES, Currency } from '@/contexts/currency-context';
import { Settings, Globe, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { currency, setCurrency, formatPrice } = useCurrency();
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(currency);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCurrencies = CURRENCIES.filter(
    c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = () => {
    setCurrency(selectedCurrency);
    toast.success(`Currency updated to ${selectedCurrency.name} (${selectedCurrency.symbol})`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Settings
          </h1>
          <p className="text-gray-600 mt-1">Manage your application preferences</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Currency Settings
            </CardTitle>
            <CardDescription>
              Select your preferred currency for displaying prices and values throughout the application.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Current Currency</Label>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-blue-900">{currency.name}</p>
                    <p className="text-sm text-blue-700">{currency.country}</p>
                  </div>
                  <div className="text-2xl font-bold text-blue-900">{currency.symbol}</div>
                </div>
                <p className="text-sm text-blue-600 mt-2">Example: {formatPrice(1234.56)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="search">Search Currency</Label>
              <input
                id="search"
                type="text"
                placeholder="Search by country, currency name, or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label>Select Currency</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-1">
                {filteredCurrencies.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => setSelectedCurrency(c)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      selectedCurrency.code === c.code
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{c.symbol} {c.code}</p>
                        <p className="text-sm text-gray-500">{c.country}</p>
                      </div>
                      {selectedCurrency.code === c.code && (
                        <Check className="h-5 w-5 text-blue-500" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {selectedCurrency.code !== currency.code && (
              <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div>
                  <p className="font-medium text-amber-900">Pending Change</p>
                  <p className="text-sm text-amber-700">
                    {currency.symbol} {currency.code} → {selectedCurrency.symbol} {selectedCurrency.code}
                  </p>
                </div>
                <Button onClick={handleSave}>
                  Save Changes
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
