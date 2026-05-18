import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  RotateCcw,
  RotateCw,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AudioPlayerAdvancedProps {
  audioUrl: string;
  isOwn?: boolean;
}

export const AudioPlayerAdvanced: React.FC<AudioPlayerAdvancedProps> = ({ 
  audioUrl, 
  isOwn = false 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [estimatedDuration, setEstimatedDuration] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const blobUrlRef = useRef<string | null>(null);

  // Detectar formato do arquivo
  const getAudioFormat = (url: string): string => {
    const match = url.match(/\.(\w+)(?:\?|$)/);
    return match ? match[1].toLowerCase() : 'unknown';
  };

  const audioFormat = getAudioFormat(audioUrl);
  const isOGG = audioFormat === 'ogg';

  // Função para estimar duração baseada no tamanho do arquivo
  const estimateDurationFromUrl = async (url: string): Promise<number> => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const contentLength = response.headers.get('content-length');
      
      if (contentLength) {
        const sizeInBytes = parseInt(contentLength);
        const sizeInKB = sizeInBytes / 1024;
        
        // Estimativa baseada em diferentes codecs
        // AAC/MP3: ~1MB por minuto
        // Opus: ~0.5MB por minuto
        // WebM: ~0.8MB por minuto
        
        let estimatedSeconds = 0;
        if (audioFormat === 'ogg' || audioFormat === 'opus') {
          estimatedSeconds = (sizeInKB / 8) * 60; // ~8KB por minuto para Opus
        } else if (audioFormat === 'mp3' || audioFormat === 'aac') {
          estimatedSeconds = (sizeInKB / 16) * 60; // ~16KB por minuto para AAC/MP3
        } else {
          estimatedSeconds = (sizeInKB / 12) * 60; // ~12KB por minuto para outros formatos
        }
        
        void 0;
        
        return Math.max(estimatedSeconds, 1); // Mínimo 1 segundo
      }
    } catch (error) {
      void 0;
    }
    return 0;
  };

  useEffect(() => {
    void 0;
    void 0;
    void 0;
    
    if (isOGG) {
      void 0;
    }
    
    // Resetar estados
    setDuration(0);
    setCurrentTime(0);
    setIsReady(false);
    setHasError(false);
    setIsLoading(true);
    setRetryCount(0);
  }, [audioUrl, isOGG, audioFormat]);

  useEffect(() => {
    if (isOGG && retryCount > 2) {
      console.error('❌ Muitas tentativas com formato OGG - desistindo');
      setHasError(true);
      setIsLoading(false);
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    // Limpar blob URL anterior se existir
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    // Para MP3 do Supabase, tentar carregar via fetch e criar blob URL
    // Isso pode resolver problemas de CORS e tipo MIME
    const loadAudioViaBlob = async () => {
      if (audioFormat === 'mp3' && audioUrl.includes('supabase.co') && retryCount === 0) {
        try {
          void 0;
          const response = await fetch(audioUrl, {
            method: 'GET',
            headers: {
              'Accept': 'audio/mpeg, audio/mp3, audio/*, */*'
            }
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const blob = await response.blob();
          const contentType = response.headers.get('content-type') || blob.type;
          
          void 0;

          // Criar blob URL com tipo MIME correto
          blobUrlRef.current = URL.createObjectURL(blob);
          audio.src = blobUrlRef.current;
          audio.load();
          return true; // Indica que usou blob URL
        } catch (fetchError) {
          void 0;
          return false; // Falhou, usar método direto
        }
      }
      return false; // Não é MP3 do Supabase ou não é primeira tentativa
    };

    // Tentar carregar via blob primeiro para MP3 do Supabase
    loadAudioViaBlob().then(usedBlob => {
      if (!usedBlob) {
        // Se não usou blob, configurar src diretamente
        // Configurar crossOrigin para Supabase
        try {
          const urlObj = new URL(audioUrl);
          const isSupabase = urlObj.hostname.includes('supabase.co');
          const isExternal = urlObj.origin !== window.location.origin;
          
          if (isSupabase || isExternal) {
            audio.crossOrigin = 'anonymous';
          } else {
            audio.removeAttribute('crossorigin');
          }
        } catch (e) {
          audio.crossOrigin = 'anonymous';
        }
        
        audio.src = audioUrl;
        audio.load();
      }
    });

    const handleLoadedMetadata = () => {
      void 0;
      
      // Verificar se a duração é válida
      if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
        setIsReady(true);
        setIsLoading(false);
        void 0;
      } else {
        void 0;
        // Tentar estimar duração
        estimateDurationFromUrl(audioUrl).then(estimated => {
          if (estimated > 0) {
            setDuration(estimated);
            setEstimatedDuration(estimated);
            setIsReady(true);
            setIsLoading(false);
            void 0;
          } else {
            console.error('❌ Não foi possível determinar duração');
            setHasError(true);
            setIsLoading(false);
          }
        });
      }
    };

    const handleError = async (e: Event) => {
      const errorCode = audio.error?.code || 0;
      const errorMessages = {
        1: 'Carregamento abortado',
        2: 'Erro de rede',
        3: 'Erro ao decodificar',
        4: 'Formato não suportado'
      };
      
      console.error('❌ Erro no áudio:', {
        code: errorCode,
        message: errorMessages[errorCode] || 'Erro desconhecido',
        format: audioFormat,
        retryCount,
        url: audioUrl,
        error: audio.error,
        readyState: audio.readyState,
        networkState: audio.networkState
      });
      
      // Para MP3 do Supabase, o erro code 4 geralmente é problema de CORS ou headers
      // Verificar se o arquivo está acessível primeiro
      if (retryCount === 0) {
        try {
          const response = await fetch(audioUrl, { method: 'HEAD', mode: 'cors' });
          void 0;
          
          if (!response.ok) {
            console.error('❌ Arquivo não acessível:', response.status);
            setHasError(true);
            setIsLoading(false);
            return;
          }
        } catch (fetchError) {
          console.error('❌ Erro ao verificar arquivo:', fetchError);
        }
      }
      
      // Tentar diferentes abordagens
      if (retryCount < 3) {
        void 0;
        setRetryCount(prev => prev + 1);
        
        setTimeout(() => {
          // Limpar completamente e recarregar
          audio.pause();
          audio.src = '';
          audio.load();
          
          setTimeout(() => {
            // Garantir crossOrigin para Supabase
            try {
              const urlObj = new URL(audioUrl);
              if (urlObj.hostname.includes('supabase.co')) {
                audio.crossOrigin = 'anonymous';
              }
            } catch (e) {
              // Ignorar erro de parse
            }
            
            audio.src = audioUrl;
            audio.load();
          }, 200);
        }, 1000);
      } else {
        console.error('❌ Todas as tentativas falharam. Verifique:');
        console.error('1. CORS está configurado no Supabase Storage?');
        console.error('2. O arquivo existe e está acessível?');
        console.error('3. O tipo MIME está correto (audio/mpeg)?');
        setHasError(true);
        setIsReady(false);
        setIsLoading(false);
      }
    };

    const handleCanPlay = () => {
      void 0;
      setIsReady(true);
      setIsLoading(false);
    };

    const handleLoadStart = () => {
      setIsLoading(true);
    };

    const handleCanPlayThrough = () => {
      void 0;
      setIsLoading(false);
    };

    // Adicionar listeners
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('canplaythrough', handleCanPlayThrough);
    audio.addEventListener('error', handleError);

    // Configurar para carregar metadata
    audio.preload = 'metadata';
    
    // Para URLs do Supabase Storage, sempre usar crossOrigin
    // Para outros domínios externos, também usar crossOrigin
    try {
      const urlObj = new URL(audioUrl);
      const isSupabase = urlObj.hostname.includes('supabase.co');
      const isExternal = urlObj.origin !== window.location.origin;
      
      if (isSupabase || isExternal) {
        audio.crossOrigin = 'anonymous';
      } else {
        // Remover crossOrigin para arquivos do mesmo domínio
        audio.removeAttribute('crossorigin');
      }
    } catch (e) {
      // Se não conseguir fazer parse da URL, tentar com crossOrigin para segurança
      audio.crossOrigin = 'anonymous';
    }
    
    // Definir o src após configurar crossOrigin
    audio.src = audioUrl;

    return () => {
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('canplaythrough', handleCanPlayThrough);
      audio.removeEventListener('error', handleError);
      
      // Limpar blob URL se foi criado
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [audioUrl, isOGG, retryCount, audioFormat]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || hasError || !isReady) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        // Para iPhone, pode ser necessário user interaction
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
          await playPromise;
          setIsPlaying(true);
        } else {
          setIsPlaying(true);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao reproduzir:', error);
      
      // Para iPhone, tentar com configurações específicas
      if (error instanceof Error && error.name === 'NotAllowedError') {
        void 0;
        audio.muted = true;
        try {
          await audio.play();
          audio.muted = false;
          setIsPlaying(true);
        } catch (secondError) {
          console.error('❌ Falha na segunda tentativa:', secondError);
          setHasError(true);
        }
      } else {
        setHasError(true);
      }
    }
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (audio && isFinite(audio.currentTime)) {
      setCurrentTime(audio.currentTime);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const progressBar = progressBarRef.current;
    if (!audio || !progressBar || !duration) return;

    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickRatio = clickX / rect.width;
    const seekTime = clickRatio * duration;
    
    audio.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const handlePlaybackRateChange = (rate: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const formatTime = (time: number): string => {
    if (!time || isNaN(time) || !isFinite(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Usar duração estimada se a real não estiver disponível
  const effectiveDuration = (duration && isFinite(duration) && duration > 0) ? duration : estimatedDuration;
  const progressPercentage = effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0;

  // Estado de erro
  if (hasError) {
    return (
      <div className={`relative overflow-hidden rounded-2xl p-4 max-w-[300px] ${
        isOwn 
          ? 'bg-gradient-to-br from-red-500 to-red-600' 
          : 'bg-gradient-to-br from-gray-100 to-gray-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${isOwn ? 'bg-red-400/30' : 'bg-gray-300/50'}`}>
            <Volume2 className={`h-5 w-5 ${isOwn ? 'text-white' : 'text-gray-600'}`} />
          </div>
          <div className="flex-1">
            <p className={`text-sm font-medium ${isOwn ? 'text-white' : 'text-gray-800'}`}>
              Áudio indisponível
            </p>
            <p className={`text-xs ${isOwn ? 'text-red-100' : 'text-gray-600'}`}>
              {isOGG ? 'Formato OGG não suportado' : 'Erro ao carregar áudio'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl p-4 max-w-[350px] transition-all ${
      isOwn 
        ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg' 
        : 'bg-gradient-to-br from-gray-100 to-gray-200 shadow-md'
    }`}>
      {/* Background decorativo */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/20 blur-2xl" />
        <div className="absolute -left-8 -bottom-8 w-32 h-32 rounded-full bg-white/20 blur-2xl" />
      </div>

      {/* Audio element oculto */}
      <audio 
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        preload="metadata"
      />
      
      <div className="relative z-10">
        {/* Header com botão play e ícone */}
        <div className="flex items-center gap-3 mb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={togglePlay}
            disabled={!isReady || hasError || isLoading}
            className={`rounded-full p-0 h-12 w-12 transition-all ${
              isOwn 
                ? 'bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm' 
                : 'bg-gray-800/10 hover:bg-gray-800/20 text-gray-700 backdrop-blur-sm'
            } ${isLoading ? 'animate-pulse' : ''}`}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </Button>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Volume2 className={`h-4 w-4 ${isOwn ? 'text-blue-100' : 'text-gray-500'}`} />
              <span className={`text-sm font-medium ${isOwn ? 'text-white' : 'text-gray-800'}`}>
                Mensagem de voz
              </span>
              {playbackRate !== 1 && (
                <span className={`text-xs px-2 py-1 rounded-full ${
                  isOwn ? 'bg-white/20 text-white' : 'bg-gray-300 text-gray-700'
                }`}>
                  {playbackRate}x
                </span>
              )}
              {estimatedDuration > 0 && !duration && (
                <span className={`text-xs px-2 py-1 rounded-full ${
                  isOwn ? 'bg-white/10 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  ~{formatTime(estimatedDuration)}
                </span>
              )}
            </div>
            
            {/* Tempo */}
            <div className={`text-xs ${isOwn ? 'text-blue-100' : 'text-gray-600'}`}>
              {formatTime(currentTime)} / {formatTime(effectiveDuration)}
            </div>
          </div>

          {/* Botão de configurações */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`rounded-full p-2 ${
                  isOwn 
                    ? 'bg-white/10 hover:bg-white/20 text-white' 
                    : 'bg-gray-800/10 hover:bg-gray-800/20 text-gray-700'
                }`}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handlePlaybackRateChange(0.5)}>
                <RotateCcw className="h-4 w-4 mr-2" />
                0.5x
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handlePlaybackRateChange(0.75)}>
                <RotateCcw className="h-4 w-4 mr-2" />
                0.75x
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handlePlaybackRateChange(1)}>
                <Play className="h-4 w-4 mr-2" />
                1x (Normal)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handlePlaybackRateChange(1.25)}>
                <RotateCw className="h-4 w-4 mr-2" />
                1.25x
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handlePlaybackRateChange(1.5)}>
                <RotateCw className="h-4 w-4 mr-2" />
                1.5x
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handlePlaybackRateChange(2)}>
                <RotateCw className="h-4 w-4 mr-2" />
                2x
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Barra de progresso interativa */}
        <div 
          ref={progressBarRef}
          className="relative h-1.5 bg-black/10 rounded-full cursor-pointer overflow-hidden mb-3"
          onClick={handleProgressClick}
        >
          <div 
            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-100 ${
              isOwn ? 'bg-white/80' : 'bg-gray-700'
            }`}
            style={{ width: `${progressPercentage}%` }}
          />
          
          {/* Indicador de posição */}
          <div 
            className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full shadow-md transition-all duration-100 ${
              isOwn ? 'bg-white' : 'bg-gray-700'
            }`}
            style={{ left: `${progressPercentage}%`, marginLeft: '-6px' }}
          />
        </div>

        {/* Visualizador de ondas estilizado */}
        <div className="flex items-center justify-center gap-0.5 h-8">
          {[...Array(30)].map((_, i) => {
            const isActive = (i / 30) * 100 <= progressPercentage;
            const height = 10 + Math.sin(i * 0.3) * 10 + Math.random() * 5;
            
            return (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-300 ${
                  isActive 
                    ? (isOwn ? 'bg-white/70' : 'bg-gray-700')
                    : (isOwn ? 'bg-white/20' : 'bg-gray-400/30')
                }`}
                style={{ 
                  height: `${isPlaying ? height : 12}px`,
                  transform: isPlaying && isActive ? 'scaleY(1.2)' : 'scaleY(1)'
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};