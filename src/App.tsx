import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  MessageCircle, 
  Headphones, 
  ChevronRight, 
  Send, 
  Volume2, 
  Sparkles,
  ArrowLeft,
  GraduationCap,
  Globe,
  Languages,
  Bookmark,
  BookmarkCheck,
  Repeat,
  Mic,
  History,
  Trophy,
  Flame,
  Award,
  Footprints,
  MessageSquare,
  User,
  CheckCircle,
  XCircle,
  HelpCircle
} from 'lucide-react';
import Markdown from 'react-markdown';
import { cn } from './lib/utils';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged,
  signOut,
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { 
  LESSONS, 
  chatWithTutor, 
  generateSpeech, 
  translateText,
  DAILY_PHRASE,
  LISTENING_EXERCISES,
  BADGES,
  GRAMMAR_EXERCISES,
  getDynamicQuiz,
  getDynamicGrammar,
  Message, 
  FrenchLevel, 
  FRENCH_LEVELS 
} from './services/frenchService';

type View = 'home' | 'lessons' | 'tutor' | 'lesson-detail' | 'translate' | 'phrasebook' | 'listen' | 'daily' | 'profile' | 'quiz' | 'grammar';

const ALLOWED_EMAILS = [
  "friend1@gmail.com", 
  "colleague2@company.com", 
  "cady0009@gmail.com"
];

