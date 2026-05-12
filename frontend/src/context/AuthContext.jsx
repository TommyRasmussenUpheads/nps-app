import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('nps_token'))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) { setLoading(false); return }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { setUser(data); setLoading(false) })
      .catch(() => { logout(); setLoading(false) })
  }, [])

  function login(newToken, username) {
    localStorage.setItem('nps_token', newToken)
    setToken(newToken)
    setUser({ username })
  }

  function logout() {
    localStorage.removeItem('nps_token')
    setToken(null)
    setUser(null)
  }

  async function authFetch(url, options = {}) {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    })
    if (res.status === 401) { logout(); return res }
    return res
  }

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout, authFetch }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
