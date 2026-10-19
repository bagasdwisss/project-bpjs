// src/components/Admin/OfficeLocation.jsx
import React, { useState, useEffect } from 'react';
import Layout from '../Layout/Layout';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { 
  MapPin, 
  ShieldCheck, 
  Save, 
  RefreshCw, 
  Sparkles, 
  Info, 
  Compass, 
  ExternalLink,
  Navigation
} from 'lucide-react';

const OfficeLocation = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [officeGeofence, setOfficeGeofence] = useState({
    name: 'Kantor Cabang BPJSTK Medan Kota',
    address: 'BPJSTK, Jl. Kapten Patimura No.334 Lantai 1, Darat, Kec. Medan Baru, Kota Medan, Sumatera Utara 20153',
    latitude: 3.575556,
    longitude: 98.665278,
    radius_meters: 150
  });

  const fetchOfficeGeofence = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/geofence/office');
      if (res.data?.success && res.data.data) {
        setOfficeGeofence({
          name: res.data.data.name || 'Kantor Cabang BPJSTK Medan Kota',
          address: res.data.data.address || '',
          latitude: Number(res.data.data.latitude) || 3.575556,
          longitude: Number(res.data.data.longitude) || 98.665278,
          radius_meters: Number(res.data.data.radius_meters) || 150
        });
      }
    } catch (err) {
      console.warn('Gagal memuat data koordinat kantor:', err);
      toast.error('Gagal memuat data koordinat kantor: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOfficeGeofence();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!officeGeofence.name.trim()) {
      toast.warning('Nama kantor wajib diisi!');
      return;
    }
    if (!officeGeofence.latitude || !officeGeofence.longitude) {
      toast.warning('Koordinat Latitude & Longitude wajib diisi dengan benar!');
      return;
    }

    try {
      setSaving(true);
      const res = await api.put('/admin/geofence/office', officeGeofence);
      if (res.data?.success) {
        toast.success('Pengaturan lokasi & radius kantor berhasil diperbarui!');
        fetchOfficeGeofence();
      }
    } catch (err) {
      console.error('Error saving geofence:', err);
      toast.error('Gagal menyimpan koordinat kantor: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleFillMedanKota = () => {
    setOfficeGeofence({
      name: 'Kantor Cabang BPJSTK Medan Kota',
      address: 'BPJSTK, Jl. Kapten Patimura No.334 Lantai 1, Darat, Kec. Medan Baru, Kota Medan, Sumatera Utara 20153',
      latitude: 3.575556,
      longitude: 98.665278,
      radius_meters: 150
    });
    toast.info('Formulir diisi dengan koordinat resmi Kantor Cabang Medan Kota.');
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="bg-[#B8C96E] border-2 border-[#121214] rounded-2xl p-6 shadow-[4px_4px_0px_#121214] relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#121214] text-white text-[11px] font-black uppercase tracking-wider mb-2 shadow-[2px_2px_0px_#121214]">
                <MapPin className="w-3.5 h-3.5 text-[#FCE373]" />
                Geofence GPS Dinamis BPJSTK
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#121214] tracking-tight">
                Lokasi Kantor Resmi & Radius Presensi
              </h1>
              <p className="text-xs sm:text-sm text-[#121214]/80 font-semibold mt-1 max-w-2xl">
                Tentukan titik koordinat GPS kantor operasional dan toleransi radius validasi absensi (dalam meter). Sistem menghitung jarak peserta menggunakan rumus Haversine secara real-time saat presensi selfie dilakukan.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={fetchOfficeGeofence}
                disabled={loading}
                className="px-3.5 py-2 rounded-xl border-2 border-[#121214] bg-white hover:bg-gray-100 active:scale-95 text-xs font-black text-[#121214] shadow-[2px_2px_0px_#121214] transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                title="Muat Ulang Koordinat"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Form & Guide */}
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-start">
            
            {/* Kolom Kiri: Form Koordinat & Radius (50%) */}
            <div className="space-y-6">
              <div className="bg-white border-2 border-[#121214] rounded-2xl p-6 shadow-[4px_4px_0px_#121214] space-y-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b-2 border-gray-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#B8C96E] border border-[#121214] flex items-center justify-center text-[#121214] shadow-[2px_2px_0px_#121214]">
                      <Navigation className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-[#121214] uppercase tracking-wide">
                        Titik Pusat Kantor BPJSTK
                      </h2>
                      <p className="text-xs text-gray-500 font-medium">
                        Titik koordinat yang menjadi acuan validasi presensi selfie peserta.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleFillMedanKota}
                    className="text-[11px] font-black text-[#121214] bg-[#FCE373] hover:bg-[#ebd056] border-2 border-[#121214] px-2.5 py-1.5 rounded-lg shadow-[2px_2px_0px_#121214] transition-all cursor-pointer active:scale-95 inline-flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    Preset Medan Kota
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Nama Kantor */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-[#121214]">
                      Nama Titik Kantor Presensi
                    </label>
                    <input
                      type="text"
                      required
                      value={officeGeofence.name}
                      onChange={(e) => setOfficeGeofence({ ...officeGeofence, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-bold text-[#121214] focus:bg-white focus:outline-none shadow-[2px_2px_0px_#121214]"
                    />
                  </div>

                  {/* Alamat Lengkap */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-[#121214]">
                      Alamat Lengkap Kantor
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={officeGeofence.address}
                      onChange={(e) => setOfficeGeofence({ ...officeGeofence, address: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-medium text-[#121214] focus:bg-white focus:outline-none shadow-[2px_2px_0px_#121214]"
                    />
                  </div>

                  {/* Lat, Lon, Radius */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-[#121214]">
                        Latitude (Garis Lintang)
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={officeGeofence.latitude}
                        onChange={(e) => setOfficeGeofence({ ...officeGeofence, latitude: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-bold text-[#121214] focus:bg-white focus:outline-none shadow-[2px_2px_0px_#121214]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-[#121214]">
                        Longitude (Garis Bujur)
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={officeGeofence.longitude}
                        onChange={(e) => setOfficeGeofence({ ...officeGeofence, longitude: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-bold text-[#121214] focus:bg-white focus:outline-none shadow-[2px_2px_0px_#121214]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-[#121214]">
                        Radius Validasi (Meter)
                      </label>
                      <input
                        type="number"
                        min="10"
                        max="2000"
                        required
                        value={officeGeofence.radius_meters}
                        onChange={(e) => setOfficeGeofence({ ...officeGeofence, radius_meters: parseInt(e.target.value, 10) || 150 })}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border-2 border-[#121214] rounded-xl text-xs font-bold text-[#121214] focus:bg-white focus:outline-none shadow-[2px_2px_0px_#121214]"
                      />
                    </div>
                  </div>

                  {/* Radius Slider Range Helper */}
                  <div className="space-y-1 bg-gray-50 p-3 rounded-xl border border-gray-200">
                    <div className="flex justify-between items-center text-[11px] font-bold text-gray-700">
                      <span>Rentang Toleransi Radius:</span>
                      <span className="text-[#121214] font-black">{officeGeofence.radius_meters} Meter</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="1000"
                      step="25"
                      value={officeGeofence.radius_meters}
                      onChange={(e) => setOfficeGeofence({ ...officeGeofence, radius_meters: parseInt(e.target.value, 10) || 150 })}
                      className="w-full cursor-pointer accent-[#121214]"
                    />
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>50m (Ketat)</span>
                      <span>150m (Standar Gedung)</span>
                      <span>500m (Longgar / Cuaca Buruk)</span>
                      <span>1000m</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-3 px-4 rounded-xl border-2 border-[#121214] bg-[#B8C96E] hover:bg-[#a5b65b] active:scale-95 text-xs font-black text-[#121214] shadow-[3px_3px_0px_#121214] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Simpan Perubahan Koordinat & Radius Kantor
                  </button>
                </div>
              </div>
            </div>

            {/* Kolom Kanan: Live Info Box & Visual Card (50%) */}
            <div className="space-y-5">
              
              {/* Preview Status Card */}
              <div className="bg-white border-2 border-[#121214] rounded-2xl p-5 shadow-[4px_4px_0px_#121214] space-y-4">
                <div className="flex items-center gap-2 border-b-2 border-gray-100 pb-3">
                  <Compass className="w-4 h-4 text-[#121214]" />
                  <h3 className="text-xs font-black text-[#121214] uppercase tracking-wide">
                    Status Titik Acuan Aktif
                  </h3>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-3 bg-[#FAF9F6] border border-[#121214]/15 rounded-xl space-y-1">
                    <p className="font-bold text-[#121214]">{officeGeofence.name}</p>
                    <p className="text-gray-600 text-[11px] leading-relaxed">{officeGeofence.address}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg">
                      <span className="text-gray-500 block font-medium">Latitude:</span>
                      <span className="font-mono font-black text-[#121214]">{officeGeofence.latitude}</span>
                    </div>
                    <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg">
                      <span className="text-gray-500 block font-medium">Longitude:</span>
                      <span className="font-mono font-black text-[#121214]">{officeGeofence.longitude}</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-[11px]">
                    <span className="text-emerald-800 font-bold">Radius Toleransi Presensi:</span>
                    <span className="font-black text-emerald-900 bg-emerald-200/70 px-2 py-0.5 rounded border border-emerald-400">
                      {officeGeofence.radius_meters} meter
                    </span>
                  </div>
                </div>

                <div className="pt-1">
                  <a
                    href={`https://www.google.com/maps?q=${officeGeofence.latitude},${officeGeofence.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#FAF9F6] border-2 border-[#121214] text-xs font-black text-[#121214] shadow-[2px_2px_0px_#121214] hover:bg-[#FCE373] transition-all cursor-pointer active:scale-95"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Buka Koordinat di Google Maps
                  </a>
                </div>
              </div>

              {/* Petunjuk Geofence Dinamis */}
              <div className="bg-[#FAF9F6] border-2 border-[#121214] rounded-2xl p-5 shadow-[4px_4px_0px_#121214] space-y-3">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#121214]" />
                  <h3 className="text-xs font-black text-[#121214] uppercase tracking-wide">
                    Petunjuk Validasi Geofence Dinamis
                  </h3>
                </div>
                <ul className="text-xs text-gray-700 font-medium space-y-2 list-disc list-inside">
                  <li>Peserta diwajibkan berada dalam lingkaran radius <strong className="font-black text-[#121214]">{officeGeofence.radius_meters} meter</strong> dari titik koordinat resmi ini saat menekan tombol presensi selfie.</li>
                  <li>Sistem secara otomatis menghitung jarak *Haversine* langsung dari sensor GPS perangkat peserta ke titik ini.</li>
                  <li>Jika kantor berpindah lokasi atau ada kendala sinyal GPS lemah di dalam gedung beton/lantai basement, Administrator cukup menaikkan radius toleransi menjadi 200m–300m secara langsung dari panel ini.</li>
                </ul>
              </div>

            </div>

          </div>
        </form>
      </div>
    </Layout>
  );
};

export default OfficeLocation;
