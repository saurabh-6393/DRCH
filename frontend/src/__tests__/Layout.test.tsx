import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Layout from '../components/Layout';
import * as AuthContextModule from '../context/AuthContext';

vi.mock('../context/AuthContext');
vi.mock('../components/NotificationPrompt', () => ({
  default: () => <div data-testid="notification-prompt" />,
}));

describe('Layout Navigation Role-Aware Filtering (P1-3)', () => {
  it('hides Review Queue from CITIZEN role', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: {
        id: 'user-citizen',
        email: 'citizen@example.com',
        displayName: 'Test Citizen',
        roles: ['CITIZEN'],
      },
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    );

    expect(screen.getByText('Public Map')).toBeInTheDocument();
    expect(screen.getByText('Report Incident')).toBeInTheDocument();
    expect(screen.getByText('My Reports')).toBeInTheDocument();
    expect(screen.getByText('Shelters')).toBeInTheDocument();
    expect(screen.queryByText('Review Queue')).not.toBeInTheDocument();
  });

  it('shows Review Queue for VOLUNTEER role', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: {
        id: 'user-vol',
        email: 'volunteer@example.com',
        displayName: 'Test Volunteer',
        roles: ['VOLUNTEER'],
      },
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    );

    expect(screen.getByText('Review Queue')).toBeInTheDocument();
  });

  it('shows Review Queue for AUTHORITY role', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: {
        id: 'user-auth',
        email: 'authority@example.com',
        displayName: 'Test Authority',
        roles: ['AUTHORITY'],
      },
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    );

    expect(screen.getByText('Review Queue')).toBeInTheDocument();
  });

  it('shows Review Queue for NGO and ADMIN roles', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: {
        id: 'user-admin',
        email: 'admin@example.com',
        displayName: 'Test Admin',
        roles: ['ADMIN'],
      },
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    );

    expect(screen.getByText('Review Queue')).toBeInTheDocument();
  });

  it('hides Review Queue and authenticated actions when unauthenticated', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    );

    expect(screen.getByText('Public Map')).toBeInTheDocument();
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Register')).toBeInTheDocument();
    expect(screen.queryByText('Review Queue')).not.toBeInTheDocument();
  });

  it('toggles mobile navigation menu when hamburger button is clicked (P2-2)', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: {
        id: 'user-vol',
        email: 'volunteer@example.com',
        displayName: 'Test Volunteer',
        roles: ['VOLUNTEER'],
      },
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    );

    const toggleBtn = screen.getByLabelText('Toggle navigation menu');
    expect(toggleBtn).toBeInTheDocument();
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');

    // Click toggle to open menu
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeInTheDocument();

    // Click toggle again to close menu
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).not.toBeInTheDocument();
  });
});

