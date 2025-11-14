import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import AuthPage from './Authpage'
import './index.css'

function Root() {
  const [userData, setUserData] = useState(() => {
    try {
      const stored = localStorage.getItem('userData');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error loading user data:', error);
      return null;
    }
  });

  // Save to localStorage whenever userData changes
  useEffect(() => {
    if (userData) {
      try {
        localStorage.setItem('userData', JSON.stringify(userData));
        console.log('✅ User data saved:', userData);
      } catch (error) {
        console.error('❌ Error saving user data:', error);
      }
    }
  }, [userData]);

  function handleAuth(user) {
    console.log('🔐 Auth successful:', user);
    setUserData(user);
  }

  function handleSignOut() {
    console.log('👋 Signing out');
    setUserData(null);
    localStorage.removeItem('userData');
  }

  function handleUpdateProfile(updatedData) {
    console.log('✏️ Updating profile with:', updatedData);
    const newUserData = { ...userData, ...updatedData };
    console.log('📝 New user data:', newUserData);
    setUserData(newUserData);
  }

  if (!userData) {
    return <AuthPage onAuth={handleAuth} />;
  }

  return (
    <App 
      user={userData} 
      onSignOut={handleSignOut} 
      onUpdateProfile={handleUpdateProfile} 
    />
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
