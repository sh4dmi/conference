import React, { useState } from 'react';
import { Speaker } from '../types';
import { GripVertical, Trash2, Edit, Clock, Save, X, Coffee, Image, Copy } from 'lucide-react';
import LogoSelector from './LogoSelector';

interface SpeakerListProps {
  speakers: Speaker[];
  currentSpeakerId: string | null;
  onEdit: (speaker: Speaker) => void;
  onDelete: (id: string) => void;
  onReorder: (startIndex: number, endIndex: number) => void;
  onDuplicate: (speaker: Speaker) => void;
  onSetCurrentSpeaker: (id: string) => void;
  showUpcomingOnly: boolean;
}

export default function SpeakerList({ 
  speakers, 
  currentSpeakerId,
  onEdit, 
  onDelete, 
  onReorder,
  onDuplicate,
  onSetCurrentSpeaker,
  showUpcomingOnly
}: SpeakerListProps) {
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [editingSpeaker, setEditingSpeaker] = useState<Speaker | null>(null);
  const [showLogoSelector, setShowLogoSelector] = useState(false);

  console.log('SpeakerList render:', {
    showUpcomingOnly,
    currentSpeakerId,
    speakersCount: speakers.length
  });

  // Get visible speakers
  const visibleSpeakers = React.useMemo(() => {
    // Always return all speakers in admin view
    return speakers;
  }, [speakers]);

  // Calculate current time and progress
  const [currentTime, setCurrentTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const getSpeakerStatus = (speaker: Speaker) => {
    if (!speaker.startTime) return 'upcoming';
    
    const [hours, minutes] = speaker.startTime.split(':').map(Number);
    const speakerStartTime = hours * 60 + minutes;
    const speakerEndTime = speakerStartTime + speaker.duration;
    const currentTimeInMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

    if (currentTimeInMinutes < speakerStartTime) return 'upcoming';
    if (currentTimeInMinutes >= speakerEndTime) return 'past';
    return 'current';
  };

  const handleDragStart = (index: number) => {
    setDraggedItem(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItem === null) return;
    
    if (draggedItem !== index) {
      // Get the actual speaker objects for the dragged and target positions
      const draggedSpeaker = visibleSpeakers[draggedItem];
      const targetSpeaker = visibleSpeakers[index];
      
      // Find their original indices in the full speakers array
      const originalDraggedIndex = speakers.findIndex(s => s.id === draggedSpeaker.id);
      const originalTargetIndex = speakers.findIndex(s => s.id === targetSpeaker.id);
      
      onReorder(originalDraggedIndex, originalTargetIndex);
      setDraggedItem(index);
    }
  };

  const handleEditClick = (speaker: Speaker) => {
    setEditingSpeaker(speaker);
  };

  const handleSaveEdit = () => {
    if (editingSpeaker) {
      onEdit(editingSpeaker);
      setEditingSpeaker(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingSpeaker(null);
  };

  return (
    <div className="space-y-2 relative">
      {/* Timeline line connecting all speakers */}
      <div className="absolute left-2 top-8 bottom-8 w-0.5 bg-gray-600/30" />
      
      {visibleSpeakers.map((speaker, index) => {
        const status = getSpeakerStatus(speaker);
        
        return (
          <div
            key={speaker.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onClick={() => onSetCurrentSpeaker(speaker.id)}
            className={`flex items-center space-x-4 p-4 backdrop-blur-sm rounded-lg shadow-sm hover:shadow-md transition-shadow relative cursor-pointer ${
              speaker.id === currentSpeakerId ? 'ring-2 ring-blue-500 bg-blue-500/30' : 
              status === 'current' ? 'bg-blue-500/30' : 
              speaker.isBreak ? 'bg-green-500/30' : 
              status === 'past' ? 'bg-gray-700/30' : 'bg-white/10'
            }`}
          >
            {/* Timeline dot */}
            <div className={`absolute left-2 w-2 h-2 rounded-full transform -translate-x-1/2 ${
              status === 'past' ? 'bg-gray-400' : 
              status === 'current' ? 'bg-blue-400 w-3 h-3 ring-4 ring-blue-400/30' : 
              'bg-gray-600'
            }`} />

            {/* Progress line */}
            {status === 'current' && speaker.startTime && (
              <div className="absolute left-2 -bottom-2 top-1/2 w-0.5 bg-blue-400 transform -translate-x-1/2" />
            )}

            <div className="cursor-move ml-4">
              <GripVertical size={20} className="text-gray-400" />
            </div>
            {editingSpeaker?.id === speaker.id ? (
              <div className="flex-1 space-y-2">
                {!speaker.isBreak && (
                  <>
                    <input
                      type="text"
                      value={editingSpeaker.name}
                      onChange={(e) => setEditingSpeaker({ ...editingSpeaker, name: e.target.value })}
                      className="w-full p-2 rounded bg-white/20 text-white placeholder-gray-400"
                      placeholder="שם המציג"
                    />
                    <textarea
                      value={editingSpeaker.bio || ''}
                      onChange={(e) => setEditingSpeaker({ ...editingSpeaker, bio: e.target.value })}
                      className="w-full p-2 rounded bg-white/20 text-white placeholder-gray-400 min-h-[80px]"
                      placeholder="ביוגרפיה של המציג"
                    />
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setShowLogoSelector(!showLogoSelector)}
                        className="flex items-center space-x-2 px-3 py-2 rounded bg-white/20 hover:bg-white/30 transition-colors"
                      >
                        <Image size={20} />
                        <span>{editingSpeaker.logo ? 'החלף לוגו' : 'הוסף לוגו'}</span>
                      </button>
                      {editingSpeaker.logo && (
                        <img
                          src={`/logos/${editingSpeaker.logo}`}
                          alt="Selected logo"
                          className="h-8 w-8 object-contain"
                        />
                      )}
                    </div>
                    {showLogoSelector && (
                      <div className="mt-2 p-4 bg-black/40 rounded-lg">
                        <LogoSelector
                          selectedLogo={editingSpeaker.logo}
                          onSelect={(logo) => {
                            setEditingSpeaker({ ...editingSpeaker, logo });
                            setShowLogoSelector(false);
                          }}
                        />
                      </div>
                    )}
                  </>
                )}
                <input
                  type="text"
                  value={editingSpeaker.topic}
                  onChange={(e) => setEditingSpeaker({ ...editingSpeaker, topic: e.target.value })}
                  className="w-full p-2 rounded bg-white/20 text-white placeholder-gray-400"
                  placeholder={speaker.isBreak ? "סוג ההפסקה" : "נושא"}
                />
                <input
                  type="number"
                  value={editingSpeaker.duration}
                  onChange={(e) => setEditingSpeaker({ ...editingSpeaker, duration: parseInt(e.target.value) })}
                  className="w-full p-2 rounded bg-white/20 text-white placeholder-gray-400"
                  placeholder="משך זמן (דקות)"
                />
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={handleSaveEdit}
                    className="flex items-center space-x-1 px-3 py-1 rounded bg-green-600 hover:bg-green-700 text-white transition-colors"
                  >
                    <Save size={16} />
                    <span>שמור</span>
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex items-center space-x-1 px-3 py-1 rounded bg-gray-600 hover:bg-gray-700 text-white transition-colors"
                  >
                    <X size={16} />
                    <span>בטל</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1">
                {!speaker.isBreak && (
                  <div className="flex items-center space-x-2">
                    {speaker.logo && (
                        <img
                          src={`/logos/${speaker.logo}`}
                          alt={`${speaker.name} logo`}
                        className="h-6 w-6 object-contain"
                        />
                    )}
                    <h3 className="font-semibold text-lg text-white">{speaker.name}</h3>
                  </div>
                )}
                {speaker.bio && (
                  <div className="relative mt-2">
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500/30 rounded-full" />
                    <p className="text-sm text-gray-400 pl-3 line-clamp-2 italic">
                      {speaker.bio}
                    </p>
                  </div>
                )}
                <p className="text-gray-300 mt-2">{speaker.topic}</p>
                <div className="flex items-center space-x-2 mt-1 text-sm text-gray-400">
                  <Clock size={14} />
                      <span>{speaker.duration} דקות</span>
                    {speaker.startTime && (
                      <>
                      <span className="mx-1">|</span>
                      <span>{speaker.startTime}</span>
                      </>
                    )}
                </div>
              </div>
            )}
            <div className="flex items-center space-x-2">
              {!editingSpeaker && (
                <>
              <button
                onClick={() => handleEditClick(speaker)}
                    className="p-1 hover:bg-white/20 rounded transition-colors"
                    title="ערוך"
              >
                    <Edit size={20} className="text-blue-400" />
              </button>
              <button
                    onClick={() => onDuplicate(speaker)}
                    className="p-1 hover:bg-white/20 rounded transition-colors"
                    title="שכפל"
              >
                    <Copy size={20} className="text-purple-400" />
              </button>
              <button
                    onClick={() => onDelete(speaker.id)}
                    className="p-1 hover:bg-white/20 rounded transition-colors"
                    title="מחק"
              >
                    <Trash2 size={20} className="text-red-400" />
              </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}