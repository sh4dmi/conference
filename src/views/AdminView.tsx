import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Conference, Speaker } from '../types';
import SpeakerList from '../components/SpeakerList';
import TimeInput from '../components/TimeInput';
import { Plus, Calendar, Clock, Image, ArrowLeft, Coffee } from 'lucide-react';
import { addMinutesToTime } from '../utils/timeUtils';
import DisplayView from './DisplayView';

const defaultBackgroundOptions = [
  {
    name: 'Tech Pattern',
    url: 'https://images.unsplash.com/photo-1557683311-eac922347aa1?auto=format&fit=crop&q=80'
  },
  {
    name: 'Abstract Blue',
    url: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80'
  },
  {
    name: 'Digital Network',
    url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80'
  }
];

function AdminView() {
  const [conference, setConference] = useState<Conference>(() => {
    const saved = localStorage.getItem('conference');
    return saved ? JSON.parse(saved) : {
      id: '1',
      name: 'כנס טבת התשפ"ה',
      date: '2025-01-20',
      startTime: '09:00',
      speakers: [
        {
          id: crypto.randomUUID(),
          name: 'מציג ראשון',
          topic: 'נושא ראשון',
          duration: 30,
          order: 0,
          logo: 'aka.png'
        },
        {
          id: crypto.randomUUID(),
          name: 'מציג שני',
          topic: 'נושא שני',
          duration: 30,
          order: 1,
          logo: 'IDF.png'
        }
      ],
      currentSpeakerId: null,
      theme: {
        background: 'bg-gradient-to-r from-blue-900 to-blue-700',
        font: 'font-sans',
        backgroundImage: defaultBackgroundOptions[0].url
      },
      customBackgrounds: []
    };
  });

  const [showBackgroundModal, setShowBackgroundModal] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('conference', JSON.stringify(conference));
    window.dispatchEvent(new Event('storage'));
  }, [conference]);

  const calculateStartTime = (index: number): string => {
    let currentTime = conference.startTime;
    
    for (let i = 0; i < index; i++) {
      currentTime = addMinutesToTime(currentTime, conference.speakers[i].duration);
    }
    
    return currentTime;
  };

  const handleAddSpeaker = (isBreak: boolean = false) => {
    const newSpeaker: Speaker = {
      id: crypto.randomUUID(),
      name: isBreak ? '' : '',
      topic: isBreak ? 'הפסקה' : '',
      duration: isBreak ? 15 : 30,
      isBreak,
      order: conference.speakers.length,
    };
    
    const updatedSpeakers = [...conference.speakers, newSpeaker].map((speaker, index) => ({
      ...speaker,
      startTime: calculateStartTime(index)
    }));

    setConference(prev => ({
      ...prev,
      speakers: updatedSpeakers
    }));
  };

  const handleEditSpeaker = (updatedSpeaker: Speaker) => {
    const updatedSpeakers = conference.speakers.map(s => 
      s.id === updatedSpeaker.id ? updatedSpeaker : s
    ).map((speaker, index) => ({
      ...speaker,
      startTime: calculateStartTime(index)
    }));

    setConference(prev => ({
      ...prev,
      speakers: updatedSpeakers
    }));
  };

  const handleDeleteSpeaker = (id: string) => {
    const filteredSpeakers = conference.speakers
      .filter(s => s.id !== id)
      .map((speaker, index) => ({
        ...speaker,
        startTime: calculateStartTime(index)
      }));

    setConference(prev => ({
      ...prev,
      speakers: filteredSpeakers,
      currentSpeakerId: prev.currentSpeakerId === id ? null : prev.currentSpeakerId
    }));
  };

  const handleReorderSpeakers = (startIndex: number, endIndex: number) => {
    const newSpeakers = [...conference.speakers];
    const [removed] = newSpeakers.splice(startIndex, 1);
    newSpeakers.splice(endIndex, 0, removed);
    
    const updatedSpeakers = newSpeakers.map((s, index) => ({
      ...s,
      order: index,
      startTime: calculateStartTime(index)
    }));

    setConference(prev => ({
      ...prev,
      speakers: updatedSpeakers
    }));
  };

  const handleBackgroundChange = (url: string) => {
    setConference(prev => ({
      ...prev,
      theme: {
        ...prev.theme,
        backgroundImage: url
      }
    }));
    setShowBackgroundModal(false);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newBackground = {
          name: file.name,
          url: reader.result as string
        };
        setConference(prev => ({
          ...prev,
          customBackgrounds: [...prev.customBackgrounds, newBackground],
          theme: {
            ...prev.theme,
            backgroundImage: reader.result as string
          }
        }));
        setShowBackgroundModal(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSetCurrentSpeaker = (speakerId: string) => {
    setConference(prev => ({
      ...prev,
      currentSpeakerId: speakerId
    }));
  };

  const saveConference = () => {
    try {
      // Get existing conferences
      const conferences = JSON.parse(localStorage.getItem('conferences') || '[]');
      
      // Find if this conference already exists
      const existingIndex = conferences.findIndex((conf: Conference) => conf.id === conference.id);
      
      let updatedConferences;
      if (existingIndex !== -1) {
        // Update existing conference
        updatedConferences = conferences.map((conf: Conference) => 
          conf.id === conference.id ? conference : conf
        );
      } else {
        // Add new conference, but keep only the last 5 conferences
        updatedConferences = [conference, ...conferences.slice(0, 4)];
      }

      try {
        localStorage.setItem('conferences', JSON.stringify(updatedConferences));
        alert('הכנס נשמר בהצלחה');
      } catch (storageError) {
        // If storage is full, try to save only the current conference
        console.warn('Storage quota exceeded, saving only current conference');
        localStorage.setItem('conferences', JSON.stringify([conference]));
        alert('הכנס נשמר בהצלחה (נמחקו כנסים ישנים עקב מגבלת אחסון)');
      }
    } catch (error) {
      console.error('Error saving conference:', error);
      alert('שגיאה בשמירת הכנס. נא לנסות שוב.');
    }
  };

  const loadConference = (conferenceId: string) => {
    try {
      const conferences = JSON.parse(localStorage.getItem('conferences') || '[]');
      const selectedConference = conferences.find((conf: Conference) => conf.id === conferenceId);
      if (selectedConference) {
        setConference(selectedConference);
      }
    } catch (error) {
      console.error('Error loading conference:', error);
      alert('שגיאה בטעינת הכנס. נא לנסות שוב.');
    }
  };

  const deleteConference = () => {
    const conferences = JSON.parse(localStorage.getItem('conferences') || '[]');
    const updatedConferences = conferences.filter((conf: Conference) => conf.id !== conference.id);
    localStorage.setItem('conferences', JSON.stringify(updatedConferences));
    setShowDeleteWarning(false);
    // Reset to a new conference
    setConference({
      id: crypto.randomUUID(),
      name: '',
      date: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      speakers: [],
      currentSpeakerId: null,
      theme: {
        background: 'bg-gradient-to-r from-blue-900 to-blue-700',
        font: 'font-sans',
        backgroundImage: defaultBackgroundOptions[0].url
      },
      customBackgrounds: []
    });
  };

  return (
    <div 
      className="min-h-screen text-white relative"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.8)), url(${conference.theme.backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <Link 
        to="/" 
        className="fixed top-4 left-4 flex items-center space-x-2 px-4 py-2 bg-black/30 hover:bg-black/50 rounded-lg transition-colors z-50"
      >
        <ArrowLeft size={20} />
        <span>חזרה לתצוגה</span>
      </Link>

      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-4xl font-bold">ניהול הכנס</h1>
            <button
              onClick={() => setShowDeleteWarning(true)}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              מחק כנס
            </button>
          </div>
          <div className="flex space-x-4">
            <input
              type="text"
              value={conference.name}
              onChange={(e) => setConference(prev => ({ ...prev, name: e.target.value }))}
              className="bg-white/10 rounded px-4 py-2 flex-grow"
              placeholder="שם הכנס"
            />
            <div className="relative flex">
              <input
                type="date"
                value={conference.date}
                onChange={(e) => setConference(prev => ({ ...prev, date: e.target.value }))}
                className="bg-white/10 rounded px-4 py-2"
              />
              <button
                onClick={() => setConference(prev => ({ 
                  ...prev, 
                  date: new Date().toISOString().split('T')[0] 
                }))}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                title="Set to today"
              >
                <Calendar size={20} />
              </button>
            </div>
            <TimeInput
              value={conference.startTime}
              onChange={(newStartTime) => {
                const updatedSpeakers = conference.speakers.map((speaker, index) => ({
                  ...speaker,
                  startTime: calculateStartTime(index)
                }));
                setConference(prev => ({
                  ...prev,
                  startTime: newStartTime,
                  speakers: updatedSpeakers
                }));
              }}
              className="bg-white/10 rounded px-4 py-2"
            />
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section className="bg-black/50 backdrop-blur-lg rounded-xl p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">מציגים</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowBackgroundModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                >
                  <Image size={20} />
                  <span>רקע</span>
                </button>
                <button
                  onClick={() => handleAddSpeaker(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  <Coffee size={20} />
                  <span>הוסף הפסקה</span>
                </button>
                <button
                  onClick={() => handleAddSpeaker(false)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Plus size={20} />
                  <span>הוסף מציג</span>
                </button>
              </div>
            </div>
            <SpeakerList
              speakers={conference.speakers}
              currentSpeakerId={conference.currentSpeakerId}
              onEdit={handleEditSpeaker}
              onDelete={handleDeleteSpeaker}
              onReorder={handleReorderSpeakers}
              onSetCurrent={handleSetCurrentSpeaker}
            />
          </section>

          <section className="bg-black/50 backdrop-blur-lg rounded-xl p-6">
            <h2 className="text-2xl font-semibold mb-6">תצוגה מקדימה</h2>
            <div className="col-span-1 bg-gray-800 rounded-lg overflow-hidden relative">
              <DisplayView isPreview={true} />
            </div>
          </section>
        </div>

        <div className="mt-8 flex items-center space-x-4">
          <select
            onChange={(e) => loadConference(e.target.value)}
            className="bg-white/10 rounded px-4 py-2 font-heebo text-white"
            dir="rtl"
          >
            <option value="" className="text-black font-heebo">בחר כנס</option>
            {JSON.parse(localStorage.getItem('conferences') || '[]').map((conf: Conference) => (
              <option key={conf.id} value={conf.id} className="text-black font-heebo">
                {conf.name}
              </option>
            ))}
          </select>
          <button
            onClick={saveConference}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors font-heebo"
          >
            שמור כנס
          </button>
        </div>
      </div>

      {showBackgroundModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">בחר רקע</h3>
            
            {/* Upload new background */}
            <div className="mb-6">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 transition-colors"
              >
                העלה תמונת רקע חדשה
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {/* Custom backgrounds */}
            {conference.customBackgrounds.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-2">רקעים מותאמים אישית</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {conference.customBackgrounds.map((bg, index) => (
                    <button
                      key={index}
                      onClick={() => handleBackgroundChange(bg.url)}
                      className="relative group overflow-hidden rounded-lg aspect-video"
                    >
                      <img 
                        src={bg.url} 
                        alt={bg.name}
                        className="w-full h-full object-cover transition-transform group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white font-medium">{bg.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Default backgrounds */}
            <h4 className="text-lg font-semibold text-gray-800 mb-2">רקעים מוכנים מראש</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {defaultBackgroundOptions.map((bg, index) => (
                <button
                  key={index}
                  onClick={() => handleBackgroundChange(bg.url)}
                  className="relative group overflow-hidden rounded-lg aspect-video"
                >
                  <img 
                    src={bg.url} 
                    alt={bg.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white font-medium">{bg.name}</span>
                  </div>
                </button>
              ))}
            </div>
            
            <button
              onClick={() => setShowBackgroundModal(false)}
              className="mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
            >
              סגור
            </button>
          </div>
        </div>
      )}

      {/* Delete Warning Modal */}
      {showDeleteWarning && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">מחיקת כנס</h3>
            <p className="text-gray-600 mb-6">האם אתה בטוח שברצונך למחוק את הכנס? פעולה זו אינה הפיכה.</p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteWarning(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
              >
                ביטול
              </button>
              <button
                onClick={deleteConference}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                מחק כנס
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminView;