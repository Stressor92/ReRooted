import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import ToastContainer from './components/ToastContainer';
import TreePage from './features/tree/TreePage';
import AppLayout from './layouts/AppLayout';
import ImportPage from './pages/ImportPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <AppLayout>
            <Routes>
              <Route path="/" element={<TreePage />} />
              <Route path="/import" element={<ImportPage />} />
            </Routes>
          </AppLayout>
          <ToastContainer />
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
