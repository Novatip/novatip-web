"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';

interface ConnectionContextType {
  isBackendUnreachable: boolean;
  reportError: () => void;
  reportSuccess: () => void;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

export const ConnectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isBackendUnreachable, setIsBackendUnreachable] = useState(false);

  const reportError = useCallback(() => {
    setIsBackendUnreachable(true);
  }, []);

  const reportSuccess = useCallback(() => {
    setIsBackendUnreachable(false);
  }, []);

  return (
    <ConnectionContext.Provider value={{ isBackendUnreachable, reportError, reportSuccess }}>
      {children}
    </ConnectionContext.Provider>
  );
};

export const useConnection = () => {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('useConnection must be used within a ConnectionProvider');
  }
  return context;
};