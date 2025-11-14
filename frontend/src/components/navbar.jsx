import React, { useState, useRef, useEffect } from 'react';

export default function Navbar({ user, onSignOut, onUpdateProfile, watchlistCount, watchlist, tickers, onRemoveFromWatchlist }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isWatchlistModalOpen, setIsWatchlistModalOpen] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userName = user?.name || "User";
  const userEmail = user?.email || "user@fintrack.com";
  const userPhone = user?.phone || "+91 98765 43210";
  const userAvatar = user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=6366f1&color=fff&bold=true`;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Edit Profile Modal
  const EditProfileModal = () => {
    const [formData, setFormData] = useState({
      name: userName,
      email: userEmail,
      phone: userPhone
    });
    const [isSaving, setIsSaving] = useState(false);

    if (!isEditModalOpen) return null;

    const handleSubmit = (e) => {
      e.preventDefault();
      setIsSaving(true);
      
      if (!formData.name.trim()) {
        alert('Name cannot be empty');
        setIsSaving(false);
        return;
      }
      if (!formData.email.trim()) {
        alert('Email cannot be empty');
        setIsSaving(false);
        return;
      }
      if (!formData.phone.trim()) {
        alert('Phone cannot be empty');
        setIsSaving(false);
        return;
      }

      try {
        console.log('💾 Saving profile changes:', formData);
        onUpdateProfile(formData);
        setIsEditModalOpen(false);
        setIsProfileOpen(false);
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
      } catch (error) {
        console.error('❌ Error updating profile:', error);
        alert('Failed to update profile. Please try again.');
      } finally {
        setIsSaving(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 w-full max-w-md shadow-2xl border-2 border-indigo-500">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-white">✏️ Edit Profile</h3>
            <button 
              onClick={() => setIsEditModalOpen(false)} 
              className="text-gray-400 hover:text-white text-3xl leading-none"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <img 
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=6366f1&color=fff&bold=true&size=128`}
                  alt="Profile Preview" 
                  className="w-32 h-32 rounded-full ring-4 ring-indigo-500 shadow-lg"
                />
                <div className="absolute bottom-0 right-0 bg-indigo-600 rounded-full p-2 shadow-lg">
                  <span className="text-2xl">👤</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full bg-slate-700 text-white border-2 border-indigo-500 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-indigo-400 outline-none"
                placeholder="Enter your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="w-full bg-slate-700 text-white border-2 border-indigo-500 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-indigo-400 outline-none"
                placeholder="your.email@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                className="w-full bg-slate-700 text-white border-2 border-indigo-500 rounded-xl px-4 py-3 text-base focus:ring-2 focus:ring-indigo-400 outline-none"
                placeholder="+91 98765 43210"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                disabled={isSaving}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-gray-600 hover:bg-gray-500 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className={`flex-1 py-3 rounded-xl font-bold text-white transition shadow-lg ${
                  isSaving 
                    ? 'bg-gray-500 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500'
                }`}
              >
                {isSaving ? '💾 Saving...' : '✅ Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Watchlist Modal
  const WatchlistModal = () => {
    if (!isWatchlistModalOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 w-full max-w-2xl shadow-2xl border-2 border-indigo-500 max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-2xl font-bold text-white">📊 Your Watchlist</h3>
              <p className="text-sm text-gray-400 mt-1">Manage your tracked assets</p>
            </div>
            <button 
              onClick={() => setIsWatchlistModalOpen(false)} 
              className="text-gray-400 hover:text-white text-3xl leading-none"
            >
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {watchlist && watchlist.length > 0 ? (
              <div className="space-y-3">
                {watchlist.map((symbol, index) => {
                  const ticker = tickers?.[symbol] || {};
                  const price = ticker.price || 0;
                  const change = ticker.change || 0;
                  const isPositive = change >= 0;

                  return (
                    <div 
                      key={symbol} 
                      className="group flex items-center justify-between p-4 bg-slate-700/50 hover:bg-slate-700 rounded-xl border-2 border-transparent hover:border-indigo-500 transition"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-xl text-white">{symbol.toUpperCase()}</div>
                          <div className="text-sm text-gray-400">
                            {symbol.length <= 5 ? 'Stock' : 'Cryptocurrency'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right mr-4">
                        <div className="text-2xl font-black text-white">
                          {price > 0 ? formatCurrency(price) : '—'}
                        </div>
                        <div className={`text-sm font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                          {change !== 0 ? `${isPositive ? '+' : ''}${change.toFixed(2)}%` : '—'}
                        </div>
                      </div>

                      <button
                        onClick={() => onRemoveFromWatchlist(symbol)}
                        className="opacity-0 group-hover:opacity-100 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-bold transition shadow-lg"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-xl text-gray-400 mb-2">Your watchlist is empty</p>
                <p className="text-gray-500">Add assets from the Market tab to track them here</p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-700">
            <button
              onClick={() => setIsWatchlistModalOpen(false)}
              className="w-full py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-lg"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/95 backdrop-blur-xl border-b border-sky-200 dark:border-indigo-900 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-sky-500 to-indigo-600 p-2 rounded-xl shadow-lg">
                <span className="text-2xl">💸</span>
              </div>
              <div className="hidden sm:block">
                <div className="font-extrabold text-xl text-indigo-800 dark:text-cyan-200 tracking-wide">FinTrack</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 -mt-1">Real-time Tracker</div>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-6">
              
              <button 
                onClick={() => setIsWatchlistModalOpen(true)}
                className="relative group flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-50 to-sky-50 dark:from-indigo-900/30 dark:to-sky-900/30 border border-indigo-200 dark:border-indigo-800 hover:shadow-lg transition"
              >
                <span className="text-lg">📊</span>
                <span className="font-semibold text-indigo-700 dark:text-sky-200">Watchlist</span>
                {watchlistCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center shadow-lg animate-pulse">
                    {watchlistCount}
                  </span>
                )}
              </button>

              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-indigo-50 dark:hover:bg-slate-800 transition border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800"
                >
                  <img
                    src={userAvatar}
                    alt="Profile"
                    className="w-10 h-10 rounded-full ring-2 ring-sky-400 shadow-lg"
                  />
                  <div className="text-left hidden lg:block">
                    <div className="font-bold text-sm text-gray-800 dark:text-white">{userName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{userPhone}</div>
                  </div>
                  <svg className={`w-4 h-4 text-gray-600 dark:text-gray-300 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden animate-fadeIn">
                    
                    <div className="p-4 bg-gradient-to-r from-sky-500 to-indigo-600 text-white">
                      <div className="flex items-center gap-3">
                        <img src={userAvatar} alt="Profile" className="w-14 h-14 rounded-full ring-4 ring-white/30" />
                        <div>
                          <div className="font-bold text-lg">{userName}</div>
                          <div className="text-sm opacity-90">{userEmail}</div>
                          <div className="text-xs opacity-75 mt-1">📱 {userPhone}</div>
                        </div>
                      </div>
                    </div>

                    <div className="p-2">
                      <button 
                        onClick={() => {
                          setIsEditModalOpen(true);
                          setIsProfileOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-indigo-50 dark:hover:bg-slate-700 transition text-left"
                      >
                        <span className="text-xl">✏️</span>
                        <div>
                          <div className="font-semibold text-gray-800 dark:text-white text-sm">Edit Profile</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Update your information</div>
                        </div>
                      </button>
                      
                      <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-indigo-50 dark:hover:bg-slate-700 transition text-left">
                        <span className="text-xl">⚙️</span>
                        <div>
                          <div className="font-semibold text-gray-800 dark:text-white text-sm">Settings</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Preferences & privacy</div>
                        </div>
                      </button>

                      <div className="my-2 border-t border-gray-200 dark:border-slate-700"></div>

                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          onSignOut();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition text-left group"
                      >
                        <span className="text-xl">🚪</span>
                        <div>
                          <div className="font-semibold text-red-600 dark:text-red-400 text-sm">Sign Out</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Logout from account</div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {isMobileMenuOpen && (
            <div className="md:hidden pb-4 animate-fadeIn">
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 rounded-xl mb-3">
                <img src={userAvatar} alt="Profile" className="w-12 h-12 rounded-full ring-2 ring-sky-400" />
                <div>
                  <div className="font-bold text-gray-800 dark:text-white">{userName}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">{userEmail}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">📱 {userPhone}</div>
                </div>
              </div>
              
              <button 
                onClick={() => {
                  setIsWatchlistModalOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-indigo-50 dark:hover:bg-slate-800 transition mb-2"
              >
                <span className="text-xl">📊</span>
                <span className="font-semibold">Watchlist ({watchlistCount})</span>
              </button>

              <button 
                onClick={() => {
                  setIsEditModalOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-indigo-50 dark:hover:bg-slate-800 transition mb-2"
              >
                <span className="text-xl">✏️</span>
                <span className="font-semibold">Edit Profile</span>
              </button>

              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-indigo-50 dark:hover:bg-slate-800 transition mb-2">
                <span className="text-xl">⚙️</span>
                <span className="font-semibold">Settings</span>
              </button>

              <button
                onClick={onSignOut}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition text-red-600 dark:text-red-400 font-semibold"
              >
                <span className="text-xl">🚪</span>
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fadeIn {
            animation: fadeIn 0.2s ease-out;
          }
        `}</style>
      </nav>

      <EditProfileModal />
      <WatchlistModal />

      {showSuccessToast && (
        <div className="fixed bottom-4 right-4 bg-gradient-to-r from-emerald-500 to-green-500 text-white px-6 py-4 rounded-xl shadow-2xl z-[200] animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <div className="font-bold">Profile Updated!</div>
              <div className="text-sm opacity-90">Your changes have been saved</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
