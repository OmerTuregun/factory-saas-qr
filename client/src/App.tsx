import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Machines from './pages/Machines';
import MachineDetail from './pages/MachineDetail';
import QRScanner from './pages/QRScanner';
import ReportFault from './pages/ReportFault';
import Maintenance from './pages/Maintenance';
import Login from './pages/Login';
import Register from './pages/Register';
import EmailConfirmed from './pages/EmailConfirmed';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes - Authentication */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth/confirm" element={<EmailConfirmed />} />

          {/* Protected Routes - Dashboard */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Dashboard />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/machines"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Machines />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/machines/:id"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <MachineDetail />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/scan"
            element={
              <ProtectedRoute>
                <QRScanner />
              </ProtectedRoute>
            }
          />
          <Route
            path="/report-fault/:machineId"
            element={
              <ProtectedRoute>
                <ReportFault />
              </ProtectedRoute>
            }
          />
          <Route
            path="/maintenance"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Maintenance />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-gray-900">Ayarlar</h2>
                    <p className="text-gray-500 mt-2">Bu sayfa geliştirilme aşamasında...</p>
                  </div>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
