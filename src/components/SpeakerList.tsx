import React, { useState } from 'react';
import { Speaker } from '../types';
import { GripVertical, Trash2, Edit, Clock, Save, X, Play, Coffee, Image } from 'lucide-react';
import LogoSelector from './LogoSelector';

interface SpeakerListProps {
  speakers: Speaker[];
  currentSpeakerId: string | null;
  onEdit: (speaker: Speaker) => void;
  onDelete: (id: string) => void;
  onReorder: (startIndex: number, endIndex: number) => void;
  onSetCurrent: (id: string) => void;
}

export default function SpeakerList({ 
  speakers, 
  currentSpeakerId,
  onEdit, 
  onDelete, 
  onReorder,
  onSetCurrent 
}: SpeakerListProps) {
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [editingSpeaker, setEditingSpeaker] = useState<Speaker | null>(null);
  const [showLogoSelector, setShowLogoSelector] = useState(false);

  const handleDragStart = (index: number) => {
    setDraggedItem(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItem === null) return;
    
    if (draggedItem !== index) {
      onReorder(draggedItem, index);
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
    <div className="space-y-2">
      {speakers.map((speaker, index) => (
        <div
          key={speaker.id}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          className={`flex items-center space-x-4 p-4 backdrop-blur-sm rounded-lg shadow-sm hover:shadow-md transition-shadow ${
            currentSpeakerId === speaker.id ? 'bg-blue-500/30' : speaker.isBreak ? 'bg-green-500/30' : 'bg-white/10'
          }`}
        >
          <div className="cursor-move">
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
              <p className="text-gray-300">{speaker.topic}</p>
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
                >
                  <Edit size={20} className="text-blue-400" />
                </button>
                <button
                  onClick={() => onDelete(speaker.id)}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                >
                  <Trash2 size={20} className="text-red-400" />
                </button>
                <button
                  onClick={() => onSetCurrent(speaker.id)}
                  className={`p-1 hover:bg-white/20 rounded transition-colors ${
                    currentSpeakerId === speaker.id ? 'text-green-400' : 'text-gray-400'
                  }`}
                >
                  <Play size={20} />
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}