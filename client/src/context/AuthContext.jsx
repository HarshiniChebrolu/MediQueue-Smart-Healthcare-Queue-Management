import React, { createContext, useState, useEffect, useContext } from 'react';
import API from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('mediqueue_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
      } catch (e) {
        localStorage.removeItem('mediqueue_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password, role) => {
    const { data } = await API.post('/auth/login', { email, password, role });
    setUser(data);
    localStorage.setItem('mediqueue_user', JSON.stringify(data));
    return data;
  };

  const googleLogin = async (payload) => {
    const { data } = await API.post('/auth/google', payload);
    setUser(data);
    localStorage.setItem('mediqueue_user', JSON.stringify(data));
    return data;
  };

  const completeProfile = async (formData) => {
    const { data } = await API.post('/auth/complete-profile', formData);
    setUser(data);
    localStorage.setItem('mediqueue_user', JSON.stringify(data));
    return data;
  };

  const register = async (patientData) => {
    const { data } = await API.post('/auth/register', patientData);
    setUser(data);
    localStorage.setItem('mediqueue_user', JSON.stringify(data));
    return data;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('mediqueue_user');
  };

  const setAuthSession = (userData) => {
    setUser(userData);
    localStorage.setItem('mediqueue_user', JSON.stringify(userData));
  };

  const updateUserProfile = (updatedFields) => {
    setUser((prev) => {
      const updated = { ...prev, ...updatedFields };
      localStorage.setItem('mediqueue_user', JSON.stringify(updated));
      return updated;
    });
  };

  const switchDemoRole = async (demoKey) => {
    let email = '';
    let password = '';
    let role = '';
    if (demoKey === 'patient') {
      email = 'patient@mediqueue.com';
      password = 'Patient123!';
      role = 'patient';
    } else if (demoKey === 'doctor-arthur') {
      email = 'dr.arthur@mediqueue.com';
      password = 'Doctor123!';
      role = 'doctor';
    } else if (demoKey === 'doctor-sarah') {
      email = 'dr.sarah@mediqueue.com';
      password = 'Doctor123!';
      role = 'doctor';
    } else if (demoKey === 'receptionist') {
      email = 'receptionist@mediqueue.com';
      password = 'Password123!';
      role = 'receptionist';
    } else if (demoKey === 'admin') {
      email = 'admin@mediqueue.com';
      password = 'Admin123!';
      role = 'admin';
    }
    if (email) {
      return await login(email, password, role);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, googleLogin, completeProfile, register, logout, updateUserProfile, setAuthSession, switchDemoRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
