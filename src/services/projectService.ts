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
    const response = await apiService.get(this.baseUrl);
    return response.data;
  }

  async getProject(id: string): Promise<Project> {
    const response = await apiService.get(`${this.baseUrl}/${id}`);
    return response.data;
  }

  async createProject(project: Omit<Project, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    const response = await apiService.post(this.baseUrl, project);
    return response.data;
  }

  async updateProject(id: string, project: Partial<Omit<Project, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>>): Promise<Project> {
    const response = await apiService.put(`${this.baseUrl}/${id}`, project);
    return response.data;
  }

  async deleteProject(id: string): Promise<void> {
    await apiService.delete(`${this.baseUrl}/${id}`);
  }
}

export const projectService = new ProjectService();
