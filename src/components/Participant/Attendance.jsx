import React, { useState, useEffect, useContext } from 'react';
import Layout from '../Layout/Layout';
import { AuthContext } from '../../context/AuthContext';
import { useDashboard } from '../../context/DashboardContext';
import { 
  Calendar, Clock, MapPin, CheckCircle, 
  XCircle, AlertCircle, RefreshCw, X, ShieldCheck
} from 'lucide-react';
import attendanceService from '../../services/attendanceService.js';

// Toast Notification
const Toast = ({ message, type = 'info', onClose, duration = 4000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const isSuccess = type === 'success';

  return (
    <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-right duration-200">
      <div className={`px-5 py-3 rounded-full shadow-lg flex items-center justify-between gap-3 text-xs font-bold ${
        isSuccess ? 'bg-[#121214] text-white' : 'bg-rose-600 text-white'
      }`}>
        <span>{message}</span>
        <button onClick={onClose} className="p-0.5 hover:opacity-70">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

const Attendance = () => {
  const { user } = useContext(AuthContext);
  const { setRefreshNeeded } = useDashboard();
  const [loading, setLoading] = useState(false);
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [notes, setNotes] = useState('');
  const [attendanceStatus, setAttendanceStatus] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [toast, setToast] = useState(null);
  
  const isFromLapangan = user?.penempatan === 'lapangan';

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    loadAttendanceData();
    return () => clearInterval(timer);
  }, []);

  const showToast = (message, type = 'info') => setToast({ message, type });
  const closeToast = () => setToast(null);

  const loadAttendanceData = async () => {
    try {
      const response = await attendanceService.getAttendanceHistory();
      if (response.success) {
        const history = (response.data.history || []).map(item => ({
          ...item,
          date: new Date(item.date)
        }));
        setAttendanceHistory(history);

        const todayAttendance = response.data.today;
        if (todayAttendance) {
          setAttendanceStatus({
            id: todayAttendance.attendance_id,
            date: new Date(todayAttendance.date),
            checkIn: todayAttendance.check_in_time 
              ? new Date(todayAttendance.check_in_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
              : null,
            status: todayAttendance.status,
            notes: todayAttendance.notes,
            gpsLocation: todayAttendance.gps_location
          });
        } else {
          setAttendanceStatus({ status: 'pending' });
        }
      }
    } catch (error) {
      console.error('Error loading attendance data:', error);
    }
  };

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation tidak didukung oleh browser Anda'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve(`${position.coords.latitude},${position.coords.longitude}`);
        },
        (error) => {
          let msg = 'Gagal mendeteksi lokasi';
          if (error.code === error.PERMISSION_DENIED) msg = 'Akses lokasi ditolak';
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  };

  const convertToAddress = async (coordinates) => {
    try {
      const [lat, lon] = coordinates.split(',');
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=id&zoom=18`);
      if (res.ok) {
        const data = await res.json();
        const address = data.address || {};
        const comps = [];
        if (address.road) comps.push(address.road);
        if (address.suburb) comps.push(address.suburb);
        if (address.city || address.city_district) comps.push(address.city || address.city_district);
        return comps.join(', ') || coordinates;
      }
      return coordinates;
    } catch {
      return coordinates;
    }
  };

  const handleCheckIn = async () => {
    if (isFromLapangan) {
      showToast('Absen tidak tersedia untuk anak lapangan', 'warning');
      return;
    }
    if (attendanceStatus && attendanceStatus.status !== 'pending') {
      showToast('Anda sudah melakukan absensi hari ini', 'warning');
      return;
    }

    setLoading(true);
    setCheckingLocation(true);
    setLocationError('');

    try {
      const currentLocation = await getCurrentLocation();
      const address = await convertToAddress(currentLocation);
      setLocation(address);

      const response = await attendanceService.checkIn(notes, address);
      if (response.success) {
        const now = new Date();
        const formatted = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const status = (currentHour > 8 || (currentHour === 8 && currentMinute > 0)) ? 'terlambat' : 'hadir';

        setAttendanceStatus({
          id: response.data.attendance_id,
          date: now,
          checkIn: formatted,
          status,
          notes: response.data.notes || notes,
          gpsLocation: address
        });
        await loadAttendanceData();
        setRefreshNeeded();
        showToast('Check-in berhasil tercatat!', 'success');
      } else {
        throw new Error(response.message || 'Gagal check in');
      }
      setNotes('');
    } catch (error) {
      setLocationError(error.message);
      showToast(error.message || 'Terjadi kesalahan saat check-in', 'error');
    } finally {
      setLoading(false);
      setCheckingLocation(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'hadir') return <span className="text-[11px] font-bold bg-[#B8C96E] text-[#121214] px-3 py-1 rounded-full">Hadir</span>;
    if (s === 'terlambat') return <span className="text-[11px] font-bold bg-[#FCE373] text-[#121214] px-3 py-1 rounded-full">Terlambat</span>;
    if (s === 'izin') return <span className="text-[11px] font-bold bg-[#BDD4F2] text-[#121214] px-3 py-1 rounded-full">Izin</span>;
    if (s === 'sakit') return <span className="text-[11px] font-bold bg-[#BDD4F2] text-[#121214] px-3 py-1 rounded-full">Sakit</span>;
    if (s === 'alpa' || s === 'absen') return <span className="text-[11px] font-bold bg-rose-100 text-rose-800 px-3 py-1 rounded-full">Alpa</span>;
    return <span className="text-[11px] font-bold bg-[#EAE9E4] text-[#6E6D6A] px-3 py-1 rounded-full">Belum Absen</span>;
  };

  const isCheckInDisabled = () => {
    if (isFromLapangan) return true;
    if (attendanceStatus && attendanceStatus.status !== 'pending') return true;
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const isOutsideHours = currentHour < 7 || (currentHour >= 9 && currentMinute > 0);
    return loading || checkingLocation || isOutsideHours;
  };

  const getButtonText = () => {
    if (isFromLapangan) return 'Absen tidak tersedia untuk tim lapangan';
    if (attendanceStatus && attendanceStatus.status !== 'pending') return 'Sudah Melakukan Presensi Hari Ini';
    if (checkingLocation) return 'Mendeteksi Lokasi GPS...';
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    if (currentHour < 7 || (currentHour >= 9 && currentMinute > 0)) return 'Di Luar Jam Presensi (07:00 - 09:00)';
    return 'Check-in Presensi Sekarang';
  };

  const isDisabled = isCheckInDisabled();

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#121214] tracking-tight">
              Presensi & Absensi Harian
            </h1>
            <p className="text-xs sm:text-sm text-[#6E6D6A] mt-1">
              Jadwal absensi masuk: pukul <span className="font-bold text-[#121214]">07:00 - 09:00 WIB</span>. Toleransi keterlambatan setelah 08:00 WIB.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold bg-[#F5C6EC] text-[#121214] px-3.5 py-1.5 rounded-full shadow-sm">
              GPS Verified
            </span>
          </div>
        </div>

        {/* 2-Column Bento Action Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Live Clock & Action Bento (lg:col-span-5) */}
          <div className="lg:col-span-5 rounded-[22px] bg-[#FCE373] text-[#121214] p-6 shadow-sm flex flex-col justify-between space-y-6 relative overflow-hidden">
            <div className="absolute right-2 -bottom-2 opacity-15 pointer-events-none font-black text-8xl">
              ⏰
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#121214]/70">
                  Waktu Server Real-Time
                </span>
                <span className="w-2 h-2 rounded-full bg-[#121214] animate-ping"></span>
              </div>

              <p className="text-4xl sm:text-5xl font-black tracking-tight text-[#121214]">
                {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
              <p className="text-xs font-semibold text-[#121214]/70 mt-1">
                {currentTime.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            {/* Today Status Pill */}
            <div className="bg-white/60 p-4 rounded-[18px] border border-[#121214]/10 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#121214]">
                <span>Status Hari Ini:</span>
                <div>{getStatusBadge(attendanceStatus?.status)}</div>
              </div>
              <div className="flex items-center justify-between text-xs text-[#121214]/80">
                <span>Waktu Check-in:</span>
                <span className="font-black text-[#121214]">{attendanceStatus?.checkIn || '-'}</span>
              </div>
            </div>

            {/* Check-In CTA Button */}
            <div>
              <button
                onClick={handleCheckIn}
                disabled={isDisabled}
                className="w-full bg-[#121214] hover:bg-neutral-800 disabled:opacity-50 text-white font-bold py-3.5 px-6 rounded-full text-xs transition-all shadow-md flex items-center justify-center space-x-2"
              >
                {checkingLocation ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-[#F5C6EC]" />
                )}
                <span>{getButtonText()}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Location, Notes & History (lg:col-span-7) */}
          <div className="lg:col-span-7 bg-white rounded-[22px] border border-[#EAE9E4] p-6 shadow-sm space-y-5">
            <div>
              <h3 className="text-base font-bold text-[#121214]">Catatan & Deteksi Lokasi</h3>
              <p className="text-xs text-[#6E6D6A]">Verifikasi koordinat GPS dan keterangan kehadiran</p>
            </div>

            {location && (
              <div className="p-3.5 bg-[#FAF9F6] border border-[#EAE9E4] rounded-[16px] flex items-center space-x-2.5 text-xs">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-[#121214] truncate">Lokasi: {location}</span>
              </div>
            )}

            {locationError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-[16px] flex items-center space-x-2.5 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{locationError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#121214] uppercase tracking-wider mb-1.5">
                Catatan Presensi (Opsional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows="2"
                placeholder="Tambahkan keterangan presensi jika ada (misal: dinas kantor cabang, kunjungan luar)"
                className="w-full px-4 py-2.5 bg-[#FAF9F6] border border-[#EAE9E4] rounded-[16px] text-xs font-medium text-[#121214] focus:outline-none focus:ring-2 focus:ring-[#121214] resize-none"
                disabled={isFromLapangan || loading || (attendanceStatus && attendanceStatus.status !== 'pending')}
              />
            </div>

            {/* Riwayat 7 Hari */}
            <div>
              <h4 className="text-xs font-bold text-[#121214] uppercase tracking-wider mb-2.5">
                Riwayat Presensi Terakhir
              </h4>
              <div className="space-y-2">
                {attendanceHistory.length === 0 ? (
                  <p className="text-xs text-[#6E6D6A] py-3 text-center">Belum ada riwayat absensi.</p>
                ) : (
                  attendanceHistory.slice(0, 4).map((record) => (
                    <div key={record.id} className="p-3 bg-[#FAF9F6] rounded-[14px] border border-[#EAE9E4] flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-[#121214]">
                          {record.date?.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </p>
                        <p className="text-[10px] text-[#6E6D6A]">Pukul: {record.checkIn || '-'}</p>
                      </div>
                      <div>{getStatusBadge(record.status)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={closeToast} />
        )}
      </div>
    </Layout>
  );
};

export default Attendance;