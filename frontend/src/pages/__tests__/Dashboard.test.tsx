import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from '../Dashboard';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';

// Mock des modules Firebase et du contexte d'authentification
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
}));

jest.mock('../../lib/firebase', () => ({
  db: {}
}));

// Mock de react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// Mock des composants que nous ne voulons pas tester
jest.mock('../../components/time/WeeklyReport', () => {
  return {
    __esModule: true,
    default: () => <div data-testid="weekly-report">Weekly Report Mock</div>,
  };
});

jest.mock('../../components/statistics/AdvancedStats', () => {
  return {
    __esModule: true,
    default: () => <div data-testid="advanced-stats">Advanced Stats Mock</div>,
  };
});

jest.mock('../../components/statistics/TopProjectsPieChart', () => {
  return {
    __esModule: true,
    default: ({ projectData, onDateRangeChange }: any) => {
      // Simuler le composant pour tester onDateRangeChange
      return (
        <div data-testid="top-projects-pie-chart">
          <div>Project Data Count: {projectData?.length || 0}</div>
          <button 
            data-testid="date-range-button"
            onClick={() => onDateRangeChange && onDateRangeChange('2025-01-01', '2025-01-31')}
          >
            Simuler changement de dates
          </button>
        </div>
      );
    },
  };
});

describe('Dashboard Component', () => {
  beforeEach(() => {
    // Setup mocks for each test
    (useAuth as jest.Mock).mockReturnValue({
      currentUser: { uid: 'test-user-id' },
    });
    
    // Mock de la fonction query
    (query as jest.Mock).mockReturnValue('mocked-query');
    
    // Mock de la fonction where
    (where as jest.Mock).mockReturnValue('mocked-where');
    
    // Simuler une collection Firebase
    (collection as jest.Mock).mockReturnValue('mocked-collection');
    
    // Simuler des donnu00e9es de retour pour getDocs
    (getDocs as jest.Mock).mockResolvedValue({
      docs: [
        {
          id: 'project1',
          data: () => ({ name: 'Projet Test 1', userId: 'test-user-id' }),
        },
        {
          id: 'project2',
          data: () => ({ name: 'Projet Test 2', userId: 'test-user-id' }),
        },
      ],
    });
  });

  test('teste le filtrage par dates', async () => {
    // Rendre le composant Dashboard
    render(<Dashboard />);
    
    // Attendre que le composant soit chargu00e9
    await waitFor(() => {
      expect(screen.getByTestId('top-projects-pie-chart')).toBeInTheDocument();
    });
    
    // Simuler un clic sur le bouton de changement de date
    fireEvent.click(screen.getByTestId('date-range-button'));
    
    // Vu00e9rifier que la fonction query a u00e9tu00e9 appelu00e9e avec les bons paramu00e8tres
    await waitFor(() => {
      expect(collection).toHaveBeenCalledWith(db, 'timeEntries');
      expect(where).toHaveBeenCalledWith('userId', '==', 'test-user-id');
      // La date de du00e9but doit u00eatre convertie en Date
      expect(where).toHaveBeenCalledWith('startTime', '>=', expect.any(Date));
      // La date de fin doit u00eatre convertie en Date
      expect(where).toHaveBeenCalledWith('startTime', '<=', expect.any(Date));
    });
  });

  test('gu00e8re correctement le cas ou00f9 aucun projet n\'est trouvu00e9', async () => {
    // Modifier le mock pour qu'aucun projet ne soit trouvu00e9
    (getDocs as jest.Mock).mockResolvedValue({
      docs: [],
    });
    
    // Rendre le composant Dashboard
    render(<Dashboard />);
    
    // Attendre que le composant soit chargu00e9
    await waitFor(() => {
      expect(screen.getByTestId('top-projects-pie-chart')).toBeInTheDocument();
    });
    
    // Simuler un clic sur le bouton de changement de date
    fireEvent.click(screen.getByTestId('date-range-button'));
    
    // Vu00e9rifier que le composant gu00e8re correctement le cas ou00f9 aucun projet n'est trouvu00e9
    await waitFor(() => {
      // On devrait toujours voir le composant TopProjectsPieChart
      expect(screen.getByTestId('top-projects-pie-chart')).toBeInTheDocument();
      // Le message projectData devrait avoir un u00e9lu00e9ment
      expect(screen.getByText('Project Data Count: 1')).toBeInTheDocument();
    });
  });
});
