import React, { createContext, useContext } from 'react';
import { useSnackbar } from 'notistack';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { enqueueSnackbar } = useSnackbar();

  const showNotification = (message, variant = 'default') => {
    enqueueSnackbar(message, { variant });
  };

  const showError = (message) => {
    enqueueSnackbar(message, { variant: 'error' });
  };

  const showSuccess = (message) => {
    enqueueSnackbar(message, { variant: 'success' });
  };

  const showWarning = (message) => {
    enqueueSnackbar(message, { variant: 'warning' });
  };

  const showInfo = (message) => {
    enqueueSnackbar(message, { variant: 'info' });
  };

  const value = {
    showNotification,
    showError,
    showSuccess,
    showWarning,
    showInfo
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};