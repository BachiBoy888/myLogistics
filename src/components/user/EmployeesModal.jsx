// src/components/user/EmployeesModal.jsx
// Модалка для управления сотрудниками (только для админа)

import React, { useState, useEffect } from 'react';
import { X, Users, Plus, User, Mail, Phone, Shield, CheckCircle, AlertCircle, Copy, Link } from 'lucide-react';
import { listUsers, createUser } from '../../api/client.js';

export default function EmployeesModal({ onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [inviteLink, setInviteLink] = useState(null);
  const [copied, setCopied] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    login: '',
    name: '',
    password: '',
    role: 'user',
    phone: '',
    email: '',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      setLoading(true);
      const list = await listUsers();
      setUsers(Array.isArray(list) ? list : []);
    } catch (err) {
      setError('Не удалось загрузить список сотрудников');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setInviteLink(null);

    if (!formData.login || !formData.name || !formData.password) {
      setError('Логин, имя и пароль обязательны');
      return;
    }

    if (formData.password.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      return;
    }

    try {
      const created = await createUser({
        login: formData.login.trim(),
        name: formData.name.trim(),
        password: formData.password,
        role: formData.role,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
      });
      
      // Формируем ссылку для первичной авторизации
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/first-login?token=${created.firstLoginToken}`;
      setInviteLink(link);
      
      setSuccess('Сотрудник успешно создан. Отправьте ссылку сотруднику для первичной авторизации.');
      setFormData({
        login: '',
        name: '',
        password: '',
        role: 'user',
        phone: '',
        email: '',
      });
      loadUsers(); // Перезагружаем список
    } catch (err) {
      setError(err.message || 'Не удалось создать сотрудника');
    }
  }

  async function copyToClipboard() {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Не удалось скопировать ссылку');
    }
  }

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
      <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            Мои сотрудники
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
            <X className="w-5 h-5" />
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

          {/* Invite Link */}
          {inviteLink && (
            <div className="mb-6 bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-200 mb-2 flex items-center gap-2">
                <Link className="w-4 h-4" />
                Ссылка для сотрудника
              </h3>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inviteLink}
                  readOnly
                  className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 font-mono"
                />
                <button
                  onClick={copyToClipboard}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  {copied ? 'Скопировано!' : 'Копировать'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Отправьте эту ссылку сотруднику. Он сможет войти и установить свой пароль.
              </p>
            </div>
          )}

          {/* Create button */}
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="mb-4 inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            {showCreateForm ? 'Отменить' : 'Добавить сотрудника'}
          </button>

          {/* Create form */}
          {showCreateForm && (
            <form onSubmit={handleCreateUser} className="mb-6 bg-gray-700/50 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium text-gray-200 mb-3">Новый сотрудник</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Логин *</label>
                  <input
                    type="text"
                    value={formData.login}
                    onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                    required
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 text-sm focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Имя *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 text-sm focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Пароль *</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 text-sm focus:border-blue-500 outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">Минимум 6 символов</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Роль</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 text-sm focus:border-blue-500 outline-none"
                  >
                    <option value="user">Пользователь</option>
                    <option value="logist">Логист</option>
                    <option value="admin">Администратор</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Телефон
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 text-sm focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1 flex items-center gap-1">
                    <Mail className="w-3 h-3" /> Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 text-sm focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Создать сотрудника
              </button>
            </form>
          )}

          {/* Users list */}
          {loading ? (
            <div className="text-center py-8 text-gray-400">Загрузка...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-gray-400">Нет сотрудников</div>
          ) : (
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.id} className="bg-gray-700/50 rounded-lg p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                    {(u.name || u.login || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-200 truncate">{u.name || u.login || 'Без имени'}</div>
                    <div className="text-sm text-gray-400 truncate">@{u.login || 'unknown'}</div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${
                      u.role === 'admin' ? 'bg-purple-500/20 text-purple-300' :
                      u.role === 'logist' ? 'bg-blue-500/20 text-blue-300' :
                      'bg-gray-500/20 text-gray-300'
                    }`}>
                      <Shield className="w-3 h-3 inline mr-1" />
                      {getRoleLabel(u.role)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
