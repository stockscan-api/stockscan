import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

// Define the expected Sage 50 Sales Order column structure
interface SageOrderRow {
  'Product Code*'?: string;
  'Description'?: string;
  'Quantity'?: number;
  'Price £'?: number;
  'Net £'?: number;
  'VAT £'?: number;
  // Also handle alternative column names that might appear
  'Product Code'?: string;
  'Part Number'?: string;
  'Qty'?: number;
  'Unit Price'?: number;
  'Net'?: number;
  'VAT'?: number;
}

interface ParsedItem {
  productCode: string;
  description: string;
  quantity: number;
  unitPrice?: number;
  netPrice?: number;
  vatAmount?: number;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an Excel file (.xlsx or .xls)' },
        { status: 400 }
      );
    }

    // Read the file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json(
        { error: 'Excel file has no sheets' },
        { status: 400 }
      );
    }

    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with header row
    const jsonData = XLSX.utils.sheet_to_json<SageOrderRow>(worksheet, {
      defval: '',
      raw: false,
    });

    if (!jsonData || jsonData.length === 0) {
      return NextResponse.json(
        { error: 'No data found in the Excel file' },
        { status: 400 }
      );
    }

    // Parse and filter valid rows
    const items: ParsedItem[] = [];
    
    for (const row of jsonData) {
      // Get product code from various possible column names
      const productCode = String(
        row['Product Code*'] || 
        row['Product Code'] || 
        row['Part Number'] || 
        ''
      ).trim();

      // Get description
      const description = String(row['Description'] || '').trim();

      // Get quantity from various possible column names
      const quantityRaw = row['Quantity'] || row['Qty'];
      const quantity = typeof quantityRaw === 'number' 
        ? quantityRaw 
        : parseFloat(String(quantityRaw || '0').replace(/[^0-9.-]/g, ''));

      // Skip invalid rows (footer rows like "Deduction", "Net Value Discount", etc.)
      const invalidCodes = ['deduction', 'net value discount', 'total', 'subtotal', 'discount', ''];
      if (invalidCodes.includes(productCode.toLowerCase()) || isNaN(quantity) || quantity <= 0) {
        continue;
      }

      // Skip rows where product code looks like a footer label
      if (!productCode || productCode.toLowerCase().includes('total') || productCode.toLowerCase().includes('discount')) {
        continue;
      }

      // Parse pricing (optional)
      const unitPriceRaw = row['Price £'] || row['Unit Price'];
      const netPriceRaw = row['Net £'] || row['Net'];
      const vatAmountRaw = row['VAT £'] || row['VAT'];

      const parsePrice = (value: any): number | undefined => {
        if (value === undefined || value === null || value === '') return undefined;
        const parsed = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
        return isNaN(parsed) ? undefined : parsed;
      };

      items.push({
        productCode,
        description,
        quantity,
        unitPrice: parsePrice(unitPriceRaw),
        netPrice: parsePrice(netPriceRaw),
        vatAmount: parsePrice(vatAmountRaw),
      });
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: 'No valid product items found in the Excel file' },
        { status: 400 }
      );
    }

    // Try to extract order reference from filename
    let orderReference: string | undefined;
    const fileNameMatch = file.name.match(/([A-Z]{2,3}[-_]?\d+)/i);
    if (fileNameMatch) {
      orderReference = fileNameMatch[1].toUpperCase();
    }

    return NextResponse.json({
      items,
      orderReference,
      totalItems: items.length,
    });
  } catch (error: any) {
    console.error('Error parsing Sage order Excel:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to parse Excel file' },
      { status: 500 }
    );
  }
}
