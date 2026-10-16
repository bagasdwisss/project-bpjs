import React, { createContext, useContext, useReducer } from 'react';

const DashboardContext = createContext();

const initialState = {
  needsRefresh: false,
  lastRefreshTime: null
};

const dashboardReducer = (state, action) => {
  switch (action.type) {
    case 'SET_REFRESH_NEEDED':
      return {
        ...state,
        needsRefresh: true,
        lastRefreshTime: action.timestamp || new Date().toISOString()
      };
    case 'MARK_AS_REFRESHED':
      return {
        ...state,
        needsRefresh: false
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
};

export const DashboardProvider = ({ children }) => {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);

  const setRefreshNeeded = (timestamp) => {
    dispatch({ type: 'SET_REFRESH_NEEDED', timestamp });
  };

  const markAsRefreshed = () => {
    dispatch({ type: 'MARK_AS_REFRESHED' });
  };

  const value = {
    dashboardState: state,
    setRefreshNeeded,
    markAsRefreshed
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};