import { auth } from '../lib/firebase';
import { API_BASE_URL, API_ENDPOINTS } from '../config/api';

class ApiService {
  private async getAuthToken(): Promise<string | null> {
    const user = auth.currentUser;
    if (!user) {
      return null;
    }
    return user.getIdToken();
  }

  private async fetchWithAuth(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const token = await this.getAuthToken();
    const headers = new Headers(options.headers);
    
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  }

  async checkHealth(): Promise<{ status: string; message: string }> {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.HEALTH}`);
    if (!response.ok) {
      throw new Error('Health check failed');
    }
    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await this.fetchWithAuth(endpoint);
    if (!response.ok) throw new Error(`GET request failed: ${response.statusText}`);
    return response.json();
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await this.fetchWithAuth(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`POST request failed: ${response.statusText}`);
    return response.json();
  }
}

export const apiService = new ApiService();
