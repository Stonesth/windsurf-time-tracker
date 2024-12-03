import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { Query, getDocs, QuerySnapshot, DocumentData, Timestamp } from 'firebase/firestore';

// Fonction utilitaire pour convertir les timestamps Firestore en Date
const convertFirestoreTimestamps = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (obj instanceof Timestamp) {
    return obj.toDate();
  }

  if (Array.isArray(obj)) {
    return obj.map(convertFirestoreTimestamps);
  }

  if (typeof obj === 'object') {
    const converted: { [key: string]: any } = {};
    Object.keys(obj).forEach(key => {
      converted[key] = convertFirestoreTimestamps(obj[key]);
    });
    return converted;
  }

  return obj;
};

export function useFirestoreQuery(
  queryKey: string[],
  firestoreQuery: Query,
  options?: Omit<UseQueryOptions<QuerySnapshot<DocumentData>>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey,
    queryFn: () => getDocs(firestoreQuery),
    ...options,
  });
}

// Hook pour convertir les données Firestore en format utilisable
export function useFirestoreQueryData<T>(
  queryKey: string[],
  firestoreQuery: Query | null,
  options?: Omit<UseQueryOptions<T[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!firestoreQuery) {
        return [];
      }
      const snapshot = await getDocs(firestoreQuery);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return convertFirestoreTimestamps({
          id: doc.id,
          ...data,
        }) as T;
      });
    },
    ...options,
  });
}
