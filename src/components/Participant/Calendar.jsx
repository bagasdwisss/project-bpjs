import React, { useState, useEffect, useContext } from 'react';
import Layout from '../Layout/Layout';
import { AuthContext } from '../../context/AuthContext';
import { eventService } from '../../services/eventService';
import { Calendar as CalendarIcon, Clock, MapPin, Users, Bell, FileText, Award, ClipboardList, RefreshCw, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

const Calendar = () => {
  const { user } = useContext(AuthContext);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [view, setView] = useState('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch events dari Laravel API
  const fetchEvents = async () => {
    try {
      setError(null);
      console.log('Fetching events...');
      const result = await eventService.getParticipantEvents();
      
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
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchEvents();
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
      return 'bg-red-100 text-red-800 border-red-200';
    } else if (title.includes('workshop') || title.includes('pelatihan')) {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    } else if (title.includes('deadline') || title.includes('pengumpulan')) {
      return 'bg-purple-100 text-purple-800 border-purple-200';
    } else if (title.includes('seminar') || title.includes('sharing')) {
      return 'bg-green-100 text-green-800 border-green-200';
    } else if (title.includes('kuis') || title.includes('quiz')) {
      return 'bg-orange-100 text-orange-800 border-orange-200';
    } else {
      return 'bg-gray-100 text-gray-800 border-gray-200';
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Calendar Header */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map((day) => (
            <div key={day} className="p-4 text-center text-sm font-medium text-gray-700">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {weeks.flat().map((day, index) => (
            <div 
              key={index} 
              className={`min-h-32 p-2 border-r border-b border-gray-200 ${
                !day.isCurrentMonth ? 'bg-gray-50' : 'bg-white'
              } ${day.isToday ? 'bg-blue-50' : ''}`}
            >
              <div className={`text-sm font-medium ${
                !day.isCurrentMonth ? 'text-gray-400' : 
                day.isToday ? 'text-blue-600' : 'text-gray-900'
              }`}>
                {day.display}
              </div>
              <div className="mt-1 space-y-1 max-h-20 overflow-y-auto">
                {day.events.slice(0, 3).map((event) => (
                  <div 
                    key={event.event_id} 
                    className={`text-xs p-1 rounded border ${getEventTypeColor(event)} cursor-pointer hover:opacity-80 transition-opacity`} 
                    onClick={() => setSelectedEvent(event)}
                    title={event.event_title}
                  >
                    <div className="flex items-center space-x-1">
                      {getEventTypeIcon(event)}
                      <span className="truncate flex-1">{event.event_title}</span>
                    </div>
                  </div>
                ))}
                {day.events.length > 3 && (
                  <div className="text-xs text-gray-500 text-center">
                    +{day.events.length - 3} lainnya
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const ListView = () => {
    const upcomingEvents = getUpcomingEvents();

    return (
      <div className="space-y-4">
        {upcomingEvents.length > 0 ? (
          upcomingEvents.map((event) => (
            <div 
              key={event.event_id} 
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer" 
              onClick={() => setSelectedEvent(event)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getEventTypeColor(event)} flex items-center space-x-1`}>
                      {getEventTypeIcon(event)}
                      <span>{getEventTypeLabel(event)}</span>
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{event.event_title}</h3>
                  {event.event_description && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {event.event_description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatDateForDisplay(event.start_datetime)}</span>
                      <span>
                        {formatTime(event.start_datetime)} - {formatTime(event.end_datetime)}
                      </span>
                    </div>
                    {event.batch_name && (
                      <div className="flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span>{event.batch_name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Tidak ada kegiatan mendatang</p>
          </div>
        )}
      </div>
    );
  };

  // Loading State
  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  // Error State
  if (error) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">Kalender Kegiatan 📅</h1>
                <p className="text-blue-100">Lihat jadwal dan kegiatan dari koordinator & administrator</p>
              </div>
              <CalendarIcon className="w-12 h-12 text-blue-200" />
            </div>
          </div>

          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <AlertCircle className="w-16 h-16 text-red-500" />
            <h3 className="text-xl font-bold text-gray-900">Gagal Memuat Kalender</h3>
            <p className="text-gray-600 text-center max-w-md">{error}</p>
            <button 
              onClick={handleRefresh} 
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-8 text-white relative">
          <button 
            onClick={handleRefresh} 
            disabled={refreshing} 
            className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50" 
            title="Refresh Kalender"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Kalender Kegiatan 📅</h1>
              <p className="text-blue-100">Lihat jadwal dan kegiatan dari koordinator & administrator</p>
            </div>
            <CalendarIcon className="w-12 h-12 text-blue-200" />
          </div>
        </div>

        {/* Calendar Controls */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* View Toggle */}
            <div className="flex space-x-2">
              <button 
                onClick={() => setView('month')} 
                className={`px-4 py-2 rounded-lg font-medium ${
                  view === 'month' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Tampilan Bulan
              </button>
              <button 
                onClick={() => setView('list')} 
                className={`px-4 py-2 rounded-lg font-medium ${
                  view === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Daftar Kegiatan
              </button>
            </div>

            {/* Month Navigation - hanya tampil di month view */}
            {view === 'month' && (
              <div className="flex items-center space-x-4">
                <button 
                  onClick={goToPreviousMonth} 
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-bold text-gray-900 min-w-48 text-center">
                  {currentDate.toLocaleDateString('id-ID', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </h2>

                <button 
                  onClick={goToNextMonth} 
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                <button 
                  onClick={goToToday} 
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Hari Ini
                </button>
              </div>
            )}

            {/* View Info */}
            <div className="text-sm text-gray-600 lg:text-right">
              {view === 'month' 
                ? `Kalender ${currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}` 
                : 'Kegiatan Mendatang'
              }
            </div>
          </div>
        </div>

        {/* Calendar Content */}
        {view === 'month' ? <MonthView /> : <ListView />}

        {/* Event Detail Modal */}
        {selectedEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">{selectedEvent.event_title}</h3>
                <button 
                  onClick={() => setSelectedEvent(null)} 
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getEventTypeColor(selectedEvent)} flex items-center space-x-1`}>
                    {getEventTypeIcon(selectedEvent)}
                    <span>{getEventTypeLabel(selectedEvent)}</span>
                  </span>
                </div>

                {selectedEvent.event_description && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Deskripsi</h4>
                    <p className="text-gray-600 whitespace-pre-wrap">{selectedEvent.event_description}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">Mulai</p>
                      <p className="text-sm text-gray-600">
                        {formatDate(selectedEvent.start_datetime)}<br />
                        {formatTime(selectedEvent.start_datetime)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">Selesai</p>
                      <p className="text-sm text-gray-600">
                        {formatDate(selectedEvent.end_datetime)}<br />
                        {formatTime(selectedEvent.end_datetime)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">Batch</p>
                      <p className="text-sm text-gray-600">{selectedEvent.batch_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Bell className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">Dibuat Oleh</p>
                      <p className="text-sm text-gray-600">{selectedEvent.created_by_name}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
            <div className="text-2xl font-bold text-blue-600">{events.length}</div>
            <div className="text-sm text-gray-600">Total Kegiatan</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
            <div className="text-2xl font-bold text-green-600">
              {events.filter((e) => new Date(e.start_datetime) >= new Date()).length}
            </div>
            <div className="text-sm text-gray-600">Kegiatan Mendatang</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {events.filter((e) => 
                e.event_title?.toLowerCase().includes('ujian') || 
                e.event_title?.toLowerCase().includes('test')
              ).length}
            </div>
            <div className="text-sm text-gray-600">Ujian & Test</div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Calendar;