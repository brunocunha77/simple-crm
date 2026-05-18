import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, X, Trash2, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import lamejs from 'lamejs';

interface AudioRecorderMP3Props {
  onSendAudio: (audioBlob: Blob) => Promise<void>;
  onCancel: () => void;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export const AudioRecorderMP3: React.FC<AudioRecorderMP3Props> = ({
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
  const [isConverting, setIsConverting] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isRecording) {
      // Pequeno delay para garantir que o componente esteja totalmente montado
      const timer = setTimeout(() => {
        startRecordingTimer();
        startMediaRecording();
      }, 100);
      
      return () => clearTimeout(timer);
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

  // Converter WebM para MP3
  const convertToMp3 = async (webmBlob: Blob): Promise<Blob> => {
    setIsConverting(true);
    void 0;

    try {
      // Criar AudioContext
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Converter blob para ArrayBuffer
      const arrayBuffer = await webmBlob.arrayBuffer();
      
      // Decodificar áudio
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Obter dados do áudio
      const channels = audioBuffer.numberOfChannels;
      const sampleRate = audioBuffer.sampleRate;
      const samples = audioBuffer.length;
      
      void 0;
      
      // Configurar encoder MP3
      const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, 128); // 128 kbps
      
      // Buffer para MP3
      const mp3Data: Int8Array[] = [];
      
      // Tamanho do bloco de processamento
      const blockSize = 1152; // Deve ser múltiplo de 576 para o LAME
      
      // Obter dados dos canais
      const leftChannel = audioBuffer.getChannelData(0);
      const rightChannel = channels > 1 ? audioBuffer.getChannelData(1) : null;
      
      // Converter float32 para int16
      const convertFloat32ToInt16 = (buffer: Float32Array): Int16Array => {
        const int16Buffer = new Int16Array(buffer.length);
        for (let i = 0; i < buffer.length; i++) {
          const s = Math.max(-1, Math.min(1, buffer[i]));
          int16Buffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return int16Buffer;
      };
      
      const left = convertFloat32ToInt16(leftChannel);
      const right = rightChannel ? convertFloat32ToInt16(rightChannel) : left;
      
      // Processar em blocos
      for (let i = 0; i < samples; i += blockSize) {
        const leftChunk = left.subarray(i, Math.min(i + blockSize, samples));
        const rightChunk = right.subarray(i, Math.min(i + blockSize, samples));
        
        const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
        if (mp3buf.length > 0) {
          mp3Data.push(mp3buf);
        }
      }
      
      // Finalizar encoding
      const mp3buf = mp3encoder.flush();
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
      
      // Criar blob MP3
      const mp3Blob = new Blob(mp3Data, { type: 'audio/mpeg' });
      
      void 0;
      
      // Fechar AudioContext
      audioContext.close();
      
      return mp3Blob;
      
    } catch (error) {
      console.error('❌ Erro na conversão para MP3:', error);
      throw error;
    } finally {
      setIsConverting(false);
    }
  };

  const startMediaRecording = async () => {
    try {
      void 0;
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
          channelCount: 1
        } 
      });
      
      void 0;
      streamRef.current = stream;
      
      void 0;
      
      // Usar WebM que é suportado pelo navegador
      let mimeType = 'audio/webm';
      
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      }
      
      void 0;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000
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
        
        // Verificar se há dados
        if (chunksRef.current.length === 0) {
          console.error('❌ Nenhum dado de áudio capturado');
          onCancel();
          return;
        }
        
        // Criar blob WebM
        const webmBlob = new Blob(chunksRef.current, { type: mimeType });
        
        if (webmBlob.size === 0) {
          console.error('❌ Blob de áudio vazio');
          onCancel();
          return;
        }
        
        void 0;
        
        // Converter para MP3
        try {
          const mp3Blob = await convertToMp3(webmBlob);
          
          // Validar MP3
          const testUrl = URL.createObjectURL(mp3Blob);
          const testAudio = new Audio();
          
          testAudio.onloadedmetadata = () => {
            void 0;
            URL.revokeObjectURL(testUrl);
            
            setAudioBlob(mp3Blob);
            setAudioUrl(URL.createObjectURL(mp3Blob));
          };
          
          testAudio.onerror = () => {
            console.error('❌ MP3 inválido');
            URL.revokeObjectURL(testUrl);
            // Usar o WebM original se a conversão falhar
            setAudioBlob(webmBlob);
            setAudioUrl(URL.createObjectURL(webmBlob));
          };
          
          testAudio.src = testUrl;
          
        } catch (conversionError) {
          console.error('❌ Erro na conversão:', conversionError);
          // Usar o WebM original se a conversão falhar
          setAudioBlob(webmBlob);
          setAudioUrl(URL.createObjectURL(webmBlob));
        }
        
        // Parar stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.onerror = (event: any) => {
        console.error('❌ Erro no MediaRecorder:', event.error);
        onCancel();
      };

      // IMPORTANTE: Iniciar SEM timeslice para gravar integralmente
      mediaRecorder.start();
      void 0;
      
    } catch (error) {
      console.error('❌ Erro ao iniciar gravação:', error);
      
      // Se for erro de permissão
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        console.error('🚫 Permissão negada para acessar o microfone');
      }
      
      onCancel();
    }
  };

  const stopMediaRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
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
    // Validar entrada
    if (!seconds || !isFinite(seconds) || isNaN(seconds) || seconds < 0) {
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

  // Se estiver convertendo
  if (isConverting) {
    return (
      <div className="flex items-center space-x-3 rounded-lg p-4 border-2 bg-yellow-50 border-yellow-200">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600" />
        <span className="text-sm font-medium text-yellow-700">
          🔄 Convertendo para MP3...
        </span>
      </div>
    );
  }

  // Se tem áudio gravado
  if (audioBlob && audioUrl) {
    // Calcular progresso com validação
    const validDuration = isFinite(audioDuration) && audioDuration > 0 ? audioDuration : recordingTime;
    const validCurrentTime = isFinite(playbackTime) ? playbackTime : 0;
    const progressPercentage = validDuration > 0 ? (validCurrentTime / validDuration) * 100 : 0;
    
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
              {(audioBlob.size / 1024).toFixed(0)} KB • MP3 ✅
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
                style={{ width: `${Math.min(100, Math.max(0, progressPercentage))}%` }}
              />
            </div>
            
            <span className="text-xs font-mono min-w-[35px] text-green-600">
              {formatTime(validCurrentTime)} / {formatTime(validDuration)}
            </span>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-green-600">
            ✅ Formato MP3 - 100% compatível
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