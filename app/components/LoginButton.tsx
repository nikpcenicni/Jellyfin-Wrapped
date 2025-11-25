'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import axios from 'axios'

type LoginMethod = 'username' | 'quick-connect'

interface AuthResponse {
  user: {
    id: string
    name: string
    serverId: string
  }
  accessToken: string
  sessionInfo: any
}

export default function LoginButton() {
  const t = useTranslations()
  const [showModal, setShowModal] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('username')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userName, setUserName] = useState<string | null>(null)

  // Check authentication status on mount and when auth changes
  useEffect(() => {
    const checkAuth = () => {
      if (typeof window !== 'undefined') {
        const userStr = localStorage.getItem('jellyfin_user')
        const accessToken = localStorage.getItem('jellyfin_access_token')
        if (userStr && accessToken) {
          try {
            const user = JSON.parse(userStr)
            setIsAuthenticated(true)
            setUserName(user.name)
          } catch {
            setIsAuthenticated(false)
            setUserName(null)
          }
        } else {
          setIsAuthenticated(false)
          setUserName(null)
        }
      }
    }

    checkAuth()

    // Listen for auth changes
    const handleAuthChange = () => {
      checkAuth()
    }
    window.addEventListener('jellyfin-auth-changed', handleAuthChange)

    return () => {
      window.removeEventListener('jellyfin-auth-changed', handleAuthChange)
    }
  }, [])

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('jellyfin_user')
      localStorage.removeItem('jellyfin_access_token')
      setIsAuthenticated(false)
      setUserName(null)
      window.dispatchEvent(new CustomEvent('jellyfin-auth-changed', { detail: { authenticated: false } }))
      window.location.reload()
    }
  }

  const confirmLogout = () => {
    setShowLogoutConfirm(true)
  }

  const cancelLogout = () => {
    setShowLogoutConfirm(false)
  }
  
  // Username/password form state
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Quick Connect state
  const [quickConnectCode, setQuickConnectCode] = useState<string | null>(null)
  const [quickConnectSecret, setQuickConnectSecret] = useState<string | null>(null)
  const [quickConnectLoading, setQuickConnectLoading] = useState(false)
  const [quickConnectError, setQuickConnectError] = useState<string | null>(null)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)

  const handleUsernameLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await axios.post<AuthResponse>('/api/login', {
        username,
        password
      })

      // Store auth data (you may want to use a proper state management solution)
      if (typeof window !== 'undefined') {
        localStorage.setItem('jellyfin_user', JSON.stringify(response.data.user))
        localStorage.setItem('jellyfin_access_token', response.data.accessToken)
      }

      setIsAuthenticated(true)
      setUserName(response.data.user.name)
      setShowModal(false)
      // Trigger a custom event to notify the parent component
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('jellyfin-auth-changed', { detail: { authenticated: true, user: response.data.user } }))
      }
      // Small delay before reload to ensure localStorage is set
      setTimeout(() => {
        window.location.reload()
      }, 100)
    } catch (err: any) {
      setError(err.response?.data?.error || t('login.loginFailed'))
      setLoading(false)
    }
  }

  const handleQuickConnectInitiate = async () => {
    setQuickConnectError(null)
    setQuickConnectLoading(true)
    setQuickConnectCode(null)
    setQuickConnectSecret(null)

    try {
      const response = await axios.post('/api/quick-connect/initiate')
      
      if (response.data?.Secret && response.data?.Code) {
        setQuickConnectSecret(response.data.Secret)
        setQuickConnectCode(response.data.Code)
        setQuickConnectLoading(false)
        
        // Start polling for authentication
        startPolling(response.data.Secret)
      } else {
          setQuickConnectError(t('login.failedToGetCode'))
        setQuickConnectLoading(false)
      }
    } catch (err: any) {
      setQuickConnectError(err.response?.data?.error || t('login.failedToInitiate'))
      setQuickConnectLoading(false)
    }
  }

  const startPolling = (secret: string) => {
    // Clear any existing polling interval
    if (pollingInterval) {
      clearInterval(pollingInterval)
    }

    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`/api/quick-connect/status?secret=${encodeURIComponent(secret)}`)
        
        // Check if authenticated
        if (response.data?.Authenticated) {
          clearInterval(interval)
          setPollingInterval(null)
          
          // Authenticate with the secret
          try {
            const authResponse = await axios.post<AuthResponse>('/api/quick-connect/authenticate', {
              secret
            })

            // Store auth data
            if (typeof window !== 'undefined') {
              localStorage.setItem('jellyfin_user', JSON.stringify(authResponse.data.user))
              localStorage.setItem('jellyfin_access_token', authResponse.data.accessToken)
            }

            setIsAuthenticated(true)
            setUserName(authResponse.data.user.name)
            setShowModal(false)
            // Trigger a custom event to notify the parent component
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('jellyfin-auth-changed', { detail: { authenticated: true, user: authResponse.data.user } }))
            }
            // Small delay before reload to ensure localStorage is set
            setTimeout(() => {
              window.location.reload()
            }, 100)
          } catch (authErr: any) {
            setQuickConnectError(authErr.response?.data?.error || t('login.authenticationFailed'))
            clearInterval(interval)
            setPollingInterval(null)
          }
        } else if (response.data?.Expired) {
          clearInterval(interval)
          setPollingInterval(null)
          setQuickConnectError(t('login.codeExpired'))
          setQuickConnectCode(null)
          setQuickConnectSecret(null)
        }
      } catch (err: any) {
        // Continue polling on error (might be temporary)
        console.error('Quick Connect polling error:', err)
      }
    }, 2000) // Poll every 2 seconds

    setPollingInterval(interval)

    // Stop polling after 5 minutes
    setTimeout(() => {
      if (interval) {
        clearInterval(interval)
        setPollingInterval(null)
        if (quickConnectCode) {
          setQuickConnectError(t('login.timeout'))
          setQuickConnectCode(null)
          setQuickConnectSecret(null)
        }
      }
    }, 5 * 60 * 1000)
  }

  const handleCloseModal = () => {
    // Clean up polling interval
    if (pollingInterval) {
      clearInterval(pollingInterval)
      setPollingInterval(null)
    }
    
    setShowModal(false)
    setError(null)
    setQuickConnectError(null)
    setQuickConnectCode(null)
    setQuickConnectSecret(null)
    setUsername('')
    setPassword('')
  }

  return (
    <>
      {isAuthenticated ? (
        <button
          onClick={confirmLogout}
          className="p-2 bg-gray-800/80 hover:bg-gray-700/80 text-gray-300 hover:text-white rounded-lg border border-gray-700 hover:border-red-500/50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500/50"
          aria-label={t('common.logout')}
          title={t('common.logout')}
        >
          <svg 
            className="w-5 h-5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
            />
          </svg>
        </button>
      ) : (
        <button
          onClick={() => setShowModal(true)}
          className="px-6 py-2 bg-jellyfin-blue hover:bg-jellyfin-blue/80 text-white font-semibold rounded-lg transition-colors"
        >
          {t('login.loginForPersonalized')}
        </button>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full border border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">{t('login.title')}</h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Login Method Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-700">
              <button
                onClick={() => {
                  setLoginMethod('username')
                  setError(null)
                  setQuickConnectError(null)
                  if (pollingInterval) {
                    clearInterval(pollingInterval)
                    setPollingInterval(null)
                  }
                  setQuickConnectCode(null)
                  setQuickConnectSecret(null)
                }}
                className={`px-4 py-2 font-semibold transition-colors ${
                  loginMethod === 'username'
                    ? 'text-jellyfin-blue border-b-2 border-jellyfin-blue'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {t('login.usernamePassword')}
              </button>
              <button
                onClick={() => {
                  setLoginMethod('quick-connect')
                  setError(null)
                }}
                className={`px-4 py-2 font-semibold transition-colors ${
                  loginMethod === 'quick-connect'
                    ? 'text-jellyfin-blue border-b-2 border-jellyfin-blue'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Quick Connect
              </button>
            </div>

            {/* Username/Password Login Form */}
            {loginMethod === 'username' && (
              <form onSubmit={handleUsernameLogin} className="space-y-4">
                {error && (
                  <div className="bg-red-900/30 border border-red-700/50 text-red-200 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                    {t('login.username')}
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-jellyfin-blue focus:border-transparent"
                    placeholder="Enter your username"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                    {t('login.password')}
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-jellyfin-blue focus:border-transparent"
                    placeholder="Enter your password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-2 bg-jellyfin-blue hover:bg-jellyfin-blue/80 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                >
                  {loading ? t('login.loggingIn') : t('common.login')}
                </button>
              </form>
            )}

            {/* Quick Connect Form */}
            {loginMethod === 'quick-connect' && (
              <div className="space-y-4">
                {quickConnectError && (
                  <div className="bg-red-900/30 border border-red-700/50 text-red-200 px-4 py-3 rounded-lg text-sm">
                    {quickConnectError}
                  </div>
                )}

                {!quickConnectCode ? (
                  <>
                    <p className="text-gray-400 text-sm mb-4">
                      {t('login.quickConnectDescription')}
                    </p>
                    <button
                      onClick={handleQuickConnectInitiate}
                      disabled={quickConnectLoading}
                      className="w-full px-6 py-2 bg-jellyfin-blue hover:bg-jellyfin-blue/80 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                    >
                      {quickConnectLoading ? t('login.generatingCode') : t('login.getCode')}
                    </button>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6 text-center">
                      <p className="text-gray-400 text-sm mb-3">
                        {t('login.enterCode')}
                      </p>
                      <div className="text-4xl font-bold text-jellyfin-blue tracking-widest mb-3">
                        {quickConnectCode}
                      </div>
                      <p className="text-gray-500 text-xs">
                        {t('login.waitingApproval')}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        if (pollingInterval) {
                          clearInterval(pollingInterval)
                          setPollingInterval(null)
                        }
                        setQuickConnectCode(null)
                        setQuickConnectSecret(null)
                        setQuickConnectError(null)
                      }}
                      className="w-full px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700 shadow-xl">
            <h3 className="text-xl font-bold text-white mb-4">
              {t('common.logout')}?
            </h3>
            <p className="text-gray-300 mb-6">
              {t('common.logoutConfirm')}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelLogout}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
              >
                {t('common.logout')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
