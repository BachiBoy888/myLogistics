// src/components/layout/Header.jsx
import React, { useState } from "react";
import { Package, Users, BarChart3, LogOut, RefreshCw, ChevronDown, User } from "lucide-react";

export default function Header({ mode, onChangeMode, user, onLogout, onRefresh, isRefreshing, onOpenProfile }) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  const tabs = [
    { key: "cargo", label: "Мои грузы", icon: Package },
    { key: "clients", label: "Мои клиенты", icon: Users },
    { key: "analytics", label: "Аналитика", icon: BarChart3 },
  ];

  const handleProfileClick = () => {
    setShowUserMenu(false);
    onOpenProfile?.();
  };

  return (
    <header className="sticky top-0 z-50 bg-gray-800 border-b border-gray-700">
      <div className="px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Package className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-semibold text-white">Моя Логистика</span>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              title="Обновить данные"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-1 bg-gray-900/50 rounded-lg p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => onChangeMode(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  mode === tab.key
                    ? "bg-gray-700 text-white shadow-sm"
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* User */}
        <div className="flex items-center gap-3">
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 hover:bg-gray-700 rounded-lg p-1.5 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium overflow-hidden">
                  {user.avatar ? (
                    <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    user.name?.charAt(0).toUpperCase()
                  )}
                </div>
                <span className="text-sm text-gray-300 hidden md:block">{user.name}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>
              
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden">
                  <button
                    onClick={handleProfileClick}
                    className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm text-gray-200 hover:bg-gray-700 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    Профиль
                  </button>
                  <div className="border-t border-gray-700" />
                  <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm text-rose-400 hover:bg-rose-900/20 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Выйти
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
