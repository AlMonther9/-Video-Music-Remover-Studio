'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  UploadCloud, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Video, 
  Sparkles, 
  Volume2, 
  FileVideo,
  Clock,
  ExternalLink,
  SlidersHorizontal,
  ChevronDown,
  Check
} from 'lucide-react';
import { 
  BotanicalVineLeft, 
  BotanicalVineRight, 
  HeaderBotanicalAccent 
} from '@/components/BotanicalIllustrations';
import { 
  OneLineBotanicalFace, 
  OneLineSoundWave, 
  AbstractBotanicalFlourish 
} from '@/components/AbstractLineArt';

interface EnvStatus {
  ffmpeg: { available: boolean; path: string };
  demucs: { available: boolean; message: string };
  isVercel?: boolean;
  isReady: boolean;
}

interface ProcessingJob {
  id: string;
  originalFilename: string;
  fileSize: number;
  mode: 'remove_music' | 'remove_vocals' | 'separate_all';
  modelName: string;
  status: 'queued' | 'extracting_audio' | 'separating_stems' | 'remuxing_video' | 'completed' | 'failed';
  progress: number;
  stepMessage: string;
  videoUrl?: string;
  outputVideoUrl?: string;
  isolatedAudioUrl?: string;
  error?: string;
}

export default function Home() {
  const [envStatus, setEnvStatus] = useState<EnvStatus | null>(null);
  const [loadingEnv, setLoadingEnv] = useState(true);

  // Form State - Always set to 'remove_music'
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [mode] = useState<'remove_music' | 'remove_vocals' | 'separate_all'>('remove_music');
  const [modelName, setModelName] = useState<'htdemucs' | 'htdemucs_ft'>('htdemucs');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);

  // Job & Processing State
  const [currentJob, setCurrentJob] = useState<ProcessingJob | null>(null);
  const [jobHistory, setJobHistory] = useState<ProcessingJob[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active view tab for result
  const [activeTab, setActiveTab] = useState<'clean' | 'original' | 'audio'>('clean');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check Local System Dependencies on Mount
  useEffect(() => {
    checkSystemStatus();
  }, []);

  const checkSystemStatus = async () => {
    setLoadingEnv(true);
    try {
      const res = await fetch('/api/check-env');
      const data: EnvStatus = await res.json();
      setEnvStatus(data);
    } catch (err) {
      console.error('Failed to check environment:', err);
    } finally {
      setLoadingEnv(false);
    }
  };

  // Poll current job status
  useEffect(() => {
    if (!currentJob || currentJob.status === 'completed' || currentJob.status === 'failed') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/job/${currentJob.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.job) {
            setCurrentJob(data.job);
            if (data.job.status === 'completed') {
              setJobHistory((prev) => [data.job, ...prev.filter((j) => j.id !== data.job.id)]);
            }
          }
        }
      } catch (err) {
        console.error('Error polling job status:', err);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [currentJob?.id, currentJob?.status]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type.startsWith('video/') || droppedFile.name.match(/\.(mp4|mov|avi|webm|mkv)$/i)) {
        setFile(droppedFile);
        setErrorMessage(null);
      } else {
        setErrorMessage('الرجاء رفع ملف فيديو بحجم صالح (.mp4, .mov, .avi, .webm, .mkv)');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorMessage(null);
    }
  };

  const handleStartProcessing = async () => {
    if (!file) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('video', file);
    formData.append('mode', mode);
    formData.append('modelName', modelName);

    try {
      const res = await fetch('/api/process-video', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'فشلت عملية البدء والمعالجة');
      }

      setCurrentJob(data.job);
    } catch (err: any) {
      console.error('Submission error:', err);
      setErrorMessage(err.message || 'حدث خطأ غير متوقع أثناء معالجة الفيديو');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ك.ب`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
  };

  const modelOptions = [
    { id: 'htdemucs', label: 'HTDemucs (معالجة سريعة)', desc: 'الأسرع محليًا ومناسب للمقاطع اليومية' },
    { id: 'htdemucs_ft', label: 'HTDemucs FT (أعلى دقة)', desc: 'أطول في المعالجة ولكنه يُقدم أعلى نقاء محتمل' },
  ];

  const currentModelLabel = modelOptions.find(m => m.id === modelName)?.label || 'HTDemucs (معالجة سريعة)';

  return (
    <div className="relative min-h-screen bg-[#F5F2EB] text-[#362A21] font-sans overflow-hidden flex flex-col justify-between">
      
      {/* Top Right Small Privacy & Local Engine Note */}
      <div className="absolute top-6 right-6 sm:right-10 z-20 inline-flex items-center gap-1.5 text-[11px] text-[#82624A]/80">
        <span className="w-1.5 h-1.5 rounded-full bg-[#6B9080]"></span>
        <span>معالجة محليّة بخصوصية تامّة عبر محرك <strong className="font-semibold text-[#362A21]">Meta Demucs AI</strong> و <strong className="font-semibold text-[#362A21]">FFmpeg</strong></span>
      </div>

      {/* Side Botanical Vine Illustrations (Pomegranates & Oranges) */}
      <BotanicalVineLeft />
      <BotanicalVineRight />

      {/* Subtle One-Line Art Accents in Background */}
      <div className="absolute top-12 left-1/4 pointer-events-none opacity-25">
        <OneLineBotanicalFace className="w-32 h-32 text-[#362A21]" />
      </div>
      <div className="absolute bottom-12 right-1/4 pointer-events-none opacity-20">
        <OneLineSoundWave className="w-44 h-14 text-[#82624A]" />
      </div>

      {/* Subtle Background Glows & Pattern */}
      <div className="absolute inset-0 bg-arabesque-pattern pointer-events-none" />
      <div className="bg-glow-clay" />
      <div className="bg-glow-sage" />

      {/* Main Single Screen Content Area */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 flex-1 flex flex-col justify-center">
        
        {/* Single Page Title Block */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10 relative">
          
          {/* Subtle line art flourish behind header */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 pointer-events-none opacity-20">
            <AbstractBotanicalFlourish className="w-20 h-20 text-[#82624A]" />
          </div>

          {/* Botanical Accent Pill */}
          <div className="inline-flex items-center gap-2 mb-3 bg-[#FAF8F5]/90 px-4 py-1 rounded-full border border-[#82624A]/20 shadow-xs backdrop-blur-xs">
            <HeaderBotanicalAccent />
            <span className="text-xs font-semibold text-[#82624A]">keep it halal bro</span>
            <div className="rotate-180">
              <HeaderBotanicalAccent />
            </div>
          </div>

          {/* Warm Title */}
          <h1 className="font-amiri text-4xl sm:text-5xl font-bold text-[#362A21] leading-tight mb-2">
            <span className="text-[#82624A] underline decoration-[#A4C3B2] decoration-wavy decoration-2">إزالة الموسيقى</span> وتصفية الصوت من الفيديو
          </h1>

          <p className="text-[#6B5C50] text-sm sm:text-base leading-relaxed max-w-xl mx-auto">
            عزل الحديث البشري والتخلص من الألحان والموسيقى الخلفية محليًا وبدون تكلفة.
          </p>

          {/* Vercel Showcase Demo Banner */}
          {envStatus?.isVercel && (
            <div className="mt-4 p-3.5 rounded-2xl bg-[#E6BEAE]/30 border border-[#C2847A]/40 text-[#522923] text-xs leading-relaxed max-w-xl mx-auto text-center flex items-center justify-center gap-2 shadow-2xs backdrop-blur-xs">
              <AlertCircle className="w-4 h-4 text-[#C2847A] shrink-0" />
              <span>
                <strong>تنبيه النسخة التجريبية (Vercel Showcase):</strong> تم استضافة هذه الواجهة للعرض المعماري والتصميمي فقط. لمعالجة الفيديوهات وحذف الموسيقى بالفعل عبر AI، يتطلب التطبيق التشغيل محليًا (Localhost) لاستخدام محرك Python & Demucs.
              </span>
            </div>
          )}

        </div>

        {/* Studio Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">

          {/* Left Panel: Options & Upload (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* Mode Selection Card - Dedicated strictly to removing music */}
            <div className="cozy-card rounded-3xl p-6 relative">
              
              {/* Background minimal line art flourish inside card */}
              <div className="absolute -bottom-4 -left-4 pointer-events-none opacity-15">
                <OneLineBotanicalFace className="w-24 h-24 text-[#82624A]" />
              </div>

              <div className="flex items-center justify-between border-b border-[#82624A]/15 pb-3 mb-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#82624A] flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#82624A]" />
                  <span>١. هدف العملية</span>
                </h2>
              </div>

              <div className="space-y-3">
                {/* Fixed Mode: Remove Music / Keep Dialogue */}
                <div className="w-full p-4 rounded-2xl border text-right transition-all flex items-start gap-4 bg-[#A4C3B2]/20 border-[#6B9080] ring-1 ring-[#6B9080]/40 shadow-xs">
                  <div className="p-3 rounded-xl shrink-0 bg-[#6B9080] text-white shadow-xs">
                    <Mic className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs sm:text-sm text-[#362A21] flex items-center gap-2 mb-1">
                      <span>إزالة الموسيقى والألحان (الاحتفاظ بالكلام)</span>
                      <CheckCircle2 className="w-4 h-4 text-[#6B9080] shrink-0" />
                    </div>
                    <p className="text-[11px] sm:text-xs text-[#6B5C50] leading-relaxed">
                      تصفية الفيديو وحذف الموسيقى الخلفية بالكامل للحصول على مقطع بصوت كلام صافٍ ونادٍ.
                    </p>
                  </div>
                </div>
              </div>

              {/* Fully Custom Styled AI Model Selector (No default browser popups) */}
              <div className="mt-5 pt-4 border-t border-[#82624A]/15 flex items-center justify-between gap-3 relative" ref={dropdownRef}>
                <label className="text-xs font-bold text-[#362A21] shrink-0">
                  دقة النموذج المعالج
                </label>

                <div className="relative">
                  {/* Custom Trigger Button */}
                  <button
                    type="button"
                    onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                    className="bg-[#FAF8F5] border border-[#82624A]/30 hover:border-[#82624A] text-xs font-bold rounded-2xl px-3.5 py-2 text-[#362A21] cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-[#82624A]/30 transition-all flex items-center gap-2"
                  >
                    <span>{currentModelLabel}</span>
                    <ChevronDown className={`w-4 h-4 text-[#82624A] transition-transform duration-200 ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Custom Floating Dropdown Menu */}
                  {isModelDropdownOpen && (
                    <div className="absolute left-0 top-full mt-2 w-64 bg-[#FAF8F5] border-2 border-[#82624A]/30 rounded-2xl p-2 shadow-xl z-50 backdrop-blur-md animate-in fade-in slide-in-from-top-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#82624A] px-2 py-1 border-b border-[#82624A]/10 mb-1">
                        اختر دقة عزل الصوت
                      </div>
                      
                      <div className="space-y-1">
                        {modelOptions.map((opt) => {
                          const isSelected = opt.id === modelName;
                          return (
                            <div
                              key={opt.id}
                              onClick={() => {
                                setModelName(opt.id as any);
                                setIsModelDropdownOpen(false);
                              }}
                              className={`p-2.5 rounded-xl cursor-pointer transition-all border ${
                                isSelected
                                  ? 'bg-[#A4C3B2]/25 border-[#6B9080] text-[#362A21]'
                                  : 'border-transparent hover:bg-[#EAE4D9]/60 text-[#6B5C50]'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-xs text-[#362A21]">{opt.label}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-[#6B9080] shrink-0" />}
                              </div>
                              <p className="text-[10px] text-[#6B5C50] mt-0.5 leading-snug">
                                {opt.desc}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Video Upload Dropzone */}
            <div className="cozy-card rounded-3xl p-6">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#82624A] mb-3 flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-[#82624A]" />
                <span>٢. اختيار الفيديو</span>
              </h2>

              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-[#6B9080] bg-[#A4C3B2]/20'
                    : file
                    ? 'border-[#6B9080] bg-[#A4C3B2]/10'
                    : 'border-[#82624A]/25 hover:border-[#82624A]/50 bg-[#FAF8F5]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*,.mp4,.mov,.avi,.webm,.mkv"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {file ? (
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-xl bg-[#6B9080]/15 text-[#6B9080] flex items-center justify-center mx-auto shadow-xs">
                      <FileVideo className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-[#362A21] truncate max-w-xs mx-auto">
                        {file.name}
                      </p>
                      <p className="text-[11px] text-[#6B5C50] mt-0.5">
                        {formatFileSize(file.size)} • جاهز للمعالجة
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                      className="text-[11px] text-[#82624A] hover:underline font-semibold"
                    >
                      تغيير الملف
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-xl bg-[#82624A]/10 text-[#82624A] flex items-center justify-center mx-auto">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-[#362A21]">
                        اسحب مقطع الفيديو هنا
                      </p>
                      <p className="text-[11px] text-[#6B5C50] mt-0.5">
                        MP4, MOV, AVI, WEBM, MKV
                      </p>
                    </div>
                    <span className="inline-block px-3.5 py-1 rounded-xl text-xs bg-[#82624A] text-[#F5F2EB] font-semibold">
                      اختر ملفًا
                    </span>
                  </div>
                )}
              </div>

              {errorMessage && (
                <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action Button */}
              <button
                type="button"
                disabled={!file || isSubmitting || currentJob?.status === 'separating_stems'}
                onClick={handleStartProcessing}
                className={`w-full mt-5 py-3.5 px-4 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md ${
                  !file || isSubmitting || currentJob?.status === 'separating_stems'
                    ? 'bg-[#EAE4D9] text-[#A39587] cursor-not-allowed border border-[#82624A]/10'
                    : 'bg-[#82624A] text-[#F5F2EB] hover:bg-[#6E513B] cursor-pointer shadow-[#82624A]/25 active:scale-[0.99]'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#F5F2EB]" />
                    <span>جاري رفع الفيديو...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#A4C3B2]" />
                    <span>بدء معالجة الفيديو وتصفية الصوت</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Panel: Player & Results Studio (7 cols) */}
          <div className="lg:col-span-7 space-y-5">

            {/* Current Active Processing State */}
            {currentJob && (
              <div className="cozy-card rounded-3xl p-6 space-y-5 border-2 border-[#82624A]/20">
                
                <div className="flex items-center justify-between border-b border-[#82624A]/15 pb-3 gap-2">
                  <div className="truncate">
                    <span className="text-[11px] font-bold uppercase text-[#6B9080]">
                      حالة العملية
                    </span>
                    <h3 className="text-sm font-bold text-[#362A21] truncate max-w-xs sm:max-w-md">
                      {currentJob.originalFilename}
                    </h3>
                  </div>

                  <span className={`px-3 py-0.5 rounded-full text-xs font-bold ${
                    currentJob.status === 'completed'
                      ? 'bg-[#A4C3B2]/40 text-[#2C4A3B] border border-[#6B9080]/30'
                      : currentJob.status === 'failed'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : 'bg-[#C9DCE5]/60 text-[#1E3A48] border border-[#C9DCE5] animate-pulse'
                  }`}>
                    {currentJob.status === 'completed' ? 'تمت المعالجة' : currentJob.status === 'failed' ? 'خطأ' : 'جاري العزل...'}
                  </span>
                </div>

                {/* Progress Indicator */}
                {currentJob.status !== 'completed' && currentJob.status !== 'failed' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#362A21] font-semibold flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#82624A]" />
                        <span>{currentJob.stepMessage}</span>
                      </span>
                      <span className="font-mono text-[#82624A] font-bold">{currentJob.progress}%</span>
                    </div>

                    <div className="w-full bg-[#EAE4D9] rounded-full h-3 overflow-hidden p-0.5 border border-[#82624A]/15">
                      <div
                        className="bg-gradient-to-r from-[#6B9080] via-[#A4C3B2] to-[#82624A] h-full rounded-full transition-all duration-500"
                        style={{ width: `${currentJob.progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Completed Results View */}
                {currentJob.status === 'completed' && (
                  <div className="space-y-4">
                    
                    {/* Media Tabs */}
                    <div className="flex flex-wrap items-center gap-2 border-b border-[#82624A]/15 pb-3">
                      <button
                        onClick={() => setActiveTab('clean')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                          activeTab === 'clean'
                            ? 'bg-[#82624A] text-[#F5F2EB]'
                            : 'bg-[#FAF8F5] text-[#6B5C50] border border-[#82624A]/10'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#A4C3B2]" />
                        <span>الفيديو النقي (بدون موسيقى)</span>
                      </button>

                      <button
                        onClick={() => setActiveTab('original')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                          activeTab === 'original'
                            ? 'bg-[#6B9080] text-white'
                            : 'bg-[#FAF8F5] text-[#6B5C50] border border-[#82624A]/10'
                        }`}
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>الفيديو الأصلي</span>
                      </button>

                      <button
                        onClick={() => setActiveTab('audio')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                          activeTab === 'audio'
                            ? 'bg-[#C9DCE5] text-[#362A21]'
                            : 'bg-[#FAF8F5] text-[#6B5C50] border border-[#82624A]/10'
                        }`}
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>الصوت فقط</span>
                      </button>
                    </div>

                    {/* Media Player Container */}
                    <div className="rounded-2xl overflow-hidden bg-[#2D231B] border border-[#82624A]/30 aspect-video relative shadow-inner">
                      {activeTab === 'clean' && currentJob.outputVideoUrl && (
                        <video
                          key={`clean-${currentJob.id}`}
                          src={currentJob.outputVideoUrl}
                          controls
                          playsInline
                          preload="metadata"
                          className="w-full h-full object-contain"
                        />
                      )}

                      {activeTab === 'original' && currentJob.videoUrl && (
                        <video
                          key={`original-${currentJob.id}`}
                          src={currentJob.videoUrl}
                          controls
                          playsInline
                          preload="metadata"
                          className="w-full h-full object-contain"
                        />
                      )}

                      {activeTab === 'audio' && currentJob.isolatedAudioUrl && (
                        <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-[#2D231B] space-y-3">
                          <div className="w-12 h-12 rounded-full bg-[#A4C3B2]/20 text-[#A4C3B2] flex items-center justify-center">
                            <Volume2 className="w-6 h-6" />
                          </div>
                          <p className="text-xs text-[#A4C3B2] font-semibold">المسار الصوتي المعزول</p>
                          <audio src={currentJob.isolatedAudioUrl} controls className="w-full max-w-sm" />
                        </div>
                      )}
                    </div>

                    {/* Download Bar */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-bold text-[#6B9080] flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>اكتملت المعالجة بنجاح</span>
                      </span>

                      {currentJob.outputVideoUrl && (
                        <a
                          href={currentJob.outputVideoUrl}
                          download={`clean_${currentJob.originalFilename}`}
                          className="px-5 py-2.5 rounded-xl bg-[#6B9080] hover:bg-[#58796B] text-[#F5F2EB] font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm"
                        >
                          <Download className="w-4 h-4 text-[#F5F2EB]" />
                          <span>تحميل الفيديو النهائي</span>
                        </a>
                      )}
                    </div>

                  </div>
                )}
              </div>
            )}

            {/* Empty Canvas Placeholder */}
            {!currentJob && (
              <div className="cozy-card rounded-3xl p-10 text-center space-y-3 relative overflow-hidden">
                
                {/* Background minimal sound loop line art */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none opacity-20">
                  <OneLineSoundWave className="w-56 h-12 text-[#82624A]" />
                </div>

                <div className="w-14 h-14 rounded-2xl bg-[#82624A]/10 text-[#82624A] flex items-center justify-center mx-auto shadow-xs">
                  <Video className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-amiri text-2xl font-bold text-[#362A21]">اختر فيديو للبدء</h3>
                  <p className="text-xs text-[#6B5C50] mt-1 max-w-xs mx-auto leading-relaxed">
                    قم برفع الفيديو لتصفية الصوت واستخراج النسخة النقية فورًا.
                  </p>
                </div>
              </div>
            )}

            {/* Job History */}
            {jobHistory.length > 0 && (
              <div className="cozy-card rounded-3xl p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#82624A] mb-3 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#82624A]" />
                  <span>المقاطع المعالجة سابقًا</span>
                </h3>

                <div className="space-y-2">
                  {jobHistory.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setCurrentJob(item)}
                      className={`p-3 rounded-xl border text-right cursor-pointer transition-all flex items-center justify-between ${
                        currentJob?.id === item.id
                          ? 'bg-[#A4C3B2]/20 border-[#6B9080]'
                          : 'bg-[#FAF8F5] border-[#82624A]/15 hover:border-[#82624A]/30'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <FileVideo className="w-4 h-4 text-[#82624A] shrink-0" />
                        <span className="font-bold text-xs text-[#362A21] truncate">
                          {item.originalFilename}
                        </span>
                      </div>

                      {item.outputVideoUrl && (
                        <a
                          href={item.outputVideoUrl}
                          download={`clean_${item.originalFilename}`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 rounded-lg bg-[#82624A] text-[#F5F2EB]"
                          title="تحميل"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Subtle Single Screen Footer Signature */}
      <footer className="relative z-10 text-center py-4 text-[11px] text-[#82624A]/70">
        <a 
          href="https://almonther.studio/"
          target="_blank"
          rel="noreferrer"
          className="hover:underline hover:text-[#82624A] inline-flex items-center gap-1 font-medium"
        >
          <span>المنذر عبد الحفيظ • almonther.studio</span>
          <ExternalLink className="w-3 h-3 opacity-60" />
        </a>
      </footer>

    </div>
  );
}
