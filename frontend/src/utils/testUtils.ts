/**
 * Utilitaires pour les tests du graphique en camembert et du filtrage par date
 * Ces fonctions peuvent être utilisées pour tester les composants en isolation
 */

/**
 * Vérifie si un tableau de chaînes contient des doublons
 * @param {string[]} arr - Tableau de chaînes à vérifier
 * @returns {boolean} - true si des doublons sont trouvés, false sinon
 */
export const containsDuplicates = (arr: string[]): boolean => {
  const uniqueSet = new Set(arr);
  return uniqueSet.size !== arr.length;
};

/**
 * Génère un identifiant unique pour un projet
 * Cette fonction est similaire à celle utilisée dans TopProjectsPieChart
 * @param {Object} project - Projet avec projectId et projectName
 * @returns {string} - Identifiant unique
 */
export const generateUniqueProjectId = (project: { projectId?: string; projectName: string }): string => {
  return project.projectId
    ? `${project.projectId}::${project.projectName}`
    : `id-${Math.random().toString(36).substring(2, 9)}::${project.projectName}`;
};

/**
 * Convertit une chaîne de date au format ISO en objet Date
 * @param {string} dateString - Date au format YYYY-MM-DD
 * @returns {Date} - Objet Date correspondant
 */
export const parseISODate = (dateString: string): Date => {
  const date = new Date(dateString);
  return date;
};

/**
 * Formate une date pour l'affichage en français
 * @param {Date} date - Date à formater
 * @returns {string} - Date formatée (ex: "01/01/2025")
 */
export const formatDateFR = (date: Date): string => {
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Vérifie si deux plages de dates se chevauchent
 * @param {Date} start1 - Date de début de la première plage
 * @param {Date} end1 - Date de fin de la première plage
 * @param {Date} start2 - Date de début de la deuxième plage
 * @param {Date} end2 - Date de fin de la deuxième plage
 * @returns {boolean} - true si les plages se chevauchent, false sinon
 */
export const datesOverlap = (start1: Date, end1: Date, start2: Date, end2: Date): boolean => {
  return start1 <= end2 && start2 <= end1;
};
