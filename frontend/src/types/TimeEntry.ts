export interface TimeEntry {
  id: string;
  userId: string;
  projectId: string;
  task: string;
  notes?: string;
  tags?: string[];
  startTime: Date;
  endTime: Date | null;
  duration: number;
}
