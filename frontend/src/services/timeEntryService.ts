import { apiService } from './apiService';

export interface TimeEntry {
  id?: string;
  userId: string;
  projectId: string;
  startTime: Date;
  endTime?: Date;
  description: string;
  task?: string;
  tags?: string[];
  isRunning: boolean;
}

export interface TimeStats {
  totalHours: number;
  entriesCount: number;
  averageDuration: number;
  projectBreakdown: {
    [projectId: string]: {
      hours: number;
      percentage: number;
    };
  };
}

class TimeEntryService {
  private readonly baseUrl = '/api/time-entries';

  async getAllTimeEntries(): Promise<TimeEntry[]> {
    const response = await apiService.get(this.baseUrl);
    return response.data;
  }

  async createTimeEntry(timeEntry: Omit<TimeEntry, 'id'>): Promise<TimeEntry> {
    const response = await apiService.post(this.baseUrl, timeEntry);
    return response.data;
  }

  async updateTimeEntry(id: string, timeEntry: Partial<TimeEntry>): Promise<TimeEntry> {
    const response = await apiService.put(`${this.baseUrl}/${id}`, timeEntry);
    return response.data;
  }

  async deleteTimeEntry(id: string): Promise<void> {
    await apiService.delete(`${this.baseUrl}/${id}`);
  }

  async getTimeStats(): Promise<TimeStats> {
    const response = await apiService.get(`${this.baseUrl}/stats`);
    return response.data;
  }

  // Méthodes utilitaires pour la gestion du temps
  startTimer(projectId: string, description: string): Promise<TimeEntry> {
    return this.createTimeEntry({
      userId: '', // Sera rempli côté serveur
      projectId,
      startTime: new Date(),
      description,
      isRunning: true
    });
  }

  async stopTimer(timeEntryId: string): Promise<TimeEntry> {
    return this.updateTimeEntry(timeEntryId, {
      endTime: new Date(),
      isRunning: false
    });
  }

  async getActiveTimer(): Promise<TimeEntry | null> {
    const entries = await this.getAllTimeEntries();
    return entries.find(entry => entry.isRunning) || null;
  }
}

export const timeEntryService = new TimeEntryService();
