import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, AlertCircle, Award, CheckCircle2, Lock, ArrowLeft, Building2, Calendar, FileText } from 'lucide-react';
import axios from 'axios';

const VerifyCertificate = () => {
  const { certNumber } = useParams();
  const [certData, setCertData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const verifyCert = async () => {
      setLoading(true);
      setError(null);
      try {
        const queryId = certNumber || new URLSearchParams(window.location.search).get('id') || `BPJSTK/MAGANG/${new Date().getFullYear()}/001`;
        const res = await axios.get(`/api/certificates/verify/${encodeURIComponent(queryId)}`);
        if (res.data?.success && res.data?.valid) {
          setCertData(res.data.data);
        } else {
          setError(res.data?.message || 'Sertifikat tidak valid');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Sertifikat tidak terdaftar atau telah dicabut.');
      } finally {
        setLoading(false);
      }
    };

    verifyCert();
  }, [certNumber]);

  return (
    <div className="min-h-screen bg-[#F5F4F0] font-sans flex flex-col justify-between p-4 sm:p-8">
      {/* Top Navbar */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between pb-6 border-b-2 border-[#121214]">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#B8C96E] border-2 border-[#121214] flex items-center justify-center shadow-[3px_3px_0px_#121214]">
            <Building2 className="w-5 h-5 text-[#121214]" />
          </div>
          <div>
            <h1 className="font-black text-lg text-[#121214] leading-tight">BPJSTK</h1>
            <p className="text-xs text-gray-600 font-semibold">Portal Verifikasi Keaslian Sertifikat Magang Resmi</p>
          </div>
        </div>
        <Link
          to="/login"
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border-2 border-[#121214] bg-white font-bold text-xs text-[#121214] shadow-[2px_2px_0px_#121214] hover:bg-[#FCE373] transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Portal</span>
        </Link>
      </div>

      {/* Main Verification Card */}
      <div className="max-w-2xl mx-auto w-full my-8">
        {loading ? (
          <div className="bg-white border-2 border-[#121214] rounded-2xl p-10 text-center shadow-[6px_6px_0px_#121214] space-y-3">
            <Lock className="w-8 h-8 text-[#121214] animate-spin mx-auto" />
            <h3 className="font-black text-base text-[#121214]">Memverifikasi Tanda Tangan Kriptografis...</h3>
            <p className="text-xs text-gray-500">Memeriksa registri pangkalan data BPJSTK</p>
          </div>
        ) : error ? (
          <div className="bg-white border-2 border-[#121214] rounded-2xl p-8 text-center shadow-[6px_6px_0px_#121214] space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#F5C6EC] border-2 border-[#121214] flex items-center justify-center mx-auto shadow-[3px_3px_0px_#121214]">
              <AlertCircle className="w-7 h-7 text-red-600" />
            </div>
            <h3 className="font-black text-xl text-[#121214]">Sertifikat Tidak Ditemukan</h3>
            <p className="text-xs text-gray-600 max-w-md mx-auto">{error}</p>
            <div className="p-3 bg-[#F5F4F0] rounded-xl border border-[#121214]/20 text-[11px] font-mono text-gray-600">
              ID Pencarian: {certNumber || 'Parameter tidak disertakan'}
            </div>
          </div>
        ) : (
          <div className="bg-white border-2 border-[#121214] rounded-2xl overflow-hidden shadow-[8px_8px_0px_#121214]">
            
            {/* Status Banner */}
            <div className="p-5 bg-[#B8C96E] border-b-2 border-[#121214] flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-white border-2 border-[#121214] flex items-center justify-center shadow-[3px_3px_0px_#121214]">
                  <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                </div>
                <div>
                  <span className="bg-[#121214] text-white text-[10px] font-black uppercase px-2 py-0.5 rounded">
                    Sah & Terverifikasi
                  </span>
                  <h2 className="font-black text-lg text-[#121214] mt-0.5">Sertifikat Kelulusan Resmi</h2>
                </div>
              </div>
              <div className="hidden sm:block text-right">
                <span className="text-[10px] font-bold text-[#121214]/80 uppercase">Standar Kriptografi</span>
                <p className="text-xs font-black text-[#121214]">{certData?.signature_algorithm || 'HMAC-SHA256'} Guard</p>
              </div>
            </div>

            {/* Details */}
            <div className="p-6 space-y-5">
              
              <div className="text-center pb-4 border-b border-gray-200">
                <span className="text-xs font-black uppercase tracking-wider text-gray-500">Diberikan Kepada</span>
                <h3 className="font-black text-2xl text-[#121214] mt-1">{certData.participant_name}</h3>
                <p className="text-xs font-mono font-bold text-gray-600 mt-0.5">NIM / ID Magang: {certData.participant_nim}</p>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-[#F5F4F0] rounded-xl border border-[#121214]/20">
                  <span className="text-[10px] uppercase font-bold text-gray-500">Nomor Sertifikat</span>
                  <p className="font-mono font-black text-[#121214] mt-0.5">{certData.certificate_number}</p>
                </div>
                <div className="p-3 bg-[#F5F4F0] rounded-xl border border-[#121214]/20">
                  <span className="text-[10px] uppercase font-bold text-gray-500">Predikat / Nilai Akhir</span>
                  <p className="font-black text-emerald-800 mt-0.5">{certData.predicate} ({certData.score_average})</p>
                </div>
                <div className="p-3 bg-[#F5F4F0] rounded-xl border border-[#121214]/20">
                  <span className="text-[10px] uppercase font-bold text-gray-500">Gelombang / Batch</span>
                  <p className="font-bold text-[#121214] mt-0.5">{certData.batch_name}</p>
                </div>
                <div className="p-3 bg-[#F5F4F0] rounded-xl border border-[#121214]/20">
                  <span className="text-[10px] uppercase font-bold text-gray-500">Tanggal Terbit</span>
                  <p className="font-bold text-[#121214] mt-0.5">{new Date(certData.issue_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>

              {/* Cryptographic Hash Verification Box (Feature 16) */}
              <div className="p-4 bg-[#BDD4F2]/30 rounded-xl border-2 border-[#121214]">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-2">
                    <Lock className="w-4 h-4 text-[#121214]" />
                    <span className="text-xs font-black uppercase text-[#121214]">Tanda Tangan Digital Kriptografis ({certData.signature_algorithm || 'HMAC-SHA256'})</span>
                  </div>
                  <span className="text-[10px] font-black bg-[#B8C96E] text-[#121214] px-2 py-0.5 rounded border border-[#121214]">
                    Matematis Sah ✓
                  </span>
                </div>
                <p className="font-mono text-[10px] text-gray-700 break-all bg-white p-2.5 rounded-lg border border-[#121214]/30 select-all">
                  {certData.digital_signature || certData.digital_signature_hash}
                </p>
                <p className="text-[10px] text-gray-600 mt-2 font-medium">
                  Tanda tangan kriptografis ini mengunci secara matematis nama peserta, predikat kelulusan, nomor registrasi, dan tanggal penerbitan sehingga mustahil dipalsukan atau diubah.
                </p>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 bg-[#F5F4F0] border-t-2 border-[#121214] text-center text-xs text-gray-600">
              Diterbitkan secara sah oleh <strong>BPJSTK Republik Indonesia</strong>.
            </div>

          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-500 py-4">
        &copy; {new Date().getFullYear()} BPJSTK. Hak Cipta Dilindungi Undang-Undang.
      </div>
    </div>
  );
};

export default VerifyCertificate;
