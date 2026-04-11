import { useState, useRef, useCallback, useEffect } from 'react';

export type RecordingMode = 'camera' | 'screen';
export type RecordingState = 'idle' | 'preview' | 'recording' | 'paused' | 'recorded';

interface UseMediaRecorderOptions {
  mode: RecordingMode;
}

interface UseMediaRecorderResult {
  state: RecordingState;
  stream: MediaStream | null;
  recordedBlob: Blob | null;
  recordedUrl: string | null;
  duration: number;
  error: Error | null;
  startPreview: () => Promise<void>;
  startRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => void;
  discardRecording: () => void;
  stopPreview: () => void;
}

function getSupportedMimeType(): string {
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return 'video/webm';
}

export function useMediaRecorder({ mode }: UseMediaRecorderOptions): UseMediaRecorderResult {
  const [state, setState] = useState<RecordingState>('idle');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }
  }, [recordedUrl]);

  useEffect(() => {
    return () => {
      cleanup();
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cleanup, stream]);

  const startPreview = useCallback(async () => {
    setError(null);
    cleanup();

    try {
      let mediaStream: MediaStream;

      if (mode === 'camera') {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: true,
        });
      } else {
        mediaStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: true,
        });
      }

      setStream(mediaStream);
      setState('preview');
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to access media'));
      setState('idle');
    }
  }, [mode, cleanup]);

  const startRecording = useCallback(() => {
    if (!stream) return;

    chunksRef.current = [];
    const mimeType = getSupportedMimeType();

    const mediaRecorder = new MediaRecorder(stream, { mimeType });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setRecordedBlob(blob);
      setRecordedUrl(url);
      setState('recorded');
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(1000);
    startTimeRef.current = Date.now();

    durationIntervalRef.current = window.setInterval(() => {
      setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    setState('recording');
    setDuration(0);
  }, [stream]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      setState('paused');
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      const pausedDuration = duration;
      startTimeRef.current = Date.now() - pausedDuration * 1000;

      durationIntervalRef.current = window.setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      setState('recording');
    }
  }, [duration]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    }
  }, []);

  const discardRecording = useCallback(() => {
    cleanup();
    setRecordedBlob(null);
    setRecordedUrl(null);
    setDuration(0);
    chunksRef.current = [];
    setState(stream ? 'preview' : 'idle');
  }, [cleanup, stream]);

  const stopPreview = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    cleanup();
    setStream(null);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setDuration(0);
    setState('idle');
  }, [stream, cleanup]);

  return {
    state,
    stream,
    recordedBlob,
    recordedUrl,
    duration,
    error,
    startPreview,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    discardRecording,
    stopPreview,
  };
}
