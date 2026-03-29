import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import CardDetailPage from './pages/CardDetailPage'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ReviewQueuePage from './pages/ReviewQueuePage'
import UploadPage from './pages/UploadPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* All protected routes share the Layout (topbar + outlet) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/"         element={<DashboardPage />} />
          <Route path="/upload"   element={<UploadPage />} />
          <Route path="/review"   element={<ReviewQueuePage />} />
          <Route path="/card/:id" element={<CardDetailPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
