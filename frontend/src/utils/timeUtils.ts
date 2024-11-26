/**
 * Formate une durée en secondes en une chaîne lisible (ex: "2h 30m 15s")
 * @param seconds - Durée en secondes
 * @returns Chaîne formatée
 */
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (remainingSeconds > 0 || parts.length === 0) parts.push(`${remainingSeconds}s`);

  return parts.join(' ');
};

/**
 * Formate une date en format français court (ex: "01/12")
 * @param date - Date à formater
 * @returns Chaîne formatée
 */
export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
  });
};

/**
 * Formate une heure en format 24h (ex: "14:30")
 * @param date - Date à formater
 * @returns Chaîne formatée
 */
export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Calcule la durée en secondes entre deux dates
 * @param startDate - Date de début
 * @param endDate - Date de fin
 * @returns Durée en secondes
 */
export const calculateDuration = (startDate: Date, endDate: Date): number => {
  return Math.floor((endDate.getTime() - startDate.getTime()) / 1000);
};
