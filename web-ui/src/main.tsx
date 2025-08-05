import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

// Create a client with proper caching to prevent infinite loops
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: false, // Disable automatic refetching
      refetchOnMount: false, // Don't auto-refetch on mount to prevent loops
      refetchOnWindowFocus: false, // Don't refetch when window gains focus
      refetchOnReconnect: false, // Don't refetch on reconnect to prevent loops
      refetchIntervalInBackground: false, // Disable background refetching
      staleTime: 30000, // Consider data fresh for 30 seconds
      gcTime: 60000, // Keep data in cache for 60 seconds
      retry: 1, // Only retry failed requests once
      retryDelay: 3000, // Fixed 3 second delay between retries
    },
    mutations: {
      retry: 1, // Only retry mutations once
    },
  },
});

console.log('🏗️ QueryClient created with config:', queryClient.getDefaultOptions());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
