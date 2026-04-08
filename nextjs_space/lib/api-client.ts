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

  // Supplier Import from Sage
  async importSuppliers(file: File): Promise<{
    imported: number;
    updated: number;
    skipped: number;
    errors: Array<{ row: number; name: string; error: string }>;
    total: number;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.requestFormData('/api/suppliers/import', formData);
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
    return this.request<any>('/api/license/activate', {
      method: 'POST',
      body: JSON.stringify({ licenseKey }),
    });
  }

  async getTierLimits() {
    return this.request<any>('/api/license/limits');
  }

  async getSubscription() {
    return this.request<any>('/api/subscriptions/my-subscription');
  }

  async getUsage() {
    return this.request<any>('/api/subscriptions/usage');
  }

  // Import
  async previewImport(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.requestFormData<any>('/api/import/products/preview', formData);
  }

  async importProducts(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.requestFormData<any>('/api/import/products', formData);
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
    return this.request<any>('/api/license/generate', {
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
    return this.request<any>(`/api/license/all${query ? `?${query}` : ''}`);
  }

  async checkLicenseKey(key: string) {
    return this.request<any>(`/api/license/check/${key}`);
  }

  async deleteLicenseKey(id: string) {
    return this.request<void>(`/api/license/${id}`, { method: 'DELETE' });
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
    return this.request<any>(`/api/job-cards${query ? `?${query}` : ''}`);
  }

  // Get my assigned job cards
  async getMyJobCards() {
    return this.request<any>('/api/job-cards/my-jobs');
  }

  // Get single job card with allocations
  async getJobCard(id: string) {
    return this.request<any>(`/api/job-cards/${id}`);
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
    return this.request<any>('/api/job-cards', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Update job card
  async updateJobCard(id: string, data: { title?: string; description?: string; customerName?: string; priority?: string; status?: string; assignedToUserId?: string }) {
    return this.request<any>(`/api/job-cards/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Delete job card
  async deleteJobCard(id: string) {
    return this.request<void>(`/api/job-cards/${id}`, {
      method: 'DELETE',
    });
  }

  // Allocate stock to job card
  async allocateStockToJob(jobCardId: string, data: { stockItemId: string; quantity: number }) {
    return this.request<any>(`/api/job-cards/${jobCardId}/allocate-stock`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Return stock from job card
  async returnStockFromJob(jobCardId: string, data: { stockItemId: string; quantity: number }) {
    return this.request<any>(`/api/job-cards/${jobCardId}/return-stock`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Update job card status
  async updateJobCardStatus(id: string, data: { status: string; actualCompletionDate?: string }) {
    return this.request<any>(`/api/job-cards/${id}/status`, {
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
    return this.request<any>(`/api/job-cards/${jobCardId}/labour`, {
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
    return this.request<any>(`/api/job-cards/${jobCardId}/labour/${labourId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Delete labour entry
  async deleteLabourEntry(jobCardId: string, labourId: string) {
    return this.request<any>(`/api/job-cards/${jobCardId}/labour/${labourId}`, {
      method: 'DELETE',
    });
  }

  // ============ DELIVERIES APIs ============
  // Based on v1.2.25 API spec: Status is PENDING | COLLECTED | CANCELLED

  // Get all deliveries
  async getDeliveries(params?: { page?: number; limit?: number; status?: string; search?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.status) searchParams.append('status', params.status);
    if (params?.search) searchParams.append('search', params.search);
    const query = searchParams.toString();
    return this.request<any>(`/api/deliveries${query ? `?${query}` : ''}`);
  }

  // Get single delivery
  async getDelivery(id: string) {
    return this.request<any>(`/api/deliveries/${id}`);
  }

  // Create delivery (v1.2.25 spec)
  // Backend accepts: productId (null for Sage imports), productName, sku, quantity, notes
  async createDelivery(data: {
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    sageOrderReference?: string;
    deliveryDate?: string;
    notes?: string;
    items?: Array<{
      productId: string | null;  // null for products not in database (Sage imports)
      productName: string;
      sku?: string;  // Product code from Sage
      quantity: number;
      notes?: string;
    }>;
  }) {
    return this.request<any>('/api/deliveries', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Update delivery
  async updateDelivery(id: string, data: {
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    sageOrderReference?: string;
    deliveryDate?: string;
  }) {
    return this.request<any>(`/api/deliveries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Collect delivery with signature (v1.2.25 - PATCH /api/deliveries/:id/collect)
  async collectDelivery(id: string, data: {
    signatureBase64: string;
    signedBy: string;
  }) {
    return this.request<any>(`/api/deliveries/${id}/collect`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Cancel delivery (v1.2.25 - PATCH /api/deliveries/:id/cancel)
  async cancelDelivery(id: string) {
    return this.request<any>(`/api/deliveries/${id}/cancel`, {
      method: 'PATCH',
    });
  }

  // Delete delivery
  async deleteDelivery(id: string) {
    return this.request<void>(`/api/deliveries/${id}`, {
      method: 'DELETE',
    });
  }

  // Export delivery PDF (v1.2.25 - POST /api/deliveries/:id/export-pdf)
  async exportDeliveryPdf(id: string): Promise<{ pdfBase64: string; filename: string }> {
    return this.request<{ pdfBase64: string; filename: string }>(`/api/deliveries/${id}/export-pdf`, {
      method: 'POST',
    });
  }

  // Email delivery PDF (v1.2.25 - POST /api/deliveries/:id/email-pdf)
  async emailDeliveryPdf(id: string, recipientEmail: string) {
    return this.request<{ message: string; sentTo: string }>(`/api/deliveries/${id}/email-pdf`, {
      method: 'POST',
      body: JSON.stringify({ recipientEmail }),
    });
  }

  // Auto-fill from Sage order (v1.2.25 - GET /api/deliveries/sage-order/:orderReference)
  async getSageOrder(orderReference: string) {
    return this.request<{
      orderReference: string;
      customerName: string;
      items: Array<{
        productName: string;
        productId: string;
        quantity: number;
        partNumber: string;
      }>;
    }>(`/api/deliveries/sage-order/${encodeURIComponent(orderReference)}`);
  }

  // Parse Sage Sales Order Excel file (POST /api/deliveries/parse-sage-excel)
  // This calls the LOCAL Next.js API route, not the backend - so no proxy needed
  async parseSageOrderExcel(formData: FormData): Promise<{
    items: Array<{
      productCode: string;
      description: string;
      quantity: number;
      unitPrice?: number;
      netPrice?: number;
      vatAmount?: number;
    }>;
    orderReference?: string;
  }> {
    // Call local Next.js API route directly (not through proxy)
    const response = await fetch('/api/deliveries/parse-sage-excel', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to parse Excel file' }));
      throw new Error(error?.error || error?.message || 'Failed to parse Excel file');
    }

    return response.json();
  }

  // Import Suppliers from Sage Excel (v1.2.25 - POST /api/suppliers/import-sage)
  async importSuppliersFromSage(file: File): Promise<{
    imported: number;
    skipped: number;
    errors: Array<{ row?: number; error: string }>;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.requestFormData('/api/suppliers/import-sage', formData);
  }

  // ============ DASHBOARD/ANALYTICS APIs ============

  // Get comprehensive dashboard stats (v1.2.25 - GET /api/dashboard/stats)
  async getDashboardStatsV2() {
    return this.request<{
      products: { total: number; lowStock: number; outOfStock: number };
      deliveries: { total: number; pending: number; collected: number; cancelled: number };
      jobCards: { total: number; pending: number; inProgress: number; completed: number; cancelled: number };
      users: { total: number; active: number };
      recentActivity: Array<{
        type: string;
        description: string;
        timestamp: string;
        user: { name: string };
      }>;
    }>('/api/dashboard/stats');
  }

  // Get low stock report (v1.2.25 - GET /api/reports/low-stock)
  async getLowStockReport() {
    return this.request<Array<{
      id: string;
      name: string;
      sku: string;
      quantity: number;
      reorderThreshold: number;
      supplier: { name: string };
    }>>('/api/reports/low-stock');
  }

  // ============ JOB CARD NOTES (v1.2.25) ============

  // Add note to job card
  async addJobCardNote(jobCardId: string, content: string) {
    return this.request<any>(`/api/job-cards/${jobCardId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  // Update job card notes (PUT /job-cards/:id/notes)
  async updateJobCardNotes(jobCardId: string, notes: string) {
    return this.request<any>(`/api/job-cards/${jobCardId}/notes`, {
      method: 'PUT',
      body: JSON.stringify({ notes }),
    });
  }

  // ============ JOB CARD ACTIVITY LOG ============

  // Get job card activity log
  async getJobCardActivity(jobCardId: string) {
    return this.request<any>(`/api/job-cards/${jobCardId}/activity`);
  }

  // ============ JOB CARD INVOICE & EXPORT ============

  // Generate job card invoice
  async getJobCardInvoice(jobCardId: string) {
    return this.request<any>(`/api/job-cards/${jobCardId}/invoice`);
  }

  // Export job card to Sage CSV
  async exportJobCardSageCSV(jobCardId: string) {
    return this.request<any>(`/api/job-cards/${jobCardId}/export-sage`);
  }

  // ============ REPORTS (client-side aggregation) ============

  async getReportSales(params: { startDate: string; endDate: string; format?: string }) {
    // Fetch all POS sales and aggregate client-side
    const res = await this.getPosSales({ limit: 1000 });
    const allSales = res?.sales || res?.data || (Array.isArray(res) ? res : []);
    const start = new Date(params.startDate);
    const end = new Date(params.endDate);
    end.setHours(23, 59, 59, 999);

    const filtered = allSales.filter((s: any) => {
      const d = new Date(s.createdAt);
      return d >= start && d <= end;
    });

    const totalSales = filtered.reduce((sum: number, s: any) => sum + (s.total ?? s.totalAmount ?? 0), 0);
    const salesCount = filtered.length;

    // Sales by date
    const byDateMap: Record<string, number> = {};
    filtered.forEach((s: any) => {
      const day = new Date(s.createdAt).toISOString().split('T')[0];
      byDateMap[day] = (byDateMap[day] || 0) + (s.total ?? s.totalAmount ?? 0);
    });
    const salesByDate = Object.entries(byDateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, total]) => ({ date, total }));

    // Top products
    const prodMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
    filtered.forEach((s: any) => {
      const items = s.items || s.saleItems || [];
      items.forEach((item: any) => {
        const name = item.productName || item.name || 'Unknown';
        const key = item.productId || name;
        if (!prodMap[key]) prodMap[key] = { name, quantity: 0, revenue: 0 };
        prodMap[key].quantity += item.quantity || 0;
        prodMap[key].revenue += (item.quantity || 0) * (item.unitPrice || item.price || 0);
      });
    });
    const topProducts = Object.values(prodMap).sort((a, b) => b.quantity - a.quantity);

    // Sales by payment method
    const methodMap: Record<string, number> = {};
    filtered.forEach((s: any) => {
      const m = s.paymentMethod || 'Unknown';
      methodMap[m] = (methodMap[m] || 0) + (s.total ?? s.totalAmount ?? 0);
    });
    const salesByPaymentMethod = Object.entries(methodMap).map(([method, total]) => ({ method, total }));

    if (params.format === 'csv') {
      const rows = [['Date', 'Sale #', 'Customer', 'Payment', 'Total']];
      filtered.forEach((s: any) => {
        rows.push([
          new Date(s.createdAt).toLocaleDateString('en-GB'),
          s.saleNumber || s.receiptNumber || s.id?.slice(0, 8) || '',
          s.customerName || '',
          s.paymentMethod || '',
          (s.total ?? s.totalAmount ?? 0).toFixed(2),
        ]);
      });
      return rows.map(r => r.join(',')).join('\n');
    }

    return { totalSales, salesCount, salesByDate, topProducts, salesByPaymentMethod };
  }

  async getReportStock(params: { startDate: string; endDate: string; format?: string }) {
    // Fetch all products for stock report
    const res = await this.getProducts({ limit: 1000 });
    const products = res?.products || res?.data || (Array.isArray(res) ? res : []);

    const items = products.map((p: any) => ({
      name: p.name,
      sku: p.sku || '',
      quantity: p.quantity ?? p.currentStock ?? 0,
      reorderPoint: p.reorderThreshold ?? p.reorderPoint ?? p.minimumStock ?? 0,
      costPrice: p.costPrice ?? 0,
      unitPrice: p.unitPrice ?? p.price ?? 0,
      isLowStock: (p.quantity ?? p.currentStock ?? 0) <= (p.reorderThreshold ?? p.reorderPoint ?? 0),
    }));

    const totalValue = items.reduce((sum: number, i: any) => sum + (i.quantity * i.costPrice), 0);
    const lowStockCount = items.filter((i: any) => i.isLowStock).length;

    if (params.format === 'csv') {
      const rows = [['Product', 'SKU', 'In Stock', 'Reorder Point', 'Cost Price', 'Value']];
      items.forEach((i: any) => {
        rows.push([i.name, i.sku, i.quantity, i.reorderPoint, i.costPrice.toFixed(2), (i.quantity * i.costPrice).toFixed(2)]);
      });
      return rows.map(r => r.join(',')).join('\n');
    }

    return { items, totalValue, lowStockCount, totalItems: items.length };
  }

  async getReportJobCards(params: { startDate: string; endDate: string; format?: string }) {
    const res = await this.getJobCards({ limit: 1000 });
    const allJobs = res?.jobCards || res?.data || (Array.isArray(res) ? res : []);
    const start = new Date(params.startDate);
    const end = new Date(params.endDate);
    end.setHours(23, 59, 59, 999);

    const filtered = allJobs.filter((j: any) => {
      const d = new Date(j.createdAt);
      return d >= start && d <= end;
    });

    const totalJobs = filtered.length;
    const totalMaterials = filtered.reduce((sum: number, j: any) => sum + (j.materialsCost ?? 0), 0);
    const totalLabour = filtered.reduce((sum: number, j: any) => sum + (j.labourCost ?? 0), 0);
    const totalCost = totalMaterials + totalLabour;
    const avgValue = totalJobs > 0 ? totalCost / totalJobs : 0;

    // By status
    const statusMap: Record<string, number> = {};
    filtered.forEach((j: any) => {
      const s = j.status || 'UNKNOWN';
      statusMap[s] = (statusMap[s] || 0) + 1;
    });
    const byStatus = Object.entries(statusMap).map(([status, count]) => ({ status, count }));

    if (params.format === 'csv') {
      const rows = [['Job Ref', 'Status', 'Customer', 'Materials', 'Labour', 'Total', 'Created']];
      filtered.forEach((j: any) => {
        rows.push([
          j.jobReference || j.id?.slice(0, 8) || '',
          j.status || '',
          j.customerName || '',
          (j.materialsCost ?? 0).toFixed(2),
          (j.labourCost ?? 0).toFixed(2),
          ((j.materialsCost ?? 0) + (j.labourCost ?? 0)).toFixed(2),
          new Date(j.createdAt).toLocaleDateString('en-GB'),
        ]);
      });
      return rows.map(r => r.join(',')).join('\n');
    }

    return { totalJobs, averageJobValue: avgValue, totalMaterialsCost: totalMaterials, totalLabourCost: totalLabour, byStatus };
  }

  async getReportProfitLoss(params: { startDate: string; endDate: string; format?: string }) {
    // Combine sales revenue with product cost data
    const [salesRes, productsRes] = await Promise.all([
      this.getPosSales({ limit: 1000 }),
      this.getProducts({ limit: 1000 }),
    ]);

    const allSales = salesRes?.sales || salesRes?.data || (Array.isArray(salesRes) ? salesRes : []);
    const products = productsRes?.products || productsRes?.data || (Array.isArray(productsRes) ? productsRes : []);
    const start = new Date(params.startDate);
    const end = new Date(params.endDate);
    end.setHours(23, 59, 59, 999);

    const filtered = allSales.filter((s: any) => {
      const d = new Date(s.createdAt);
      return d >= start && d <= end;
    });

    // Build product cost lookup
    const costLookup: Record<string, number> = {};
    products.forEach((p: any) => {
      costLookup[p.id] = p.costPrice ?? 0;
    });

    let revenue = 0;
    let costs = 0;
    const monthlyMap: Record<string, { revenue: number; costs: number }> = {};

    filtered.forEach((s: any) => {
      const saleTotal = s.total ?? s.totalAmount ?? 0;
      revenue += saleTotal;
      const monthKey = new Date(s.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      if (!monthlyMap[monthKey]) monthlyMap[monthKey] = { revenue: 0, costs: 0 };
      monthlyMap[monthKey].revenue += saleTotal;

      const items = s.items || s.saleItems || [];
      items.forEach((item: any) => {
        const costPrice = costLookup[item.productId] ?? 0;
        const itemCost = costPrice * (item.quantity || 0);
        costs += itemCost;
        monthlyMap[monthKey].costs += itemCost;
      });
    });

    const grossProfit = revenue - costs;
    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const breakdown = Object.entries(monthlyMap).map(([month, data]) => ({ month, ...data }));

    if (params.format === 'csv') {
      const rows = [['Month', 'Revenue', 'Costs', 'Profit']];
      breakdown.forEach((b) => {
        rows.push([b.month, b.revenue.toFixed(2), b.costs.toFixed(2), (b.revenue - b.costs).toFixed(2)]);
      });
      rows.push(['', '', '', '']);
      rows.push(['Total', revenue.toFixed(2), costs.toFixed(2), grossProfit.toFixed(2)]);
      return rows.map(r => r.join(',')).join('\n');
    }

    return { revenue, costs, grossProfit, grossMargin, netProfit: grossProfit, breakdown };
  }

  // ============ POS (Point of Sale) ============

  async getPosSales(params?: { page?: number; limit?: number }) {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return this.request<any>(`/api/pos/sales${query}`);
  }

  async getPosSale(saleId: string) {
    return this.request<any>(`/api/pos/sales/${saleId}`);
  }

  async createPosSale(data: { items: Array<{ productId: string; productName: string; quantity: number; unitPrice: number }>; paymentMethod: string; amountTendered: number; customerName?: string; notes?: string }) {
    return this.request<any>('/api/pos/sales', { method: 'POST', body: JSON.stringify(data) });
  }

  async refundPosSale(saleId: string, data?: { reason?: string }) {
    return this.request<any>(`/api/pos/sales/${saleId}/refund`, { method: 'POST', body: JSON.stringify(data || {}) });
  }

  async getPosReceipt(saleId: string) {
    return this.request<any>(`/api/pos/receipt/${saleId}`);
  }

  // ============ FEATURE FLAGS ============

  async getFeatureFlags() {
    return this.request<any>('/api/feature-flags');
  }

  async updateFeatureFlags(flags: Record<string, boolean>) {
    return this.request<any>('/api/feature-flags', { method: 'PUT', body: JSON.stringify(flags) });
  }

  // ============ COMPANY BRANDING ============

  async getCompanyProfile() {
    // Get current user's company from auth profile
    const profile = await this.request<any>('/api/auth/profile');
    if (profile?.company) return profile.company;
    if (profile?.companyId) {
      return this.request<any>(`/api/company/${profile.companyId}`);
    }
    throw new Error('No company found');
  }

  async updateCompanyDetails(companyId: string, data: { name?: string; email?: string; phone?: string; address?: string }) {
    return this.request<any>(`/api/company/${companyId}`, { method: 'PATCH', body: JSON.stringify(data) });
  }
}

export const apiClient = new ApiClient();
