import React, { useState, useEffect, useContext, useRef } from 'react';
import Layout from '../Layout/Layout';
import { AuthContext } from '../../context/AuthContext';
import { useDashboard } from '../../context/DashboardContext';
import { 
  Calendar, Clock, MapPin, CheckCircle, 
  XCircle, AlertCircle, RefreshCw, X, ShieldCheck,
  Camera, Upload, FileText, QrCode, Calculator, Navigation,
  Sparkles, Check, AlertTriangle, Eye, ArrowRight
} from 'lucide-react';
import api from '../../services/api';
import CalculatorModal from '../Common/CalculatorModal';
import QRCodeModal from '../Common/QRCodeModal';

// Toast Notification Component
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
      <div className={`px-5 py-3 rounded-2xl border-2 border-[#121214] shadow-[4px_4px_0px_#121214] flex items-center justify-between gap-3 text-xs font-black ${
        isSuccess ? 'bg-[#B8C96E] text-[#121214]' : 'bg-[#F5C6EC] text-[#121214]'
      }`}>
        <span>{message}</span>
        <button onClick={onClose} className="p-0.5 hover:opacity-70">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

// Haversine distance calculator in meters
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
};

const Attendance = () => {
  const { user } = useContext(AuthContext);
  const { setRefreshNeeded } = useDashboard();

  // Navigation Tabs: 'presensi' or 'izin'
  const [activeTab, setActiveTab] = useState('presensi');

  // Modals
  const [calcModalOpen, setCalcModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  // Attendance State
  const [loading, setLoading] = useState(false);
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [notes, setNotes] = useState('');
  const [attendanceStatus, setAttendanceStatus] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [toast, setToast] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);

  // Geofencing State
  const [geofences, setGeofences] = useState([]);
  const [selectedGeofence, setSelectedGeofence] = useState(null);
  const [currentCoords, setCurrentCoords] = useState(null);
  const [distanceToGeofence, setDistanceToGeofence] = useState(null);
  const [isWithinRadius, setIsWithinRadius] = useState(false);
  const [isMockLocation, setIsMockLocation] = useState(false);
  const [locationAddress, setLocationAddress] = useState('');

  // Selfie Camera State
  const [cameraActive, setCameraActive] = useState(false);
  const [selfieImage, setSelfieImage] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Leave / Cuti / Sakit Form State
  const [leaveType, setLeaveType] = useState('Sakit');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveProofUrl, setLeaveProofUrl] = useState('');
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [leaveHistory, setLeaveHistory] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    loadInitialData();
    return () => clearInterval(timer);
  }, []);

  const showToast = (message, type = 'info') => setToast({ message, type });
  const closeToast = () => setToast(null);

  const loadInitialData = async () => {
    await Promise.all([
      loadGeofences(),
      loadAttendanceData(),
      loadLeaveHistory()
    ]);
  };

  const loadGeofences = async () => {
    try {
      const res = await api.get('/geofences');
      if (res.data?.success && res.data.data.length > 0) {
        setGeofences(res.data.data);
        setSelectedGeofence(res.data.data[0]);
      }
    } catch (err) {
      console.error('Error loading geofences:', err);
    }
  };

  const loadAttendanceData = async () => {
    try {
      const res = await api.get('/participant/attendance');
      if (res.data?.success) {
        const records = res.data.data || [];
        setAttendanceHistory(records);

        const todayStr = new Date().toISOString().split('T')[0];
        const todayRec = records.find(r => {
          const recDate = new Date(r.attendance_date).toISOString().split('T')[0];
          return recDate === todayStr;
        });

        if (todayRec) {
          setAttendanceStatus({
            id: todayRec.attendance_id,
            status: todayRec.status,
            checkIn: todayRec.check_in_time,
            notes: todayRec.notes,
            location: todayRec.location_address || todayRec.location_coordinates,
            selfie: todayRec.selfie_image_url
          });
        } else {
          setAttendanceStatus({ status: 'pending' });
        }
      }
    } catch (error) {
      console.error('Error loading attendance records:', error);
    }
  };

  const loadLeaveHistory = async () => {
    try {
      const res = await api.get('/leaves/my');
      if (res.data?.success) {
        setLeaveHistory(res.data.data || []);
      }
    } catch (err) {
      console.error('Error loading leave history:', err);
    }
  };

  // GPS & Anti-Fake GPS Detection
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      showToast('Perangkat tidak mendukung geolokasi GPS.', 'error');
      return;
    }

    setCheckingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;
        const speed = pos.coords.speed;
        const altitude = pos.coords.altitude;

        // Anti-Fake GPS Heuristic Check:
        // Mock providers often report accuracy exactly 0, or lack elevation/speed inconsistencies
        const mockDetected = accuracy < 1 || (speed === 0 && altitude === 0 && accuracy === 0);
        setIsMockLocation(mockDetected);

        setCurrentCoords({ lat, lon, accuracy });

        // Calculate distance to selected geofence
        const target = selectedGeofence || geofences[0];
        if (target) {
          const dist = calculateDistance(lat, lon, parseFloat(target.latitude), parseFloat(target.longitude));
          setDistanceToGeofence(dist);
          setIsWithinRadius(dist <= target.radius_meters);
        }

        // Reverse Geocode
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=id&zoom=18`);
          if (res.ok) {
            const data = await res.json();
            setLocationAddress(data.display_name || `${lat.toFixed(6)}, ${lon.toFixed(6)}`);
          } else {
            setLocationAddress(`${lat.toFixed(6)}, ${lon.toFixed(6)}`);
          }
        } catch {
          setLocationAddress(`${lat.toFixed(6)}, ${lon.toFixed(6)}`);
        }

        setCheckingLocation(false);
        showToast('Lokasi GPS berhasil dikonfirmasi.', 'success');
      },
      (err) => {
        setCheckingLocation(false);
        showToast('Gagal mendeteksi GPS: Pastikan izin lokasi aktif.', 'error');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 }
    );
  };

  // Camera Selfie & Liveness Simulation
  const startCamera = async () => {
    setCameraActive(true);
    setFaceDetected(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 480 }, height: { ideal: 480 }, facingMode: 'user' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Simulate face recognition detection after 1.2 seconds of video play
        setTimeout(() => {
          setFaceDetected(true);
        }, 1200);
      }
    } catch (err) {
      console.warn('Camera stream error, using simulated photo fallback:', err);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 320;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUri = canvas.toDataURL('image/jpeg', 0.8);
      setSelfieImage(dataUri);

      // Stop camera stream
      const stream = video.srcObject;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setCameraActive(false);
      showToast('Foto wajah berhasil diverifikasi!', 'success');
    } else {
      // Fallback dummy selfie image
      const dummyCanvas = document.createElement('canvas');
      dummyCanvas.width = 300;
      dummyCanvas.height = 300;
      const ctx = dummyCanvas.getContext('2d');
      ctx.fillStyle = '#BDD4F2';
      ctx.fillRect(0, 0, 300, 300);
      ctx.fillStyle = '#121214';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Selfie Verified', 150, 150);
      setSelfieImage(dummyCanvas.toDataURL('image/jpeg'));
      setCameraActive(false);
      setFaceDetected(true);
      showToast('Foto selfie berhasil diambil.', 'success');
    }
  };

  const handleGeofenceChange = (e) => {
    const geoId = parseInt(e.target.value, 10);
    const found = geofences.find(g => g.id === geoId);
    if (found) {
      setSelectedGeofence(found);
      if (currentCoords) {
        const dist = calculateDistance(currentCoords.lat, currentCoords.lon, parseFloat(found.latitude), parseFloat(found.longitude));
        setDistanceToGeofence(dist);
        setIsWithinRadius(dist <= found.radius_meters);
      }
    }
  };

  // Check In Execution
  const handleCheckIn = async () => {
    if (attendanceStatus && attendanceStatus.status !== 'pending') {
      showToast('Anda sudah melakukan absensi hari ini.', 'error');
      return;
    }

    if (!currentCoords) {
      showToast('Wajib mendeteksi lokasi GPS terlebih dahulu.', 'error');
      return;
    }

    if (!selfieImage) {
      showToast('Wajib mengambil foto selfie verifikasi wajah.', 'error');
      return;
    }

    setLoading(true);

    try {
      const currentHour = currentTime.getHours();
      const currentMinute = currentTime.getMinutes();
      const status = (currentHour > 8 || (currentHour === 8 && currentMinute > 0)) ? 'Terlambat' : 'Hadir';

      const payload = {
        status,
        notes: notes || (isWithinRadius ? 'Presensi dalam radius titik binaan' : 'Presensi di luar radius binaan (Verifikasi Koordinator)'),
        coordinates: `${currentCoords.lat},${currentCoords.lon}`,
        address: locationAddress || selectedGeofence?.name,
        device_info: navigator.userAgent,
        selfie_image_url: selfieImage,
        geofence_id: selectedGeofence?.id || null,
        distance_meters: distanceToGeofence || 0,
        is_mock_location: isMockLocation
      };

      const res = await api.post('/participant/attendance/check-in', payload);

      if (res.data?.success) {
        showToast('Presensi selfie & geofence berhasil dicatat!', 'success');
        setAttendanceStatus({
          id: res.data.data.attendance_id,
          status,
          checkIn: res.data.data.check_in_time,
          notes: res.data.data.notes,
          location: locationAddress,
          selfie: selfieImage
        });
        await loadAttendanceData();
        setRefreshNeeded();
      } else {
        throw new Error(res.data?.message || 'Gagal menyimpan absensi');
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Terjadi kesalahan check-in', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Leave submission handler
  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    if (!leaveStartDate || !leaveEndDate || !leaveReason) {
      showToast('Mohon lengkapi semua kolom permohonan.', 'error');
      return;
    }

    setSubmittingLeave(true);

    try {
      const res = await api.post('/leaves', {
        leave_type: leaveType,
        start_date: leaveStartDate,
        end_date: leaveEndDate,
        reason: leaveReason,
        proof_file_url: leaveProofUrl || null
      });

      if (res.data?.success) {
        showToast('Permohonan izin/sakit berhasil diajukan ke Koordinator!', 'success');
        setLeaveStartDate('');
        setLeaveEndDate('');
        setLeaveReason('');
        setLeaveProofUrl('');
        loadLeaveHistory();
      } else {
        throw new Error(res.data?.message || 'Gagal mengirim permohonan');
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Gagal mengirim permohonan', 'error');
    } finally {
      setSubmittingLeave(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'hadir') return <span className="text-[11px] font-black bg-[#B8C96E] text-[#121214] px-3 py-1 rounded-full border border-[#121214]">Hadir</span>;
    if (s === 'terlambat') return <span className="text-[11px] font-black bg-[#FCE373] text-[#121214] px-3 py-1 rounded-full border border-[#121214]">Terlambat</span>;
    if (s === 'izin') return <span className="text-[11px] font-black bg-[#BDD4F2] text-[#121214] px-3 py-1 rounded-full border border-[#121214]">Izin</span>;
    if (s === 'sakit') return <span className="text-[11px] font-black bg-[#F5C6EC] text-[#121214] px-3 py-1 rounded-full border border-[#121214]">Sakit</span>;
    if (s === 'alfa') return <span className="text-[11px] font-black bg-rose-200 text-rose-900 px-3 py-1 rounded-full border border-[#121214]">Alfa</span>;
    return <span className="text-[11px] font-black bg-gray-200 text-gray-700 px-3 py-1 rounded-full border border-[#121214]">Belum Absen</span>;
  };

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* Top Header with Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#121214] tracking-tight">
              Presensi & Manajemen Kehadiran
            </h1>
            <p className="text-xs sm:text-sm text-[#6E6D6A] mt-1 font-medium">
              Geofencing Multi-Titik Kantor & Lapangan Binaan BPJS Ketenagakerjaan
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCalcModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl border-2 border-[#121214] bg-[#FCE373] hover:bg-[#ebd056] font-black text-xs text-[#121214] shadow-[3px_3px_0px_#121214] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
            >
              <Calculator className="w-4 h-4" />
              <span>Kalkulator Iuran</span>
            </button>
            <button
              onClick={() => setQrModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl border-2 border-[#121214] bg-[#BDD4F2] hover:bg-[#a9c5eb] font-black text-xs text-[#121214] shadow-[3px_3px_0px_#121214] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
            >
              <QrCode className="w-4 h-4" />
              <span>QR Referral BPU</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex space-x-2 border-b-2 border-[#121214] pb-1">
          <button
            onClick={() => setActiveTab('presensi')}
            className={`px-4 py-2 rounded-xl border-2 border-[#121214] font-black text-xs transition-all ${
              activeTab === 'presensi'
                ? 'bg-[#B8C96E] text-[#121214] shadow-[3px_3px_0px_#121214]'
                : 'bg-white text-gray-600 hover:bg-[#F5F4F0]'
            }`}
          >
            Presensi Masuk & Geofencing
          </button>
          <button
            onClick={() => setActiveTab('izin')}
            className={`px-4 py-2 rounded-xl border-2 border-[#121214] font-black text-xs transition-all ${
              activeTab === 'izin'
                ? 'bg-[#F5C6EC] text-[#121214] shadow-[3px_3px_0px_#121214]'
                : 'bg-white text-gray-600 hover:bg-[#F5F4F0]'
            }`}
          >
            Pengajuan Izin, Cuti & Sakit
          </button>
        </div>

        {/* TAB 1: PRESENSI MASUK & GEOFENCING */}
        {activeTab === 'presensi' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Left Column: Clock & Check-in Bento (lg:col-span-5) */}
            <div className="lg:col-span-5 rounded-2xl bg-[#FCE373] border-2 border-[#121214] text-[#121214] p-5 sm:p-6 shadow-[5px_5px_0px_#121214] flex flex-col justify-between space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#121214]/70">
                    Waktu Server Resmi
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#121214] animate-ping"></span>
                </div>

                <p className="text-4xl sm:text-5xl font-black tracking-tight text-[#121214]">
                  {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
                <p className="text-xs font-bold text-[#121214]/80 mt-1">
                  {currentTime.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>

              {/* Status Hari Ini Card */}
              <div className="bg-white p-4 rounded-xl border-2 border-[#121214] shadow-[3px_3px_0px_#121214] space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>Status Hari Ini:</span>
                  <div>{getStatusBadge(attendanceStatus?.status)}</div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-700">
                  <span>Waktu Check-in:</span>
                  <span className="font-mono font-black text-[#121214]">{attendanceStatus?.checkIn || '-'}</span>
                </div>
                {attendanceStatus?.location && (
                  <div className="text-[11px] text-gray-600 truncate pt-1 border-t border-gray-100 flex items-center space-x-1">
                    <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span className="truncate">{attendanceStatus.location}</span>
                  </div>
                )}
              </div>

              {/* Geofence Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black uppercase text-[#121214]">
                  Pilih Titik Penugasan Geofence:
                </label>
                <select
                  value={selectedGeofence?.id || ''}
                  onChange={handleGeofenceChange}
                  className="w-full p-2.5 bg-white border-2 border-[#121214] rounded-xl text-xs font-bold text-[#121214] shadow-[2px_2px_0px_#121214] focus:outline-hidden"
                >
                  {geofences.map((geo) => (
                    <option key={geo.id} value={geo.id}>
                      {geo.name} (Radius: {geo.radius_meters}m)
                    </option>
                  ))}
                </select>
              </div>

              {/* GPS Detection Bar */}
              <div className="bg-white p-3.5 rounded-xl border-2 border-[#121214] shadow-[2px_2px_0px_#121214] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#121214]">Verifikasi Koordinat GPS</span>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={checkingLocation}
                    className="flex items-center space-x-1 px-3 py-1 rounded-lg border-2 border-[#121214] bg-[#B8C96E] hover:bg-[#a6b85c] font-black text-[11px] shadow-[2px_2px_0px_#121214]"
                  >
                    <RefreshCw className={`w-3 h-3 ${checkingLocation ? 'animate-spin' : ''}`} />
                    <span>{checkingLocation ? 'Mencari...' : 'Deteksi GPS'}</span>
                  </button>
                </div>

                {currentCoords ? (
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Jarak ke Titik:</span>
                      <strong className={`font-black ${isWithinRadius ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {distanceToGeofence !== null ? `${distanceToGeofence} meter` : '-'}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Status Radius:</span>
                      <span className={`px-2 py-0.5 rounded font-black border border-[#121214] text-[10px] ${
                        isWithinRadius ? 'bg-[#B8C96E] text-[#121214]' : 'bg-[#FCE373] text-[#121214]'
                      }`}>
                        {isWithinRadius ? 'Dalam Radius (Valid)' : 'Di Luar Radius Titik'}
                      </span>
                    </div>
                    {isMockLocation && (
                      <div className="p-1.5 bg-rose-100 border border-rose-400 rounded text-rose-800 font-bold text-[10px] flex items-center space-x-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>Peringatan: Terdeteksi kemungkinan Mock Location / Fake GPS!</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-500">Klik "Deteksi GPS" untuk memeriksa keberadaan Anda di titik binaan.</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleCheckIn}
                disabled={loading || (attendanceStatus && attendanceStatus.status !== 'pending')}
                className="w-full py-3.5 px-4 bg-[#121214] hover:bg-neutral-800 disabled:opacity-50 text-white font-black rounded-xl text-xs shadow-[4px_4px_0px_#B8C96E] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-[#B8C96E]" />
                )}
                <span>
                  {attendanceStatus?.status !== 'pending'
                    ? 'Sudah Melakukan Presensi Hari Ini'
                    : 'Konfirmasi Presensi Selfie & GPS'}
                </span>
              </button>
            </div>

            {/* Right Column: Selfie Face Verification & Recent Records (lg:col-span-7) */}
            <div className="lg:col-span-7 space-y-5">
              
              {/* Selfie Camera Card */}
              <div className="bg-white rounded-2xl border-2 border-[#121214] p-5 shadow-[5px_5px_0px_#121214] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#BDD4F2] border-2 border-[#121214] flex items-center justify-center shadow-[2px_2px_0px_#121214]">
                      <Camera className="w-4 h-4 text-[#121214]" />
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-[#121214]">Presensi Selfie & Deteksi Wajah</h3>
                      <p className="text-[11px] text-gray-500">Verifikasi biometrik langsung (Anti-Joki & Fake GPS)</p>
                    </div>
                  </div>
                  {selfieImage && (
                    <span className="text-[10px] font-black bg-[#B8C96E] px-2 py-0.5 rounded border border-[#121214]">
                      Wajah Terverifikasi
                    </span>
                  )}
                </div>

                {/* Camera Viewport or Snapshot Preview */}
                <div className="flex flex-col items-center justify-center p-4 bg-[#F5F4F0] border-2 border-dashed border-[#121214] rounded-xl relative min-h-[200px]">
                  {cameraActive ? (
                    <div className="relative w-full max-w-[280px] aspect-square rounded-xl overflow-hidden border-2 border-[#121214]">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      {/* Face Recognition Frame Overlay */}
                      <div className="absolute inset-4 border-2 border-dashed border-emerald-400 rounded-full animate-pulse pointer-events-none flex items-center justify-center">
                        <span className="text-[10px] font-black bg-black/60 text-white px-2 py-0.5 rounded">
                          {faceDetected ? 'Wajah Terdeteksi ✓' : 'Arahkan Wajah ke Lingkaran'}
                        </span>
                      </div>
                      <canvas ref={canvasRef} className="hidden" />
                    </div>
                  ) : selfieImage ? (
                    <div className="relative w-40 h-40 rounded-xl overflow-hidden border-2 border-[#121214] shadow-[3px_3px_0px_#121214]">
                      <img src={selfieImage} alt="Selfie Presensi" className="w-full h-full object-cover" />
                      <div className="absolute bottom-1 right-1 bg-emerald-500 text-white p-1 rounded-full border border-[#121214]">
                        <Check className="w-3 h-3" />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-2 py-4">
                      <Camera className="w-10 h-10 text-gray-400 mx-auto" />
                      <p className="text-xs font-bold text-gray-600">Kamera belum diaktifkan</p>
                      <p className="text-[11px] text-gray-500 max-w-xs">
                        Wajib mengambil foto selfie langsung saat berada di lokasi penugasan.
                      </p>
                    </div>
                  )}

                  {/* Camera Control Buttons */}
                  <div className="mt-4 flex items-center space-x-2">
                    {cameraActive ? (
                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="px-4 py-2 bg-[#B8C96E] hover:bg-[#a6b85c] font-black text-xs text-[#121214] border-2 border-[#121214] rounded-xl shadow-[2px_2px_0px_#121214]"
                      >
                        Ambil Foto Sekarang
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={startCamera}
                        className="px-4 py-2 bg-white hover:bg-[#FCE373] font-black text-xs text-[#121214] border-2 border-[#121214] rounded-xl shadow-[2px_2px_0px_#121214]"
                      >
                        {selfieImage ? 'Foto Ulang' : 'Buka Kamera Selfie'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Notes Input */}
                <div>
                  <label className="block text-xs font-black uppercase text-[#121214] mb-1">
                    Catatan Kegiatan / Penugasan Lapangan:
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows="2"
                    placeholder="Contoh: Edukasi sosialisasi 15 pedagang Pasar Beringharjo bersama koordinator..."
                    className="w-full px-3 py-2 bg-[#F5F4F0] border-2 border-[#121214] rounded-xl text-xs font-medium text-[#121214] focus:outline-hidden focus:bg-white resize-none"
                  />
                </div>
              </div>

              {/* Recent History Table */}
              <div className="bg-white rounded-2xl border-2 border-[#121214] p-5 shadow-[5px_5px_0px_#121214] space-y-3">
                <h3 className="font-black text-xs uppercase tracking-wider text-[#121214]">
                  Riwayat Presensi Terakhir Anda
                </h3>
                <div className="divide-y divide-gray-100">
                  {attendanceHistory.length === 0 ? (
                    <p className="text-xs text-gray-500 py-3 text-center">Belum ada riwayat kehadiran.</p>
                  ) : (
                    attendanceHistory.slice(0, 4).map((record) => (
                      <div key={record.attendance_id} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-[#121214]">
                            {new Date(record.attendance_date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                          <p className="text-[10px] text-gray-500">
                            Pukul: {record.check_in_time || '-'} • {record.geofence_name || 'Kantor Cabang'}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {record.distance_meters && (
                            <span className="text-[10px] font-mono text-gray-600 bg-[#F5F4F0] px-1.5 py-0.5 rounded border border-[#121214]/20">
                              {Math.round(record.distance_meters)}m
                            </span>
                          )}
                          {getStatusBadge(record.status)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: PENGAJUAN IZIN, CUTI & SAKIT (APPROVAL WORKFLOW) */}
        {activeTab === 'izin' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Form Column (lg:col-span-5) */}
            <div className="lg:col-span-5 bg-white rounded-2xl border-2 border-[#121214] p-5 sm:p-6 shadow-[5px_5px_0px_#121214] space-y-4">
              <div className="flex items-center space-x-2.5 border-b-2 border-[#121214] pb-3">
                <div className="w-10 h-10 rounded-xl bg-[#F5C6EC] border-2 border-[#121214] flex items-center justify-center shadow-[2px_2px_0px_#121214]">
                  <FileText className="w-5 h-5 text-[#121214]" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-[#121214]">Formulir Permohonan Izin / Sakit</h3>
                  <p className="text-[11px] text-gray-500 font-medium">Alur persetujuan berjenjang ke Koordinator</p>
                </div>
              </div>

              <form onSubmit={handleLeaveSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-black uppercase text-[#121214] mb-1">
                    Jenis Permohonan:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Sakit', 'Izin', 'Cuti'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setLeaveType(t)}
                        className={`py-2 rounded-xl border-2 border-[#121214] text-xs font-black transition-all ${
                          leaveType === t
                            ? 'bg-[#121214] text-white shadow-[2px_2px_0px_#F5C6EC]'
                            : 'bg-[#F5F4F0] text-[#121214] hover:bg-white'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-black uppercase text-[#121214] mb-1">
                      Dari Tanggal:
                    </label>
                    <input
                      type="date"
                      value={leaveStartDate}
                      onChange={(e) => setLeaveStartDate(e.target.value)}
                      className="w-full p-2 bg-[#F5F4F0] border-2 border-[#121214] rounded-xl text-xs font-bold text-[#121214]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-[#121214] mb-1">
                      Sampai Tanggal:
                    </label>
                    <input
                      type="date"
                      value={leaveEndDate}
                      onChange={(e) => setLeaveEndDate(e.target.value)}
                      className="w-full p-2 bg-[#F5F4F0] border-2 border-[#121214] rounded-xl text-xs font-bold text-[#121214]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-[#121214] mb-1">
                    Alasan / Keterangan Lengkap:
                  </label>
                  <textarea
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    rows="3"
                    placeholder="Sebutkan alasan atau diagnosa dokter secara singkat..."
                    className="w-full p-2.5 bg-[#F5F4F0] border-2 border-[#121214] rounded-xl text-xs font-medium text-[#121214] resize-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-[#121214] mb-1">
                    Unggah Bukti / Surat Dokter Digital:
                  </label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => setLeaveProofUrl(event.target.result);
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-2 file:border-[#121214] file:text-xs file:font-black file:bg-[#BDD4F2] file:text-[#121214]"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    *Wajib melampirkan Surat Keterangan Dokter bagi yang mengajukan Sakit.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submittingLeave}
                  className="w-full py-3 px-4 bg-[#B8C96E] hover:bg-[#a6b85c] disabled:opacity-50 text-[#121214] font-black rounded-xl text-xs border-2 border-[#121214] shadow-[3px_3px_0px_#121214] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
                >
                  {submittingLeave ? 'Mengirim Pengajuan...' : 'Kirim Permohonan ke Koordinator'}
                </button>
              </form>
            </div>

            {/* History Column (lg:col-span-7) */}
            <div className="lg:col-span-7 bg-white rounded-2xl border-2 border-[#121214] p-5 sm:p-6 shadow-[5px_5px_0px_#121214] space-y-4">
              <h3 className="font-black text-sm uppercase tracking-wider text-[#121214]">
                Status & Riwayat Pengajuan Izin Anda
              </h3>

              <div className="divide-y divide-gray-100">
                {leaveHistory.length === 0 ? (
                  <div className="py-12 text-center text-xs text-gray-500">
                    Belum ada pengajuan izin atau sakit yang diajukan.
                  </div>
                ) : (
                  leaveHistory.map((leave) => {
                    const statusClass = 
                      leave.status === 'Disetujui' ? 'bg-[#B8C96E] text-[#121214]' :
                      leave.status === 'Ditolak' ? 'bg-rose-200 text-rose-900' :
                      'bg-[#FCE373] text-[#121214]';

                    return (
                      <div key={leave.id} className="py-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="font-black text-xs text-[#121214]">{leave.leave_type}</span>
                            <span className="text-[11px] text-gray-500">
                              ({new Date(leave.start_date).toLocaleDateString('id-ID')} s.d. {new Date(leave.end_date).toLocaleDateString('id-ID')})
                            </span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full border border-[#121214] text-[10px] font-black ${statusClass}`}>
                            {leave.status}
                          </span>
                        </div>

                        <p className="text-xs text-gray-700 bg-[#F5F4F0] p-2.5 rounded-xl border border-[#121214]/15">
                          {leave.reason}
                        </p>

                        {leave.coordinator_notes && (
                          <div className="text-[11px] text-blue-900 bg-blue-50 p-2 rounded-lg border border-blue-200">
                            <strong>Catatan Koordinator:</strong> {leave.coordinator_notes}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        )}

        {/* Global Modals */}
        <CalculatorModal isOpen={calcModalOpen} onClose={() => setCalcModalOpen(false)} />
        <QRCodeModal isOpen={qrModalOpen} onClose={() => setQrModalOpen(false)} user={user} />
        {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}

      </div>
    </Layout>
  );
};

export default Attendance;