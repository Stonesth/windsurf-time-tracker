import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Garder les données en cache pendant 5 minutes
      staleTime: 5 * 60 * 1000,
      // Réessayer 3 fois en cas d'erreur
      retry: 3,
      // Réactiver la requête si l'onglet reprend le focus
      refetchOnWindowFocus: true,
      // Ne pas recharger automatiquement les données
      refetchOnMount: false,
    },
  },
});
