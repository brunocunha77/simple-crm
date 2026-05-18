import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, X, Trash2, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AudioRecorderProps {
  onSendAudio: (audioBlob: Blob) => Promise<void>;
  onCancel: () => void;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
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
          sampleRate: 44100
        } 
      });
      
      // 🎯 NOVA ESTRATÉGIA: MP4/AAC para máxima compatibilidade
      void 0;
      
      // Ordem de preferência: MP4 > WebM > OGG (universalidade first)
      const formatosCompatibilidade = [
        { mime: 'audio/mp4', nome: 'MP4/AAC', whatsappCompatible: true, universal: true },
        { mime: 'audio/webm;codecs=opus', nome: 'WebM+Opus', whatsappCompatible: true, universal: false },
        { mime: 'audio/webm', nome: 'WebM', whatsappCompatible: true, universal: false },
        { mime: 'audio/ogg;codecs=opus', nome: 'OGG+Opus', whatsappCompatible: true, universal: false },
        { mime: 'audio/ogg', nome: 'OGG', whatsappCompatible: true, universal: false }
      ];
      
      let formatoSelecionado = null;
      
      void 0;
      for (const formato of formatosCompatibilidade) {
        const suportado = MediaRecorder.isTypeSupported(formato.mime);
        const compatibilidade = formato.whatsappCompatible ? '✅' : '❌';
        const universalidade = formato.universal ? '🌍 Universal' : '⚠️ Limitado';
        
        void 0;
        
        if (suportado && !formatoSelecionado) {
          formatoSelecionado = formato;
        }
      }
      
      if (!formatoSelecionado) {
        throw new Error('❌ NENHUM formato de áudio suportado pelo navegador');
      }
      
      void 0;
      void 0;
      void 0;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: formatoSelecionado.mime
      });
      
      // Validação do formato real usado
      void 0;
      void 0;
      void 0;
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // 🎯 CRIAR BLOB OTIMIZADO PARA COMPATIBILIDADE
        const blob = new Blob(chunksRef.current, { type: formatoSelecionado.mime });
        
        void 0;
        void 0;
        void 0;
        void 0;
        void 0;
        void 0;
        void 0;
        
        // Determinar extensão baseada no formato
        let extension = '.mp3'; // padrão universal
        let willWorkInWhatsApp = true;
        
        if (blob.type.includes('mp4')) {
          extension = '.mp4';
          willWorkInWhatsApp = true;
        } else if (blob.type.includes('webm')) {
          extension = '.webm'; 
          willWorkInWhatsApp = true;
        } else if (blob.type.includes('ogg')) {
          extension = '.ogg';
          willWorkInWhatsApp = true; // mas pode ter problemas de compatibilidade
        }
        
        void 0;
        
        if (willWorkInWhatsApp && formatoSelecionado.universal) {
          void 0;
        } else if (willWorkInWhatsApp) {
          void 0;
        } else {
          void 0;
        }
        
        // Validação de duração
        if (recordingTime < 1) {
          void 0;
        }
        
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        
        // Parar stream
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
    } catch (error) {
      console.error('❌ Erro ao iniciar gravação:', error);
      onCancel();
    }
  };

  const stopMediaRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleSendAudio = async () => {
    if (!audioBlob) return;
    
    setIsSending(true);
    try {
      await onSendAudio(audioBlob);
      handleCancel(); // Limpar após enviar
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
    onCancel();
  };

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
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
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Se estiver gravando
  if (isRecording) {
    const isShort = recordingTime < 3;
    
    return (
      <div className={`flex items-center space-x-3 rounded-lg p-4 border-2 ${
        isShort 
          ? 'bg-yellow-50 border-yellow-300' 
          : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full animate-pulse ${
            isShort ? 'bg-yellow-500' : 'bg-red-500'
          }`} />
          <span className={`font-mono text-sm font-medium ${
            isShort ? 'text-yellow-700' : 'text-red-600'
          }`}>
            {formatTime(recordingTime)}
          </span>
        </div>
        
        <div className="flex-1 text-center">
          <span className={`text-sm font-medium ${
            isShort ? 'text-yellow-700' : 'text-red-600'
          }`}>
            🎤 Gravando áudio...
          </span>
          {isShort && (
            <p className="text-xs text-yellow-600 mt-1">
              ⏱️ Grave pelo menos 3s para melhor compatibilidade WhatsApp
            </p>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onStopRecording}
          className={`rounded-full ${
            isShort 
              ? 'text-yellow-600 hover:bg-yellow-100' 
              : 'text-red-600 hover:bg-red-100'
          }`}
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

  // Se tem áudio gravado para reproduzir/enviar
  if (audioBlob && audioUrl) {
    const progressPercentage = audioDuration > 0 ? (playbackTime / audioDuration) * 100 : 0;
    const isShortAudio = recordingTime < 3;
    
    return (
      <div className={`rounded-lg p-4 border-2 ${
        isShortAudio 
          ? 'bg-yellow-50 border-yellow-300' 
          : 'bg-blue-50 border-blue-200'
      }`}>
        <audio 
          ref={audioRef} 
          src={audioUrl}
          preload="metadata"
        />
        
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className={`text-sm font-medium ${
              isShortAudio ? 'text-yellow-700' : 'text-blue-700'
            }`}>
              🎤 Áudio gravado - {formatTime(recordingTime)}
            </span>
            {isShortAudio && (
              <p className="text-xs text-yellow-600 mt-1">
                ⚠️ Áudio curto - WhatsApp pode ter problemas de compatibilidade
              </p>
            )}
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
        
        {/* Player Controls */}
        <div className="flex items-center space-x-3 mb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={togglePlayback}
            className={`rounded-full p-2 ${
              isShortAudio 
                ? 'text-yellow-600 hover:bg-yellow-100' 
                : 'text-blue-600 hover:bg-blue-100'
            }`}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
          
          <div className="flex-1 flex items-center space-x-2">
            <div 
              className={`flex-1 h-2 rounded-full cursor-pointer relative ${
                isShortAudio ? 'bg-yellow-200' : 'bg-blue-200'
              }`}
              onClick={handleSeek}
            >
              <div 
                className={`h-full rounded-full transition-all duration-100 ${
                  isShortAudio ? 'bg-yellow-500' : 'bg-blue-500'
                }`}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            
            <span className={`text-xs font-mono min-w-[35px] ${
              isShortAudio ? 'text-yellow-600' : 'text-blue-600'
            }`}>
              {formatTime(playbackTime)} / {formatTime(audioDuration)}
            </span>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <span className={`text-sm ${
            isShortAudio ? 'text-yellow-600' : 'text-blue-600'
          }`}>
            {isShortAudio 
              ? '⚠️ Teste o áudio antes de enviar'
              : '⚡ Clique em reproduzir para ouvir antes de enviar'
            }
          </span>
          
          <Button
            onClick={handleSendAudio}
            disabled={isSending}
            className={`px-4 py-2 rounded-lg ${
              isShortAudio
                ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isSending ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                <span>Enviando...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Send className="h-4 w-4" />
                <span>{isShortAudio ? 'Enviar Mesmo Assim' : 'Enviar Áudio'}</span>
              </div>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}; 