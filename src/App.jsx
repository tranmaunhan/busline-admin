import { Navigate, Route, Routes } from 'react-router-dom';
import { useAdminAuth } from './auth/AdminAuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';
import AdminBookingSeatPage from './pages/AdminBookingSeatPage';
import BookingPage from './pages/BookingPage';
import DashboardPage from './pages/DashboardPage';
import FleetPage from './pages/FleetPage';
import FleetEditorPage from './pages/FleetEditorPage';
import LoginPage from './pages/LoginPage';
import RouteEditorPage from './pages/RouteEditorPage';
import RoutesPage from './pages/RoutesPage';
import SchedulePage from './pages/SchedulePage';
import ScheduleEditorPage from './pages/ScheduleEditorPage';
import StaffPage from './pages/StaffPage';

function App() {
  const { isAuthenticated, authReady } = useAdminAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={authReady && isAuthenticated ? <Navigate replace to="/dashboard" /> : <LoginPage />}
      />
      <Route
        element={(
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        )}
      >
        <Route index element={<Navigate replace to="/dashboard" />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/dat-ve" element={<BookingPage />} />
        <Route path="/dat-ve/chuyen/:tripId" element={<AdminBookingSeatPage />} />
        <Route path="/lich-chay" element={<SchedulePage />} />
        <Route path="/lich-chay/tao-moi" element={<ScheduleEditorPage />} />
        <Route path="/lich-chay/:scheduleId/chinh-sua" element={<ScheduleEditorPage />} />
        <Route path="/tuyen-xe" element={<RoutesPage />} />
        <Route path="/tuyen-xe/tao-moi" element={<RouteEditorPage />} />
        <Route path="/tuyen-xe/:routeId/chinh-sua" element={<RouteEditorPage />} />
        <Route path="/doi-xe" element={<FleetPage />} />
        <Route path="/doi-xe/tao-moi" element={<FleetEditorPage />} />
        <Route path="/doi-xe/:vehicleId/chinh-sua" element={<FleetEditorPage />} />
        <Route path="/nhan-su" element={<StaffPage />} />
      </Route>
      <Route path="*" element={<Navigate replace to={isAuthenticated ? '/dashboard' : '/login'} />} />
    </Routes>
  );
}

export default App;
