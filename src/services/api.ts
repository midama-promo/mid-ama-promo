import { User, Release, Enquiry, NotificationLog, AdminStats, ReleaseStatus, WithdrawalRequest } from '../types';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = this.getToken();
  }

  setToken(token: string | null) {
    // Keep the token only in memory. The server also sets an HttpOnly session cookie,
    // so normal page refreshes do not require exposing the session to JavaScript storage.
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(endpoint, {
      ...options,
      cache: 'no-store',
      credentials: 'include',
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `HTTP error ${response.status}`);
    }

    return data as T;
  }

  // Auth
  async getAuthConfig(): Promise<{ supabaseUrl: string; supabaseAnonKey: string }> {
    return this.request<{ supabaseUrl: string; supabaseAnonKey: string }>('/api/auth/config');
  }

  async requestLoginOtp(email: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/api/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async registerArtist(payload: { realFirstName: string; realSurname: string; artistName: string; email: string }): Promise<{ message: string; email: string }> {
    return this.request<{ message: string; email: string }>('/api/auth/register-artist', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async verifyLoginOtp(email: string, code?: string, accessToken?: string): Promise<{ token: string; user: User }> {
    const data = await this.request<{ token: string; user: User }>('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, code, accessToken }),
    });
    this.setToken(data.token);
    return data;
  }

  async getMe(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/api/auth/me');
  }

  async setSpotifyProfileClaimed(claimed: boolean): Promise<{ message: string; user: User }> {
    return this.request<{ message: string; user: User }>('/api/auth/spotify-profile-claim', {
      method: 'PATCH',
      body: JSON.stringify({ claimed }),
    });
  }

  async logout(): Promise<void> {
    try {
      await this.request<{ message: string }>('/api/auth/logout', { method: 'POST' });
    } catch (_) {
      // Clear the in-memory token even if the network request fails.
    }
    this.setToken(null);
  }

  async registerInvite(data: {
    token: string;
    password: string;
    confirmPassword: string;
    name?: string;
    phone?: string;
  }): Promise<{ message: string; token: string; user: User }> {
    const res = await this.request<{ message: string; token: string; user: User }>('/api/auth/register-invite', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(res.token);
    return res;
  }

  async forgotPassword(email: string): Promise<{ message: string; demoToken?: string }> {
    return this.request<{ message: string; demoToken?: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(data: { token: string; password: string; confirmPassword: string }): Promise<{ message: string }> {
    return this.request<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // File Uploads
  async uploadArtwork(file: File, dimensions?: { width: number; height: number }): Promise<{
    fileUrl: string;
    filename: string;
    storedFilename: string;
    size: number;
    dimensions?: { width: number; height: number };
  }> {
    const formData = new FormData();
    formData.append('artwork', file);
    if (dimensions) {
      formData.append('width', dimensions.width.toString());
      formData.append('height', dimensions.height.toString());
    }

    return this.request('/api/upload/artwork', {
      method: 'POST',
      body: formData,
    });
  }

  async uploadAudio(file: File): Promise<{
    fileUrl: string;
    filename: string;
    storedFilename: string;
    fileSize: number;
  }> {
    const formData = new FormData();
    formData.append('audio', file);

    return this.request('/api/upload/audio', {
      method: 'POST',
      body: formData,
    });
  }

  // Releases
  async getReleases(): Promise<{ releases: Release[] }> {
    return this.request<{ releases: Release[] }>('/api/releases');
  }

  async getRelease(id: string): Promise<{ release: Release }> {
    return this.request<{ release: Release }>(`/api/releases/${id}`);
  }

  async createRelease(payload: Partial<Release>): Promise<{ message: string; release: Release }> {
    return this.request<{ message: string; release: Release }>('/api/releases', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Admin Approval / Denial System
  async approveRelease(id: string, note?: string): Promise<{ message: string; release: Release }> {
    return this.request<{ message: string; release: Release }>(`/api/releases/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  }

  async updatePreSaveLinks(id: string, links: Array<{ id?: string; label: string; url: string }>): Promise<{ message: string; release: Release }> {
    return this.request<{ message: string; release: Release }>(`/api/releases/${id}/presave-links`, {
      method: 'PATCH',
      body: JSON.stringify({ links }),
    });
  }

  async updateReleaseRoyalty(id: string, amount: number): Promise<{ message: string; release: Release }> {
    return this.request<{ message: string; release: Release }>(`/api/releases/${id}/royalty`, {
      method: 'PATCH',
      body: JSON.stringify({ amount }),
    });
  }

  async getRoyaltySummary(): Promise<{ totalEarnings: number; pendingAmount: number; paidAmount: number; availableAmount: number; withdrawals: WithdrawalRequest[] }> {
    return this.request('/api/royalties/summary');
  }

  async requestRoyaltyWithdrawal(payload: {
    amount: number; bankName: string; accountHolder: string; accountNumber: string; branchCode: string;
    accountType: WithdrawalRequest['accountType']; notes?: string; liabilityAcknowledged: boolean;
  }): Promise<{ message: string; withdrawal: WithdrawalRequest; summary: { totalEarnings: number; pendingAmount: number; paidAmount: number; availableAmount: number } }> {
    return this.request('/api/royalties/withdrawals', { method: 'POST', body: JSON.stringify(payload) });
  }

  async completeRelease(id: string, note?: string): Promise<{ message: string; release: Release }> {
    return this.request<{ message: string; release: Release }>(`/api/releases/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  }

  async denyRelease(id: string, reason: string): Promise<{ message: string; release: Release }> {
    return this.request<{ message: string; release: Release }>(`/api/releases/${id}/deny`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async requestCorrections(id: string, note: string): Promise<{ message: string; release: Release }> {
    return this.request<{ message: string; release: Release }>(`/api/releases/${id}/request-corrections`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  }

  async requestTakedown(id: string): Promise<{ message: string; release: Release }> {
    return this.request<{ message: string; release: Release }>(`/api/releases/${id}/takedown-request`, { method: 'POST' });
  }

  async processTakedown(id: string, status: 'Takedown Processing' | 'Takedown Completed', note?: string): Promise<{ message: string; release: Release }> {
    return this.request<{ message: string; release: Release }>(`/api/releases/${id}/takedown-process`, { method: 'POST', body: JSON.stringify({ status, note }) });
  }

  // Generate a temporary signed download ticket (for authorized admin or release owner)
  async createSignedDownloadTicket(
    releaseId: string,
    assetType: 'artwork' | 'track' | 'document',
    assetId?: string
  ): Promise<{
    success: boolean;
    downloadUrl: string;
    filename: string;
    expiresAt: number;
    contentType: string;
  }> {
    return this.request<{
      success: boolean;
      downloadUrl: string;
      filename: string;
      expiresAt: number;
      contentType: string;
    }>(`/api/releases/${releaseId}/download-ticket`, {
      method: 'POST',
      body: JSON.stringify({
        assetType,
        trackId: assetType === 'track' ? assetId : undefined,
        documentId: assetType === 'document' ? assetId : undefined,
      }),
    });
  }

  // Securely trigger download with fresh signed URL and friendly error handling
  async downloadAsset(
    releaseId: string,
    assetType: 'artwork' | 'track' | 'document',
    assetId?: string,
    fallbackFilename?: string
  ): Promise<void> {
    try {
      const ticket = await this.createSignedDownloadTicket(releaseId, assetType, assetId);
      
      const response = await fetch(ticket.downloadUrl);
      if (!response.ok) {
        let errMessage = "We couldn't download this file. Please try again.";
        try {
          const errData = await response.json();
          if (response.status === 410 || errData.expired) {
            errMessage = 'This download link has expired. Please click Download again to generate a fresh link.';
          } else if (response.status === 404) {
            errMessage = 'The requested file no longer exists on the server.';
          } else if (response.status === 403 || response.status === 401) {
            errMessage = "You don't have permission to access this file.";
          } else if (errData.error) {
            errMessage = errData.error;
          }
        } catch (_) {}
        throw new Error(errMessage);
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const downloadName = ticket.filename || fallbackFilename || `${assetType}-midama`;
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        window.URL.revokeObjectURL(blobUrl);
      }, 1000);
    } catch (err: any) {
      console.error('Download failure:', err);
      if (err.message && (
        err.message.includes("permission") ||
        err.message.includes("expired") ||
        err.message.includes("no longer exists")
      )) {
        throw err;
      }
      throw new Error("We couldn't download this file. Please try again.");
    }
  }

  // Document Upload
  async uploadDocument(file: File): Promise<{
    success: boolean;
    message: string;
    filename: string;
    storedFilename: string;
    fileUrl: string;
    fileSize: number;
  }> {
    const formData = new FormData();
    formData.append('document', file);
    return this.request('/api/upload/document', {
      method: 'POST',
      body: formData,
    });
  }

  getArtworkDownloadUrl(releaseId: string): string {
    return `/api/releases/${releaseId}/download-artwork`;
  }

  getTrackDownloadUrl(releaseId: string, trackId: string): string {
    return `/api/releases/${releaseId}/download-track/${trackId}`;
  }

  getDocumentDownloadUrl(releaseId: string): string {
    return `/api/releases/${releaseId}/download-document`;
  }

  async createClientEnquiry(payload: { subject: string; message: string }): Promise<{ message: string; enquiry: Enquiry }> {
    return this.request<{ message: string; enquiry: Enquiry }>('/api/enquiries', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getPublicShareRelease(refNumber: string): Promise<{ release: any }> {
    return this.request<{ release: any }>(`/api/public/share/${refNumber}`);
  }

  // Admin Client Management
  async getAdminStats(): Promise<{ stats: AdminStats }> {
    return this.request<{ stats: AdminStats }>('/api/admin/stats');
  }

  async getAdminClients(): Promise<{ clients: User[] }> {
    return this.request<{ clients: User[] }>('/api/admin/clients');
  }

  async registerClient(payload: { email: string; name: string; realFirstName?: string; realSurname?: string; phone?: string; country?: string }): Promise<{ message: string; client: User }> {
    return this.request<{ message: string; client: User }>('/api/admin/clients/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateClient(id: string, payload: Partial<User>): Promise<{ message: string; client: User }> {
    return this.request<{ message: string; client: User }>(`/api/admin/clients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async adminAccessClientAccount(clientId: string): Promise<{ message: string; token: string; client: User }> {
    return this.request<{ message: string; token: string; client: User }>(`/api/admin/clients/${clientId}/access-session`, {
      method: 'POST',
    });
  }

  async getClientReleases(clientId: string): Promise<{ client: User; releases: Release[] }> {
    return this.request<{ client: User; releases: Release[] }>(`/api/admin/clients/${clientId}/releases`);
  }

  async getAdminRoyaltyWithdrawals(): Promise<{ withdrawals: WithdrawalRequest[] }> {
    return this.request('/api/admin/royalties/withdrawals');
  }

  async updateRoyaltyWithdrawal(id: string, payload: { status: 'paid' | 'rejected'; adminNote?: string }): Promise<{ message: string; withdrawal: WithdrawalRequest }> {
    return this.request(`/api/admin/royalties/withdrawals/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
  }

  async getAdminCatalogue(): Promise<{ entries: Array<any> }> {
    return this.request<{ entries: Array<any> }>('/api/admin/catalogue');
  }

  async addExistingReleaseToCatalogue(userId: string, releaseId: string): Promise<{ message: string; entry: any; release: Release; client: User }> {
    return this.request<{ message: string; entry: any; release: Release; client: User }>('/api/admin/catalogue/add-existing-release', {
      method: 'POST',
      body: JSON.stringify({ userId, releaseId }),
    });
  }

  async createCatalogueEntry(payload: Record<string, any>): Promise<{ message: string; entry: any }> {
    return this.request<{ message: string; entry: any }>('/api/admin/catalogue', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateCatalogueEntry(id: string, payload: Record<string, any>): Promise<{ message: string; entry: any }> {
    return this.request<{ message: string; entry: any }>(`/api/admin/catalogue/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async getClientCatalogue(): Promise<{ entries: Array<any> }> {
    return this.request<{ entries: Array<any> }>('/api/catalogue');
  }

  async exportAdminBackup(): Promise<Blob> {
    const token = this.getToken();
    const response = await fetch('/api/admin/backup/export', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `HTTP error ${response.status}`);
    }
    return response.blob();
  }

  async importAdminBackup(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('backup', file);
    return this.request<any>('/api/admin/backup/import', {
      method: 'POST',
      body: formData,
    });
  }

  // Enquiries
  async submitEnquiry(payload: { name: string; email: string; phone?: string; subject: string; message: string }): Promise<{ message: string; enquiry: Enquiry }> {
    return this.request<{ message: string; enquiry: Enquiry }>('/api/enquiries', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getAdminEnquiries(): Promise<{ enquiries: Enquiry[] }> {
    return this.request<{ enquiries: Enquiry[] }>('/api/admin/enquiries');
  }

  async updateEnquiryStatus(id: string, status: 'new' | 'read' | 'replied'): Promise<{ message: string; enquiry: Enquiry }> {
    return this.request<{ message: string; enquiry: Enquiry }>(`/api/admin/enquiries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // Notifications
  async getNotifications(): Promise<{ notifications: NotificationLog[] }> {
    return this.request<{ notifications: NotificationLog[] }>('/api/notifications');
  }
}

export const api = new ApiService();
