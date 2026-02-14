// API Types for Inventory Management System

export type UserRole = 'STAFF' | 'MANAGER' | 'OWNER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
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
