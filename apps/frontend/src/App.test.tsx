import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Home } from './routes/Home';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('Home', () => {
  it('renders the title', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <Home />
      </QueryClientProvider>,
    );
    expect(screen.getByRole('heading', { name: 'Garden Guide' })).toBeInTheDocument();
  });
});
