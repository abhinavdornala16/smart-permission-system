import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { AuthContext } from './auth-context';

export const AuthProvider = ({ children }) => {
  const normalizeUserData = (data) => {
    if (!data) return null;
    return {
      ...data,
      role: data.role ? String(data.role).toLowerCase() : data.role,
    };
  };

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? normalizeUserData(JSON.parse(savedUser)) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          if (res.data.success) {
            const normalized = normalizeUserData(res.data.data);
            setUser(normalized);
            localStorage.setItem('user', JSON.stringify(normalized));
          }
        } catch (error) {
          console.error('Failed to verify user session:', error);
          if (error.response?.status === 401) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            setUser(null);
          }
        }
      }
      setLoading(false);
    };

    fetchProfile();
  }, []);

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    if (res.data.success) {
      const { access_token, refresh_token, user: rawUserData } = res.data.data;
      const userData = normalizeUserData(rawUserData);
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return userData;
    }
    throw new Error(res.data.message || 'Login failed');
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
