// src/components/layout/Header.jsx
import React from "react";
import { Package, Users, BarChart3, LogOut } from "lucide-react";

export default function Header({ mode, onChangeMode, user, onLogout }) {
  const tabs = [
    { key: "cargo", label: "Мои грузы", icon: Package },
    { key: "clients", label: "Мои клиенты", icon: Users },
    { key: "analytics", label: "Аналитика", icon: BarChart3 },
  ];

  return (
    <header className="sticky top-0 z-50 bg-gray-800 border-b border-gray-700">
      <div className="px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Package className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-semibold text-white">Моя Логистика</span>
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
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-gray-300 hidden md:block">{user.name}</span>
            </div>
          )}
          <button
            onClick={onLogout}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="Выйти"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
