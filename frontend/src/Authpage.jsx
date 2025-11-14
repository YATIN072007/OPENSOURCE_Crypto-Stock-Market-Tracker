import React, { useState } from 'react';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { initializeApp } from 'firebase/app';

// ⚠️ IMPORTANT: Replace with YOUR actual Firebase credentials
// Get these from: https://console.firebase.google.com/ → Your Project → Settings → General
const firebaseConfig = {
  apiKey: "AIzaSyACRwMqhTo7-YkJKIYHqFoKvgk0Yp4NFtM",
  authDomain: "fintrick-15601.firebaseapp.com",
  projectId: "fintrick-15601",
  storageBucket: "fintrick-15601.firebasestorage.app",
  messagingSenderId: "981104174698",
  appId: "1:981104174698:web:adb634e8556445b82b0c13",
  measurementId: "G-7RXPD1KKHY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export default function AuthPage({ onAuth }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isStrongPassword = (password) => {
    return password.length >= 6;
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.name.trim()) {
      setError('Name is required');
      setLoading(false);
      return;
    }

    if (!isValidEmail(formData.email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    if (!isStrongPassword(formData.password)) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      const userData = {
        uid: userCredential.user.uid,
        email: formData.email,
        name: formData.name,
        phone: formData.phone || '+91 98765 43210',
        createdAt: new Date().toISOString()
      };

      // Store user data in localStorage for profile info
      const allUsers = JSON.parse(localStorage.getItem('users') || '{}');
      allUsers[userData.uid] = userData;
      localStorage.setItem('users', JSON.stringify(allUsers));

      onAuth(userData);
    } catch (error) {
      console.error('Sign up error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      if (error.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please sign in.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else if (error.code === 'auth/weak-password') {
        setError('Password is too weak');
      } else if (error.code === 'auth/network-request-failed') {
        setError('Network error. Check your internet connection.');
      } else if (error.code === 'auth/invalid-api-key') {
        setError('Firebase configuration error. Please check API key.');
      } else {
        setError(`Sign up failed: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!isValidEmail(formData.email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    if (!formData.password) {
      setError('Password is required');
      setLoading(false);
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      const storedUsers = JSON.parse(localStorage.getItem('users') || '{}');
      const userData = storedUsers[userCredential.user.uid] || {
        uid: userCredential.user.uid,
        email: formData.email,
        name: formData.email.split('@')[0],
        phone: '+91 98765 43210'
      };

      onAuth(userData);
    } catch (error) {
      console.error('Sign in error:', error);
      console.error('Error code:', error.code);
      
      if (error.code === 'auth/user-not-found') {
        setError('No account found with this email');
      } else if (error.code === 'auth/wrong-password') {
        setError('Incorrect password');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else if (error.code === 'auth/network-request-failed') {
        setError('Network error. Check your internet connection.');
      } else if (error.code === 'auth/invalid-api-key') {
        setError('Firebase configuration error. Please check API key.');
      } else {
        setError(`Sign in failed: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-800/90 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-indigo-900 w-full max-w-md p-8">
        
        <div className="text-center mb-8">
          <div className="bg-gradient-to-br from-sky-500 to-indigo-600 w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg">
            <span className="text-3xl">💸</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-2">FinTrack</h1>
          <p className="text-gray-400 text-sm">Real-time Crypto & Stock Tracker</p>
        </div>

        <div className="flex gap-2 mb-6 bg-slate-700/50 p-1 rounded-xl">
          <button
            onClick={() => {
              setIsSignUp(false);
              setError('');
            }}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition ${
              !isSignUp ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setIsSignUp(true);
              setError('');
            }}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition ${
              isSignUp ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded-lg text-red-200 text-sm">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
          
          {isSignUp && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-700 text-white border-2 border-slate-600 focus:border-indigo-500 rounded-xl px-4 py-3 outline-none transition"
                  placeholder="John Doe"
                  required={isSignUp}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-700 text-white border-2 border-slate-600 focus:border-indigo-500 rounded-xl px-4 py-3 outline-none transition"
                  placeholder="+91 98765 43210"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-slate-700 text-white border-2 border-slate-600 focus:border-indigo-500 rounded-xl px-4 py-3 outline-none transition"
              placeholder="your.email@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full bg-slate-700 text-white border-2 border-slate-600 focus:border-indigo-500 rounded-xl px-4 py-3 outline-none transition"
              placeholder="••••••••"
              required
            />
          </div>

          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full bg-slate-700 text-white border-2 border-slate-600 focus:border-indigo-500 rounded-xl px-4 py-3 outline-none transition"
                placeholder="••••••••"
                required={isSignUp}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-xl font-bold text-white transition shadow-lg ${
              loading
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500'
            }`}
          >
            {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-gray-400 text-xs mt-6">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
            className="text-indigo-400 hover:text-indigo-300 font-semibold"
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  );
}
