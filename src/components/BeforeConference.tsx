import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const BeforeConference: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Ensure video plays automatically
    const video = videoRef.current;
    if (video) {
      video.play().catch(error => {
        console.error('Error playing video:', error);
      });
    }
  }, []);

  return (
    <div className="fixed inset-0 bg-black">
      {/* Back to Admin Button */}
      <Link 
        to="/admin" 
        className="fixed top-4 left-4 flex items-center space-x-2 px-4 py-2 bg-black/30 hover:bg-black/50 rounded-lg transition-colors z-50 text-white"
      >
        <ArrowLeft size={20} />
        <span>חזרה לניהול</span>
      </Link>

      {/* Full Screen Video */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        loop
        muted
        playsInline
        autoPlay
      >
        <source src="/videos/break-animation.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default BeforeConference; 