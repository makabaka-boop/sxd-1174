import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Batches from './pages/Batches.jsx';
import Issue from './pages/Issue.jsx';
import ReturnConfirm from './pages/ReturnConfirm.jsx';
import Abnormal from './pages/Abnormal.jsx';
import Transfer from './pages/Transfer.jsx';
import Statistics from './pages/Statistics.jsx';
import Layout from './components/Layout.jsx';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>加载中...</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="batches" element={<Batches />} />
          <Route path="issue" element={<Issue />} />
          <Route path="return" element={<ReturnConfirm />} />
          <Route path="abnormal" element={<Abnormal />} />
          <Route path="transfer" element={<Transfer />} />
          <Route path="statistics" element={<Statistics />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  );
}
