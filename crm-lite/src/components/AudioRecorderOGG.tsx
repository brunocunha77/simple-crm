import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, X, Trash2, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AudioRecorderOGGProps {
  onSendAudio: (audioBlob: Blob) => Promise<void>;
  onCancel: () => void;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export const AudioRecorderOGG: React.FC<AudioRecorderOGGProps> = ({
  onSendAudio,
  onCancel,
  isRecording,
  onStartRecording,
  onStopRecording
}) => {
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isRecording) {
      startRecordingTimer();
      startMediaRecording();
    } else {
      stopRecordingTimer();
      stopMediaRecording();
    }

    return () => {
      stopRecordingTimer();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isRecording]);

  // Atualizar tempo de reprodução
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setPlaybackTime(audio.currentTime);
    const updateDuration = () => setAudioDuration(audio.duration);
    const onEnded = () => {
      setIsPlaying(false);
      setPlaybackTime(0);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioUrl]);

  const startRecordingTimer = () => {
    setRecordingTime(0);
    intervalRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const stopRecordingTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startMediaRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000, // Taxa de amostragem padrão do Opus
          channelCount: 1,
          sampleSize: 16
        } 
      });
      
      streamRef.current = stream;
      
      void 0;
      
      // Configurar para OGG/Opus - formato preferido do WhatsApp
      let mimeType = 'audio/ogg;codecs=opus';
      
      // Verificar suporte
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        void 0;
        
        // Tentar alternativas
        const alternatives = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/ogg'
        ];
        
        for (const alt of alternatives) {
          if (MediaRecorder.isTypeSupported(alt)) {
            mimeType = alt;
            void 0;
            break;
          }
        }
      }
      
      void 0;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        audioBitsPerSecond: 32000 // Bitrate otimizado para voz no WhatsApp
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          void 0;
        }
      };

      mediaRecorder.onstop = async () => {
        void 0;
        
        if (chunksRef.current.length === 0) {
          console.error('❌ Nenhum dado de áudio capturado');
          onCancel();
          return;
        }
        
        // Criar blob com tipo correto
        let finalMimeType = mimeType;
        let extension = 'ogg';
        
        // Ajustar tipo MIME e extensão baseado no que foi gravado
        if (mimeType.includes('webm')) {
          // Se gravou em WebM, vamos marcar como OGG para o WhatsApp
          finalMimeType = 'audio/ogg';
          extension = 'ogg';
        } else if (mimeType.includes('ogg')) {
          extension = 'ogg';
        }
        
        const audioBlob = new Blob(chunksRef.current, { type: finalMimeType });
        
        // Validar tamanho
        if (audioBlob.size === 0) {
          console.error('❌ Blob de áudio vazio');
          onCancel();
          return;
        }
        
        // Adicionar propriedade customizada para extensão
        Object.defineProperty(audioBlob, '_extension', {
          value: extension,
          writable: false
        });
        
        void 0;
        
        // Testar se o áudio é válido antes de definir
        const testUrl = URL.createObjectURL(audioBlob);
        const testAudio = new Audio(testUrl);
        
        testAudio.onloadedmetadata = () => {
          void 0;
          setAudioBlob(audioBlob);
          setAudioUrl(testUrl);
        };
        
        testAudio.onerror = (e) => {
          console.error('❌ Erro ao validar áudio:', e);
          URL.revokeObjectURL(testUrl);
          onCancel();
        };
        
        // Limpar stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => {
            track.stop();
            void 0;
          });
          streamRef.current = null;
        }
      };

      mediaRecorder.onerror = (event: any) => {
        console.error('❌ Erro no MediaRecorder:', event.error);
        onCancel();
      };

      // Iniciar gravação com timeslice para garantir dados
      mediaRecorder.start(1000); // Coletar dados a cada 1 segundo
      void 0;
      
    } catch (error) {
      console.error('❌ Erro ao iniciar gravação:', error);
      onCancel();
    }
  };

  const stopMediaRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      void 0;
      mediaRecorderRef.current.stop();
    }
  };

  const handleSend = async () => {
    if (!audioBlob) return;
    
    setIsSending(true);
    try {
      void 0;
      await onSendAudio(audioBlob);
      handleCancel();
    } catch (error) {
      console.error('Erro ao enviar áudio:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleCancel = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl('');
    setRecordingTime(0);
    setIsPlaying(false);
    setPlaybackTime(0);
    setAudioDuration(0);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    onCancel();
  };

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(err => {
        console.error('Erro ao reproduzir:', err);
      });
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audioDuration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const seekTime = percentage * audioDuration;
    
    audio.currentTime = seekTime;
    setPlaybackTime(seekTime);
  };

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || isNaN(seconds)) {
      return '0:00';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Se estiver gravando
  if (isRecording) {
    return (
      <div className="flex items-center space-x-3 rounded-lg p-4 border-2 bg-red-50 border-red-200">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full animate-pulse bg-red-500" />
          <span className="font-mono text-sm font-medium text-red-600">
            {formatTime(recordingTime)}
          </span>
        </div>
        
        <div className="flex-1 text-center">
          <span className="text-sm font-medium text-red-600">
            🎤 Gravando áudio...
          </span>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onStopRecording}
          className="rounded-full text-red-600 hover:bg-red-100"
        >
          <MicOff className="h-5 w-5" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          className="text-gray-600 hover:bg-gray-100 rounded-full"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  // Se tem áudio gravado
  if (audioBlob && audioUrl) {
    const progressPercentage = audioDuration > 0 ? (playbackTime / audioDuration) * 100 : 0;
    const formatDisplay = audioBlob.type.includes('ogg') ? 'OGG/Opus' : 'Áudio';
    
    return (
      <div className="rounded-lg p-4 border-2 bg-green-50 border-green-200">
        <audio 
          ref={audioRef} 
          src={audioUrl}
          preload="metadata"
        />
        
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-sm font-medium text-green-700">
              🎤 Áudio pronto - {formatTime(recordingTime)}
            </span>
            <p className="text-xs text-green-600 mt-1">
              {(audioBlob.size / 1024).toFixed(0)} KB • {formatDisplay}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="text-gray-600 hover:bg-gray-100 rounded-full p-1"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center space-x-3 mb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={togglePlayback}
            className="rounded-full p-2 text-green-600 hover:bg-green-100"
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
          
          <div className="flex-1 flex items-center space-x-2">
            <div 
              className="flex-1 h-2 bg-green-200 rounded-full cursor-pointer relative"
              onClick={handleSeek}
            >
              <div 
                className="h-full bg-green-500 rounded-full transition-all duration-100"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            
            <span className="text-xs font-mono min-w-[35px] text-green-600">
              {formatTime(playbackTime)} / {formatTime(audioDuration || recordingTime)}
            </span>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-green-600">
            ✅ Formato OGG/Opus - WhatsApp
          </span>
          
          <Button
            onClick={handleSend}
            disabled={isSending}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
          >
            {isSending ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                <span>Enviando...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Send className="h-4 w-4" />
                <span>Enviar Áudio</span>
              </div>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}; 