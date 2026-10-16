import React, { useState, useEffect, useContext } from 'react';
import Layout from '../Layout/Layout';
import { AuthContext } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { eventService } from '../../services/eventService';
import batchService from '../../services/batchService';
import NeoDatePicker from '../Common/NeoDatePicker';
import NeoSelect from '../Common/NeoSelect';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Users, 
  Bell, 
  FileText, 
  Award, 
  ClipboardList, 
  RefreshCw, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  Trash2,
  X
} from 'lucide-react';

const Calendar = () => {
  const { user } = useContext(AuthContext);
  const { toast, confirm } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [view, setView] = useState('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [formData, setFormData] = useState({
    event_title: '',
    event_description: '',
    start_datetime: '',
    end_datetime: '',
    batch_id: ''
  });

  const isPrivileged = Boolean(
    user?.role_id === 2 || 
    user?.role_id === 3 || 
    user?.role === 'Koordinator' || 
    user?.role === 'Administrator' || 
    user?.role === 'Admin'
  );

  // Fetch events
  const fetchEvents = async () => {
    try {
      setError(null);
      const result = await eventService.getEvents();
      
      console.log('Calendar component received:', result);
      
      if (result.success && Array.isArray(result.data)) {
        // Process events dengan validasi yang lebih baik
        const processedEvents = result.data
          .filter(event => {
            // Validasi data event
            if (!event.event_id || !event.event_title || !event.start_datetime) {
              console.warn('Invalid event data:', event);
              return false;
            }
            
            // Pastikan tanggal valid
            const startDate = new Date(event.start_datetime);
            const endDate = new Date(event.end_datetime);
            
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
              console.warn('Invalid date in event:', event);
              return false;
            }
            
            return true;
          })
          .map(event => ({
            ...event,
            // Pastikan format tanggal konsisten
            start_datetime: new Date(event.start_datetime).toISOString(),
            end_datetime: new Date(event.end_datetime).toISOString()
          }));
        
        console.log('Processed events:', processedEvents);
        setEvents(processedEvents);
      } else {
        console.error('Invalid response format:', result);
        throw new Error(result.message || 'Failed to load events - invalid response format');
      }
    } catch (err) {
      console.error('Error details:', err);
      setError(err.message || 'Terjadi kesalahan saat memuat events');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    if (isPrivileged) {
      batchService.getAll()
        .then((res) => {
          if (res.data?.success && Array.isArray(res.data.data)) {
            setBatches(res.data.data);
          }
        })
        .catch((err) => console.error('Failed to load batches:', err));
    }
  }, [isPrivileged]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!formData.event_title || !formData.start_datetime || !formData.end_datetime) {
      toast.error('Judul agenda, waktu mulai, dan waktu selesai wajib diisi.');
      return;
    }
    if (new Date(formData.end_datetime) < new Date(formData.start_datetime)) {
      toast.error('Waktu selesai tidak boleh lebih awal dari waktu mulai.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        event_title: formData.event_title,
        event_description: formData.event_description,
        start_datetime: formData.start_datetime,
        end_datetime: formData.end_datetime,
        batch_id: formData.batch_id ? Number(formData.batch_id) : (batches[0]?.batch_id || 1)
      };
      const res = await eventService.createEvent(payload);
      if (res.success) {
        toast.success('Agenda kegiatan berhasil ditambahkan dan disiarkan ke semua peserta.');
        setShowCreateModal(false);
        setFormData({
          event_title: '',
          event_description: '',
          start_datetime: '',
          end_datetime: '',
          batch_id: ''
        });
        fetchEvents();
      } else {
        toast.error(res.message || 'Gagal menambahkan agenda.');
      }
    } catch (err) {
      toast.error(err.message || 'Terjadi kesalahan saat menambahkan agenda.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventId, eventTitle) => {
    const ok = await confirm({
      title: 'Hapus Agenda Kegiatan',
      message: `Apakah Anda yakin ingin menghapus agenda "${eventTitle}"? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      type: 'danger'
    });
    if (!ok) return;

    setIsDeleting(true);
    try {
      const res = await eventService.deleteEvent(eventId);
      if (res.success) {
        toast.success('Agenda kegiatan berhasil dihapus.');
        setSelectedEvent(null);
        fetchEvents();
      } else {
        toast.error(res.message || 'Gagal menghapus agenda.');
      }
    } catch (err) {
      toast.error(err.message || 'Terjadi kesalahan saat menghapus agenda.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getEventTypeColor = (event) => {
    const title = event.event_title?.toLowerCase() || '';

    if (title.includes('ujian') || title.includes('test') || title.includes('assessment')) {
      return 'bg-[#FCE373] text-[#121214] border border-[#F2CE46]/50';
    } else if (title.includes('workshop') || title.includes('pelatihan')) {
      return 'bg-[#BDD4F2] text-[#121214] border border-[#91B6E6]/50';
    } else if (title.includes('deadline') || title.includes('pengumpulan')) {
      return 'bg-[#F5C6EC] text-[#121214] border border-[#E59CD8]/50';
    } else if (title.includes('seminar') || title.includes('sharing')) {
      return 'bg-[#B8C96E] text-[#121214] border border-[#9CB04C]/50';
    } else if (title.includes('kuis') || title.includes('quiz')) {
      return 'bg-[#FCE373] text-[#121214] border border-[#F2CE46]/50';
    } else {
      return 'bg-[#FAF9F6] text-[#121214] border border-[#EAE9E4]';
    }
  };

  const getEventTypeIcon = (event) => {
    const title = event.event_title?.toLowerCase() || '';

    if (title.includes('ujian') || title.includes('test') || title.includes('assessment')) {
      return <FileText className="w-4 h-4" />;
    } else if (title.includes('workshop') || title.includes('pelatihan')) {
      return <Users className="w-4 h-4" />;
    } else if (title.includes('deadline') || title.includes('pengumpulan')) {
      return <Clock className="w-4 h-4" />;
    } else if (title.includes('seminar') || title.includes('sharing')) {
      return <Award className="w-4 h-4" />;
    } else if (title.includes('kuis') || title.includes('quiz')) {
      return <ClipboardList className="w-4 h-4" />;
    } else {
      return <Bell className="w-4 h-4" />;
    }
  };

  const getEventTypeLabel = (event) => {
    const title = event.event_title?.toLowerCase() || '';

    if (title.includes('ujian') || title.includes('test') || title.includes('assessment')) {
      return 'Ujian';
    } else if (title.includes('workshop') || title.includes('pelatihan')) {
      return 'Workshop';
    } else if (title.includes('deadline') || title.includes('pengumpulan')) {
      return 'Deadline';
    } else if (title.includes('seminar') || title.includes('sharing')) {
      return 'Seminar';
    } else if (title.includes('kuis') || title.includes('quiz')) {
      return 'Kuis';
    } else {
      return 'Kegiatan';
    }
  };

  const getEventsForDate = (date) => {
    console.log('Checking events for date:', date);
    
    const dayEvents = events.filter((event) => {
      if (!event.start_datetime) return false;
      
      const eventDate = new Date(event.start_datetime);
      const targetDate = new Date(date);
      
      // Bandingkan tanggal saja (abaikan waktu)
      const eventDateStr = eventDate.toISOString().split('T')[0];
      const targetDateStr = targetDate.toISOString().split('T')[0];
      
      console.log('Event date comparison:', eventDateStr, targetDateStr, eventDateStr === targetDateStr);
      return eventDateStr === targetDateStr;
    });
    
    console.log('Found events for date', date, ':', dayEvents);
    return dayEvents;
  };

  const getUpcomingEvents = () => {
    const now = new Date();
    return events
      .filter((event) => {
        const eventDate = new Date(event.start_datetime);
        return eventDate >= now;
      })
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
      .slice(0, 5);
  };

  const formatDate = (dateString) => {
    try {
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(dateString).toLocaleDateString('id-ID', options);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Tanggal tidak valid';
    }
  };

  const formatTime = (datetimeString) => {
    try {
      return new Date(datetimeString).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'Waktu tidak valid';
    }
  };

  const formatDateForDisplay = (datetimeString) => {
    try {
      const date = new Date(datetimeString);
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date for display:', error);
      return 'Tanggal tidak valid';
    }
  };

  const MonthView = () => {
    const today = new Date().toISOString().split('T')[0];
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const weeks = [];
    let currentWeek = [];

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);

      const dateString = date.toISOString().split('T')[0];
      const dayEvents = getEventsForDate(dateString);

      currentWeek.push({
        date: dateString,
        display: date.getDate(),
        isCurrentMonth: date.getMonth() === currentDate.getMonth(),
        isToday: dateString === today,
        events: dayEvents,
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    return (
      <div className="bg-white rounded-[22px] border border-[#EAE9E4] overflow-hidden shadow-sm">
        {/* Responsive Table Wrapper */}
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            {/* Calendar Header */}
            <div className="grid grid-cols-7 bg-[#FAF9F6] border-b border-[#EAE9E4]">
              {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day) => (
                <div key={day} className="py-3 text-center text-xs font-bold uppercase tracking-wider text-[#6E6D6A]">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-[#F0EFEA]">
              {weeks.flat().map((day, index) => (
                <div 
                  key={index} 
                  className={`min-h-24 sm:min-h-28 p-2 flex flex-col justify-between transition-colors ${
                    !day.isCurrentMonth ? 'bg-[#FAF9F6]/60 opacity-40' : 'bg-white'
                  } ${day.isToday ? 'bg-[#F5C6EC]/20' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center justify-center text-xs font-bold w-6 h-6 rounded-full ${
                      day.isToday 
                        ? 'bg-[#121214] text-white shadow-sm' 
                        : !day.isCurrentMonth 
                          ? 'text-[#A09F9B]' 
                          : 'text-[#121214]'
                    }`}>
                      {day.display}
                    </span>
                    {day.events.length > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#121214]"></span>
                    )}
                  </div>

                  <div className="mt-1 space-y-1 overflow-y-auto max-h-16">
                    {day.events.slice(0, 2).map((event) => (
                      <div 
                        key={event.event_id} 
                        className={`text-[10px] p-1 rounded-lg ${getEventTypeColor(event)} cursor-pointer font-semibold truncate hover:opacity-80 transition-opacity`} 
                        onClick={() => setSelectedEvent(event)}
                        title={event.event_title}
                      >
                        {event.event_title}
                      </div>
                    ))}
                    {day.events.length > 2 && (
                      <div className="text-[9px] font-bold text-[#6E6D6A] text-center">
                        +{day.events.length - 2} lagi
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ListView = () => {
    const upcomingEvents = getUpcomingEvents();

    return (
      <div className="space-y-3">
        {upcomingEvents.length > 0 ? (
          upcomingEvents.map((event) => (
            <div 
              key={event.event_id} 
              className="bg-white rounded-[20px] border border-[#EAE9E4] p-4 sm:p-5 shadow-sm hover:border-[#121214]/20 transition-all cursor-pointer" 
              onClick={() => setSelectedEvent(event)}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start space-x-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#FAF9F6] border border-[#EAE9E4] flex items-center justify-center shrink-0 text-[#121214] font-bold">
                    {getEventTypeIcon(event)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${getEventTypeColor(event)}`}>
                        {getEventTypeLabel(event)}
                      </span>
                      {event.batch_name && (
                        <span className="text-[10px] font-semibold text-[#6E6D6A] bg-[#FAF9F6] px-2 py-0.5 rounded-full border border-[#EAE9E4]">
                          {event.batch_name}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-sm text-[#121214] truncate">{event.event_title}</h3>
                    {event.event_description && (
                      <p className="text-xs text-[#6E6D6A] mt-0.5 line-clamp-1">
                        {event.event_description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 sm:self-center">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#FAF9F6] border border-[#EAE9E4] text-[#121214] px-3 py-1.5 rounded-full">
                    <Clock className="w-3.5 h-3.5 text-[#6E6D6A]" />
                    {formatDateForDisplay(event.start_datetime)} • {formatTime(event.start_datetime)}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-[22px] border border-[#EAE9E4] p-6">
            <CalendarIcon className="w-10 h-10 text-[#A09F9B] mx-auto mb-3" />
            <p className="text-sm font-bold text-[#121214]">Tidak ada kegiatan mendatang</p>
            <p className="text-xs text-[#6E6D6A] mt-1">Semua agenda pelatihan telah diselesaikan.</p>
          </div>
        )}
      </div>
    );
  };

  // Loading State
  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
          <div className="w-10 h-10 border-3 border-[#121214] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-[#121214]">Memuat jadwal kegiatan...</p>
        </div>
      </Layout>
    );
  }

  // Error State
  if (error) {
    return (
      <Layout>
        <div className="bg-white rounded-[24px] border border-red-200 p-8 text-center max-w-md mx-auto my-12 space-y-4 shadow-sm">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h3 className="text-base font-bold text-[#121214]">Gagal Memuat Kalender</h3>
          <p className="text-xs text-[#6E6D6A]">{error}</p>
          <button 
            onClick={handleRefresh} 
            className="px-5 py-2.5 bg-[#121214] text-white rounded-full text-xs font-bold hover:bg-neutral-800 transition-colors shadow-sm"
          >
            Coba Lagi
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#121214] tracking-tight">
              Kalender Kegiatan & Agenda
            </h1>
            <p className="text-xs sm:text-sm text-[#6E6D6A] mt-1">
              Jadwal pelaksanaan sosialisasi, evaluasi ujian, dan agenda bimbingan koordinator
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {isPrivileged && (
              <button 
                onClick={() => setShowCreateModal(true)} 
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#121214] text-white border-2 border-[#121214] rounded-full text-xs font-bold hover:bg-neutral-800 shadow-[3px_3px_0px_#121214] transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Agenda
              </button>
            )}
            <button 
              onClick={handleRefresh} 
              disabled={refreshing} 
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#EAE9E4] rounded-full text-xs font-bold text-[#121214] hover:bg-[#FAF9F6] shadow-sm transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Segarkan
            </button>
          </div>
        </div>

        {/* 3 Bento Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-[22px] bg-[#FCE373] text-[#121214] p-5 relative overflow-hidden shadow-sm flex flex-col justify-between">
            <div className="absolute right-3 -bottom-4 opacity-15 pointer-events-none text-7xl font-black">●</div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#121214]/70">Total Agenda</span>
            <div className="text-3xl font-black text-[#121214] my-1">{events.length}</div>
            <span className="text-[10px] font-bold text-[#121214]/70">Kegiatan Terdaftar</span>
          </div>

          <div className="rounded-[22px] bg-[#F5C6EC] text-[#121214] p-5 relative overflow-hidden shadow-sm flex flex-col justify-between">
            <div className="absolute right-3 -bottom-4 opacity-15 pointer-events-none text-7xl font-black">♥</div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#121214]/70">Akan Datang</span>
            <div className="text-3xl font-black text-[#121214] my-1">
              {events.filter((e) => new Date(e.start_datetime) >= new Date()).length}
            </div>
            <span className="text-[10px] font-bold text-[#121214]/70">Kegiatan Mendatang</span>
          </div>

          <div className="rounded-[22px] bg-[#BDD4F2] text-[#121214] p-5 relative overflow-hidden shadow-sm flex flex-col justify-between">
            <div className="absolute right-3 -bottom-4 opacity-15 pointer-events-none text-7xl font-black">★</div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#121214]/70">Ujian & Evaluasi</span>
            <div className="text-3xl font-black text-[#121214] my-1">
              {events.filter((e) => 
                e.event_title?.toLowerCase().includes('ujian') || 
                e.event_title?.toLowerCase().includes('test')
              ).length}
            </div>
            <span className="text-[10px] font-bold text-[#121214]/70">Tes Kompetensi</span>
          </div>
        </div>

        {/* Calendar Controls Bento Card */}
        <div className="bg-white rounded-[22px] border border-[#EAE9E4] p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* View Switcher Pills */}
            <div className="inline-flex items-center bg-[#FAF9F6] p-1 rounded-full border border-[#EAE9E4]">
              <button 
                onClick={() => setView('month')} 
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  view === 'month' 
                    ? 'bg-[#121214] text-white shadow-sm' 
                    : 'text-[#6E6D6A] hover:text-[#121214]'
                }`}
              >
                Tampilan Bulan
              </button>
              <button 
                onClick={() => setView('list')} 
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  view === 'list' 
                    ? 'bg-[#121214] text-white shadow-sm' 
                    : 'text-[#6E6D6A] hover:text-[#121214]'
                }`}
              >
                Daftar Kegiatan
              </button>
            </div>

            {/* Month Navigation */}
            {view === 'month' && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={goToPreviousMonth} 
                  className="w-8 h-8 rounded-full bg-[#FAF9F6] hover:bg-[#EAE9E4] border border-[#EAE9E4] flex items-center justify-center transition-colors text-[#121214]"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Signature Intelly Pink Month Pill */}
                <span className="px-4 py-1.5 bg-[#F5C6EC] text-[#121214] font-bold text-xs rounded-full shadow-sm">
                  {currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                </span>

                <button 
                  onClick={goToNextMonth} 
                  className="w-8 h-8 rounded-full bg-[#FAF9F6] hover:bg-[#EAE9E4] border border-[#EAE9E4] flex items-center justify-center transition-colors text-[#121214]"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button 
                  onClick={goToToday} 
                  className="px-3.5 py-1.5 bg-[#121214] text-white text-xs font-bold rounded-full hover:bg-neutral-800 transition-colors shadow-sm ml-1"
                >
                  Hari Ini
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Calendar Content */}
        {view === 'month' ? <MonthView /> : <ListView />}

        {/* Event Detail Modal (Intelly Design) */}
        {selectedEvent && (
          <div className="fixed inset-0 bg-[#121214]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
            <div className="bg-white rounded-[26px] border border-[#EAE9E4] p-6 sm:p-7 w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 text-xs font-bold rounded-full ${getEventTypeColor(selectedEvent)}`}>
                    {getEventTypeLabel(selectedEvent)}
                  </span>
                  {selectedEvent.batch_name && (
                    <span className="text-xs font-semibold text-[#6E6D6A] bg-[#FAF9F6] px-2.5 py-1 rounded-full border border-[#EAE9E4]">
                      {selectedEvent.batch_name}
                    </span>
                  )}
                </div>
                <button 
                  onClick={() => setSelectedEvent(null)} 
                  className="w-8 h-8 rounded-full bg-[#FAF9F6] hover:bg-[#EAE9E4] flex items-center justify-center text-[#121214] transition-colors"
                >
                  ✕
                </button>
              </div>

              <h3 className="text-xl font-bold text-[#121214] tracking-tight">{selectedEvent.event_title}</h3>
              
              {selectedEvent.event_description && (
                <div className="mt-3 p-4 bg-[#FAF9F6] rounded-2xl border border-[#EAE9E4] text-xs text-[#121214] leading-relaxed">
                  <p className="font-bold mb-1 text-[#121214]">Deskripsi Acara:</p>
                  <p className="whitespace-pre-wrap">{selectedEvent.event_description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-[#F0EFEA] text-xs">
                <div className="p-3 bg-white rounded-xl border border-[#EAE9E4] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FAF9F6] flex items-center justify-center text-[#121214]">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-[#121214]">Waktu Mulai</p>
                    <p className="text-[#6E6D6A]">{formatDate(selectedEvent.start_datetime)} • {formatTime(selectedEvent.start_datetime)}</p>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-[#EAE9E4] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FAF9F6] flex items-center justify-center text-[#121214]">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-[#121214]">Waktu Selesai</p>
                    <p className="text-[#6E6D6A]">{formatDate(selectedEvent.end_datetime)} • {formatTime(selectedEvent.end_datetime)}</p>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-[#EAE9E4] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FAF9F6] flex items-center justify-center text-[#121214]">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-[#121214]">Target Batch</p>
                    <p className="text-[#6E6D6A]">{selectedEvent.batch_name || 'Semua Batch'}</p>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-[#EAE9E4] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FAF9F6] flex items-center justify-center text-[#121214]">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-[#121214]">Penyelenggara</p>
                    <p className="text-[#6E6D6A]">{selectedEvent.created_by_name || 'Koordinator BPJS'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                {isPrivileged ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteEvent(selectedEvent.event_id, selectedEvent.event_title)}
                    disabled={isDeleting}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-rose-50 text-rose-700 border-2 border-rose-300 rounded-full text-xs font-bold hover:bg-rose-100 transition-colors shadow-sm disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {isDeleting ? 'Menghapus...' : 'Hapus Agenda'}
                  </button>
                ) : <div />}
                <div>
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-[#121214] text-white rounded-full text-xs font-bold hover:bg-neutral-800 transition-colors shadow-sm"
                  >
                    Tutup Informasi
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Event Modal (Intelly Soft Neo-Brutalist) */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-[#121214]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
            <div className="bg-white rounded-[26px] border-2 border-[#121214] p-6 sm:p-7 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-[6px_6px_0px_#121214]">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-black text-[#121214] tracking-tight">
                    Tambah Agenda Kegiatan
                  </h3>
                  <p className="text-xs text-[#6E6D6A] mt-0.5">
                    Agenda baru otomatis memicu notifikasi ke akun peserta dan koordinator
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-8 h-8 rounded-full bg-[#FAF9F6] border border-[#EAE9E4] hover:bg-[#EAE9E4] flex items-center justify-center text-[#121214] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#121214] mb-1.5">
                    Judul Agenda <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.event_title}
                    onChange={(e) => setFormData({ ...formData, event_title: e.target.value })}
                    placeholder="Contoh: Evaluasi Tengah Periode / Ujian Kompetensi"
                    className="w-full bg-[#FAF9F6] border-2 border-[#121214] rounded-2xl px-4 py-2.5 text-xs font-bold text-[#121214] shadow-[3px_3px_0px_#121214] focus:outline-none focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#121214] mb-1.5">
                    Deskripsi Kegiatan
                  </label>
                  <textarea
                    rows={3}
                    value={formData.event_description}
                    onChange={(e) => setFormData({ ...formData, event_description: e.target.value })}
                    placeholder="Instruksi, ruangan, atau link virtual meeting..."
                    className="w-full bg-[#FAF9F6] border-2 border-[#121214] rounded-2xl px-4 py-2.5 text-xs font-bold text-[#121214] shadow-[3px_3px_0px_#121214] focus:outline-none focus:bg-white transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <NeoDatePicker
                    label="Waktu Mulai"
                    required
                    type="datetime-local"
                    value={formData.start_datetime}
                    onChange={(e) => setFormData({ ...formData, start_datetime: e.target.value })}
                    placeholder="Pilih tanggal & waktu mulai"
                  />
                  <NeoDatePicker
                    label="Waktu Selesai"
                    required
                    type="datetime-local"
                    value={formData.end_datetime}
                    onChange={(e) => setFormData({ ...formData, end_datetime: e.target.value })}
                    placeholder="Pilih tanggal & waktu selesai"
                  />
                </div>

                <div>
                  <NeoSelect
                    label="Target Batch Magang"
                    value={formData.batch_id}
                    onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
                    placeholder="Pilih batch (default: batch pertama)"
                    options={batches.map((b) => ({
                      value: String(b.batch_id),
                      label: `${b.batch_name} (${b.status || 'Aktif'})`
                    }))}
                  />
                </div>

                <div className="pt-3 border-t border-[#F0EFEA] flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2.5 bg-white border-2 border-[#121214] text-[#121214] rounded-full text-xs font-bold hover:bg-[#FAF9F6] transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 bg-[#121214] text-white border-2 border-[#121214] rounded-full text-xs font-bold hover:bg-neutral-800 shadow-[3px_3px_0px_#121214] transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmitting ? 'Menyimpan...' : 'Simpan & Siarkan Agenda'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Calendar;