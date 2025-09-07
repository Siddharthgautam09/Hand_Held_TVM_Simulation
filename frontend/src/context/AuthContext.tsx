import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Conductor } from '../types';

interface AuthContextType {
  conductor: Conductor | null;
  login: (credentials: { username: string; password: string }) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [conductor, setConductor] = useState<Conductor | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check for saved authentication
    const savedConductor = localStorage.getItem('conductor');
    if (savedConductor) {
      setConductor(JSON.parse(savedConductor));
      setIsAuthenticated(true);
    }
  }, []);

  const login = async (credentials: { username: string; password: string }): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (response.ok) {
        const conductorData = await response.json();
        setConductor(conductorData);
        setIsAuthenticated(true);
        localStorage.setItem('conductor', JSON.stringify(conductorData));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    setConductor(null);
    setIsAuthenticated(false);
    localStorage.removeItem('conductor');
  };

  return (
    <AuthContext.Provider value={{ conductor, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};
