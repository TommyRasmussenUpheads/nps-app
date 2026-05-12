import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RequireAuth({ children }) {
  const { token, loading } = useAuth()
  const location = useLocation()

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f3' }}>
      <p style={{ color: '#6b6b68' }}>Laster...</p>
    </div>
  )

  if (!token) return <Navigate to="/login" state={{ from: location.pathname }} replace />

  return children
}
