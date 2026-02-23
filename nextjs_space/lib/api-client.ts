'use client';

// Use proxy to avoid CORS issues - requests go through /api/proxy/* to the backend
const API_BASE_URL = '/api/proxy';

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  }

  private setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  private removeToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {
      ...(options.headers || {}),
    };

    // Only set Content-Type for non-FormData requests
    if (!(options.body instanceof FormData)) {
      (headers as Record<string, string>)['Content-Type'] = 'application/json';
    }

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.removeToken();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error?.message || `Request failed with status ${response.status}`);
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) return {} as T;
    return JSON.parse(text);
  }

  private async requestFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {};

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (response.status === 401) {
      this.removeToken();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error?.message || `Request failed with status ${response.status}`);
    }

    const text = await response.text();
    if (!text) return {} as T;
    return JSON.parse(text);
  }

  // Auth
  async login(email: string, password: string) {
    const response = await this.request<{ token: string; user: any }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(response.token);
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    return response;
  }

  logout() {
    this.removeToken();
  }

  getUser() {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  isAuthenticated() {
    return !!this.getToken();
  }

  // Products
  async getProducts(params?: { page?: number; limit?: number; search?: string; categoryId?: string; supplierId?: string; lowStock?: boolean }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.categoryId) searchParams.append('categoryId', params.categoryId);
    if (params?.supplierId) searchParams.append('supplierId', params.supplierId);
    if (params?.lowStock) searchParams.append('lowStock', 'true');
    const query = searchParams.toString();
    return this.request<any>(`/api/products${query ? `?${query}` : ''}`);
  }

  async getProduct(id: string) {
    return this.request<any>(`/api/products/${id}`);
  }

  async createProduct(data: any) {
    return this.request<any>('/api/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProduct(id: string, data: any) {
    return this.request<any>(`/api/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteProduct(id: string) {
    return this.request<void>(`/api/products/${id}`, {
      method: 'DELETE',
    });
  }

  // Categories
  async getCategories() {
    return this.request<any[]>('/api/categories');
  }

  async createCategory(data: { name: string; description?: string }) {
    return this.request<any>('/api/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Suppliers
  async getSuppliers(params?: { page?: number; limit?: number; search?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    const query = searchParams.toString();
    return this.request<any>(`/api/suppliers${query ? `?${query}` : ''}`);
  }

  async getSupplier(id: string) {
    return this.request<any>(`/api/suppliers/${id}`);
  }

  async createSupplier(data: any) {
    return this.request<any>('/api/suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSupplier(id: string, data: any) {
    return this.request<any>(`/api/suppliers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteSupplier(id: string) {
    return this.request<void>(`/api/suppliers/${id}`, {
      method: 'DELETE',
    });
  }

  // Transactions (Inventory)
  async getTransactions(params?: { page?: number; limit?: number; productId?: string; type?: string; startDate?: string; endDate?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.productId) searchParams.append('productId', params.productId);
    if (params?.type) searchParams.append('type', params.type);
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    const query = searchParams.toString();
    return this.request<any>(`/api/inventory/transactions${query ? `?${query}` : ''}`);
  }

  async adjustStock(data: { productId: string; quantity: number; reason: string; notes?: string }) {
    return this.request<any>('/api/inventory/adjust', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Users (Owner only)
  async getUsers() {
    return this.request<any>('/api/users');
  }

  async updateUserRole(id: string, role: string) {
    return this.request<any>(`/api/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  async deleteUser(id: string) {
    return this.request<void>(`/api/users/${id}`, {
      method: 'DELETE',
    });
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request<any>('/api/users/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  // Dashboard
  async getDashboardStats() {
    return this.request<any>('/api/dashboard/stats');
  }

  // Reorder
  async getReorderList() {
    return this.request<any>('/api/reorders/list');
  }

  async generateReorderItems() {
    return this.request<any>('/api/reorders/generate', { method: 'POST' });
  }

  async updateReorderItem(id: string, quantityToOrder: number) {
    return this.request<any>(`/api/reorders/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ quantityToOrder }),
    });
  }

  async markItemsAsOrdered(reorderItemIds: string[]) {
    return this.request<any>('/api/reorders/mark-ordered', {
      method: 'POST',
      body: JSON.stringify({ reorderItemIds }),
    });
  }

  async exportReorderCSV(supplierId?: string) {
    const token = this.getToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const query = supplierId ? `?supplierId=${supplierId}` : '';
    const response = await fetch(`${API_BASE_URL}/api/reorders/export${query}`, { headers });
    return response.text();
  }

  // Invitations
  async getInvitations() {
    return this.request<any>('/api/invitations');
  }

  async createInvitation(data: { email?: string; role: string; expiresInDays?: number }) {
    return this.request<any>('/api/invitations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteInvitation(id: string) {
    return this.request<void>(`/api/invitations/${id}`, {
      method: 'DELETE',
    });
  }

  // License / Subscription
  async activateLicense(licenseKey: string) {
    return this.request<any>('/license/activate', {
      method: 'POST',
      body: JSON.stringify({ licenseKey }),
    });
  }

  async getTierLimits() {
    return this.request<any>('/license/limits');
  }

  async getSubscription() {
    return this.request<any>('/subscriptions/my-subscription');
  }

  async getUsage() {
    return this.request<any>('/subscriptions/usage');
  }

  // Import
  async previewImport(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.requestFormData<any>('/import/products/preview', formData);
  }

  async importProducts(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.requestFormData<any>('/import/products', formData);
  }

  // Profile
  async getProfile() {
    return this.request<any>('/api/auth/profile');
  }

  // ============ SUPER ADMIN APIs ============

  // Admin Dashboard
  async getAdminDashboard() {
    return this.request<any>('/api/admin/dashboard');
  }

  // Company Management
  async getCompanies(params?: { page?: number; limit?: number; search?: string; status?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.status) searchParams.append('status', params.status);
    const query = searchParams.toString();
    return this.request<any>(`/api/admin/companies${query ? `?${query}` : ''}`);
  }

  async getCompany(id: string) {
    return this.request<any>(`/api/admin/companies/${id}`);
  }

  async suspendCompany(id: string) {
    return this.request<any>(`/api/admin/companies/${id}/suspend`, { method: 'PATCH' });
  }

  async activateCompany(id: string) {
    return this.request<any>(`/api/admin/companies/${id}/activate`, { method: 'PATCH' });
  }

  async deleteCompany(id: string) {
    return this.request<void>(`/api/admin/companies/${id}`, { method: 'DELETE' });
  }

  // License Key Management (Admin)
  async generateLicenseKeys(data: { tier: string; duration: number; notes?: string; count: number }) {
    return this.request<any>('/license/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAllLicenseKeys(params?: { page?: number; limit?: number; tier?: string; status?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.tier) searchParams.append('tier', params.tier);
    if (params?.status) searchParams.append('status', params.status);
    const query = searchParams.toString();
    return this.request<any>(`/license/all${query ? `?${query}` : ''}`);
  }

  async checkLicenseKey(key: string) {
    return this.request<any>(`/license/check/${key}`);
  }

  async deleteLicenseKey(id: string) {
    return this.request<void>(`/license/${id}`, { method: 'DELETE' });
  }

  // Audit Logs
  async getAuditLogs(params?: { page?: number; limit?: number; companyId?: string; action?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.companyId) searchParams.append('companyId', params.companyId);
    if (params?.action) searchParams.append('action', params.action);
    const query = searchParams.toString();
    return this.request<any>(`/api/admin/audit-logs${query ? `?${query}` : ''}`);
  }

  // Super Admin Management
  async getSuperAdmins() {
    return this.request<any>('/api/admin/super-admins');
  }

  async createSuperAdmin(data: { email: string; name: string; password: string }) {
    return this.request<any>('/api/admin/super-admins', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async activateSuperAdmin(id: string) {
    return this.request<any>(`/api/admin/super-admins/${id}/activate`, { method: 'PATCH' });
  }

  async deactivateSuperAdmin(id: string) {
    return this.request<any>(`/api/admin/super-admins/${id}/deactivate`, { method: 'PATCH' });
  }

  // ============ JOB CARDS APIs ============

  // Get all job cards
  // Job Cards - Note: Backend uses /job-cards without /api prefix
  async getJobCards(params?: { page?: number; limit?: number; status?: string; priority?: string; assignedToUserId?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.status) searchParams.append('status', params.status);
    if (params?.priority) searchParams.append('priority', params.priority);
    if (params?.assignedToUserId) searchParams.append('assignedToUserId', params.assignedToUserId);
    const query = searchParams.toString();
    return this.request<any>(`/job-cards${query ? `?${query}` : ''}`);
  }

  // Get my assigned job cards
  async getMyJobCards() {
    return this.request<any>('/job-cards/my-jobs');
  }

  // Get single job card with allocations
  async getJobCard(id: string) {
    return this.request<any>(`/job-cards/${id}`);
  }

  // Create job card - Backend uses jobName, customerName, startDate
  async createJobCard(data: { 
    jobName: string; 
    customerName: string; 
    startDate: string;
    description?: string; 
    priority?: string; 
    assignedToUserId?: string;
    estimatedEndDate?: string;
  }) {
    return this.request<any>('/job-cards', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Update job card
  async updateJobCard(id: string, data: { title?: string; description?: string; customerName?: string; priority?: string; status?: string; assignedToUserId?: string }) {
    return this.request<any>(`/job-cards/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Delete job card
  async deleteJobCard(id: string) {
    return this.request<void>(`/job-cards/${id}`, {
      method: 'DELETE',
    });
  }

  // Allocate stock to job card
  async allocateStockToJob(jobCardId: string, data: { stockItemId: string; quantity: number }) {
    return this.request<any>(`/job-cards/${jobCardId}/allocate-stock`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Return stock from job card
  async returnStockFromJob(jobCardId: string, data: { stockItemId: string; quantity: number }) {
    return this.request<any>(`/job-cards/${jobCardId}/return-stock`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Update job card status
  async updateJobCardStatus(id: string, data: { status: string; actualCompletionDate?: string }) {
    return this.request<any>(`/job-cards/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Get stock items (for allocation) - use products endpoint
  async getStockItems(params?: { page?: number; limit?: number; search?: string; categoryId?: string; locationId?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.categoryId) searchParams.append('categoryId', params.categoryId);
    if (params?.locationId) searchParams.append('locationId', params.locationId);
    const query = searchParams.toString();
    return this.request<any>(`/api/products${query ? `?${query}` : ''}`);
  }

  // Get locations
  async getLocations() {
    return this.request<any[]>('/api/locations');
  }

  // ========== Labour Tracking ==========

  // Add labour entry to job card
  async addLabourEntry(jobCardId: string, data: {
    staffMemberId: string;
    hoursWorked: number;
    hourlyRate: number;
    dateWorked: string;
    description?: string;
  }) {
    return this.request<any>(`/job-cards/${jobCardId}/labour`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Update labour entry
  async updateLabourEntry(jobCardId: string, labourId: string, data: {
    hoursWorked?: number;
    hourlyRate?: number;
    dateWorked?: string;
    description?: string;
  }) {
    return this.request<any>(`/job-cards/${jobCardId}/labour/${labourId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Delete labour entry
  async deleteLabourEntry(jobCardId: string, labourId: string) {
    return this.request<any>(`/job-cards/${jobCardId}/labour/${labourId}`, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();
