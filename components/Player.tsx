
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PlayIcon, StopIcon } from './icons';

interface PlayerProps {
  videoUrl: string;
  audioBuffer: AudioBuffer;
}

export const Player: React.FC<PlayerProps> = ({ videoUrl, audioBuffer }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [progress, setProgress] = useState(0);

  // Initialize AudioContext
  useEffect(() => {
    if (!audioContextRef.current) {
        // FIX: Cast window to any to support webkitAudioContext for older browsers.
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
  }, []);

  const stopPlayback = useCallback(() => {
    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
      audioSourceRef.current.disconnect();
      audioSourceRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  }, []);

  const startPlayback = useCallback(() => {
    if (videoRef.current && audioBuffer && audioContextRef.current) {
      stopPlayback(); // Ensure everything is stopped before starting

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      source.start(0);

      audioSourceRef.current = source;
      setIsPlaying(true);

      source.onended = () => {
        // This will be called when audio finishes or is stopped
        if (isPlaying) {
           stopPlayback();
        }
      };
    }
  }, [audioBuffer, stopPlayback, isPlaying]);

  const handlePlayToggle = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  };

  useEffect(() => {
    const videoElement = videoRef.current;
    const handleTimeUpdate = () => {
        if(videoElement) {
            const currentProgress = (videoElement.currentTime / videoElement.duration) * 100;
            setProgress(currentProgress);
        }
    };
    
    if (videoElement) {
        videoElement.addEventListener('timeupdate', handleTimeUpdate);
        videoElement.addEventListener('ended', stopPlayback);
    }
    
    return () => {
        if (videoElement) {
            videoElement.removeEventListener('timeupdate', handleTimeUpdate);
            videoElement.removeEventListener('ended', stopPlayback);
        }
        stopPlayback();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoUrl, audioBuffer]);

  return (
    <div className="w-full relative">
      <video
        ref={videoRef}
        src={videoUrl}
        muted
        className="w-full rounded-lg aspect-video bg-black"
      />
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/50 backdrop-blur-sm rounded-b-lg">
         <div className="flex items-center gap-4">
            <button onClick={handlePlayToggle} className="p-2 rounded-full bg-purple-600 hover:bg-purple-500 transition-colors">
                {isPlaying ? <StopIcon className="w-6 h-6 text-white"/> : <PlayIcon className="w-6 h-6 text-white"/>}
            </button>
            <div className="w-full bg-gray-600 rounded-full h-2.5">
                <div className="bg-purple-500 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
            </div>
        </div>
      </div>
    </div>
  );
};
