// API Types for Inventory Management System

// v1.2.25: Added DELIVERY_CLERK role for counter staff who handle customer collections
export type UserRole = 'STAFF' | 'MANAGER' | 'OWNER' | 'DELIVERY_CLERK' | 'SUPER_ADMIN';

export interface Company {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  subscriptionTier?: 'FREE' | 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE';
  subscriptionStatus?: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
  subscriptionEndDate?: string;
  activeLicenseKey?: string;
  isActive: boolean;
  createdAt?: string;
  _count?: {
    users: number;
    products: number;
    suppliers?: number;
  };
  users?: User[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  companyId?: string;
  company?: Company;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  price: number;
  currentStock: number;
  minimumStock: number;
  category?: Category;
  categoryId?: string;
  supplier?: Supplier;
  supplierId?: string;
  barcode?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType = 'IN' | 'OUT';

export interface InventoryTransaction {
  id: string;
  product: Product;
  productId: string;
  quantity: number;
  type: TransactionType;
  reason: string;
  notes?: string;
  user: User;
  userId: string;
  balanceAfter: number;
  createdAt: string;
}

export interface ReorderItem {
  product: Product;
  currentStock: number;
  minimumStock: number;
  suggestedQuantity: number;
  supplier?: Supplier;
}

export interface DashboardStats {
  totalProducts: number;
  lowStockCount: number;
  totalSuppliers: number;
  totalValue: number;
  recentTransactions: InventoryTransaction[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

// Admin Types
export interface AdminDashboardStats {
  totalCompanies: number;
  activeCompanies: number;
  suspendedCompanies: number;
  totalUsers: number;
  recentCompanies: number;
}

export interface LicenseKey {
  id: string;
  key: string;
  tier: 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE';
  duration: number;
  isRedeemed: boolean;
  redeemedBy?: string;
  redeemedAt?: string;
  generatedBy?: string;
  notes?: string;
  createdAt: string;
  expiresAt: string;
  company?: {
    name: string;
    email: string;
  };
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  };
  company?: {
    id: string;
    name: string;
  };
}

export const AUDIT_ACTIONS = [
  'COMPANY_CREATED',
  'COMPANY_SUSPENDED',
  'COMPANY_ACTIVATED',
  'COMPANY_DELETED',
  'LICENSE_GENERATED',
  'LICENSE_ACTIVATED',
  'LICENSE_DELETED',
  'USER_CREATED',
  'USER_ROLE_CHANGED',
  'USER_DELETED',
  'SUPER_ADMIN_CREATED',
] as const;

export const TIER_LIMITS = {
  BASIC: {
    products: 100,
    users: 3,
    locations: 1,
    features: ['CSV Export'],
  },
  PROFESSIONAL: {
    products: -1,
    users: 10,
    locations: 10,
    features: ['CSV Export', 'Sage Integration', 'Advanced Reports'],
  },
  ENTERPRISE: {
    products: -1,
    users: -1,
    locations: -1,
    features: ['CSV Export', 'Sage Integration', 'Advanced Reports', 'API Access', 'Priority Support', 'Advanced Analytics'],
  },
};
