import React, { useState, useRef, useEffect } from 'react';
import Layout from '../Layout/Layout';
import UserModal from './UserModal';
import * as XLSX from 'xlsx';
import userService from '../../services/userService';

// Komponen Toast yang didefinisikan langsung dalam file yang sama
const Toast = ({ message, type = 'success', onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'info':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      default:
        return '';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
      <div className={`${getBackgroundColor()} text-white px-6 py-3 rounded-lg shadow-lg flex items-center justify-between min-w-64 max-w-sm`}>
        <div className="flex items-center">
          <span className="mr-2 font-bold">{getIcon()}</span>
          <span className="text-sm">{message}</span>
        </div>
        <button
          onClick={onClose}
          className="ml-4 text-white hover:text-gray-200 focus:outline-none text-lg font-bold"
        >
          ×
        </button>
      </div>
    </div>
  );
};

// Komponen Confirm Delete Modal
const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, userName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
            Delete User
          </h3>
          <p className="text-sm text-gray-600 text-center mb-6">
            Are you sure you want to delete <span className="font-semibold">{userName}</span>? This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Delete User
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [coordinators, setCoordinators] = useState([]);
  const [roleFilter, setRoleFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, user: null });
  const fileInputRef = useRef(null);

  // Load data dari API
  useEffect(() => {
    loadUsers();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const closeToast = () => {
    setToast(null);
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await userService.getUsers();
      setUsers(response.data);
      
      // Extract coordinators dari data users yang sudah ada (role_id = 2)
      const coordinatorUsers = response.data.filter(user => user.role_id === 2);
      setCoordinators(coordinatorUsers);
      
      console.log('Users loaded:', response.data.length);
      console.log('Coordinators extracted:', coordinatorUsers.length);
    } catch (error) {
      console.error('Error loading users:', error);
      showToast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = () => {
    setSelectedUser(null);
    setShowModal(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const handleSaveUser = async (userData) => {
    try {
      // Pastikan coordinator_id dikonversi ke number atau null
      const processedData = {
        ...userData,
        coordinator_id: userData.coordinator_id ? parseInt(userData.coordinator_id) : null,
        role_id: parseInt(userData.role_id)
      };

      if (selectedUser) {
        // Edit user
        await userService.updateUser(selectedUser.user_id, processedData);
        showToast('User updated successfully!', 'success');
      } else {
        // Add new user
        await userService.createUser(processedData);
        showToast('User created successfully!', 'success');
      }
      
      setShowModal(false);
      await loadUsers(); // Reload data
    } catch (error) {
      console.error('Error saving user:', error);
      showToast(`Failed to ${selectedUser ? 'update' : 'create'} user: ${error.response?.data?.message || error.message}`, 'error');
    }
  };

  const handleDeleteClick = (user) => {
    setDeleteModal({
      isOpen: true,
      user: user
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.user) return;

    try {
      await userService.deleteUser(deleteModal.user.user_id);
      await loadUsers(); // Reload data
      showToast('User deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting user:', error);
      showToast('Failed to delete user', 'error');
    } finally {
      setDeleteModal({ isOpen: false, user: null });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, user: null });
  };

  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  const handleFileImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const result = await userService.importUsers(file);
      showToast(result.data.message || 'Users imported successfully!', 'success');
      await loadUsers(); // Reload data
    } catch (error) {
      console.error('Error importing users:', error);
      showToast('Failed to import users', 'error');
    }
  };

  const getRoleName = (roleId) => {
    const roles = {
      1: 'participant',
      2: 'coordinator',
      3: 'admin'
    };
    return roles[roleId] || 'unknown';
  };

  const getCoordinatorName = (coordinatorId) => {
    if (!coordinatorId) return '-';
    const coordinator = coordinators.find(coord => coord.user_id === coordinatorId);
    return coordinator ? coordinator.full_name : '-';
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      user.unique_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role_id.toString() === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <Layout>
        <div className="p-6">
          <div className="flex justify-center items-center h-64">
            <div className="text-lg">Loading users...</div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="sm:flex sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-sm text-gray-600 mt-1">
              {coordinators.length} coordinators available from user data
            </p>
          </div>
          <div className="flex items-center gap-2 mt-3 sm:mt-0">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileImport}
              className="hidden"
              accept=".xlsx, .xls, .csv"
            />
            <button
              onClick={handleImportClick}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Import from Excel
            </button>
            <button
              onClick={handleAddUser}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Add New User
            </button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="mb-6 flex gap-4">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-md shadow-sm"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full sm:w-48 px-4 py-2 border border-gray-300 rounded-md shadow-sm"
          >
            <option value="all">All Roles</option>
            <option value="1">Participant</option>
            <option value="2">Coordinator</option>
            <option value="3">Admin</option>
          </select>
        </div>

        {/* Users Table */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Penempatan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Coordinator</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.user_id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.unique_id}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                  </td>
                  <td className="px-6 py-4 capitalize">{getRoleName(user.role_id)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.penempatan === 'Kantor' ? 'bg-blue-100 text-blue-800' : 
                      user.penempatan === 'Lapangan' ? 'bg-green-100 text-green-800' : 
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.penempatan || 'Belum ditentukan'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {getCoordinatorName(user.coordinator_id)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.status === 'Aktif' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <button 
                      onClick={() => handleEditUser(user)} 
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteClick(user)} 
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* User Modal */}
        {showModal && (
          <UserModal 
            user={selectedUser} 
            onClose={() => setShowModal(false)}
            onSave={handleSaveUser}
            coordinators={coordinators}
          />
        )}

        {/* Confirm Delete Modal */}
        <ConfirmDeleteModal
          isOpen={deleteModal.isOpen}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          userName={deleteModal.user?.full_name || ''}
        />

        {/* Toast Notification */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={closeToast}
          />
        )}
      </div>
    </Layout>
  );
};

export default UserManagement;