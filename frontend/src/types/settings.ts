export interface SiteSettings {
  workHoursPerDay: string; // Format "HH:mm"
  workHoursPerWeek: string; // Format "HH:mm"
  createdAt?: Date;
  updatedAt?: Date;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  workHoursPerDay: '07:24',
  workHoursPerWeek: '37:00',
};
