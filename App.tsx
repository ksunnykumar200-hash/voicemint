
import React, { useState, useCallback, useEffect } from 'react';
import { generateDubbedAudio, translateScript, generateScriptFromImage, transcribeAudio } from './services/geminiService';
import { decode, decodeAudioData, pcmToWav } from './utils/audio';
import { VOICE_OPTIONS, LANGUAGE_OPTIONS } from './constants';
import { Player } from './components/Player';
import { FileUploadIcon, LoaderIcon, WarningIcon, SparklesIcon, MusicIcon, Volume2Icon, MicIcon, VoicemintLogo, LogOutIcon, SmileIcon, FrownIcon, TurtleIcon, RabbitIcon } from './components/icons';
import { Auth } from './components/Auth';
import type { User } from './types';
import type { Voice } from './types';

const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // State for Video Dubbing
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [selectedVoice, setSelectedVoice] = useState<Voice>(VOICE_OPTIONS[0].value);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedAudioBuffer, setGeneratedAudioBuffer] = useState<AudioBuffer | null>(null);
  const [translatedScript, setTranslatedScript] = useState<string | null>(null);
  const [generatedScript, setGeneratedScript] = useState<string | null>(null);
  const [isGeneratingScript, setIsGeneratingScript] = useState<boolean>(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [isProcessingCustomAudio, setIsProcessingCustomAudio] = useState<boolean>(false);
  const [customAudioFile, setCustomAudioFile] = useState<File | null>(null);
  const [customAudioSuccess, setCustomAudioSuccess] = useState<string | null>(null);
  const [emotion, setEmotion] = useState<number>(50);
  const [speed, setSpeed] = useState<number>(50);

  // State for Text-to-Speech
  const [ttsText, setTtsText] = useState<string>('');
  const [ttsSelectedVoice, setTtsSelectedVoice] = useState<Voice>(VOICE_OPTIONS[0].value);
  const [isTtsLoading, setIsTtsLoading] = useState<boolean>(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);
  const [ttsEmotion, setTtsEmotion] = useState<number>(50);
  const [ttsSpeed, setTtsSpeed] = useState<number>(50);

  // State for Speech-to-Text
  const [sttAudioFile, setSttAudioFile] = useState<File | null>(null);
  const [isSttLoading, setIsSttLoading] = useState<boolean>(false);
  const [sttError, setSttError] = useState<string | null>(null);
  const [sttTranscription, setSttTranscription] = useState<string | null>(null);

  useEffect(() => {
    try {
      const session = localStorage.getItem('voicemint_session');
      if (session) {
        setCurrentUser(JSON.parse(session));
      }
    } catch (e) {
      console.error("Failed to parse session from localStorage", e);
      localStorage.removeItem('voicemint_session');
    }
  }, []);

  // Cleanup for TTS audio URL
  useEffect(() => {
    return () => {
      if (ttsAudioUrl) {
        URL.revokeObjectURL(ttsAudioUrl);
      }
    };
  }, [ttsAudioUrl]);

  const handleAuthSuccess = (user: User) => {
    localStorage.setItem('voicemint_session', JSON.stringify(user));
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('voicemint_session');
    setCurrentUser(null);
  };


  const generateScriptForVideo = async (videoFile: File) => {
    setIsGeneratingScript(true);
    setScriptError(null);
    setGeneratedScript(null);

    try {
        const video = document.createElement('video');
        video.src = URL.createObjectURL(videoFile);
        video.preload = 'metadata';

        const cleanup = () => {
            URL.revokeObjectURL(video.src);
        };

        video.onloadedmetadata = () => {
            if (video.duration > 0) {
              video.currentTime = video.duration / 2;
            }
        };

        video.onseeked = async () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    throw new Error("Could not get canvas context");
                }
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg');
                const base64Data = dataUrl.split(',')[1];
                
                const script = await generateScriptFromImage(base64Data);
                setGeneratedScript(script);
            } catch (e) {
                if (e instanceof Error) {
                    setScriptError(`Failed to generate script: ${e.message}`);
                } else {
                    setScriptError('An unknown error occurred while generating the script.');
                }
            } finally {
                setIsGeneratingScript(false);
                cleanup();
            }
        };

        video.onerror = () => {
            setScriptError("Failed to load video. Please check the file and try again.");
            setIsGeneratingScript(false);
            cleanup();
        }
    } catch(e) {
        if (e instanceof Error) {
            setScriptError(`An error occurred: ${e.message}`);
        } else {
            setScriptError('An unknown error occurred.');
        }
        setIsGeneratingScript(false);
    }
};


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setGeneratedAudioBuffer(null);
      setCustomAudioFile(null);
      setCustomAudioSuccess(null);
      setError(null);
      generateScriptForVideo(file);
    }
  };

  const handleCustomAudioChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCustomAudioFile(file);
    setIsProcessingCustomAudio(true);
    setError(null);
    setGeneratedAudioBuffer(null);
    setTranslatedScript(null);
    setCustomAudioSuccess(null);

    try {
        const arrayBuffer = await file.arrayBuffer();
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        setGeneratedAudioBuffer(audioBuffer);
        setCustomAudioSuccess('Audio processed successfully! You can now preview it below.');
    } catch (e) {
        if (e instanceof Error) {
            setError(`Failed to process audio file: ${e.message}. Please ensure it's a valid audio format.`);
        } else {
            setError('An unknown error occurred while processing the audio file.');
        }
        console.error(e);
    } finally {
        setIsProcessingCustomAudio(false);
    }
  };

  const handleGenerate = useCallback(async () => {
    if (selectedVoice === 'custom' || !generatedScript) {
      setError('A script must be generated and an AI voice selected.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedAudioBuffer(null);
    setTranslatedScript(null);

    try {
      const languageName = LANGUAGE_OPTIONS.find(l => l.value === selectedLanguage)?.label ?? selectedLanguage;
      const translated = await translateScript(generatedScript, languageName);
      setTranslatedScript(translated);

      const audioBase64 = await generateDubbedAudio(translated, selectedVoice, emotion, speed);
      if (audioBase64) {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const decodedBytes = decode(audioBase64);
        const buffer = await decodeAudioData(decodedBytes, audioContext, 24000, 1);
        setGeneratedAudioBuffer(buffer);
      } else {
        throw new Error("Failed to generate audio. The API returned no data.");
      }
    } catch (e) {
      if (e instanceof Error) {
        setError(`An error occurred: ${e.message}`);
      } else {
        setError('An unknown error occurred.');
      }
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [generatedScript, selectedVoice, selectedLanguage, emotion, speed]);

  const handleTtsGenerate = useCallback(async () => {
    if (!ttsText.trim()) {
      setTtsError('Please enter some text to generate speech.');
      return;
    }
    if (ttsSelectedVoice === 'custom') {
      setTtsError('Please select a valid AI voice.');
      return;
    }

    setIsTtsLoading(true);
    setTtsError(null);
    if (ttsAudioUrl) {
      URL.revokeObjectURL(ttsAudioUrl);
    }
    setTtsAudioUrl(null);

    try {
      const audioBase64 = await generateDubbedAudio(ttsText, ttsSelectedVoice, ttsEmotion, ttsSpeed);
      if (audioBase64) {
        const decodedBytes = decode(audioBase64);
        const wavBlob = pcmToWav(decodedBytes, 24000, 1, 16);
        const url = URL.createObjectURL(wavBlob);
        setTtsAudioUrl(url);
      } else {
        throw new Error("Failed to generate audio. The API returned no data.");
      }
    } catch (e) {
      if (e instanceof Error) {
        setTtsError(`An error occurred: ${e.message}`);
      } else {
        setTtsError('An unknown error occurred.');
      }
      console.error(e);
    } finally {
      setIsTtsLoading(false);
    }
  }, [ttsText, ttsSelectedVoice, ttsAudioUrl, ttsEmotion, ttsSpeed]);

  const handleSttFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSttAudioFile(file);
      setSttError(null);
      setSttTranscription(null);
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
  };

  const handleTranscribe = useCallback(async () => {
    if (!sttAudioFile) {
        setSttError('Please upload an audio file to transcribe.');
        return;
    }

    setIsSttLoading(true);
    setSttError(null);
    setSttTranscription(null);

    try {
        const audioBase64 = await blobToBase64(sttAudioFile);
        const transcription = await transcribeAudio(audioBase64, sttAudioFile.type);
        setSttTranscription(transcription);
    } catch (e) {
        if (e instanceof Error) {
            setSttError(`An error occurred: ${e.message}`);
        } else {
            setSttError('An unknown error occurred during transcription.');
        }
        console.error(e);
    } finally {
        setIsSttLoading(false);
    }
  }, [sttAudioFile]);

  const ttsVoiceOptions = VOICE_OPTIONS.filter(v => v.value !== 'custom');

  if (!currentUser) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gray-900 font-sans text-gray-200 flex flex-col items-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-4xl mx-auto relative">
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-3">
            <VoicemintLogo className="w-12 h-12 sm:w-14 sm:h-14" />
            <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
              Voicemint
            </h1>
          </div>
          <p className="text-gray-400 mt-2 text-lg">
            Bring your videos to life with AI-powered voice dubbing.
          </p>
        </header>

        <div className="absolute top-0 right-0 flex items-center gap-3 text-sm">
            <span className="text-gray-400 hidden sm:inline">{currentUser.email}</span>
            <button
                onClick={handleLogout}
                className="p-2 rounded-full hover:bg-gray-700/50 transition-colors"
                aria-label="Logout"
            >
                <LogOutIcon className="w-5 h-5 text-gray-400" />
            </button>
        </div>

        <main className="space-y-6">
          <div className="bg-gray-800/50 p-6 rounded-2xl shadow-lg border border-gray-700">
            <h2 className="text-xl font-bold mb-4 text-purple-300">Step 1: Upload Your Video</h2>
            <div className="flex items-center justify-center w-full">
              <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-800 hover:bg-gray-700 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <FileUploadIcon className="w-10 h-10 mb-3 text-gray-400" />
                  <p className="mb-2 text-sm text-gray-400">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">MP4, MOV, AVI, or other video formats</p>
                  {videoFile && <p className="text-sm text-green-400 mt-2">{videoFile.name}</p>}
                </div>
                <input id="dropzone-file" type="file" className="hidden" accept="video/*" onChange={handleFileChange} />
              </label>
            </div>
          </div>
          
          {videoFile && (
            <>
                <div className="bg-gray-800/50 p-6 rounded-2xl shadow-lg border border-gray-700">
                    <h2 className="text-xl font-bold mb-4 text-purple-300">Step 2: AI Generated Script</h2>
                    {isGeneratingScript && (
                        <div className="flex items-center gap-3 text-gray-400">
                            <LoaderIcon className="w-5 h-5 animate-spin" />
                            <span>Analyzing video and generating script...</span>
                        </div>
                    )}
                    {scriptError && (
                         <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg relative flex items-start gap-3" role="alert">
                            <WarningIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                            <div>
                                <strong className="font-bold">Error: </strong>
                                <span className="block sm:inline">{scriptError}</span>
                            </div>
                        </div>
                    )}
                    {generatedScript !== null && (
                        <div>
                            <label htmlFor="script-editor" className="flex items-center gap-2 text-purple-300 mb-2 font-semibold">
                                <SparklesIcon className="w-5 h-5" />
                                <span>Edit AI Generated Script (or use as a guide for your recording)</span>
                            </label>
                            <textarea
                                id="script-editor"
                                value={generatedScript}
                                onChange={(e) => setGeneratedScript(e.target.value)}
                                className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow appearance-none text-gray-200 italic min-h-[80px]"
                                rows={3}
                                aria-label="AI Generated Script Editor"
                            />
                        </div>
                    )}
                </div>

                <div className="bg-gray-800/50 p-6 rounded-2xl shadow-lg border border-gray-700">
                    <h2 className="text-xl font-bold mb-4 text-purple-300">Step 3: Customize Dubbing</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="language" className="block text-sm font-medium text-gray-300 mb-2">Target Language</label>
                            <select
                                id="language"
                                className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                                value={selectedLanguage}
                                onChange={(e) => setSelectedLanguage(e.target.value)}
                                disabled={selectedVoice === 'custom'}
                                style={{ background: 'url(\'data:image/svg+xml;charset=UTF-8,%3csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%239ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3e%3cpolyline points="6 9 12 15 18 9"%3e%3c/polyline%3e%3c/svg%3e\') right 1rem center/1.5em 1.5em no-repeat, #111827' }}
                            >
                                {LANGUAGE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            {selectedVoice === 'custom' && <p className="text-xs text-gray-500 mt-1">Language selection is disabled for custom audio uploads.</p>}
                        </div>
                        <div>
                            <label htmlFor="voice" className="block text-sm font-medium text-gray-300 mb-2">Select a Voice</label>
                            <select
                                id="voice"
                                className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow appearance-none"
                                value={selectedVoice}
                                onChange={(e) => {
                                    const newVoice = e.target.value as Voice;
                                    setSelectedVoice(newVoice);
                                    setGeneratedAudioBuffer(null);
                                    setCustomAudioFile(null);
                                    setCustomAudioSuccess(null);
                                    setError(null);
                                }}
                                style={{ background: 'url(\'data:image/svg+xml;charset=UTF-8,%3csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%239ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3e%3cpolyline points="6 9 12 15 18 9"%3e%3c/polyline%3e%3c/svg%3e\') right 1rem center/1.5em 1.5em no-repeat, #111827' }}
                            >
                                {VOICE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                     {selectedVoice === 'custom' ? (
                        <div className="mt-6">
                            <label htmlFor="custom-audio-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-800 hover:bg-gray-700 transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <MusicIcon className="w-8 h-8 mb-3 text-gray-400" />
                                    <p className="mb-2 text-sm text-gray-400">
                                        <span className="font-semibold">Click to upload your audio</span> or drag and drop
                                    </p>
                                    <p className="text-xs text-gray-500">MP3, WAV, OGG, etc.</p>
                                    {customAudioFile && <p className="text-sm text-green-400 mt-2">{customAudioFile.name}</p>}
                                </div>
                                <input id="custom-audio-file" type="file" className="hidden" accept="audio/*" onChange={handleCustomAudioChange} />
                            </label>
                            {isProcessingCustomAudio && (
                                <div className="flex items-center justify-center gap-3 text-gray-400 mt-2">
                                    <LoaderIcon className="w-5 h-5 animate-spin" />
                                    <span>Processing custom audio...</span>
                                </div>
                            )}
                            {customAudioSuccess && !isProcessingCustomAudio && (
                                <div className="text-sm text-green-400 mt-2 text-center">
                                    {customAudioSuccess}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="mt-6 space-y-4">
                            <div>
                                <label htmlFor="emotion" className="block text-sm font-medium text-gray-300 mb-2">Emotion</label>
                                <div className="flex items-center gap-3">
                                    <FrownIcon className="w-5 h-5 text-gray-400"/>
                                    <input
                                        id="emotion"
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={emotion}
                                        onChange={(e) => setEmotion(Number(e.target.value))}
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                        disabled={selectedVoice === 'custom'}
                                    />
                                    <SmileIcon className="w-5 h-5 text-gray-400"/>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="speed" className="block text-sm font-medium text-gray-300 mb-2">Speed</label>
                                <div className="flex items-center gap-3">
                                    <TurtleIcon className="w-5 h-5 text-gray-400"/>
                                    <input
                                        id="speed"
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={speed}
                                        onChange={(e) => setSpeed(Number(e.target.value))}
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                        disabled={selectedVoice === 'custom'}
                                    />
                                    <RabbitIcon className="w-5 h-5 text-gray-400"/>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-center">
                    <button
                    onClick={handleGenerate}
                    disabled={isLoading || isGeneratingScript || !generatedScript || !videoFile || selectedVoice === 'custom'}
                    className="flex items-center justify-center gap-2 text-lg font-semibold px-8 py-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg hover:shadow-purple-500/50 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none"
                    >
                    {isLoading ? (
                        <>
                        <LoaderIcon className="w-6 h-6 animate-spin" />
                        Generating Audio...
                        </>
                    ) : selectedVoice === 'custom' ? (
                        'Upload Your Audio Above'
                    ) : (
                        'Generate Dubbed Audio'
                    )}
                    </button>
                </div>
            </>
          )}
          
          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg relative flex items-start gap-3" role="alert">
              <WarningIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
              </div>
            </div>
          )}

          {videoUrl && generatedAudioBuffer && (
            <div className="bg-gray-800/50 p-6 rounded-2xl shadow-lg border border-gray-700 space-y-4">
                <h2 className="text-xl font-bold mb-4 text-purple-300">
                    {selectedVoice === 'custom' ? 'Step 4: Preview Your Custom Dub' : 'Step 4: Preview Your Dubbed Video'}
                </h2>
                 {translatedScript && selectedVoice !== 'custom' && (
                    <div className="bg-gray-900/50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-gray-300 mb-2">Dubbed Script ({LANGUAGE_OPTIONS.find(l => l.value === selectedLanguage)?.label}):</h3>
                        <p className="text-gray-400 italic">"{translatedScript}"</p>
                    </div>
                )}
                <Player videoUrl={videoUrl} audioBuffer={generatedAudioBuffer} />
            </div>
          )}

          <div className="bg-gray-800/50 p-6 rounded-2xl shadow-lg border border-gray-700 space-y-4">
            <h2 className="flex items-center gap-3 text-xl font-bold text-purple-300">
                <Volume2Icon className="w-6 h-6" />
                Text-to-Speech Generator
            </h2>
            
            <div>
              <label htmlFor="tts-text" className="block text-sm font-medium text-gray-300 mb-2">Enter Text</label>
              <textarea
                id="tts-text"
                value={ttsText}
                onChange={(e) => setTtsText(e.target.value)}
                className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow appearance-none text-gray-200"
                rows={4}
                placeholder="Type anything you want to hear..."
              />
            </div>

            <div className="space-y-4">
                <div>
                    <label htmlFor="tts-emotion" className="block text-sm font-medium text-gray-300 mb-2">Emotion</label>
                    <div className="flex items-center gap-3">
                        <FrownIcon className="w-5 h-5 text-gray-400"/>
                        <input
                            id="tts-emotion"
                            type="range"
                            min="0"
                            max="100"
                            value={ttsEmotion}
                            onChange={(e) => setTtsEmotion(Number(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                        />
                        <SmileIcon className="w-5 h-5 text-gray-400"/>
                    </div>
                </div>
                <div>
                    <label htmlFor="tts-speed" className="block text-sm font-medium text-gray-300 mb-2">Speed</label>
                    <div className="flex items-center gap-3">
                        <TurtleIcon className="w-5 h-5 text-gray-400"/>
                        <input
                            id="tts-speed"
                            type="range"
                            min="0"
                            max="100"
                            value={ttsSpeed}
                            onChange={(e) => setTtsSpeed(Number(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                        />
                        <RabbitIcon className="w-5 h-5 text-gray-400"/>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
              <div>
                <label htmlFor="tts-voice" className="block text-sm font-medium text-gray-300 mb-2">Select a Voice</label>
                <select
                  id="tts-voice"
                  className="w-full p-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow appearance-none"
                  value={ttsSelectedVoice}
                  onChange={(e) => setTtsSelectedVoice(e.target.value as Voice)}
                  style={{ background: 'url(\'data:image/svg+xml;charset=UTF-8,%3csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%239ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3e%3cpolyline points="6 9 12 15 18 9"%3e%3c/polyline%3e%3c/svg%3e\') right 1rem center/1.5em 1.5em no-repeat, #111827' }}
                >
                  {ttsVoiceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleTtsGenerate}
                disabled={isTtsLoading || !ttsText.trim()}
                className="w-full flex items-center justify-center gap-2 text-md font-semibold px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg hover:shadow-purple-500/50 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none"
              >
                {isTtsLoading ? (
                  <>
                    <LoaderIcon className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Speech'
                )}
              </button>
            </div>
            
            {ttsError && (
              <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg relative flex items-start gap-3 mt-4" role="alert">
                <WarningIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="font-bold">Error: </strong>
                  <span className="block sm:inline">{ttsError}</span>
                </div>
              </div>
            )}

            {ttsAudioUrl && !isTtsLoading && (
              <div className="mt-4">
                <h3 className="text-lg font-semibold text-gray-300 mb-2">Generated Audio:</h3>
                <audio controls src={ttsAudioUrl} className="w-full">
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}
          </div>

          <div className="bg-gray-800/50 p-6 rounded-2xl shadow-lg border border-gray-700 space-y-4">
            <h2 className="flex items-center gap-3 text-xl font-bold text-purple-300">
                <MicIcon className="w-6 h-6" />
                Speech-to-Text Transcription
            </h2>

            <div>
              <label htmlFor="stt-audio-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-800 hover:bg-gray-700 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <FileUploadIcon className="w-8 h-8 mb-3 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-400">
                          <span className="font-semibold">Click to upload audio</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">MP3, WAV, OGG, etc.</p>
                      {sttAudioFile && <p className="text-sm text-green-400 mt-2">{sttAudioFile.name}</p>}
                  </div>
                  <input id="stt-audio-file" type="file" className="hidden" accept="audio/*" onChange={handleSttFileChange} />
              </label>
            </div>

            <div className="flex justify-center">
              <button
                onClick={handleTranscribe}
                disabled={isSttLoading || !sttAudioFile}
                className="w-full md:w-auto flex items-center justify-center gap-2 text-md font-semibold px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg hover:shadow-purple-500/50 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none"
              >
                {isSttLoading ? (
                  <>
                    <LoaderIcon className="w-5 h-5 animate-spin" />
                    Transcribing...
                  </>
                ) : (
                  'Transcribe Audio'
                )}
              </button>
            </div>
            
            {sttError && (
              <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg relative flex items-start gap-3 mt-4" role="alert">
                <WarningIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="font-bold">Error: </strong>
                  <span className="block sm:inline">{sttError}</span>
                </div>
              </div>
            )}

            {sttTranscription && !isSttLoading && (
              <div className="mt-4 bg-gray-900/50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-300 mb-2">Transcription Result:</h3>
                <p className="text-gray-200 whitespace-pre-wrap">{sttTranscription}</p>
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  );
};

export default App;
