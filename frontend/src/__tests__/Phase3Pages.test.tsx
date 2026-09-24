import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PublicMapPage } from '../pages/PublicMapPage';
import { ReviewQueuePage } from '../pages/ReviewQueuePage';
import { SheltersPage } from '../pages/SheltersPage';
import * as sheltersApi from '../api/shelters';
import * as verificationsApi from '../api/verifications';

vi.mock('../api/shelters');
vi.mock('../api/verifications');

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      email: 'authority@example.com',
      roles: ['AUTHORITY'],
    },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
  }),
}));

describe('Phase 3 Pages & Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PublicMapPage', () => {
    it('renders heading and handles empty incident list with plain-text fallback capability', async () => {
      vi.mocked(sheltersApi.getPublicVerifiedIncidents).mockResolvedValue([]);

      render(<PublicMapPage />);

      expect(screen.getByText(/Public Verified Incident Map/i)).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText(/No verified incident reports currently active/i)).toBeInTheDocument();
      });
    });

    it('renders list of verified incidents with 2-decimal rounded coordinates', async () => {
      vi.mocked(sheltersApi.getPublicVerifiedIncidents).mockResolvedValue([
        {
          id: 'inc-1',
          category: 'FLOOD',
          description: 'High water levels',
          severity: 'HIGH',
          status: 'VERIFIED',
          location: { lat: 12.97, lng: 77.59 },
          createdAt: '2026-09-24T12:00:00Z',
        },
      ]);

      render(<PublicMapPage />);

      await waitFor(() => {
        const floodElements = screen.getAllByText('FLOOD');
        expect(floodElements.length).toBeGreaterThan(0);
        expect(screen.getByText('High water levels')).toBeInTheDocument();
        expect(screen.getAllByText(/12\.97/i).length).toBeGreaterThan(0);
      });
    });
  });

  describe('ReviewQueuePage', () => {
    it('renders verification queue page heading and empty backlog state', async () => {
      vi.mocked(verificationsApi.getVerificationQueue).mockResolvedValue([]);

      render(<ReviewQueuePage />);

      expect(screen.getByRole('heading', { name: /Verification Backlog Queue/i })).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByText(/No reports currently pending review/i)).toBeInTheDocument();
      });
    });
  });

  describe('SheltersPage', () => {
    it('renders shelter search header and submit button', async () => {
      vi.mocked(sheltersApi.getSheltersProximity).mockResolvedValue([]);

      render(<SheltersPage />);

      expect(screen.getByRole('heading', { name: /Shelter Proximity Search/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Search Nearby Operational Shelters/i })).toBeInTheDocument();
    });
  });
});
