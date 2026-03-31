import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider, SidebarProvider } from './context/AuthContext.jsx';
import App from './App.jsx';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <SidebarProvider>
        <App />
      </SidebarProvider>
    </AuthProvider>
  </React.StrictMode>
);
