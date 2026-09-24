import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App';

describe('App component', () => {
  it('renders sign in header on initial load or redirects to login', async () => {
    render(<App />);
    // Initial loading or login page render
    const heading = await screen.findByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
  });
});
