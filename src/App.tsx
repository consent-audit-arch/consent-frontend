import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './auth/AuthContext';
import { Layout } from './components/Layout';
import { LoginGate } from './components/LoginGate';
import { DashboardPage } from './pages/DashboardPage';
import { TimelinePage } from './pages/TimelinePage';
import { ConsentsPage } from './pages/ConsentsPage';
import { BillingPage } from './pages/BillingPage';
import { PromotionsPage } from './pages/PromotionsPage';
import { AuditPage } from './pages/AuditPage';
import { SeedPage } from './pages/SeedPage';
import { CallbackPage } from './pages/CallbackPage';

const qc = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30000 },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/callback" element={<CallbackPage />} />
            <Route
              path="*"
              element={
                <LoginGate>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<DashboardPage />} />
                      <Route path="/timeline" element={<TimelinePage />} />
                      <Route path="/consents" element={<ConsentsPage />} />
                      <Route path="/billing" element={<BillingPage />} />
                      <Route path="/promotions" element={<PromotionsPage />} />
                      <Route path="/audit" element={<AuditPage />} />
                      <Route path="/seed" element={<SeedPage />} />
                    </Routes>
                  </Layout>
                </LoginGate>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
