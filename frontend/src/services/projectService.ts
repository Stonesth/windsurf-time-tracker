import { apiService } from './apiService';

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

class ProjectService {
  private readonly baseUrl = '/api/projects';

  async getAllProjects(): Promise<Project[]> {
    return await apiService.get<Project[]>(this.baseUrl);
  }

  async getProject(id: string): Promise<Project> {
    return await apiService.get<Project>(`${this.baseUrl}/${id}`);
  }

  async createProject(project: Omit<Project, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    return await apiService.post<Project>(this.baseUrl, project);
  }

  async updateProject(id: string, project: Partial<Omit<Project, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>>): Promise<Project> {
    return await apiService.put<Project>(`${this.baseUrl}/${id}`, project);
  }

  async deleteProject(id: string): Promise<void> {
    await apiService.delete(`${this.baseUrl}/${id}`);
  }
}

export const projectService = new ProjectService();
