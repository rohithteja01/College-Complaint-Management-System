import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

const DEFAULT_ADMIN = {
  fullName: 'System Administrator',
  email: 'admin@college.edu',
  role: 'admin',
  department: 'Administration',
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(DEFAULT_ADMIN);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize and auto-authenticate Admin session
  useEffect(() => {
    let isMounted = true;

    const initializeAdminAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken) {
        try {
          if (isMounted) {
            setToken(storedToken);
            if (storedUser) {
              setCurrentUser(JSON.parse(storedUser));
            }
          }
          
          // Verify token validity by calling /auth/me
          const response = await api.get('/auth/me');
          if (response.data?.user && isMounted) {
            setCurrentUser(response.data.user);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            setLoading(false);
            return;
          }
        } catch (err) {
          console.warn('Session verification failed, auto-reauthenticating default admin...');
        }
      }

      // Auto-authenticate as default Administrator (zero manual sign-in required)
      try {
        const response = await api.post('/auth/login', {
          email: 'admin@college.edu',
          password: 'AdminPassword@123',
        });

        const { token: receivedToken, user: receivedUser } = response.data;
        if (isMounted) {
          setToken(receivedToken);
          setCurrentUser(receivedUser || DEFAULT_ADMIN);
          localStorage.setItem('token', receivedToken);
          localStorage.setItem('user', JSON.stringify(receivedUser || DEFAULT_ADMIN));
        }
      } catch (loginErr) {
        console.warn('Auto-login notice:', loginErr.message);
        if (isMounted) {
          // Keep default admin user available in UI even if offline
          setCurrentUser(DEFAULT_ADMIN);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAdminAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Log in user with email and password (Real Auth)
   */
  const login = async (email, password) => {
    setError(null);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token: receivedToken, user: receivedUser } = response.data;

      setToken(receivedToken);
      setCurrentUser(receivedUser);
      localStorage.setItem('token', receivedToken);
      localStorage.setItem('user', JSON.stringify(receivedUser));

      return response.data;
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Login failed';
      setError(message);
      throw new Error(message);
    }
  };

  /**
   * Register a new student (Real Auth)
   */
  const register = async (userData) => {
    setError(null);
    try {
      const response = await api.post('/auth/register', userData);
      const { token: receivedToken, user: receivedUser } = response.data;

      setToken(receivedToken);
      setCurrentUser(receivedUser);
      localStorage.setItem('token', receivedToken);
      localStorage.setItem('user', JSON.stringify(receivedUser));

      return response.data;
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Registration failed';
      setError(message);
      throw new Error(message);
    }
  };

  /**
   * Log out user
   */
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setCurrentUser(null);
    setError(null);
  };

  const value = {
    currentUser,
    user: currentUser,
    token,
    loading,
    error,
    isAuthenticated: !!currentUser && !!token,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
