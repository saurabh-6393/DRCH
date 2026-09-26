import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Eagerly loaded core foundation pages (instant navigation, zero loading latency)
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';

// Code-split heavy feature pages (Mapbox, PostGIS spatial search, incident evidence upload, queue)
const PublicMapPage = lazy(() =>
  import('./pages/PublicMapPage').then((m) => ({ default: m.PublicMapPage }))
);
const ReportIncidentPage = lazy(() =>
  import('./pages/ReportIncidentPage').then((m) => ({ default: m.ReportIncidentPage }))
);
const MyReportsPage = lazy(() =>
  import('./pages/MyReportsPage').then((m) => ({ default: m.MyReportsPage }))
);
const ReviewQueuePage = lazy(() =>
  import('./pages/ReviewQueuePage').then((m) => ({ default: m.ReviewQueuePage }))
);
const SheltersPage = lazy(() =>
  import('./pages/SheltersPage').then((m) => ({ default: m.SheltersPage }))
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function PageLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[350px] text-gray-400">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-medium tracking-wide text-gray-400">Loading module...</span>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoadingFallback />}>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/public-map" element={<PublicMapPage />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/report-incident"
                  element={
                    <ProtectedRoute>
                      <ReportIncidentPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/my-reports"
                  element={
                    <ProtectedRoute>
                      <MyReportsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/verifications/queue"
                  element={
                    <ProtectedRoute>
                      <ReviewQueuePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/shelters"
                  element={
                    <ProtectedRoute>
                      <SheltersPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
