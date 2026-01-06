import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <DashboardLayout>
              <Dashboard />
            </DashboardLayout>
          }
        />
        <Route
          path="/machines"
          element={
            <DashboardLayout>
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-gray-900">Makineler</h2>
                <p className="text-gray-500 mt-2">Bu sayfa geliştirilme aşamasında...</p>
              </div>
            </DashboardLayout>
          }
        />
        <Route
          path="/maintenance"
          element={
            <DashboardLayout>
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-gray-900">Arızalar</h2>
                <p className="text-gray-500 mt-2">Bu sayfa geliştirilme aşamasında...</p>
              </div>
            </DashboardLayout>
          }
        />
        <Route
          path="/settings"
          element={
            <DashboardLayout>
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-gray-900">Ayarlar</h2>
                <p className="text-gray-500 mt-2">Bu sayfa geliştirilme aşamasında...</p>
              </div>
            </DashboardLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
