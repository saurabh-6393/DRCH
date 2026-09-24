import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import { ReportIncidentPage } from './pages/ReportIncidentPage';
import { MyReportsPage } from './pages/MyReportsPage';
import { ReviewQueuePage } from './pages/ReviewQueuePage';
import { SheltersPage } from './pages/SheltersPage';
import { PublicMapPage } from './pages/PublicMapPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
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
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

