import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AudioPlayerSimplesProps {
  audioUrl: string;
  isOwn?: boolean;
}

export const AudioPlayerSimples: React.FC<AudioPlayerSimplesProps> = ({ audioUrl, isOwn = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string>('');
  const audioRef = useRef<HTMLAudioElement>(null);
  const retryCount = useRef(0);

  // Detectar formato
  const getAudioFormat = (url: string): string => {
    const match = url.match(/\.(\w+)(?:\?|$)/);
    return match ? match[1].toLowerCase() : 'unknown';
  };

  const audioFormat = getAudioFormat(audioUrl);

  // Tentar carregar áudio
  const loadAudio = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    void 0;
    
    setIsLoading(true);
    setHasError(false);
    setErrorDetails('');

    // Adicionar timeout
    const timeout = setTimeout(() => {
      if (isLoading) {
        void 0;
        setHasError(true);
        setErrorDetails('Tempo limite excedido ao carregar áudio');
        setIsLoading(false);
      }
    }, 10000); // 10 segundos

    // Resetar e tentar carregar
    audio.load();

    // Limpar timeout quando carregar
    audio.oncanplay = () => {
      clearTimeout(timeout);
      setIsLoading(false);
    };
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      void 0;
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleError = (e: Event) => {
      const errorTypes: Record<number, string> = {
        1: 'Carregamento abortado',
        2: 'Erro de rede - verifique CORS',
        3: 'Erro ao decodificar áudio',
        4: 'Formato não suportado pelo navegador'
      };
      
      const errorCode = audio.error?.code || 0;
      const errorMsg = errorTypes[errorCode] || 'Erro desconhecido';
      
      console.error('❌ Erro no áudio:', {
        code: errorCode,
        message: errorMsg,
        format: audioFormat,
        url: audioUrl,
        readyState: audio.readyState,
        networkState: audio.networkState
      });
      
      setHasError(true);
      setErrorDetails(errorMsg);
      setIsLoading(false);
    };

    const handleCanPlay = () => {
      void 0;
      setIsLoading(false);
    };

    const handleWaiting = () => {
      void 0;
      setIsLoading(true);
    };

    const handleStalled = () => {
      void 0;
    };

    // Adicionar todos os listeners
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('stalled', handleStalled);

    // Tentar carregar
    loadAudio();

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('stalled', handleStalled);
    };
  }, [audioUrl]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || hasError) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        // Tentar diferentes abordagens
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              void 0;
              setIsPlaying(true);
            })
            .catch(error => {
              console.error('❌ Erro ao reproduzir:', error);
              
              // Se for erro de interação, pedir ao usuário clicar novamente
              if (error.name === 'NotAllowedError') {
                setErrorDetails('Clique novamente para reproduzir');
              } else {
                setHasError(true);
                setErrorDetails(error.message);
              }
            });
        }
      }
    } catch (error) {
      console.error('❌ Erro ao controlar reprodução:', error);
      setHasError(true);
    }
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (audio) {
      setCurrentTime(audio.currentTime);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleRetry = () => {
    retryCount.current += 1;
    void 0;
    loadAudio();
  };

  const formatTime = (time: number): string => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Estado de erro
  if (hasError) {
    return (
      <div className={`flex items-center space-x-2 p-3 rounded-lg max-w-[320px] ${
        isOwn ? 'bg-red-500 text-white' : 'bg-red-100 text-red-700'
      }`}>
        <AlertCircle className="h-5 w-5" />
        <div className="flex-1">
          <p className="text-sm font-medium">Erro ao carregar áudio</p>
          <p className="text-xs opacity-75">{errorDetails}</p>
          <p className="text-xs opacity-75 mt-1">Formato: {audioFormat.toUpperCase()}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRetry}
          className="p-1"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 p-2 rounded-lg max-w-[280px] ${
      isOwn ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800'
    }`}>
      {/* Audio element sempre presente */}
      <audio 
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        preload="metadata"
        crossOrigin="anonymous" // Tentar resolver CORS
      />
      
      <Button
        variant="ghost"
        size="sm"
        onClick={togglePlay}
        disabled={isLoading}
        className={`rounded-full p-0 h-8 w-8 ${
          isOwn 
            ? 'hover:bg-blue-600 text-white border-white border' 
            : 'hover:bg-gray-200 text-gray-700 border-gray-400 border'
        }`}
      >
        {isLoading ? (
          <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
        ) : isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4 ml-0.5" />
        )}
      </Button>

      <div className="flex-1 flex flex-col space-y-1">
        <div className="flex items-center justify-center h-6">
          {[...Array(20)].map((_, i) => {
            const barProgress = (i / 20) * 100;
            const isActive = barProgress <= progressPercentage;
            const barHeight = 4 + Math.sin(i * 0.8) * 8;
            
            return (
              <div
                key={i}
                className={`w-1 mx-0.5 rounded-full transition-all duration-200 ${
                  isLoading 
                    ? (isOwn ? 'bg-blue-300' : 'bg-gray-200')
                    : isActive 
                      ? (isOwn ? 'bg-white' : 'bg-blue-500')
                      : (isOwn ? 'bg-blue-300' : 'bg-gray-300')
                }`}
                style={{ height: `${Math.max(barHeight, 6)}px` }}
              />
            );
          })}
        </div>
        
        <div className="flex justify-between items-center">
          <span className={`text-xs font-mono ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
            {formatTime(currentTime)}
          </span>
          <span className={`text-xs ${isOwn ? 'text-blue-200' : 'text-gray-400'}`}>
            {audioFormat.toUpperCase()}
            {isLoading && ' 🔄'}
          </span>
          <span className={`text-xs font-mono ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
            {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}; 