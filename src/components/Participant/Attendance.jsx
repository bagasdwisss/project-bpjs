import React, { useState, useEffect, useContext } from 'react';
import Layout from '../Layout/Layout';
import { AuthContext } from '../../context/AuthContext';
import { useDashboard } from '../../context/DashboardContext';
import { 
  Calendar, Clock, MapPin, CheckCircle, 
  XCircle, AlertCircle, RefreshCw
} from 'lucide-react';
import attendanceService from '../../services/attendanceService.js';

// Komponen Toast untuk notifikasi
const Toast = ({ message, type = 'info', onClose, duration = 4000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500 border-green-600';
      case 'error':
        return 'bg-red-500 border-red-600';
      case 'warning':
        return 'bg-yellow-500 border-yellow-600';
      case 'info':
        return 'bg-blue-500 border-blue-600';
      default:
        return 'bg-gray-500 border-gray-600';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'error':
        return <XCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5" />;
      case 'info':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
      <div className={`${getBackgroundColor()} text-white px-6 py-4 rounded-lg shadow-lg flex items-center justify-between min-w-80 max-w-md border`}>
        <div className="flex items-center space-x-3">
          {getIcon()}
          <span className="text-sm font-medium">{message}</span>
        </div>
        <button
          onClick={onClose}
          className="ml-4 text-white hover:text-gray-200 focus:outline-none text-lg font-bold transition-colors"
        >
          ×
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

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const closeToast = () => {
    setToast(null);
  };

  // 🎯 FUNGSI UTAMA: Format waktu yang benar
  const formatCheckInTime = (timeValue) => {
    if (!timeValue || timeValue === 'NULL' || timeValue === null) {
      return '-';
    }
    
    try {
      console.log('🕒 Formatting time:', timeValue);
      
      // Jika sudah string waktu seperti "08:45:42"
      if (typeof timeValue === 'string') {
        const timeParts = timeValue.split(':');
        if (timeParts.length >= 2) {
          const hours = timeParts[0].padStart(2, '0');
          const minutes = timeParts[1].padStart(2, '0');
          return `${hours}:${minutes}`;
        }
      }
      
      return '-';
    } catch (error) {
      console.error('❌ Error formatting time:', error);
      return '-';
    }
  };

  // 🎯 FUNGSI UTAMA: Parsing tanggal yang benar
  const parseAttendanceDate = (dateString) => {
    if (!dateString) return new Date();
    
    try {
      console.log('📅 Parsing date:', dateString);
      
      // Format dari database: "YYYY-MM-DD"
      if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Parse dengan format YYYY-MM-DD
        const [year, month, day] = dateString.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
      
      // Coba parse sebagai Date object atau string lainnya
      const parsedDate = new Date(dateString);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
      
      console.warn('⚠️ Invalid date, using current date');
      return new Date();
    } catch (error) {
      console.error('❌ Error parsing date:', error);
      return new Date();
    }
  };

  const loadAttendanceData = async () => {
    try {
      setLoading(true);
      const attendanceResponse = await attendanceService.getMyAttendance();
      
      if (attendanceResponse.success && attendanceResponse.data) {
        console.log('📊 Raw data from API:', attendanceResponse.data);
        
        // Transform data dengan format yang benar
        const formattedHistory = attendanceResponse.data.map(att => {
          console.log('📅 Processing record:', {
            id: att.attendance_id,
            date: att.attendance_date,
            time: att.check_in_time,
            status: att.status
          });

          // Format check-in time
          const checkInTime = formatCheckInTime(att.check_in_time);
          
          // Format date
          const attendanceDate = parseAttendanceDate(att.attendance_date);
          
          // Tentukan status
          const status = (att.status || 'pending').toLowerCase();

          return {
            id: att.attendance_id || att.id,
            date: attendanceDate,
            checkIn: checkInTime,
            status: status,
            notes: att.notes || '',
            gpsLocation: att.gps_location || '',
            rawData: att // Simpan data mentah untuk debugging
          };
        });
        
        console.log('📋 Formatted History:', formattedHistory);
        setAttendanceHistory(formattedHistory);
        
        // 🎯 CARI ABSENSI HARI INI - DENGAN CARA YANG LEBIH AKURAT
        const today = new Date();
        const todayString = today.toDateString(); // Gunakan toDateString() untuk perbandingan
        
        console.log('🔍 Looking for today attendance:', todayString);
        
        const todayAttendance = formattedHistory.find(att => {
          if (!att.date || isNaN(att.date.getTime())) {
            return false;
          }
          
          const attDateString = att.date.toDateString();
          const isToday = attDateString === todayString;
          
          if (isToday) {
            console.log('✅ Found today attendance:', att);
          }
          
          return isToday;
        });
        
        console.log('🎯 Today Attendance Result:', todayAttendance);
        
        if (todayAttendance) {
          setAttendanceStatus(todayAttendance);
          console.log('🎉 Today status set:', {
            checkIn: todayAttendance.checkIn,
            status: todayAttendance.status,
            date: todayAttendance.date.toLocaleDateString('id-ID')
          });
        } else {
          const pendingStatus = {
            id: null,
            date: today,
            checkIn: '-',
            status: 'pending',
            notes: '',
            gpsLocation: ''
          };
          setAttendanceStatus(pendingStatus);
          console.log('⏳ No attendance today, set to pending');
        }
        
        setRefreshNeeded();
      } else {
        console.error('❌ No data from API');
        // Set status pending jika tidak ada data
        const pendingStatus = {
          id: null,
          date: new Date(),
          checkIn: '-',
          status: 'pending',
          notes: '',
          gpsLocation: ''
        };
        setAttendanceStatus(pendingStatus);
      }
    } catch (error) {
      console.error('❌ Error loading attendance data:', error);
      // Set status pending jika error
      const pendingStatus = {
        id: null,
        date: new Date(),
        checkIn: '-',
        status: 'pending',
        notes: '',
        gpsLocation: ''
      };
      setAttendanceStatus(pendingStatus);
      showToast('Gagal memuat data absensi', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fungsi untuk mendapatkan koordinat lokasi GPS
  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation tidak didukung'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          resolve(`${latitude},${longitude}`);
        },
        (error) => {
          let errorMessage = 'Gagal mendapatkan lokasi';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Akses lokasi ditolak';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Informasi lokasi tidak tersedia';
              break;
            case error.TIMEOUT:
              errorMessage = 'Timeout mendapatkan lokasi';
              break;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  };

  // 🧭 Fungsi konversi koordinat ke alamat (reverse geocoding)
  const convertToAddress = async (coordinates) => {
    try {
      const [lat, lon] = coordinates.split(',');
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=id&zoom=18`
      );
      
      if (response.ok) {
        const data = await response.json();
        return formatAddress(data);
      }
      
      return coordinates;
    } catch (error) {
      return coordinates;
    }
  };

  const formatAddress = (data) => {
    const address = data.address || {};
    const components = [];
    
    if (address.name && address.name !== address.road) components.push(address.name);
    if (address.road) components.push(address.road);
    if (address.suburb) components.push(address.suburb);
    if (address.city_district) components.push(address.city_district);
    if (address.city) components.push(address.city);
    if (address.state) components.push(address.state);
    if (address.postcode) components.push(address.postcode);
    
    return components.join(', ');
  };

  // 🔔 Handle Check-in dengan konversi alamat
  const handleCheckIn = async () => {
    if (isFromLapangan) {
      showToast('Absen tidak tersedia untuk anak lapangan', 'warning');
      return;
    }
    
    // Cek apakah sudah absen hari ini
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
        console.log('✅ Check-in berhasil, response:', response);
        
        // Format waktu sekarang
        const now = new Date();
        const checkInTimeFormatted = now.toLocaleTimeString('id-ID', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        
        // Tentukan status berdasarkan waktu
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        let status = 'hadir';
        
        if (currentHour > 8 || (currentHour === 8 && currentMinute > 0)) {
          status = 'terlambat';
        }
        
        // Format data baru untuk status
        const newAttendance = {
          id: response.data.attendance_id,
          date: now,
          checkIn: checkInTimeFormatted,
          status: status,
          notes: response.data.notes || notes,
          gpsLocation: response.data.gps_location || address
        };
        
        console.log('🔄 Setting new attendance status:', newAttendance);
        setAttendanceStatus(newAttendance);
        
        // Reload data untuk update riwayat
        await loadAttendanceData();
        setRefreshNeeded();
        showToast('Check-in berhasil!', 'success');
      } else {
        throw new Error(response.message || 'Gagal check in');
      }

      setNotes('');

    } catch (error) {
      console.error('❌ Check-in error:', error);
      setLocationError(error.message);
      showToast(error.message || 'Terjadi kesalahan saat check-in', 'error');
    } finally {
      setLoading(false);
      setCheckingLocation(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      hadir: 'text-green-600 bg-green-50 border-green-200',
      terlambat: 'text-orange-600 bg-orange-50 border-orange-200',
      izin: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      sakit: 'text-orange-600 bg-orange-50 border-orange-200',
      alpa: 'text-red-600 bg-red-50 border-red-200',
      absen: 'text-red-600 bg-red-50 border-red-200',
      pending: 'text-gray-600 bg-gray-50 border-gray-200'
    };
    return colors[status] || colors.pending;
  };

  const getStatusText = (status) => {
    const texts = {
      hadir: 'Hadir',
      terlambat: 'Terlambat',
      izin: 'Izin',
      sakit: 'Sakit',
      alpa: 'Absen',
      absen: 'Absen',
      pending: 'Belum Absen'
    };
    return texts[status] || status;
  };

  const isCheckInDisabled = () => {
    if (isFromLapangan) return true;
    
    // 🎯 TOMBOL DISABLE JIKA SUDAH ABSEN
    if (attendanceStatus && attendanceStatus.status !== 'pending') {
      console.log('🔒 Tombol disabled - sudah absen, status:', attendanceStatus.status);
      return true;
    }
    
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    
    // Waktu check-in: 07:00 - 09:00
    const isOutsideHours = currentHour < 7 || (currentHour >= 9 && currentMinute > 0);
    
    const disabled = loading || checkingLocation || isOutsideHours;
    
    console.log('🔍 Tombol check-in:', { 
      disabled, 
      loading, 
      checkingLocation, 
      isOutsideHours,
      currentTime: `${currentHour}:${currentMinute}`,
      attendanceStatus: attendanceStatus?.status 
    });
    
    return disabled;
  };

  const isAttendanceTimeOver = () => {
    const currentHour = currentTime.getHours();
    return !isFromLapangan && currentHour >= 10;
  };

  const getButtonText = () => {
    if (isFromLapangan) {
      return 'Absen tidak tersedia untuk anak lapangan';
    }
    
    // 🎯 TEXT "SUDAH MELAKUKAN ABSENSI" JIKA SUDAH ABSEN
    if (attendanceStatus && attendanceStatus.status !== 'pending') {
      return 'Sudah Melakukan Absensi';
    }
    
    if (checkingLocation) {
      return 'Mendeteksi Lokasi...';
    }
    
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const isOutsideHours = currentHour < 7 || (currentHour >= 9 && currentMinute > 0);
    
    if (isOutsideHours) {
      return 'Waktu Check-in Telah Berakhir';
    }
    
    return 'Check-in Sekarang';
  };

  const buttonText = getButtonText();
  const isDisabled = isCheckInDisabled();

  console.log('🎯 Current Attendance Status:', attendanceStatus);
  console.log('🎯 Button State:', { text: buttonText, disabled: isDisabled });

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Absensi Harian 📅
              </h1>
              <p className="text-blue-100">
                Lakukan check-in untuk mencatat kehadiran Anda
              </p>
            </div>
            <Calendar className="w-12 h-12 text-blue-200" />
          </div>
        </div>

        {/* Current Time */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Waktu Saat Ini</h2>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {currentTime.toLocaleTimeString('id-ID', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </p>
              <p className="text-gray-600 mt-1">
                {currentTime.toLocaleDateString('id-ID', { 
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <Clock className="w-12 h-12 text-blue-500" />
          </div>
        </div>

        {/* Attendance Status */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Status Absensi Hari Ini</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Check-in Time</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {attendanceStatus?.checkIn || '-'}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Status</p>
              <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full border mt-1 ${getStatusColor(attendanceStatus?.status)}`}>
                {getStatusText(attendanceStatus?.status)}
              </span>
            </div>
          </div>

          {/* Action Button */}
          {isFromLapangan ? (
            <div className="mt-4 p-4 bg-gray-100 border border-gray-300 rounded-lg">
              <div className="flex items-center space-x-2 text-gray-700">
                <XCircle className="w-5 h-5" />
                <span className="font-medium">Absen tidak tersedia untuk anak lapangan</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleCheckIn}
                disabled={isDisabled}
                className={`flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
                  isDisabled
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {checkingLocation ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
                <span>{buttonText}</span>
              </button>
            </div>
          )}

          {!isFromLapangan && isAttendanceTimeOver() && attendanceStatus?.status === 'pending' && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2 text-yellow-700">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Peringatan:</span>
                <span>Waktu check-in telah berakhir. Status akan otomatis tercatat sebagai Absen.</span>
              </div>
            </div>
          )}

          {!isFromLapangan && locationError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Error Lokasi:</span>
                <span>{locationError}</span>
              </div>
            </div>
          )}

          {!isFromLapangan && location && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2 text-green-700">
                <MapPin className="w-5 h-5" />
                <span className="font-medium">Lokasi Terdeteksi:</span>
                <span>{location}</span>
              </div>
            </div>
          )}
        </div>

        {/* Notes Input */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Catatan (Opsional)</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows="3"
            placeholder="Tambahkan catatan untuk absensi hari ini (contoh: kerja remote, meeting client, dll.)"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            disabled={isFromLapangan || loading || (attendanceStatus && attendanceStatus.status !== 'pending') || isAttendanceTimeOver()}
          />
        </div>

        {/* History */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Riwayat Absensi 7 Hari Terakhir</h2>
          <div className="space-y-3">
            {attendanceHistory.slice(0, 7).map((record) => (
              <div key={record.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Tanggal</p>
                    <p className="font-semibold text-gray-900">
                      {record.date && !isNaN(record.date.getTime()) 
                        ? record.date.toLocaleDateString('id-ID', { 
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })
                        : 'Invalid Date'
                      }
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Check-in</p>
                    <p className="font-semibold text-gray-900">{record.checkIn}</p>
                  </div>
                  {record.notes && (
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Catatan</p>
                      <p className="font-semibold text-gray-900 text-sm max-w-xs truncate">{record.notes}</p>
                    </div>
                  )}
                </div>
                <span className={`px-3 py-1 text-sm font-semibold rounded-full border ${getStatusColor(record.status)}`}>
                  {getStatusText(record.status)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Informasi Absensi</h3>
          <ul className="text-blue-800 space-y-1 text-sm">
            <li>• Check-in dapat dilakukan mulai pukul 07:00 - 09:00</li>
            <li>• Check-in setelah jam 08:00 akan tercatat sebagai Terlambat</li>
            <li>• Tidak check-in sampai jam 10:00 akan otomatis tercatat sebagai Absen</li>
            <li>• Pastikan GPS aktif untuk verifikasi lokasi</li>
            <li>• Status kehadiran: Hadir, Terlambat, Izin, Sakit, Absen</li>
            <li>• Hubungi koordinator jika mengalami kendala</li>
          </ul>
        </div>

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

export default Attendance;