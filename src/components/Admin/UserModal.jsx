// UserModal.jsx
import React, { useState, useEffect } from 'react';

const UserModal = ({ user, onClose, onSave, coordinators, loading = false }) => {
  const [formData, setFormData] = useState({
    unique_id: '',
    full_name: '',
    role_id: '1',
    coordinator_id: '',
    penempatan: '',
    password: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        unique_id: user.unique_id || '',
        full_name: user.full_name || '',
        role_id: user.role_id?.toString() || '1',
        coordinator_id: user.coordinator_id?.toString() || '',
        penempatan: user.penempatan || '',
        password: ''
      });
    } else {
      setFormData({
        unique_id: '',
        full_name: '',
        role_id: '1',
        coordinator_id: '',
        penempatan: '',
        password: ''
      });
    }
  }, [user]);

  const handleSubmit = (e) => {
    e.preventDefault();

    const submitData = { ...formData };

    if (user && !submitData.password) {
      delete submitData.password;
    }

    if (!submitData.penempatan) {
      submitData.penempatan = null;
    }

    onSave(submitData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-auto">
        <div className="p-6">
          <h3 className="text-lg font-bold mb-4">
            {user ? 'Edit User' : 'Add New User'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">ID Pengguna</label>
              <input
                type="text"
                name="unique_id"
                value={formData.unique_id}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Nama Lengkap</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <select
                name="role_id"
                value={formData.role_id}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="1">Participant</option>
                <option value="2">Coordinator</option>
                <option value="3">Admin</option>
              </select>
            </div>

            {/* Field Penempatan */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Penempatan</label>
              <select
                name="penempatan"
                value={formData.penempatan}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Pilih Penempatan</option>
                <option value="Kantor">Kantor</option>
                <option value="Lapangan">Lapangan</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Opsional - bisa dikosongkan</p>
            </div>

            {/* Coordinator selection */}
            {formData.role_id === '1' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Coordinator
                </label>
                {loading ? (
                  <div className="text-sm text-gray-500 mt-1">Loading coordinators...</div>
                ) : (
                  <select
                    value={formData.coordinator_id || ''}
                    onChange={(e) => setFormData({...formData, coordinator_id: e.target.value})}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">No Coordinator</option>
                    {coordinators.map(coordinator => (
                      <option key={coordinator.user_id} value={coordinator.user_id}>
                        {coordinator.full_name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {!user && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Kosongkan untuk password default"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Kosongkan untuk menggunakan password default
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                {user ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserModal;