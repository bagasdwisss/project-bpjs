import React, { useState, useRef, useEffect, lazy, Suspense } from 'react';
import Layout from '../Layout/Layout';
import userService from '../../services/userService';

const UserModal = lazy(() => import('./UserModal'));
import { TableSkeleton } from '../Common/Skeleton';
import { 
  Users, UserPlus, Upload, Search, Filter, 
  Edit3, Trash2, CheckCircle2, AlertCircle, X, Shield, Sparkles
} from 'lucide-react';
import { filterWithTypoTolerance } from '../../utils/fuzzySearch';

// Toast Notification in Intelly Style
const Toast = ({ message, type = 'success', onClose, duration = 3500 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const isSuccess = type === 'success';

  return (
    <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-right duration-200">
      <div className={`px-5 py-3 rounded-2xl border-2 border-[#121214] shadow-[4px_4px_0px_#121214] flex items-center justify-between gap-3 text-xs font-black ${
        isSuccess ? 'bg-[#B8C96E] text-[#121214]' : 'bg-[#F5C6EC] text-[#121214]'
      }`}>
        <div className="flex items-center gap-2">
          {isSuccess ? <CheckCircle2 className="w-4 h-4 text-[#121214]" /> : <AlertCircle className="w-4 h-4 text-[#121214]" />}
          <span>{message}</span>
        </div>
        <button onClick={onClose} className="p-0.5 hover:opacity-70 transition-opacity">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

// Confirm Delete Modal in Soft Neo-Brutalism Style
const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, userName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#121214]/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[26px] border border-[#EAE9E4] shadow-2xl max-w-sm w-full p-6 text-center space-y-4">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
          <Trash2 className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-[#121214]">Hapus Pengguna</h3>
          <p className="text-xs text-[#6E6D6A] mt-1">
            Yakin ingin menghapus akun <span className="font-bold text-[#121214]">{userName}</span>? Tindakan ini tidak dapat dibatalkan.
          </p>
        </div>
        <div className="flex gap-2.5 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-full border border-[#EAE9E4] text-xs font-bold text-[#121214] hover:bg-[#F5F4F0] transition-colors"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 px-4 rounded-full bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors shadow-sm"
          >
            Hapus Akun
          </button>
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

  useEffect(() => {
    loadUsers();
  }, []);

  const showToast = (message, type = 'success') => setToast({ message, type });
  const closeToast = () => setToast(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await userService.getUsers();
      const rawData = response.data;
      const userList = Array.isArray(rawData) 
        ? rawData 
        : (Array.isArray(rawData?.data) ? rawData.data : []);
      
      setUsers(userList);
      const coordinatorUsers = userList.filter(u => u.role_id === 2);
      setCoordinators(coordinatorUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      showToast('Gagal memuat data pengguna', 'error');
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
      const processedData = {
        ...userData,
        coordinator_id: userData.coordinator_id ? parseInt(userData.coordinator_id) : null,
        role_id: parseInt(userData.role_id)
      };

      if (selectedUser) {
        await userService.updateUser(selectedUser.user_id, processedData);
        showToast('Data pengguna berhasil diperbarui!', 'success');
      } else {
        await userService.createUser(processedData);
        showToast('Pengguna baru berhasil ditambahkan!', 'success');
      }
      
      setShowModal(false);
      await loadUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      showToast(`Gagal menyimpan: ${error.response?.data?.message || error.message}`, 'error');
    }
  };

  const handleDeleteClick = (user) => {
    setDeleteModal({ isOpen: true, user });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.user) return;
    try {
      await userService.deleteUser(deleteModal.user.user_id);
      await loadUsers();
      showToast('Pengguna berhasil dihapus!', 'success');
    } catch (error) {
      console.error('Error deleting user:', error);
      showToast('Gagal menghapus pengguna', 'error');
    } finally {
      setDeleteModal({ isOpen: false, user: null });
    }
  };

  const handleImportClick = () => fileInputRef.current.click();

  const handleFileImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const result = await userService.importUsers(file);
      showToast(result.data.message || 'Users imported successfully!', 'success');
      await loadUsers();
    } catch (error) {
      console.error('Error importing users:', error);
      showToast('Failed to import users', 'error');
    }
  };

  const getRoleBadge = (roleId) => {
    if (roleId === 1) return <span className="text-[10px] font-bold bg-[#FCE373] text-[#121214] px-2.5 py-0.5 rounded-full">Peserta</span>;
    if (roleId === 2) return <span className="text-[10px] font-bold bg-[#F5C6EC] text-[#121214] px-2.5 py-0.5 rounded-full">Koordinator</span>;
    if (roleId === 3) return <span className="text-[10px] font-bold bg-[#121214] text-white px-2.5 py-0.5 rounded-full">Administrator</span>;
    return <span className="text-[10px] font-bold bg-[#EAE9E4] text-[#121214] px-2.5 py-0.5 rounded-full">User</span>;
  };

  const getCoordinatorName = (coordId) => {
    if (!coordId) return '-';
    const c = coordinators.find(coord => coord.user_id === coordId);
    return c ? c.full_name : '-';
  };

  const roleFiltered = (Array.isArray(users) ? users : []).filter(u => {
    return roleFilter === 'all' || u?.role_id?.toString() === roleFilter;
  });

  const filteredUsers = searchTerm.trim()
    ? filterWithTypoTolerance(roleFiltered, searchTerm, ['full_name', 'unique_id', 'email'], 0.45)
    : roleFiltered;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#121214] tracking-tight">
              Kelola Pengguna Sistem
            </h1>
            <p className="text-xs sm:text-sm text-[#6E6D6A] mt-1">
              Total {users.length} pengguna terdaftar ({coordinators.length} koordinator pembimbing aktif).
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileImport}
              className="hidden"
              accept=".xlsx, .xls, .csv"
            />
            <button
              onClick={handleImportClick}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#EAE9E4] rounded-full text-xs font-bold text-[#121214] hover:bg-[#FAF9F6] shadow-sm transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              Import Excel
            </button>
            <button
              onClick={handleAddUser}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#121214] text-white rounded-full text-xs font-bold hover:bg-neutral-800 shadow-sm transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Tambah Pengguna Baru
            </button>
          </div>
        </div>

        {/* Search & Filter Pill Group */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border-2 border-[#121214] shadow-[4px_4px_0px_#121214]">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A8985]" />
            <input
              type="text"
              placeholder="Cari nama, ID pengguna..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#FAF9F6] border-2 border-[#121214] rounded-full text-xs font-bold text-[#121214] placeholder-[#8A8985] focus:outline-none shadow-[2px_2px_0px_#121214]"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setRoleFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-black border-2 border-[#121214] transition-all ${
                roleFilter === 'all' ? 'bg-[#121214] text-white shadow-[2px_2px_0px_#B8C96E]' : 'bg-[#FAF9F6] text-[#121214] hover:bg-[#EAE9E4]'
              }`}
            >
              Semua ({users.length})
            </button>
            <button
              onClick={() => setRoleFilter('1')}
              className={`px-3 py-1.5 rounded-full text-xs font-black border-2 border-[#121214] transition-all ${
                roleFilter === '1' ? 'bg-[#121214] text-white shadow-[2px_2px_0px_#B8C96E]' : 'bg-[#FAF9F6] text-[#121214] hover:bg-[#EAE9E4]'
              }`}
            >
              Peserta
            </button>
            <button
              onClick={() => setRoleFilter('2')}
              className={`px-3 py-1.5 rounded-full text-xs font-black border-2 border-[#121214] transition-all ${
                roleFilter === '2' ? 'bg-[#121214] text-white shadow-[2px_2px_0px_#B8C96E]' : 'bg-[#FAF9F6] text-[#121214] hover:bg-[#EAE9E4]'
              }`}
            >
              Koordinator
            </button>
            <button
              onClick={() => setRoleFilter('3')}
              className={`px-3 py-1.5 rounded-full text-xs font-black border-2 border-[#121214] transition-all ${
                roleFilter === '3' ? 'bg-[#121214] text-white shadow-[2px_2px_0px_#B8C96E]' : 'bg-[#FAF9F6] text-[#121214] hover:bg-[#EAE9E4]'
              }`}
            >
              Admin
            </button>
          </div>
        </div>

        {/* Users Table Card */}
        {loading ? (
          <TableSkeleton rows={7} cols={7} />
        ) : (
          <div className="bg-white rounded-2xl border-2 border-[#121214] overflow-hidden shadow-[4px_4px_0px_#121214]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[720px] divide-y-2 divide-[#121214]">
              <thead className="bg-[#121214] text-white">
                <tr>
                  <th className="px-5 py-3.5 text-left text-[11px] font-black uppercase tracking-wider">ID</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-black uppercase tracking-wider">Nama Lengkap</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-black uppercase tracking-wider">Role</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-black uppercase tracking-wider">Penempatan</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-black uppercase tracking-wider">Koordinator</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-black uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3.5 text-right text-[11px] font-black uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EFEA] bg-white">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-xs text-[#6E6D6A]">
                      Tidak ada pengguna yang cocok dengan kriteria pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.user_id} className="hover:bg-[#FAF9F6] transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap text-xs font-bold text-[#121214]">
                        <span className="bg-[#FAF9F6] border border-[#EAE9E4] px-2.5 py-1 rounded-full">
                          {u.unique_id}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="text-xs font-bold text-[#121214]">{u.full_name}</div>
                        <div className="text-[11px] text-[#6E6D6A]">{u.email || '-'}</div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {getRoleBadge(u.role_id)}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize ${
                          u.penempatan === 'kantor' ? 'bg-[#BDD4F2] text-[#121214]' :
                          u.penempatan === 'lapangan' ? 'bg-[#FCE373] text-[#121214]' :
                          'bg-[#FAF9F6] text-[#6E6D6A] border border-[#EAE9E4]'
                        }`}>
                          {u.penempatan || 'Kantor'}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-xs text-[#6E6D6A] font-medium">
                        {getCoordinatorName(u.coordinator_id)}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          u.status === 'Aktif' || !u.status ? 'bg-[#B8C96E] text-[#121214]' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {u.status || 'Aktif'}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-right text-xs">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleEditUser(u)}
                            className="p-1.5 rounded-full hover:bg-[#F5F4F0] text-[#121214] transition-colors"
                            title="Edit Pengguna"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(u)}
                            className="p-1.5 rounded-full hover:bg-rose-50 text-rose-600 transition-colors"
                            title="Hapus Pengguna"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Modal User & Delete */}
        {showModal && (
          <Suspense fallback={null}>
            <UserModal 
              user={selectedUser} 
              onClose={() => setShowModal(false)}
              onSave={handleSaveUser}
              coordinators={coordinators}
            />
          </Suspense>
        )}

        <ConfirmDeleteModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, user: null })}
          onConfirm={handleDeleteConfirm}
          userName={deleteModal.user?.full_name || ''}
        />

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