export default function App() {
  const [view, setView] = useState<View>('home');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [level, setLevel] = useState<FrenchLevel>('Beginner');
  const [selectedLesson, setSelectedLesson] = useState<typeof LESSONS[0] | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Bonjour ! Je m\'appelle Poonam. Comment puis-je vous aider aujourd\'hui ?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [phrasebook, setPhrasebook] = useState<{french: string, english: string}[]>([]);
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [points, setPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [earnedBadges, setEarnedBadges] = useState<string[]>([]);
  const [stats, setStats] = useState({
    messagesSent: 0,
    lessonsCompleted: 0,
    pronunciationsPracticed: 0,
    lastCheckIn: '',
  });

  // Translation state
  const [transInput, setTransInput] = useState('');
  const [transOutput, setTransOutput] = useState('');
  const [isToFrench, setIsToFrench] = useState(true);
  const [isTranslating, setIsTranslating] = useState(false);

  // Quiz state
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  // Grammar state
  const [selectedGrammar, setSelectedGrammar] = useState<typeof GRAMMAR_EXERCISES[0] | null>(null);
  const [currentGrammarIdx, setCurrentGrammarIdx] = useState(0);
  const [grammarInput, setGrammarInput] = useState('');
  const [grammarFeedback, setGrammarFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [grammarFinished, setGrammarFinished] = useState(false);
  const [grammarScore, setGrammarScore] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [tutorInputLang, setTutorInputLang] = useState<'fr-FR' | 'en-US'>('fr-FR');
  const recognitionRef = useRef<any>(null);
  const [currentQuiz, setCurrentQuiz] = useState<any[]>([]);
  const [currentGrammar, setCurrentGrammar] = useState<any[]>([]);
  const [lastAttended, setLastAttended] = useState<Record<string, string>>({});
  const [isLoadingDynamic, setIsLoadingDynamic] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const pcmToWav = (base64Pcm: string, sampleRate: number = 24000) => {
    const binaryString = atob(base64Pcm);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);
    
    // RIFF identifier
    view.setUint32(0, 0x52494646, false);
    // file length
    view.setUint32(4, 36 + len, true);
    // RIFF type
    view.setUint32(8, 0x57415645, false);
    // format chunk identifier
    view.setUint32(12, 0x666d7420, false);
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (1 is PCM)
    view.setUint16(20, 1, true);
    // channel count
    view.setUint16(22, 1, true);
    // sample rate
    view.setUint32(24, sampleRate, true);
    // byte rate (sampleRate * numChannels * bitsPerSample/8)
    view.setUint32(28, sampleRate * 1 * 16 / 8, true);
    // block align (numChannels * bitsPerSample/8)
    view.setUint16(32, 1 * 16 / 8, true);
    // bits per sample
    view.setUint16(34, 16, true);
    // data chunk identifier
    view.setUint32(36, 0x64617461, false);
    // data chunk length
    view.setUint32(40, len, true);
    
    const blob = new Blob([wavHeader, bytes], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  };

  const startListening = (target: 'tutor' | 'translate') => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;

    if (target === 'tutor') {
      recognition.lang = tutorInputLang;
    } else {
      recognition.lang = isToFrench ? 'en-US' : 'fr-FR';
    }

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };
    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (target === 'tutor') {
        setInput(prev => prev + (prev ? ' ' : '') + transcript);
      } else {
        setTransInput(prev => prev + (prev ? ' ' : '') + transcript);
      }
    };

    try {
      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setIsListening(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthLoading(true);
      if (firebaseUser) {
        const email = firebaseUser.email?.toLowerCase() || '';
        if (ALLOWED_EMAILS.includes(email)) {
          setUser(firebaseUser);
          setUnauthorized(false);
          
          // Fetch or initialize user data in Firestore
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const data = userDoc.data();
            setPoints(data.points || 0);
            setStreak(data.streak || 0);
            setEarnedBadges(data.earnedBadges || []);
            setPhrasebook(data.phrasebook || []);
            setStats(data.stats || {
              messagesSent: 0,
              lessonsCompleted: 0,
              pronunciationsPracticed: 0,
              lastCheckIn: '',
            });
            setLastAttended(data.lastAttended || {});
            if (data.level) setLevel(data.level as FrenchLevel);
          } else {
            // Initializing new user
            const newData = {
              email: firebaseUser.email,
              points: 0,
              streak: 0,
              earnedBadges: [],
              phrasebook: [],
              stats: {
                messagesSent: 0,
                lessonsCompleted: 0,
                pronunciationsPracticed: 0,
                lastCheckIn: '',
              },
              lastAttended: {},
              level: 'Beginner',
              createdAt: new Date().toISOString()
            };
            await setDoc(userDocRef, newData);
          }
        } else {
          setUser(null);
          setUnauthorized(true);
          await signOut(auth);
        }
      } else {
        setUser(null);
      }
      setAuthLoading(false);
      setIsLoaded(true);
    });

    return () => unsubscribe();
  }, []);

  // Sync data to Firestore whenever it changes
  useEffect(() => {
    if (!isLoaded || !user || unauthorized) return;

    const syncData = async () => {
      if (!user?.email) return;
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, {
          email: user.email,
          points,
          streak,
          earnedBadges,
          stats,
          phrasebook,
          lastAttended,
          level
        });
      } catch (error) {
        console.error("Error syncing data to Firestore:", error);
      }
    };

    const timeoutId = setTimeout(syncData, 1000); // Debounce sync
    return () => clearTimeout(timeoutId);
  }, [points, streak, earnedBadges, stats, phrasebook, lastAttended, level, isLoaded, user, unauthorized]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setView('home');
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Daily Streak Logic
  useEffect(() => {
    if (!isLoaded) return;
    const today = new Date().toISOString().split('T')[0];
    if (stats.lastCheckIn !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      if (stats.lastCheckIn === yesterdayStr) {
        setStreak(prev => prev + 1);
      } else if (stats.lastCheckIn !== '') {
        setStreak(1);
      } else {
        setStreak(1);
      }
      
      setStats(prev => ({ ...prev, lastCheckIn: today }));
      addPoints(10); // Daily login bonus
    }
  }, [stats.lastCheckIn]);

  const addPoints = (amount: number) => {
    setPoints(prev => prev + amount);
  };

  const checkAchievements = (newStats: typeof stats, newPoints: number) => {
    const newBadges = [...earnedBadges];
    
    if (!newBadges.includes('first-step') && newStats.lessonsCompleted >= 1) {
      newBadges.push('first-step');
    }
    if (!newBadges.includes('chatterbox') && newStats.messagesSent >= 10) {
      newBadges.push('chatterbox');
    }
    if (!newBadges.includes('polyglot') && newPoints >= 500) {
      newBadges.push('polyglot');
    }
    if (!newBadges.includes('native-speaker') && newStats.pronunciationsPracticed >= 20) {
      newBadges.push('native-speaker');
    }
    if (!newBadges.includes('streak-master') && streak >= 3) {
      newBadges.push('streak-master');
    }
    if (!newBadges.includes('quiz-whiz') && newStats.lessonsCompleted > 0 && quizScore === selectedLesson?.quiz?.length) {
      newBadges.push('quiz-whiz');
    }

    if (newBadges.length > earnedBadges.length) {
      setEarnedBadges(newBadges);
      // Could add a toast notification here
    }
  };

  const handleOptionSelect = (option: string) => {
    if (selectedOption || !selectedLesson) return;
    
    setSelectedOption(option);
    const correct = option === currentQuiz[currentQuestionIdx].answer;
    setIsCorrect(correct);
    
    if (correct) {
      setQuizScore(prev => prev + 1);
      addPoints(10);
    }
  };

  const nextQuestion = () => {
    if (!selectedLesson) return;
    
    if (currentQuestionIdx + 1 < currentQuiz.length) {
      setCurrentQuestionIdx(prev => prev + 1);
      setSelectedOption(null);
      setIsCorrect(null);
    } else {
      setQuizFinished(true);
      const today = new Date().toISOString().split('T')[0];
      setLastAttended(prev => ({ ...prev, [selectedLesson.id]: today }));
      
      const newStats = { ...stats, lessonsCompleted: stats.lessonsCompleted + 1 };
      setStats(newStats);
      addPoints(50);
      checkAchievements(newStats, points + 50);
    }
  };

  const startQuiz = async () => {
    if (!selectedLesson) return;
    setIsLoadingDynamic(true);
    const today = new Date().toISOString().split('T')[0];
    
    try {
      if (lastAttended[selectedLesson.id] !== today) {
        const newQuiz = await getDynamicQuiz(selectedLesson.id, level);
        setCurrentQuiz(newQuiz || selectedLesson.quiz);
      } else {
        setCurrentQuiz(selectedLesson.quiz);
      }
      
      setCurrentQuestionIdx(0);
      setQuizScore(0);
      setQuizFinished(false);
      setSelectedOption(null);
      setIsCorrect(null);
      setView('quiz');
    } catch (error) {
      console.error(error);
      setCurrentQuiz(selectedLesson.quiz);
      setView('quiz');
    } finally {
      setIsLoadingDynamic(false);
    }
  };

  const startGrammar = async (exercise: typeof GRAMMAR_EXERCISES[0]) => {
    setSelectedGrammar(exercise);
    setIsLoadingDynamic(true);
    const today = new Date().toISOString().split('T')[0];

    try {
      if (lastAttended[exercise.id] !== today) {
        const newGrammar = await getDynamicGrammar(exercise.id, level);
        setCurrentGrammar(newGrammar || exercise.exercises);
      } else {
        setCurrentGrammar(exercise.exercises);
      }

      setCurrentGrammarIdx(0);
      setGrammarInput('');
      setGrammarFeedback(null);
      setGrammarFinished(false);
      setGrammarScore(0);
      setView('grammar');
    } catch (error) {
      console.error(error);
      setCurrentGrammar(exercise.exercises);
      setView('grammar');
    } finally {
      setIsLoadingDynamic(false);
    }
  };

  const handleGrammarSubmit = () => {
    if (!selectedGrammar || grammarFeedback) return;
    
    const current = currentGrammar[currentGrammarIdx];
    if (grammarInput.toLowerCase().trim() === current.answer.toLowerCase()) {
      setGrammarFeedback('correct');
      setGrammarScore(prev => prev + 1);
      addPoints(15);
    } else {
      setGrammarFeedback('incorrect');
    }
  };

  const nextGrammar = () => {
    if (!selectedGrammar) return;
    
    if (currentGrammarIdx + 1 < currentGrammar.length) {
      setCurrentGrammarIdx(prev => prev + 1);
      setGrammarInput('');
      setGrammarFeedback(null);
    } else {
      setGrammarFinished(true);
      const today = new Date().toISOString().split('T')[0];
      setLastAttended(prev => ({ ...prev, [selectedGrammar.id]: today }));
      addPoints(30);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    const userMsg: Message = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const newStats = { ...stats, messagesSent: stats.messagesSent + 1 };
    setStats(newStats);
    addPoints(5);
    checkAchievements(newStats, points + 5);

    try {
      const response = await chatWithTutor([...messages, userMsg], level);
      setMessages(prev => [...prev, { role: 'model', text: response || 'Désolé, je n\'ai pas compris.' }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: 'Une erreur est survenue. Réessayez plus tard.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleTranslate = async () => {
    if (!transInput.trim()) return;
    setIsTranslating(true);
    try {
      const result = await translateText(transInput, isToFrench);
      setTransOutput(result || '');
    } catch (error) {
      console.error(error);
    } finally {
      setIsTranslating(false);
    }
  };

  const togglePhrase = (french: string, english: string) => {
    const exists = phrasebook.find(p => p.french === french);
    if (exists) {
      setPhrasebook(prev => prev.filter(p => p.french !== french));
    } else {
      setPhrasebook(prev => [...prev, { french, english }]);
    }
  };

  const playPronunciation = async (text: string) => {
    setPlayingAudio(text);
    const base64Pcm = await generateSpeech(text);
    if (base64Pcm) {
      try {
        const audioUrl = pcmToWav(base64Pcm);
        const audio = new Audio(audioUrl);
        audio.play().catch(e => {
          console.error("Audio playback failed:", e);
          setPlayingAudio(null);
        });
        audio.onended = () => {
          setPlayingAudio(null);
          URL.revokeObjectURL(audioUrl);
        };

        const newStats = { ...stats, pronunciationsPracticed: stats.pronunciationsPracticed + 1 };
        setStats(newStats);
        addPoints(2);
        checkAchievements(newStats, points + 2);
      } catch (e) {
        console.error("Error creating audio:", e);
        setPlayingAudio(null);
      }
    } else {
      setPlayingAudio(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfdfb]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#FF6321] border-t-transparent rounded-full animate-spin" />
          <p className="font-serif italic text-[#FF6321]">Chargement de votre expérience...</p>
        </div>
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfdfb] p-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white p-12 rounded-[40px] shadow-2xl border border-[#e5e5e0] text-center"
        >
          <XCircle size={64} className="text-red-500 mx-auto mb-6" />
          <h1 className="text-3xl font-serif font-bold mb-4">Accès Refusé</h1>
          <p className="text-[#8e8e80] mb-8 leading-relaxed">
            Désolé, votre adresse email n'est pas autorisée à accéder à Frankly French pour le moment. 
            Veuillez contacter l'administrateur si vous pensez qu'il s'agit d'une erreur.
          </p>
          <button 
            onClick={() => setUnauthorized(false)}
            className="w-full bg-[#FF6321] text-white py-4 rounded-full font-bold shadow-lg hover:shadow-orange-200 transition-all active:scale-95"
          >
            Réessayer
          </button>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfdfb] p-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white p-10 rounded-[40px] shadow-2xl border border-[#e5e5e0] text-center"
        >
          <div className="w-20 h-20 bg-[#fff4e6] rounded-3xl flex items-center justify-center mx-auto mb-8">
            <GraduationCap size={40} className="text-[#FF6321]" />
          </div>
          <h1 className="text-4xl font-serif font-bold mb-3 tracking-tight">Frankly French</h1>
          <p className="text-[#8e8e80] mb-10 leading-relaxed italic">Votre compagnon d'apprentissage immersif.</p>
          
          <button 
            onClick={handleLogin}
            className="w-full bg-white border-2 border-[#e5e5e0] text-[#1a1a1a] py-4 rounded-full font-bold flex items-center justify-center gap-3 hover:bg-[#fdfdfb] transition-all active:scale-95 mb-4"
          >
            <Globe size={20} className="text-[#4285F4]" />
            Se connecter avec Google
          </button>
          
          <p className="text-[10px] text-[#8e8e80] uppercase tracking-widest mt-6">
            Approuvé par des milliers de passionnés.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-white shadow-xl relative overflow-hidden">
      {/* Header */}
      <header className="p-6 flex items-center justify-between border-b border-[#e5e5e0] bg-[#fdfdfb]">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-[#FF6321] flex items-center justify-center text-white">
            <Languages size={20} />
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold leading-tight">Frankly French</h1>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-[#FF6321] font-bold">
                <Trophy size={10} />
                <span>{points} pts</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-orange-600 font-bold">
                <Flame size={10} />
                <span>{streak} day streak</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {view !== 'home' && (
            <button 
              onClick={() => setView('home')}
              className="p-2 hover:bg-[#fff4e6] rounded-full transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <button 
            onClick={() => setView('profile')}
            className={cn(
              "p-2 rounded-full transition-colors",
              view === 'profile' ? "bg-[#FF6321] text-white" : "hover:bg-[#fff4e6] text-[#8e8e80]"
            )}
          >
            <User size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <section className="text-center space-y-4 py-8">
                <h2 className="text-4xl font-serif font-light leading-tight italic">
                  Bienvenue dans votre voyage linguistique.
                </h2>
                <p className="text-[#FF6321] text-sm max-w-[280px] mx-auto">
                  Master French through immersive lessons and AI-powered tools.
                </p>
              </section>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setView('translate')}
                  className="flex flex-col items-center gap-3 p-6 bg-[#fff4e6] rounded-3xl border border-[#FF6321]/10 hover:border-[#FF6321] transition-all"
                >
                  <div className="w-12 h-12 rounded-full bg-[#FF6321] text-white flex items-center justify-center">
                    <Languages size={24} />
                  </div>
                  <span className="text-sm font-bold font-serif">Translate</span>
                </button>
                <button 
                  onClick={() => setView('tutor')}
                  className="flex flex-col items-center gap-3 p-6 bg-[#fdfdfb] rounded-3xl border border-[#e5e5e0] hover:border-[#FF6321] transition-all"
                >
                  <div className="w-12 h-12 rounded-full bg-[#f5f5f0] text-[#FF6321] flex items-center justify-center">
                    <MessageCircle size={24} />
                  </div>
                  <span className="text-sm font-bold font-serif">AI Tutor</span>
                </button>
                <button 
                  onClick={() => setView('lessons')}
                  className="flex flex-col items-center gap-3 p-6 bg-[#fdfdfb] rounded-3xl border border-[#e5e5e0] hover:border-[#FF6321] transition-all"
                >
                  <div className="w-12 h-12 rounded-full bg-[#f5f5f0] text-[#FF6321] flex items-center justify-center">
                    <BookOpen size={24} />
                  </div>
                  <span className="text-sm font-bold font-serif">Lessons</span>
                </button>
                <button 
                  onClick={() => setView('phrasebook')}
                  className="flex flex-col items-center gap-3 p-6 bg-[#fdfdfb] rounded-3xl border border-[#e5e5e0] hover:border-[#FF6321] transition-all"
                >
                  <div className="w-12 h-12 rounded-full bg-[#f5f5f0] text-[#FF6321] flex items-center justify-center">
                    <Bookmark size={24} />
                  </div>
                  <span className="text-sm font-bold font-serif">Saved</span>
                </button>
                <button 
                  onClick={() => {
                    const levelGrammar = GRAMMAR_EXERCISES.find(g => g.level === level);
                    if (levelGrammar) startGrammar(levelGrammar);
                  }}
                  className="flex flex-col items-center gap-3 p-6 bg-[#fdfdfb] rounded-3xl border border-[#e5e5e0] hover:border-[#FF6321] transition-all col-span-2"
                >
                  <div className="w-12 h-12 rounded-full bg-[#f5f5f0] text-[#FF6321] flex items-center justify-center">
                    <History size={24} />
                  </div>
                  <span className="text-sm font-bold font-serif">Grammar Practice (Fill-ups)</span>
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] uppercase tracking-widest font-semibold text-[#8e8e80]">Select Your Level</span>
                </div>
                <div className="flex gap-2">
                  {FRENCH_LEVELS.map(l => (
                    <button
                      key={l}
                      onClick={() => setLevel(l)}
                      className={cn(
                        "flex-1 py-2 px-3 rounded-full text-xs font-medium transition-all border",
                        level === l 
                          ? "bg-[#FF6321] text-white border-[#FF6321]" 
                          : "bg-white text-[#FF6321] border-[#e5e5e0] hover:border-[#FF6321]"
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'translate' && (
            <motion.div 
              key="translate"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-center gap-4 py-4 border-b border-[#e5e5e0]">
                <span className={cn("text-sm font-bold transition-colors", isToFrench ? "text-[#8e8e80]" : "text-[#FF6321]")}>
                  {isToFrench ? "English" : "French"}
                </span>
                <button 
                  onClick={() => setIsToFrench(!isToFrench)}
                  className="p-2 bg-[#f5f5f0] rounded-full text-[#FF6321] hover:bg-[#FF6321] hover:text-white transition-all"
                >
                  <Repeat size={18} />
                </button>
                <span className={cn("text-sm font-bold transition-colors", isToFrench ? "text-[#FF6321]" : "text-[#8e8e80]")}>
                  {isToFrench ? "French" : "English"}
                </span>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <textarea 
                    value={transInput}
                    onChange={(e) => setTransInput(e.target.value)}
                    placeholder={isToFrench ? "Enter English text..." : "Entrez du texte en français..."}
                    className="w-full min-h-[120px] p-6 bg-[#fdfdfb] border border-[#e5e5e0] rounded-3xl text-lg font-serif resize-none focus:ring-2 focus:ring-[#FF6321] outline-none"
                  />
                  <div className="absolute bottom-4 right-4 flex gap-2">
                    <button 
                      onClick={() => startListening('translate')}
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                        isListening ? "bg-red-500 text-white animate-pulse" : "bg-[#f5f5f0] text-[#FF6321] hover:bg-[#FF6321] hover:text-white"
                      )}
                    >
                      <Mic size={18} />
                    </button>
                    <button 
                      onClick={handleTranslate}
                      disabled={!transInput.trim() || isTranslating}
                      className="w-10 h-10 bg-[#FF6321] text-white rounded-full flex items-center justify-center disabled:opacity-50"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>

                {transOutput && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-6 bg-[#fff4e6] border border-[#FF6321]/20 rounded-3xl space-y-4"
                  >
                    <div className="flex justify-between items-start">
                      <p className="text-xl font-serif font-bold text-[#FF6321]">{transOutput}</p>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => playPronunciation(transOutput)}
                          className="p-2 bg-white rounded-full text-[#FF6321]"
                        >
                          <Volume2 size={18} />
                        </button>
                        <button 
                          onClick={() => togglePhrase(isToFrench ? transOutput : transInput, isToFrench ? transInput : transOutput)}
                          className="p-2 bg-white rounded-full text-[#FF6321]"
                        >
                          {phrasebook.find(p => p.french === (isToFrench ? transOutput : transInput)) ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {view === 'phrasebook' && (
            <motion.div 
              key="phrasebook"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <Bookmark className="text-[#FF6321]" />
                <h2 className="text-2xl font-serif font-bold">Saved Phrases</h2>
              </div>

              {phrasebook.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-16 h-16 bg-[#f5f5f0] rounded-full flex items-center justify-center mx-auto text-[#8e8e80]">
                    <History size={32} />
                  </div>
                  <p className="text-[#8e8e80] text-sm">No saved phrases yet. Start translating or exploring lessons!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {phrasebook.map((item, idx) => (
                    <div 
                      key={idx}
                      className="bg-[#fdfdfb] border border-[#e5e5e0] p-4 rounded-xl flex items-center justify-between group hover:border-[#FF6321] transition-colors"
                    >
                      <div>
                        <p className="text-lg font-serif font-bold text-[#1a1a1a]">{item.french}</p>
                        <p className="text-xs text-[#8e8e80]">{item.english}</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => playPronunciation(item.french)}
                          className="p-2 rounded-full bg-[#f5f5f0] text-[#FF6321] hover:bg-[#FF6321] hover:text-white transition-all"
                        >
                          <Volume2 size={16} />
                        </button>
                        <button 
                          onClick={() => togglePhrase(item.french, item.english)}
                          className="p-2 rounded-full bg-[#fff4e6] text-[#FF6321]"
                        >
                          <BookmarkCheck size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {view === 'listen' && (
            <motion.div 
              key="listen"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <Headphones className="text-[#FF6321]" />
                <h2 className="text-2xl font-serif font-bold">Listening Practice</h2>
              </div>
              <p className="text-sm text-[#8e8e80]">Listen to these phrases and try to repeat them aloud to improve your accent.</p>
              
              <div className="space-y-4">
                {LISTENING_EXERCISES.map((ex) => (
                  <div 
                    key={ex.id}
                    className="bg-[#fdfdfb] border border-[#e5e5e0] p-5 rounded-2xl space-y-3 hover:border-[#FF6321] transition-all"
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="font-serif font-bold text-[#FF6321]">{ex.title}</h3>
                      <button 
                        onClick={() => playPronunciation(ex.french)}
                        className="p-3 rounded-full bg-[#fff4e6] text-[#FF6321] hover:bg-[#FF6321] hover:text-white transition-all"
                      >
                        <Volume2 size={20} />
                      </button>
                    </div>
                    <p className="text-lg font-serif italic text-[#1a1a1a]">"{ex.french}"</p>
                    <p className="text-xs text-[#8e8e80] border-t border-[#e5e5e0] pt-2">{ex.english}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {view === 'daily' && (
            <motion.div 
              key="daily"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="text-[#FF6321]" />
                <h2 className="text-2xl font-serif font-bold">Daily Inspiration</h2>
              </div>

              <div className="bg-[#fff4e6] p-8 rounded-[40px] border border-[#FF6321]/10 text-center space-y-6 shadow-sm">
                <div className="space-y-2">
                  <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#FF6321]/60">Phrase of the Day</span>
                  <h3 className="text-4xl font-serif font-bold text-[#FF6321] leading-tight">
                    {DAILY_PHRASE.french}
                  </h3>
                  <p className="text-lg text-[#8e8e80] italic">
                    {DAILY_PHRASE.english}
                  </p>
                </div>

                <div className="flex justify-center gap-4">
                  <button 
                    onClick={() => playPronunciation(DAILY_PHRASE.french)}
                    className="w-14 h-14 rounded-full bg-white text-[#FF6321] flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
                  >
                    <Volume2 size={24} />
                  </button>
                  <button 
                    onClick={() => togglePhrase(DAILY_PHRASE.french, DAILY_PHRASE.english)}
                    className="w-14 h-14 rounded-full bg-white text-[#FF6321] flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
                  >
                    {phrasebook.find(p => p.french === DAILY_PHRASE.french) ? <BookmarkCheck size={24} /> : <Bookmark size={24} />}
                  </button>
                </div>

                <div className="pt-6 border-t border-[#FF6321]/10 text-left">
                  <p className="text-xs font-bold text-[#FF6321] uppercase tracking-widest mb-2">Pronunciation</p>
                  <p className="text-sm text-[#1a1a1a] font-mono bg-white/50 p-3 rounded-xl">{DAILY_PHRASE.pronunciation}</p>
                </div>

                <div className="text-left">
                  <p className="text-xs font-bold text-[#FF6321] uppercase tracking-widest mb-2">Context</p>
                  <p className="text-sm text-[#8e8e80] leading-relaxed">{DAILY_PHRASE.context}</p>
                </div>
              </div>

              <div className="p-6 bg-[#fdfdfb] border border-[#e5e5e0] rounded-3xl space-y-3">
                <h4 className="font-serif font-bold">Daily Tip</h4>
                <p className="text-sm text-[#8e8e80] leading-relaxed">
                  Try to use today's phrase in a conversation with Poonam! Consistency is key to mastering French.
                </p>
                <button 
                  onClick={() => setView('tutor')}
                  className="text-[#FF6321] text-xs font-bold uppercase tracking-widest hover:underline"
                >
                  Go to AI Tutor →
                </button>
              </div>
            </motion.div>
          )}

          {view === 'lessons' && (
            <motion.div 
              key="lessons"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <GraduationCap className="text-[#FF6321]" />
                <h2 className="text-2xl font-serif font-bold">Your Lessons</h2>
              </div>
              
              <div className="space-y-4">
                {LESSONS.filter(l => l.level === level).map(lesson => (
                  <button
                    key={lesson.id}
                    onClick={() => {
                      setSelectedLesson(lesson);
                      setView('lesson-detail');
                    }}
                    className="w-full bg-white border border-[#e5e5e0] p-5 rounded-2xl text-left hover:border-[#FF6321] transition-all group"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-[10px] uppercase tracking-widest text-[#FF6321] font-bold">{lesson.level}</span>
                        <h3 className="text-lg font-serif font-bold mt-1">{lesson.title}</h3>
                        <p className="text-xs text-[#8e8e80] mt-1">{lesson.description}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-[#fff4e6] flex items-center justify-center text-[#FF6321] group-hover:bg-[#FF6321] group-hover:text-white transition-colors">
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {view === 'lesson-detail' && selectedLesson && (
            <motion.div 
              key="lesson-detail"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-3xl font-serif font-bold">{selectedLesson.title}</h2>
                <p className="text-sm text-[#FF6321] italic">{selectedLesson.description}</p>
              </div>

              <div className="space-y-3">
                {selectedLesson.content.map((item, idx) => (
                  <div 
                    key={idx}
                    className="bg-[#fdfdfb] border border-[#e5e5e0] p-4 rounded-xl flex items-center justify-between group hover:border-[#FF6321] transition-colors"
                  >
                    <div>
                      <p className="text-lg font-serif font-bold text-[#1a1a1a]">{item.french}</p>
                      <p className="text-xs text-[#8e8e80]">{item.english}</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => playPronunciation(item.french)}
                        disabled={playingAudio === item.french}
                        className={cn(
                          "p-2 rounded-full transition-all",
                          playingAudio === item.french 
                            ? "bg-[#FF6321] text-white animate-pulse" 
                            : "bg-[#fff4e6] text-[#FF6321] hover:bg-[#FF6321] hover:text-white"
                        )}
                      >
                        <Volume2 size={18} />
                      </button>
                      <button 
                        onClick={() => togglePhrase(item.french, item.english)}
                        className="p-2 rounded-full bg-[#f5f5f0] text-[#FF6321] hover:bg-[#FF6321] hover:text-white transition-all"
                      >
                        {phrasebook.find(p => p.french === item.french) ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={startQuiz}
                  disabled={isLoadingDynamic}
                  className="w-full py-4 bg-[#fff4e6] text-[#FF6321] border border-[#FF6321] rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#FF6321] hover:text-white transition-colors disabled:opacity-50"
                >
                  {isLoadingDynamic ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <HelpCircle size={20} />}
                  {isLoadingDynamic ? "Preparing Quiz..." : "Take Quiz to Complete"}
                </button>
                <button 
                  onClick={() => setView('tutor')}
                  className="w-full py-4 bg-[#FF6321] text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#E55A1E] transition-colors"
                >
                  <MessageCircle size={20} />
                  Practice with Poonam
                </button>
              </div>
            </motion.div>
          )}

          {view === 'quiz' && selectedLesson && selectedLesson.quiz && (
            <motion.div 
              key="quiz"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              {!quizFinished ? (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-[#8e8e80] uppercase tracking-widest">
                        Question {currentQuestionIdx + 1} of {currentQuiz.length}
                      </span>
                      <span className="text-xs font-bold text-[#FF6321] uppercase tracking-widest">
                        Score: {quizScore}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[#f5f5f0] rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentQuestionIdx + 1) / currentQuiz.length) * 100}%` }}
                        className="h-full bg-[#FF6321]"
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-2xl font-serif font-bold leading-tight">
                      {currentQuiz[currentQuestionIdx].question}
                    </h3>

                    <div className="grid gap-3">
                      {currentQuiz[currentQuestionIdx].options.map((option: string, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => handleOptionSelect(option)}
                          disabled={selectedOption !== null}
                          className={cn(
                            "w-full p-5 rounded-2xl border text-left font-medium transition-all flex items-center justify-between",
                            selectedOption === option
                              ? isCorrect 
                                ? "bg-green-50 border-green-500 text-green-700"
                                : "bg-red-50 border-red-500 text-red-700"
                              : selectedOption !== null && option === currentQuiz[currentQuestionIdx].answer
                                ? "bg-green-50 border-green-500 text-green-700"
                                : "bg-white border-[#e5e5e0] hover:border-[#FF6321]"
                          )}
                        >
                          <span>{option}</span>
                          {selectedOption === option && (
                            isCorrect ? <CheckCircle size={20} /> : <XCircle size={20} />
                          )}
                          {selectedOption !== null && option === currentQuiz[currentQuestionIdx].answer && selectedOption !== option && (
                            <CheckCircle size={20} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedOption && (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={nextQuestion}
                      className="w-full py-4 bg-[#FF6321] text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#E55A1E] transition-colors"
                    >
                      {currentQuestionIdx + 1 === currentQuiz.length ? "Finish Quiz" : "Next Question"}
                      <ChevronRight size={20} />
                    </motion.button>
                  )}
                </>
              ) : (
                <div className="text-center space-y-8 py-8">
                  <div className="w-24 h-24 bg-[#fff4e6] rounded-full flex items-center justify-center mx-auto border-4 border-[#FF6321]">
                    <Trophy size={48} className="text-[#FF6321]" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-3xl font-serif font-bold">Quiz Complete!</h2>
                    <p className="text-[#8e8e80]">
                      You scored {quizScore} out of {currentQuiz.length}
                    </p>
                  </div>

                  <div className="bg-[#fdfdfb] border border-[#e5e5e0] p-6 rounded-3xl space-y-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-[#8e8e80]">Base Reward</span>
                      <span className="font-bold text-[#FF6321]">+50 pts</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-[#8e8e80]">Correct Answers ({quizScore})</span>
                      <span className="font-bold text-[#FF6321]">+{quizScore * 10} pts</span>
                    </div>
                    <div className="pt-4 border-t border-[#e5e5e0] flex justify-between items-center font-bold">
                      <span>Total Earned</span>
                      <span className="text-[#FF6321]">{50 + (quizScore * 10)} pts</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => setView('lessons')}
                    className="w-full py-4 bg-[#FF6321] text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#E55A1E] transition-colors"
                  >
                    Back to Lessons
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {view === 'grammar' && selectedGrammar && (
            <motion.div 
              key="grammar"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              {!grammarFinished ? (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-[#8e8e80] uppercase tracking-widest">
                        Exercise {currentGrammarIdx + 1} of {selectedGrammar.exercises.length}
                      </span>
                      <span className="text-xs font-bold text-[#FF6321] uppercase tracking-widest">
                        Level: {selectedGrammar.level}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[#f5f5f0] rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentGrammarIdx + 1) / currentGrammar.length) * 100}%` }}
                        className="h-full bg-[#FF6321]"
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="text-center space-y-2">
                      <h3 className="text-xl font-serif font-bold text-[#FF6321]">
                        {selectedGrammar.title}
                      </h3>
                      <p className="text-sm text-[#8e8e80]">{selectedGrammar.description}</p>
                    </div>

                    <div className="p-8 bg-[#fdfdfb] border border-[#e5e5e0] rounded-[32px] text-center space-y-6">
                      <p className="text-2xl font-serif font-bold leading-relaxed">
                        {currentGrammar[currentGrammarIdx].sentence.split('___').map((part: string, i: number, arr: string[]) => (
                          <React.Fragment key={i}>
                            {part}
                            {i < arr.length - 1 && (
                              <span className="inline-block min-w-[80px] border-b-2 border-[#FF6321] mx-2 text-[#FF6321]">
                                {grammarFeedback ? currentGrammar[currentGrammarIdx].answer : (grammarInput || '...')}
                              </span>
                            )}
                          </React.Fragment>
                        ))}
                      </p>
                      
                      <p className="text-sm text-[#8e8e80] italic">
                        Hint: {currentGrammar[currentGrammarIdx].hint}
                      </p>

                      <div className="space-y-4">
                        <input 
                          type="text"
                          value={grammarInput}
                          onChange={(e) => setGrammarInput(e.target.value)}
                          disabled={grammarFeedback !== null}
                          placeholder="Type your answer..."
                          className={cn(
                            "w-full p-4 bg-white border rounded-2xl text-center font-bold outline-none transition-all",
                            grammarFeedback === 'correct' ? "border-green-500 bg-green-50 text-green-700" :
                            grammarFeedback === 'incorrect' ? "border-red-500 bg-red-50 text-red-700" :
                            "border-[#e5e5e0] focus:border-[#FF6321]"
                          )}
                        />

                        {grammarFeedback === 'incorrect' && (
                          <p className="text-xs text-red-600 font-bold">
                            Correct answer: {currentGrammar[currentGrammarIdx].answer}
                          </p>
                        )}

                        {!grammarFeedback ? (
                          <button 
                            onClick={handleGrammarSubmit}
                            disabled={!grammarInput.trim()}
                            className="w-full py-4 bg-[#FF6321] text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#E55A1E] transition-colors disabled:opacity-50"
                          >
                            Check Answer
                          </button>
                        ) : (
                          <button 
                            onClick={nextGrammar}
                            className="w-full py-4 bg-[#FF6321] text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#E55A1E] transition-colors"
                          >
                            {currentGrammarIdx + 1 === currentGrammar.length ? "Finish" : "Next Exercise"}
                            <ChevronRight size={20} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center space-y-8 py-8">
                  <div className="w-24 h-24 bg-[#fff4e6] rounded-full flex items-center justify-center mx-auto border-4 border-[#FF6321]">
                    <CheckCircle size={48} className="text-[#FF6321]" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-3xl font-serif font-bold">Great Job!</h2>
                    <p className="text-[#8e8e80]">
                      You completed the {selectedGrammar.title} practice.
                    </p>
                    <p className="text-lg font-bold text-[#FF6321]">
                      Score: {grammarScore} / {currentGrammar.length}
                    </p>
                  </div>

                  <div className="bg-[#fdfdfb] border border-[#e5e5e0] p-6 rounded-3xl space-y-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-[#8e8e80]">Completion Reward</span>
                      <span className="font-bold text-[#FF6321]">+30 pts</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-[#8e8e80]">Correct Answers ({grammarScore})</span>
                      <span className="font-bold text-[#FF6321]">+{grammarScore * 15} pts</span>
                    </div>
                    <div className="pt-4 border-t border-[#e5e5e0] flex justify-between items-center font-bold">
                      <span>Total Earned</span>
                      <span className="text-[#FF6321]">{30 + (grammarScore * 15)} pts</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => setView('home')}
                    className="w-full py-4 bg-[#FF6321] text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#E55A1E] transition-colors"
                  >
                    Back to Home
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {view === 'profile' && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              <div className="text-center space-y-4">
                <div className="w-24 h-24 bg-[#fff4e6] rounded-full flex items-center justify-center mx-auto border-4 border-[#FF6321]">
                  <User size={48} className="text-[#FF6321]" />
                </div>
                <div>
                  <h2 className="text-2xl font-serif font-bold">Your Progress</h2>
                  <p className="text-sm text-[#8e8e80]">Keep going, you're doing great!</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#fdfdfb] border border-[#e5e5e0] p-4 rounded-2xl text-center">
                  <p className="text-2xl font-bold text-[#FF6321]">{points}</p>
                  <p className="text-[10px] uppercase tracking-widest text-[#8e8e80] font-bold">Points</p>
                </div>
                <div className="bg-[#fdfdfb] border border-[#e5e5e0] p-4 rounded-2xl text-center">
                  <p className="text-2xl font-bold text-[#FF6321]">{streak}</p>
                  <p className="text-[10px] uppercase tracking-widest text-[#8e8e80] font-bold">Streak</p>
                </div>
                <div className="bg-[#fdfdfb] border border-[#e5e5e0] p-4 rounded-2xl text-center">
                  <p className="text-2xl font-bold text-[#FF6321]">{earnedBadges.length}</p>
                  <p className="text-[10px] uppercase tracking-widest text-[#8e8e80] font-bold">Badges</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-serif font-bold flex items-center gap-2">
                  <Award size={20} className="text-[#FF6321]" />
                  Achievements
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {BADGES.map(badge => {
                    const isEarned = earnedBadges.includes(badge.id);
                    const Icon = {
                      Footprints,
                      MessageSquare,
                      Trophy,
                      Mic,
                      Flame,
                      CheckCircle
                    }[badge.icon] || Award;

                    return (
                      <div 
                        key={badge.id}
                        className={cn(
                          "p-4 rounded-2xl border flex items-center gap-4 transition-all",
                          isEarned 
                            ? "bg-white border-[#FF6321] shadow-sm" 
                            : "bg-[#f5f5f0] border-[#e5e5e0] opacity-60 grayscale"
                        )}
                      >
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center",
                          isEarned ? "bg-[#fff4e6] text-[#FF6321]" : "bg-[#e5e5e0] text-[#8e8e80]"
                        )}>
                          <Icon size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm">{badge.title}</h4>
                          <p className="text-xs text-[#8e8e80]">{badge.description}</p>
                        </div>
                        {isEarned && (
                          <div className="ml-auto">
                            <Sparkles size={16} className="text-[#FF6321]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-serif font-bold flex items-center gap-2">
                  <History size={20} className="text-[#FF6321]" />
                  Stats
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#8e8e80]">Messages Sent</span>
                    <span className="font-bold">{stats.messagesSent}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#8e8e80]">Lessons Completed</span>
                    <span className="font-bold">{stats.lessonsCompleted}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#8e8e80]">Pronunciations Practiced</span>
                    <span className="font-bold">{stats.pronunciationsPracticed}</span>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-[#e5e5e0] space-y-4 pb-12">
                <div className="bg-[#fdfdfb] border border-[#e5e5e0] p-4 rounded-3xl flex items-center gap-4">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-12 h-12 rounded-full border-2 border-white shadow-sm" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-12 h-12 bg-[#fff4e6] rounded-full flex items-center justify-center border-2 border-[#FF6321]">
                      <User size={24} className="text-[#FF6321]" />
                    </div>
                  )}
                  <div className="flex-1 overflow-hidden">
                    <p className="font-bold text-sm truncate">{user?.displayName || 'User'}</p>
                    <p className="text-xs text-[#8e8e80] truncate">{user?.email}</p>
                  </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="w-full py-4 text-red-500 font-bold border-2 border-red-100 rounded-3xl hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                >
                  <XCircle size={18} />
                  Sign Out
                </button>
              </div>
            </motion.div>
          )}
          {view === 'tutor' && (
            <motion.div 
              key="tutor"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col h-full -mx-6 -mb-6"
            >
              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-[400px]">
                {messages.map((msg, idx) => (
                  <div 
                    key={idx}
                    className={cn(
                      "flex flex-col max-w-[85%]",
                      msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                    )}
                  >
                    <div className={cn(
                      "p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
                      msg.role === 'user' 
                        ? "bg-[#FF6321] text-white rounded-tr-none" 
                        : "bg-[#fff4e6] text-[#1a1a1a] rounded-tl-none border border-[#e5e5e0]"
                    )}>
                      <div className="markdown-body">
                        <Markdown>{msg.text}</Markdown>
                      </div>
                    </div>
                    {msg.role === 'model' && (
                      <div className="flex gap-2 mt-1">
                        <button 
                          onClick={() => playPronunciation(msg.text)}
                          className="p-1 text-[#8e8e80] hover:text-[#FF6321] transition-colors"
                        >
                          <Volume2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {isTyping && (
                  <div className="flex gap-1 p-4 bg-[#fff4e6] rounded-2xl rounded-tl-none w-16 items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-[#FF6321] rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-[#FF6321] rounded-full animate-bounce delay-75" />
                    <div className="w-1.5 h-1.5 bg-[#FF6321] rounded-full animate-bounce delay-150" />
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-4 bg-white border-t border-[#e5e5e0] flex flex-col gap-2">
                <div className="flex items-center gap-2 px-2">
                  <button 
                    onClick={() => setTutorInputLang('fr-FR')}
                    className={cn(
                      "text-[10px] px-2 py-1 rounded-full transition-all border",
                      tutorInputLang === 'fr-FR' ? "bg-[#FF6321] text-white border-[#FF6321]" : "bg-white text-[#8e8e80] border-[#e5e5e0]"
                    )}
                  >
                    Français
                  </button>
                  <button 
                    onClick={() => setTutorInputLang('en-US')}
                    className={cn(
                      "text-[10px] px-2 py-1 rounded-full transition-all border",
                      tutorInputLang === 'en-US' ? "bg-[#FF6321] text-white border-[#FF6321]" : "bg-white text-[#8e8e80] border-[#e5e5e0]"
                    )}
                  >
                    English
                  </button>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => startListening('tutor')}
                    className={cn(
                      "p-3 rounded-full transition-colors",
                      isListening ? "bg-red-500 text-white animate-pulse" : "text-[#FF6321] hover:bg-[#fff4e6]"
                    )}
                  >
                    <Mic size={20} />
                  </button>
                  <input 
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={tutorInputLang === 'fr-FR' ? "Écrivez en français..." : "Write in English..."}
                    className="flex-1 bg-[#fff4e6] border-none rounded-full px-5 py-3 text-sm focus:ring-2 focus:ring-[#FF6321] outline-none"
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={!input.trim() || isTyping}
                    className="w-12 h-12 bg-[#FF6321] text-white rounded-full flex items-center justify-center disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Navigation */}
      {['home', 'listen', 'daily', 'profile'].includes(view) && (
        <footer className="p-6 border-t border-[#e5e5e0] bg-[#fdfdfb] flex justify-around">
          <button 
            onClick={() => setView('home')}
            className={cn("flex flex-col items-center gap-1 transition-colors", view === 'home' || view === 'lessons' || view === 'lesson-detail' || view === 'quiz' || view === 'grammar' ? "text-[#FF6321]" : "text-[#8e8e80] hover:text-[#FF6321]")}
          >
            <Globe size={20} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Explore</span>
          </button>
          <button 
            onClick={() => setView('listen')}
            className={cn("flex flex-col items-center gap-1 transition-colors", view === 'listen' ? "text-[#FF6321]" : "text-[#8e8e80] hover:text-[#FF6321]")}
          >
            <Headphones size={20} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Listen</span>
          </button>
          <button 
            onClick={() => setView('daily')}
            className={cn("flex flex-col items-center gap-1 transition-colors", view === 'daily' ? "text-[#FF6321]" : "text-[#8e8e80] hover:text-[#FF6321]")}
          >
            <Sparkles size={20} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Daily</span>
          </button>
          <button 
            onClick={() => setView('profile')}
            className={cn("flex flex-col items-center gap-1 transition-colors", view === 'profile' ? "text-[#FF6321]" : "text-[#8e8e80] hover:text-[#FF6321]")}
          >
            <User size={20} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Profile</span>
          </button>
        </footer>
      )}
    </div>
  );
}
