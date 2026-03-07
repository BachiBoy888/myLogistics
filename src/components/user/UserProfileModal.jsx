// src/components/user/UserProfileModal.jsx
// Модальное окно профиля пользователя

import React, { useState, useEffect } from 'react';
import { X, User, Phone, Mail, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { updateCurrentUser, changePassword } from '../../api/client.js';

export default function UserProfileModal({ user, onClose, onUpdate }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Profile form state
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
  });
  
  // Password form state
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Clear messages when tab changes
  useEffect(() => {
    setError(null);
    setSuccess(null);
  }, [activeTab]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const updated = await updateCurrentUser({
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
      });
      
      setSuccess('Профиль обновлен');
      onUpdate?.(updated);
    } catch (err) {
      setError(err.message || 'Не удалось обновить профиль');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    // Валидация
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Новые пароли не совпадают');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      setError('Новый пароль должен быть не менее 6 символов');
      return;
    }
    
    setLoading(true);
    
    try {
      await changePassword(passwordData.oldPassword, passwordData.newPassword);
      setSuccess('Пароль успешно изменен');
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.message || 'Не удалось изменить пароль');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  const getRoleLabel = (role) => {
    const roles = {
      admin: 'Администратор',
      logist: 'Логист',
      user: 'Пользователь',
    };
    return roles[role] || role;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-400" />
            Профиль пользователя
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'profile'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Профиль
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'password'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Сменить пароль
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {/* Messages */}
          {error && (
            <div className="mb-4 bg-red-900/20 border border-red-700/50 rounded-lg p-3 text-sm text-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 bg-green-900/20 border border-green-700/50 rounded-lg p-3 text-sm text-green-200 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {success}
            </div>
          )}

          {activeTab === 'profile' ? (
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              {/* Avatar placeholder */}
              <div className="flex flex-col items-center gap-3">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-medium">
                  {getInitials(user?.name)}
                </div>
              </div>

              {/* Login (read-only) */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Логин</label>
                <input
                  type="text"
                  value={user?.login || ''}
                  disabled
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-400 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">Логин нельзя изменить</p>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Имя *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 focus:border-blue-500 outline-none"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm text-gray-400 mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Телефон
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 focus:border-blue-500 outline-none"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm text-gray-400 mb-1 flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 focus:border-blue-500 outline-none"
                />
              </div>

              {/* Role (read-only) */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Роль</label>
                <input
                  type="text"
                  value={getRoleLabel(user?.role)}
                  disabled
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-400 cursor-not-allowed"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 rounded-lg font-medium transition-colors"
              >
                {loading ? 'Сохранение...' : 'Сохранить изменения'}
              </button>
            </form>
          ) : (
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="bg-gray-700/50 rounded-lg p-4 text-sm text-gray-300">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4 text-blue-400" />
                  <span className="font-medium">Смена пароля</span>
                </div>
                <p>Для смены пароля введите текущий пароль и новый пароль дважды.</p>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Текущий пароль *</label>
                <input
                  type="password"
                  value={passwordData.oldPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                  required
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Новый пароль *</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  required
                  minLength={6}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 focus:border-blue-500 outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Минимум 6 символов</p>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Подтвердите новый пароль *</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  required
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 focus:border-blue-500 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 rounded-lg font-medium transition-colors"
              >
                {loading ? 'Изменение пароля...' : 'Изменить пароль'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
