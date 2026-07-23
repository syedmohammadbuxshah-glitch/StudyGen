import React, { useState, useEffect, useRef } from "react";
import { jsPDF } from "jspdf";
import { LoginPage } from "./components/LoginPage";
import {
  Sparkles,
  Star,
  Upload,
  Download,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Moon,
  Sun,
  Flame,
  BookOpen,
  HelpCircle,
  GraduationCap,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  Calendar,
  RefreshCw,
  Trophy,
  ChevronRight,
  Plus,
  Trash2,
  FileText,
  Play,
  Lightbulb,
  Check,
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldAlert,
  Shield,
  Search,
  Image,
  LogOut,
  Settings,
  Database,
  Key,
  Copy,
  UserPlus
} from "lucide-react";

// Types
interface QuizQuestion {
  id: string;
  type: "mcq" | "true_false" | "short";
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

interface Flashcard {
  id: string;
  front: string;
  back: string;
}

interface StudyDay {
  day: string;
  focusSubject: string;
  tasks: string[];
  studyMethod: string;
  motivationQuote?: string;
}

interface StudyPlan {
  studyDays: StudyDay[];
  generalSuccessTips: string[];
}

export default function App() {
  // Theme & App Settings
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("studygen_dark_mode");
    return saved === "true";
  });

  // Gamification & Streaks State
  const [streak, setStreak] = useState<number>(() => {
    const saved = localStorage.getItem("studygen_streak");
    return saved ? parseInt(saved, 10) : 3; // start with a nice default streak
  });
  const [xp, setXp] = useState<number>(() => {
    const saved = localStorage.getItem("studygen_xp");
    return saved ? parseInt(saved, 10) : 120;
  });
  const [loggedToday, setLoggedToday] = useState<boolean>(() => {
    const saved = localStorage.getItem("studygen_logged_today");
    return saved === new Date().toDateString();
  });

  // Streak history check-in tracking (holds Date.toDateString() list)
  const [streakHistory, setStreakHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem("studygen_streak_history");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    // Set some default past dates matching the default 3-day streak to look nice and populated!
    const history = [];
    const today = new Date();
    for (let i = 1; i <= 3; i++) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      history.push(d.toDateString());
    }
    return history;
  });

  const [showStreakCelebration, setShowStreakCelebration] = useState<boolean>(false);

  // PDF & Text Material State
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [notesText, setNotesText] = useState<string>(() => {
    return localStorage.getItem("studygen_notes_text") || "";
  });
  const [uploadLoading, setUploadLoading] = useState<boolean>(false);
  const [pastedText, setPastedText] = useState<string>("");

  // AI Summarizer State
  const [summary, setSummary] = useState<string>(() => {
    return localStorage.getItem("studygen_summary") || "";
  });
  const [summarizeLoading, setSummarizeLoading] = useState<boolean>(false);

  // Ask Question State
  const [question, setQuestion] = useState<string>("");
  const [qaHistory, setQaHistory] = useState<Array<{ q: string; a: string }>>(() => {
    const saved = localStorage.getItem("studygen_qa_history");
    return saved ? JSON.parse(saved) : [];
  });
  const [qaLoading, setQaLoading] = useState<boolean>(false);
  const [isDictatingQuestion, setIsDictatingQuestion] = useState<boolean>(false);

  // Quiz State
  const [quizzes, setQuizzes] = useState<QuizQuestion[]>(() => {
    const saved = localStorage.getItem("studygen_quizzes");
    return saved ? JSON.parse(saved) : [];
  });
  const [currentQuizIndex, setCurrentQuizIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
  const [score, setScore] = useState<number>(0);
  const [quizLoading, setQuizLoading] = useState<boolean>(false);
  const [shortAnswerInputs, setShortAnswerInputs] = useState<Record<string, string>>({});

  // Flashcard State
  const [flashcards, setFlashcards] = useState<Flashcard[]>(() => {
    const saved = localStorage.getItem("studygen_flashcards");
    return saved ? JSON.parse(saved) : [];
  });
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [flashcardLoading, setFlashcardLoading] = useState<boolean>(false);

  // Explain Like I'm 10 State
  const [eliTopic, setEliTopic] = useState<string>("");
  const [eliExplanation, setEliExplanation] = useState<string>("");
  const [eliLoading, setEliLoading] = useState<boolean>(false);

  // Study Planner State
  const [plannerSubjects, setPlannerSubjects] = useState<string[]>(["Mathematics", "Computer Science"]);
  const [newSubject, setNewSubject] = useState<string>("");
  const [examDate, setExamDate] = useState<string>("2026-08-10");
  const [studyHours, setStudyHours] = useState<number>(2);
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(() => {
    const saved = localStorage.getItem("studygen_study_plan");
    return saved ? JSON.parse(saved) : null;
  });
  const [planLoading, setPlanLoading] = useState<boolean>(false);
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("studygen_completed_tasks");
    return saved ? JSON.parse(saved) : {};
  });

  // UI Active Workspace Tab
  const [activeTab, setActiveTab] = useState<"summary" | "qa" | "quiz" | "flashcards" | "visual" | "admin">("summary");

  // Authentication State
  const [user, setUser] = useState<{ username: string; role: string } | null>(() => {
    const saved = localStorage.getItem("studygen_auth_user");
    return saved ? JSON.parse(saved) : null;
  });

  // Visual AI Image Analyzer State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState<string>("");
  const [imageAnalysis, setImageAnalysis] = useState<string>("");
  const [imageLoading, setImageLoading] = useState<boolean>(false);

  // Admin Panel State & Security Authentication
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [adminLoading, setAdminLoading] = useState<boolean>(false);
  const [adminSearchQuery, setAdminSearchQuery] = useState<string>("");
  const [supabaseStatus, setSupabaseStatus] = useState<any>(null);
  const [showBottomAdminPanel, setShowBottomAdminPanel] = useState<boolean>(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [revealAllPasswords, setRevealAllPasswords] = useState<boolean>(true);
  const [newAdminUsername, setNewAdminUsername] = useState<string>("");
  const [newAdminPassword, setNewAdminPassword] = useState<string>("");
  const [newAdminRole, setNewAdminRole] = useState<string>("user");
  const [createUserError, setCreateUserError] = useState<string>("");
  const [createUserSuccess, setCreateUserSuccess] = useState<string>("");
  const [copiedUser, setCopiedUser] = useState<string>("");

  // Master Security PIN / Key State
  const [adminKey, setAdminKey] = useState<string>("");
  const [showPinAuthModal, setShowPinAuthModal] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>("");
  const [pinAuthError, setPinAuthError] = useState<string>("");
  const [showChangePinModal, setShowChangePinModal] = useState<boolean>(false);
  const [oldPinInput, setOldPinInput] = useState<string>("");
  const [newPinInput, setNewPinInput] = useState<string>("");
  const [changePinError, setChangePinError] = useState<string>("");
  const [changePinSuccess, setChangePinSuccess] = useState<string>("");

  const getActiveAdminKey = () => adminKey;

  const togglePasswordVisibility = (username: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [username]: !prev[username]
    }));
  };

  const handleOpenAdminPanel = () => {
    const key = getActiveAdminKey();
    if (key) {
      fetchUsers(key);
      fetchSupabaseStatus();
      setShowBottomAdminPanel(true);
      return;
    }
    setPinInput("");
    setPinAuthError("");
    setShowPinAuthModal(true);
  };

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinAuthError("");
    if (!pinInput.trim()) {
      setPinAuthError("Please enter the Master Admin PIN.");
      return;
    }
    try {
      const res = await fetch("/api/admin/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Incorrect Admin PIN. Access Denied.");
      }
      const verifiedKey = pinInput.trim();
      setAdminKey(verifiedKey);
      setShowPinAuthModal(false);
      fetchUsers(verifiedKey);
      fetchSupabaseStatus();
      setShowBottomAdminPanel(true);
    } catch (err: any) {
      setPinAuthError(err.message || "Access Denied.");
    }
  };

  const handleChangeAdminPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePinError("");
    setChangePinSuccess("");
    if (!oldPinInput.trim() || !newPinInput.trim()) {
      setChangePinError("Both current and new PIN are required.");
      return;
    }
    try {
      const res = await fetch("/api/admin/change-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPin: oldPinInput.trim(), newPin: newPinInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update PIN.");
      }
      setChangePinSuccess("Admin Master Security PIN updated successfully!");
      setAdminKey(newPinInput.trim());
      setOldPinInput("");
      setNewPinInput("");
    } catch (err: any) {
      setChangePinError(err.message || "Failed to update PIN.");
    }
  };

  const handleAdminCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateUserError("");
    setCreateUserSuccess("");
    if (!newAdminUsername.trim() || !newAdminPassword.trim()) {
      setCreateUserError("Please enter username/email and password.");
      return;
    }
    try {
      const res = await fetch("/api/admin/users/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": getActiveAdminKey()
        },
        body: JSON.stringify({
          username: newAdminUsername.trim(),
          password: newAdminPassword.trim(),
          role: newAdminRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create user.");
      }
      setCreateUserSuccess(`Account '${newAdminUsername}' created!`);
      setNewAdminUsername("");
      setNewAdminPassword("");
      fetchUsers();
    } catch (err: any) {
      setCreateUserError(err.message || "Failed to create user.");
    }
  };

  const handleChangePassword = async (targetUsername: string) => {
    const newPassword = prompt(`Enter new password for '${targetUsername}':`);
    if (!newPassword || newPassword.trim() === "") return;
    try {
      const res = await fetch("/api/admin/users/password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": getActiveAdminKey()
        },
        body: JSON.stringify({ username: targetUsername, newPassword: newPassword.trim() }),
      });
      if (res.ok) {
        alert(`Password for '${targetUsername}' updated successfully!`);
        fetchUsers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const copyCredentials = (u: string, p: string) => {
    navigator.clipboard.writeText(`Username: ${u}\nPassword: ${p}`);
    setCopiedUser(u);
    setTimeout(() => setCopiedUser(""), 2000);
  };

  const handleLogin = async (usernameInput: string, passwordInput: string) => {
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: usernameInput, password: passwordInput }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }
      localStorage.setItem("studygen_auth_user", JSON.stringify(data.user));
      setUser(data.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const handleRegister = async (usernameInput: string, passwordInput: string) => {
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: usernameInput, password: passwordInput }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }
      localStorage.setItem("studygen_auth_user", JSON.stringify(data.user));
      setUser(data.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("studygen_auth_user");
    setUser(null);
    setActiveTab("summary");
  };

  const fetchUsers = async (overrideKey?: string) => {
    const key = overrideKey || getActiveAdminKey();
    try {
      setAdminLoading(true);
      const response = await fetch("/api/admin/users", {
        headers: { "x-admin-key": key }
      });
      const data = await response.json();
      if (response.ok) {
        setAllUsers(data.users || []);
      } else {
        setAllUsers([]);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setAdminLoading(false);
    }
  };

  const fetchSupabaseStatus = async () => {
    try {
      const response = await fetch("/api/supabase/status");
      const data = await response.json();
      setSupabaseStatus(data);
    } catch (err) {
      console.error("Error checking Supabase status:", err);
    }
  };

  useEffect(() => {
    if (user?.role === "admin" && activeTab === "admin") {
      fetchUsers();
      fetchSupabaseStatus();
    }
  }, [user, activeTab]);

  const handleUpdateRole = async (targetUsername: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    try {
      const res = await fetch("/api/admin/users/role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": getActiveAdminKey()
        },
        body: JSON.stringify({ username: targetUsername, newRole }),
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteUser = async (targetUsername: string) => {
    if (!confirm(`Are you sure you want to remove user '${targetUsername}'?`)) return;
    try {
      const res = await fetch("/api/admin/users/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": getActiveAdminKey()
        },
        body: JSON.stringify({ username: targetUsername }),
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeImage = async () => {
    if (!selectedImage) return;
    try {
      setImageLoading(true);
      setImageAnalysis("");
      const response = await fetch("/api/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: selectedImage,
          prompt: imagePrompt,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze image");
      }
      setImageAnalysis(data.analysis || "No response received.");
    } catch (err: any) {
      setImageAnalysis(`Error: ${err.message || "Something went wrong."}`);
    } finally {
      setImageLoading(false);
    }
  };

  // LIVE VOICE AGENT STATE (Matches reference picture)
  const [voiceAgentActive, setVoiceAgentActive] = useState<boolean>(false);
  const [voiceAgentState, setVoiceAgentState] = useState<"idle" | "listening" | "speaking">("idle");
  const [voiceTranscript, setVoiceTranscript] = useState<string>("Click 'Speak with Tutor' to start studying together! ✨");
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [useRealtimeLive, setUseRealtimeLive] = useState<boolean>(true);
  
  // Speech synthesis and recognition refs
  const recognitionRef = useRef<any>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Gemini Live API audio refs
  const liveWsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const nextStartTimeRef = useRef<number>(0);

  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupLiveVoiceSession();
    };
  }, []);

  // Sync state to localStorage
  useEffect(() => {
    // Robust mount-time daily streak maintenance check
    const lastLoggedStr = localStorage.getItem("studygen_logged_today");
    if (lastLoggedStr) {
      const lastLoggedDate = new Date(lastLoggedStr);
      const today = new Date();
      
      const d1 = new Date(lastLoggedDate.getFullYear(), lastLoggedDate.getMonth(), lastLoggedDate.getDate());
      const d2 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const diffTime = d2.getTime() - d1.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 1) {
        // Broke streak! Reset streak to 0
        setStreak(0);
        localStorage.setItem("studygen_streak", "0");
      }
    } else {
      // If there's no logged date history yet, pretend they checked in yesterday to preserve the default 3-day streak!
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      localStorage.setItem("studygen_logged_today", yesterday.toDateString());
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("studygen_streak_history", JSON.stringify(streakHistory));
  }, [streakHistory]);

  useEffect(() => {
    localStorage.setItem("studygen_dark_mode", String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem("studygen_streak", String(streak));
    localStorage.setItem("studygen_xp", String(xp));
  }, [streak, xp]);

  useEffect(() => {
    localStorage.setItem("studygen_notes_text", notesText);
  }, [notesText]);

  useEffect(() => {
    localStorage.setItem("studygen_summary", summary);
  }, [summary]);

  useEffect(() => {
    localStorage.setItem("studygen_qa_history", JSON.stringify(qaHistory));
  }, [qaHistory]);

  useEffect(() => {
    localStorage.setItem("studygen_quizzes", JSON.stringify(quizzes));
  }, [quizzes]);

  useEffect(() => {
    localStorage.setItem("studygen_flashcards", JSON.stringify(flashcards));
  }, [flashcards]);

  useEffect(() => {
    localStorage.setItem("studygen_study_plan", JSON.stringify(studyPlan));
  }, [studyPlan]);

  useEffect(() => {
    localStorage.setItem("studygen_completed_tasks", JSON.stringify(completedTasks));
  }, [completedTasks]);

  // Handle Level calculation based on XP
  const userLevel = Math.floor(xp / 100) + 1;
  const xpInCurrentLevel = xp % 100;

  // Store the active states in refs so speech recognition event handlers always have fresh values without triggering recreation!
  const voiceAgentActiveRef = useRef(voiceAgentActive);
  const voiceAgentStateRef = useRef(voiceAgentState);
  const notesTextRef = useRef(notesText);

  useEffect(() => {
    voiceAgentActiveRef.current = voiceAgentActive;
  }, [voiceAgentActive]);

  useEffect(() => {
    voiceAgentStateRef.current = voiceAgentState;
  }, [voiceAgentState]);

  useEffect(() => {
    notesTextRef.current = notesText;
  }, [notesText]);

  // Web Speech API initialization
  useEffect(() => {
    // @ts-ignore
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionClass) {
      const rec = new SpeechRecognitionClass();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onstart = () => {
        setVoiceAgentState("listening");
        setVoiceTranscript("I am listening... Ask or say 'Quiz me!' 🎙️");
      };

      rec.onresult = async (event: any) => {
        const spokenText = event.results[0][0].transcript;
        setVoiceTranscript(`You: "${spokenText}"`);
        setVoiceAgentState("speaking");
        await handleVoiceAgentQuery(spokenText, notesTextRef.current);
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition error:", e);
        setVoiceAgentState("idle");
        setVoiceTranscript("Could not hear you clearly. Let's try again! ✨");
      };

      rec.onend = () => {
        // Automatically switch back to idle if we aren't fetching or speaking
        if (voiceAgentStateRef.current === "listening") {
          setVoiceAgentState("idle");
        }
      };

      recognitionRef.current = rec;
    }
  }, []);

  // Voice dictation helper for standard Q&A input
  const startQuestionDictation = () => {
    // @ts-ignore
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      alert("Voice input is not supported in this browser. Try Chrome or Safari!");
      return;
    }
    const dictation = new SpeechRec();
    dictation.lang = "en-US";
    dictation.onstart = () => {
      setIsDictatingQuestion(true);
      setQuestion("Listening...");
    };
    dictation.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setQuestion(text);
    };
    dictation.onerror = () => {
      setIsDictatingQuestion(false);
    };
    dictation.onend = () => {
      setIsDictatingQuestion(false);
    };
    dictation.start();
  };

  // Speaks text aloud using native SpeechSynthesis
  const speakText = (text: string) => {
    if (isMuted) return;
    window.speechSynthesis.cancel(); // cancel any active speech

    // Clean up text for easier reading
    const cleanText = text.replace(/[*#_`✨⭐]/g, "").trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    
    // Attempt to select a clear English voice
    const voices = window.speechSynthesis.getVoices();
    const premiumVoice = voices.find(v => v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha")));
    if (premiumVoice) {
      utterance.voice = premiumVoice;
    }

    utterance.onstart = () => {
      setVoiceAgentState("speaking");
    };

    utterance.onend = () => {
      setVoiceAgentState("idle");
      // Seamless interactive loop: automatically start listening when AI finishes speaking!
      if (voiceAgentActiveRef.current && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.log("Speech recognition auto-start error or already running", e);
        }
      }
    };

    utterance.onerror = () => {
      setVoiceAgentState("idle");
      if (voiceAgentActiveRef.current && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          // ignore
        }
      }
    };

    activeUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Handle active Voice Agent responses
  const handleVoiceAgentQuery = async (queryText: string, context?: string) => {
    const textToUse = context !== undefined ? context : notesText;
    try {
      setVoiceAgentState("speaking");
      setVoiceTranscript("StudyGen is thinking... 🧠");

      const response = await fetch("/api/voice-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: queryText,
          contextText: textToUse
        })
      });

      if (!response.ok) throw new Error("Voice tutor server error");
      const data = await response.json();
      
      setVoiceTranscript(`StudyGen: "${data.responseText}"`);
      addXp(10);
      speakText(data.responseText);
    } catch (err) {
      console.error(err);
      setVoiceTranscript("Oops, my audio system glitched! Ask me again in a moment. ✨");
      setVoiceAgentState("idle");
    }
  };

  // Toggle Live Voice Agent Active State
  const toggleVoiceAgent = () => {
    if (!voiceAgentActive) {
      setVoiceAgentActive(true);
      if (useRealtimeLive) {
        startLiveVoiceSession();
      } else {
        toggleStandardVoiceAgent(true);
      }
    } else {
      if (useRealtimeLive) {
        cleanupLiveVoiceSession();
      } else {
        toggleStandardVoiceAgent(false);
      }
      setVoiceAgentActive(false);
      setVoiceAgentState("idle");
      setVoiceTranscript("Click 'Speak with Tutor' to start studying together! ✨");
    }
  };

  const toggleStandardVoiceAgent = (activate: boolean) => {
    if (activate) {
      const greeting = "Hi there! I am your live AI tutor. I can explain any concept or quiz you directly from your lecture notes. What are we studying today? ✨";
      setVoiceTranscript(`StudyGen: "${greeting}"`);
      setTimeout(() => speakText(greeting), 200);
    } else {
      window.speechSynthesis.cancel();
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    }
  };

  // -------------------------------------------------------------
  // REAL-TIME AUDIO VOICE SESSION (GEMINI LIVE API VIA WEBSOCKETS)
  // -------------------------------------------------------------

  const floatTo16BitPCM = (input: Float32Array): ArrayBuffer => {
    const buffer = new ArrayBuffer(input.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    for (let i = 0; i < input.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, input[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
  };

  const pcmToBase64 = (float32Array: Float32Array): string => {
    const buffer = floatTo16BitPCM(float32Array);
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const startLiveVoiceSession = async () => {
    try {
      setVoiceAgentState("listening");
      setVoiceTranscript("Connecting to Gemini Live Voice Agent... ⚡");

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/api/live-session`;
      const ws = new WebSocket(wsUrl);
      liveWsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connection established. Sending setup...");
        ws.send(JSON.stringify({
          type: "setup",
          contextText: notesTextRef.current
        }));
      };

      ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "ready") {
          setVoiceTranscript("Gemini Live connected! Speak into your microphone... 🎙️");
          setVoiceAgentState("listening");
          await startMicRecording(ws);
        } else if (msg.type === "audio") {
          setVoiceAgentState("speaking");
          setVoiceTranscript("Gemini Live is speaking... 🔊");
          playAudioChunk(msg.audio);
        } else if (msg.type === "interrupted") {
          console.log("Speech interrupted by student!");
          stopActivePlayback();
          setVoiceAgentState("listening");
          setVoiceTranscript("Listening... 🎙️");
        } else if (msg.type === "error") {
          console.error("Gemini Live session error:", msg.error);
          setVoiceTranscript(`Live API error: ${msg.error}. Falling back to standard voice mode.`);
          cleanupLiveVoiceSession();
          setUseRealtimeLive(false);
          toggleStandardVoiceAgent(true);
        } else if (msg.type === "closed") {
          console.log("Gemini Live session closed by server");
          cleanupLiveVoiceSession();
        }
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        setVoiceTranscript("Live connection failed. Falling back to standard voice mode.");
        cleanupLiveVoiceSession();
        setUseRealtimeLive(false);
        toggleStandardVoiceAgent(true);
      };

      ws.onclose = () => {
        console.log("WebSocket connection closed");
        cleanupLiveVoiceSession();
      };

    } catch (err: any) {
      console.error("Failed to start live session:", err);
      setVoiceTranscript(`Failed to start: ${err.message || err}. Falling back to standard voice mode.`);
      setUseRealtimeLive(false);
      toggleStandardVoiceAgent(true);
    }
  };

  const startMicRecording = async (ws: WebSocket) => {
    try {
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      inputAudioCtxRef.current = inputCtx;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const source = inputCtx.createMediaStreamSource(stream);
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(inputCtx.destination);

      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          // Quick threshold check to avoid sending absolute silence
          let hasSignal = false;
          for (let i = 0; i < inputData.length; i++) {
            if (Math.abs(inputData[i]) > 0.005) {
              hasSignal = true;
              break;
            }
          }
          if (hasSignal) {
            const base64 = pcmToBase64(inputData);
            ws.send(JSON.stringify({ type: "audio", audio: base64 }));
          }
        }
      };
    } catch (err) {
      console.error("Error capturing microphone:", err);
      throw err;
    }
  };

  const playAudioChunk = (base64Audio: string) => {
    try {
      if (!outputAudioCtxRef.current) {
        outputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const audioCtx = outputAudioCtxRef.current;

      const binary = atob(base64Audio);
      const len = binary.length;
      const buffer = new ArrayBuffer(len);
      const view = new DataView(buffer);
      for (let i = 0; i < len; i++) {
        view.setUint8(i, binary.charCodeAt(i));
      }

      const numSamples = len / 2;
      const float32Data = new Float32Array(numSamples);
      for (let i = 0; i < numSamples; i++) {
        const val = view.getInt16(i * 2, true);
        float32Data[i] = val / 32768.0;
      }

      const audioBuffer = audioCtx.createBuffer(1, numSamples, 24000);
      audioBuffer.getChannelData(0).set(float32Data);

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);

      const currentTime = audioCtx.currentTime;
      if (nextStartTimeRef.current < currentTime) {
        nextStartTimeRef.current = currentTime + 0.08;
      }

      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += audioBuffer.duration;

      activeSourcesRef.current.push(source);
      source.onended = () => {
        const idx = activeSourcesRef.current.indexOf(source);
        if (idx > -1) activeSourcesRef.current.splice(idx, 1);

        if (activeSourcesRef.current.length === 0) {
          setVoiceAgentState("listening");
          setVoiceTranscript("Listening... Ask me anything! 🎙️");
        }
      };
    } catch (err) {
      console.error("Error playing audio chunk:", err);
    }
  };

  const stopActivePlayback = () => {
    activeSourcesRef.current.forEach(src => {
      try { src.stop(); } catch (e) {}
    });
    activeSourcesRef.current = [];
    nextStartTimeRef.current = 0;
  };

  const cleanupLiveVoiceSession = () => {
    stopActivePlayback();
    
    if (processorRef.current) {
      try { processorRef.current.disconnect(); } catch (e) {}
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      } catch (e) {}
      mediaStreamRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      try { inputAudioCtxRef.current.close(); } catch (e) {}
      inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      try { outputAudioCtxRef.current.close(); } catch (e) {}
      outputAudioCtxRef.current = null;
    }
    if (liveWsRef.current) {
      try { liveWsRef.current.close(); } catch (e) {}
      liveWsRef.current = null;
    }
  };

  // Ask Voice Agent to speak & listen
  const triggerVoiceAgentListen = () => {
    if (useRealtimeLive) {
      // Real-time live is continually capturing in background, so no action needed.
      return;
    }
    if (recognitionRef.current) {
      window.speechSynthesis.cancel();
      try {
        recognitionRef.current.start();
      } catch (e) {
        // In case already started
        recognitionRef.current.stop();
      }
    } else {
      alert("Microphone/Speech Recognition is not supported by your browser. You can still use typed Q&A below!");
    }
  };

  // Reward XP helper
  const addXp = (amount: number) => {
    setXp(prev => {
      const next = prev + amount;
      return next;
    });
  };

  // Log Daily Study Session
  const logStudySession = () => {
    if (loggedToday) return;
    const today = new Date().toDateString();
    localStorage.setItem("studygen_logged_today", today);
    setLoggedToday(true);
    setStreak(prev => prev + 1);
    addXp(50); // Massive XP for logging daily!

    // Add to history list
    setStreakHistory(prev => {
      const next = prev.includes(today) ? prev : [today, ...prev];
      return next;
    });

    // Trigger visual celebration overlay modal
    setShowStreakCelebration(true);
  };

  // Client-side PDF Parsing with PDF.js
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadLoading(true);
    setUploadedFileName(file.name);

    try {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (isPdf) {
        // @ts-ignore
        const pdfjsLib = window.pdfjsLib;
        if (!pdfjsLib) {
          throw new Error("PDF parser loading. Please ensure you are connected to the internet.");
        }
        
        pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
        
        const reader = new FileReader();
        reader.onload = async function() {
          try {
            const typedarray = new Uint8Array(this.result as ArrayBuffer);
            const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
            let extractedText = "";
            const maxPages = Math.min(pdf.numPages, 12); // Parse up to 12 pages for optimal performance

            for (let i = 1; i <= maxPages; i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              const pageText = textContent.items.map((item: any) => item.str).join(" ");
              extractedText += `\n--- Page ${i} ---\n` + pageText;
            }

            if (pdf.numPages > 12) {
              extractedText += "\n\n*(Truncated: Only first 12 pages parsed for speed)*";
            }

            setNotesText(extractedText);
            addXp(30);
            setUploadLoading(false);
            
            // Automatically kickstart all AI study feature generations in parallel!
            triggerAutoGeneration(extractedText);
          } catch (err: any) {
            alert("Error parsing PDF pages: " + err.message);
            setUploadLoading(false);
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        // Plain text file
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          setNotesText(text);
          addXp(20);
          setUploadLoading(false);
          
          // Automatically kickstart all AI study feature generations in parallel!
          triggerAutoGeneration(text);
        };
        reader.readAsText(file);
      }
    } catch (err: any) {
      console.error(err);
      alert("Failed to parse file: " + err.message);
      setUploadLoading(false);
    }
  };

  // Paste Custom Notes Helper
  const handlePasteNotes = () => {
    if (!pastedText.trim()) return;
    const text = pastedText;
    setNotesText(text);
    setPastedText("");
    addXp(15);
    
    // Automatically kickstart all AI study feature generations in parallel!
    triggerAutoGeneration(text);
  };

  // Trigger Automatic AI Study Assistance Generation (Summary, Quizzes, Flashcards)
  const triggerAutoGeneration = async (textToUse: string) => {
    if (!textToUse.trim()) return;
    // Set active tab to summary and fire all endpoints in parallel for extreme speed!
    setActiveTab("summary");
    await Promise.all([
      handleSummarize(textToUse, true),
      handleGenerateQuiz(textToUse, true),
      handleGenerateFlashcards(textToUse, true)
    ]);
  };

  // Reset Notes Context
  const handleResetNotes = () => {
    if (confirm("Are you sure you want to clear your current notes?")) {
      setNotesText("");
      setUploadedFileName("");
      localStorage.removeItem("studygen_notes_text");
    }
  };

  // 1. AI Summarizer Action
  const handleSummarize = async (overrideText?: string, isAuto: boolean = false) => {
    const textToUse = overrideText !== undefined ? overrideText : notesText;
    if (!textToUse.trim()) {
      if (!isAuto) alert("Please upload a PDF or write notes first!");
      return;
    }
    setSummarizeLoading(true);
    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToUse })
      });
      if (!response.ok) throw new Error("Failed to summarize");
      const data = await response.json();
      setSummary(data.summary);
      addXp(40);
      setActiveTab("summary");
    } catch (err: any) {
      console.error("Auto summarize failed:", err);
      if (!isAuto) alert("Error: " + err.message);
    } finally {
      setSummarizeLoading(false);
    }
  };

  // 2. Ask Questions Action
  const handleAskQuestion = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!question.trim()) return;

    setQaLoading(true);
    const userQ = question;
    setQuestion("");

    try {
      const response = await fetch("/api/ask-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: notesText, question: userQ })
      });
      if (!response.ok) throw new Error("Failed to ask question");
      const data = await response.json();
      
      setQaHistory(prev => [{ q: userQ, a: data.answer }, ...prev]);
      addXp(25);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setQaLoading(false);
    }
  };

  // 3. Quiz Generator Action
  const handleGenerateQuiz = async (overrideText?: string, isAuto: boolean = false) => {
    const textToUse = overrideText !== undefined ? overrideText : notesText;
    if (!textToUse.trim()) {
      if (!isAuto) alert("Please upload a PDF or write notes first!");
      return;
    }
    setQuizLoading(true);
    setSelectedAnswers({});
    setRevealedAnswers({});
    setScore(0);
    setCurrentQuizIndex(0);

    try {
      const response = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToUse, numQuestions: 5 })
      });
      if (!response.ok) throw new Error("Failed to generate quiz");
      const data = await response.json();
      
      if (data.questions && data.questions.length > 0) {
        setQuizzes(data.questions);
        addXp(35);
      } else {
        throw new Error("No quiz questions returned.");
      }
    } catch (err: any) {
      console.error("Auto quiz generation failed:", err);
      if (!isAuto) alert("Error: " + err.message);
    } finally {
      setQuizLoading(false);
    }
  };

  // 4. Flashcard Generator Action
  const handleGenerateFlashcards = async (overrideText?: string, isAuto: boolean = false) => {
    const textToUse = overrideText !== undefined ? overrideText : notesText;
    if (!textToUse.trim()) {
      if (!isAuto) alert("Please upload a PDF or write notes first!");
      return;
    }
    setFlashcardLoading(true);
    setIsFlipped(false);
    setCurrentCardIndex(0);

    try {
      const response = await fetch("/api/generate-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToUse })
      });
      if (!response.ok) throw new Error("Failed to generate flashcards");
      const data = await response.json();

      if (data.flashcards && data.flashcards.length > 0) {
        setFlashcards(data.flashcards);
        addXp(30);
      } else {
        throw new Error("No flashcards returned.");
      }
    } catch (err: any) {
      console.error("Auto flashcard generation failed:", err);
      if (!isAuto) alert("Error: " + err.message);
    } finally {
      setFlashcardLoading(false);
    }
  };

  // 5. Explain Like I'm 10 Action
  const handleELI10 = async () => {
    if (!eliTopic.trim()) {
      alert("Please enter a topic to explain!");
      return;
    }
    setEliLoading(true);
    try {
      const response = await fetch("/api/explain-like-im-10", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: eliTopic, text: notesText })
      });
      if (!response.ok) throw new Error("Failed to explain");
      const data = await response.json();
      setEliExplanation(data.explanation);
      addXp(20);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setEliLoading(false);
    }
  };

  // 6. Study Planner Action
  const handleGeneratePlanner = async () => {
    if (plannerSubjects.length === 0) {
      alert("Please add at least one subject to plan!");
      return;
    }
    setPlanLoading(true);
    try {
      const response = await fetch("/api/study-planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjects: plannerSubjects,
          examDate: examDate,
          dailyHours: studyHours
        })
      });
      if (!response.ok) throw new Error("Failed to generate plan");
      const data = await response.json();
      setStudyPlan(data);
      addXp(50);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setPlanLoading(false);
    }
  };

  // Helper to add planner subject
  const addPlannerSubject = () => {
    if (newSubject.trim() && !plannerSubjects.includes(newSubject.trim())) {
      setPlannerSubjects([...plannerSubjects, newSubject.trim()]);
      setNewSubject("");
    }
  };

  // Helper to remove planner subject
  const removePlannerSubject = (subj: string) => {
    setPlannerSubjects(plannerSubjects.filter(s => s !== subj));
  };

  // Toggle checklist tasks in Planner
  const toggleTask = (taskId: string) => {
    setCompletedTasks(prev => {
      const updated = { ...prev, [taskId]: !prev[taskId] };
      if (updated[taskId]) {
        addXp(5); // Small reward for completing study tasks!
      }
      return updated;
    });
  };

  // 10. Download Summary as PDF using jsPDF
  const handleDownloadPDF = () => {
    if (!summary) {
      alert("No summary generated yet. Create one first!");
      return;
    }

    try {
      const doc = new jsPDF();
      
      // Page styling / margin
      const margin = 15;
      const pageWidth = doc.internal.pageSize.width;
      const contentWidth = pageWidth - (margin * 2);
      
      // Title
      doc.setFillColor(255, 123, 84); // Warm coral
      doc.rect(0, 0, pageWidth, 40, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.text("StudyGen Summary Report", margin, 25);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.text(`Generated on ${new Date().toLocaleDateString()} • Keep studying, reach for the stars! ✨`, margin, 34);

      // Reset text properties
      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);

      // Clean Markdown tags for PDF generation
      const cleanSummary = summary
        .replace(/###/g, "")
        .replace(/##/g, "")
        .replace(/#/g, "")
        .replace(/\*\*/g, "")
        .replace(/\*/g, "•")
        .trim();

      const splitText = doc.splitTextToSize(cleanSummary, contentWidth);
      
      let yPosition = 50;
      for (let i = 0; i < splitText.length; i++) {
        if (yPosition > 275) {
          doc.addPage();
          yPosition = 20; // reset y
          
          // Page divider line on new page
          doc.setDrawColor(240, 240, 240);
          doc.line(margin, 10, pageWidth - margin, 10);
        }
        doc.text(splitText[i], margin, yPosition);
        yPosition += 6.5;
      }

      doc.save(`StudyGen_Summary_${uploadedFileName ? uploadedFileName.replace(/\.[^/.]+$/, "") : "Notes"}.pdf`);
      addXp(15);
    } catch (err: any) {
      alert("Could not generate PDF: " + err.message);
    }
  };

  // Quiz helper to grade answer
  const handleSelectQuizAnswer = (optionKey: string) => {
    const activeQuiz = quizzes[currentQuizIndex];
    if (revealedAnswers[activeQuiz.id]) return; // already graded

    setSelectedAnswers(prev => ({ ...prev, [activeQuiz.id]: optionKey }));
    setRevealedAnswers(prev => ({ ...prev, [activeQuiz.id]: true }));

    const isCorrect = optionKey.charAt(0) === activeQuiz.correctAnswer.charAt(0);
    if (isCorrect) {
      setScore(prev => prev + 1);
      addXp(20);
    } else {
      addXp(5); // partial credit for trying
    }
  };

  if (!user) {
    return (
      <LoginPage
        onLogin={handleLogin}
        onRegister={handleRegister}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />
    );
  }

  return (
    <div id="studygen-root" className={`min-h-screen font-sans relative overflow-hidden ${darkMode ? "bg-[#2D1B69] text-white" : "bg-indigo-50/50 text-[#2D1B69]"} transition-colors duration-300`}>
      
      {/* Starry Background Elements */}
      {darkMode && (
        <>
          <div className="absolute top-10 left-20 w-1 h-1 bg-yellow-200 rounded-full shadow-[0_0_8px_white] opacity-80 pointer-events-none"></div>
          <div className="absolute top-40 left-80 w-2 h-2 bg-yellow-100 rounded-full shadow-[0_0_12px_white] opacity-60 pointer-events-none"></div>
          <div className="absolute top-20 right-40 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_10px_white] opacity-90 pointer-events-none"></div>
          <div className="absolute bottom-20 left-1/4 w-1 h-1 bg-yellow-200 rounded-full opacity-70 pointer-events-none"></div>
          <div className="absolute top-2/3 right-20 w-2 h-2 bg-white rounded-full shadow-[0_0_8px_yellow] opacity-50 pointer-events-none"></div>
        </>
      )}

      {/* Dynamic Star Elements for bright-star feeling */}
      <div className="absolute top-12 left-8 text-brand-secondary animate-star-float pointer-events-none opacity-60">
        <Star className="w-6 h-6 fill-brand-secondary" />
      </div>
      <div className="absolute top-24 right-16 text-brand-primary animate-star-float pointer-events-none opacity-40" style={{ animationDelay: "1s" }}>
        <Star className="w-5 h-5 fill-brand-primary" />
      </div>
      <div className="absolute bottom-16 left-12 text-brand-accent animate-pulse-glow pointer-events-none opacity-50">
        <Sparkles className="w-7 h-7" />
      </div>

      {/* Top Header Navigation */}
      <header id="main-header" className={`border-b sticky top-0 z-40 transition-all ${
        darkMode 
          ? "border-white/10 bg-[#2D1B69]/85 backdrop-blur-md text-white" 
          : "border-indigo-100 bg-white/85 backdrop-blur-md text-indigo-950"
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-tr from-brand-primary to-brand-secondary rounded-xl shadow-md flex items-center justify-center animate-pulse-glow">
              <GraduationCap className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <span className="font-display font-bold text-2xl bg-gradient-to-r from-brand-primary to-brand-accent bg-clip-text text-transparent tracking-tight">
                Study<span className="text-brand-secondary">Gen</span>
              </span>
              <span className={`text-[10px] block font-medium uppercase tracking-widest ${darkMode ? "text-indigo-200/80" : "text-slate-500"}`}>
                Intelligent Study Assistant ✨
              </span>
            </div>
          </div>

          {/* Core Gamified Stats Bar */}
          <div className="hidden md:flex items-center gap-6 text-sm">
            {/* XP and Levels */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className={`flex items-center gap-1 ${darkMode ? "text-brand-secondary" : "text-indigo-600"}`}>
                  <Trophy className="w-3.5 h-3.5 fill-current" /> Level {userLevel}
                </span>
                <span className={darkMode ? "text-indigo-200" : "text-slate-500"}>{xpInCurrentLevel}/100 XP</span>
              </div>
              <div className={`w-36 h-2 rounded-full overflow-hidden ${darkMode ? "bg-white/10" : "bg-slate-200"}`}>
                <div 
                  className="h-full bg-gradient-to-r from-brand-primary to-brand-secondary transition-all duration-500" 
                  style={{ width: `${xpInCurrentLevel}%` }}
                />
              </div>
            </div>

            {/* Streak Counter */}
            <button 
              onClick={logStudySession}
              disabled={loggedToday}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border transition-all ${
                loggedToday 
                  ? darkMode
                    ? "bg-white/10 border-white/20 text-brand-secondary"
                    : "bg-orange-500/10 border-orange-500/30 text-orange-500" 
                  : "bg-brand-secondary hover:opacity-90 text-[#2D1B69] border-transparent shadow-sm cursor-pointer font-bold"
              }`}
              title={loggedToday ? "Streak logged today!" : "Click to log your daily study session & maintain your streak!"}
            >
              <Flame className={`w-4.5 h-4.5 ${loggedToday ? "fill-current animate-pulse" : "fill-current"}`} />
              <span className="font-bold">{streak} Day Streak</span>
              {!loggedToday && <span className="text-[10px] font-bold bg-white/40 px-1 rounded">Log</span>}
            </button>
          </div>

          {/* Theme Toggle, User Info, & Sign Out */}
          <div className="flex items-center gap-2">
            <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
              darkMode ? "border-white/10 bg-white/5 text-indigo-200" : "border-indigo-100 bg-indigo-50/50 text-indigo-950"
            }`}>
              <User className="w-3.5 h-3.5 text-brand-primary" />
              <span className="capitalize">{user?.username}</span>
            </div>

            {user?.role === "admin" && (
              <div className="flex items-center gap-1 bg-red-500/10 text-red-400 border border-red-500/25 px-2.5 py-1.5 rounded-xl text-xs font-bold animate-pulse">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Admin</span>
              </div>
            )}

            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                darkMode 
                  ? "border-white/10 bg-white/10 hover:bg-white/20 text-brand-secondary" 
                  : "border-indigo-100 bg-indigo-50 hover:bg-indigo-100 text-indigo-900"
              }`}
              aria-label="Toggle Dark Mode"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={handleLogout}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                darkMode 
                  ? "border-white/10 bg-white/10 hover:bg-red-500/20 hover:text-red-400 text-indigo-200" 
                  : "border-indigo-100 bg-indigo-50 hover:bg-red-50 text-indigo-900 hover:text-red-600 hover:border-red-200 shadow-sm"
              }`}
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Workspace Wrapper */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        
        {/* MOBILE STREAK BAR */}
        <div className="md:hidden flex items-center justify-between p-3 mb-6 bg-amber-100/40 dark:bg-slate-900 border border-amber-200/50 dark:border-slate-800 rounded-2xl">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Lvl {userLevel} ({xpInCurrentLevel}/100 XP)</span>
          </div>
          <button 
            onClick={logStudySession}
            disabled={loggedToday}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
              loggedToday ? "bg-orange-500/10 text-orange-500" : "bg-brand-primary text-white"
            }`}
          >
            <Flame className="w-3.5 h-3.5 fill-current" />
            <span>{streak} Day Streak</span>
          </button>
        </div>

        {/* =======================================================
            8. LIVE VOICE AGENT COMPONENT (Matches Reference Image)
            ======================================================= */}
        <section id="voice-agent-section" className="mb-8 relative overflow-hidden rounded-3xl p-6 shadow-[0_0_50px_rgba(99,102,241,0.25)] border border-white/10 text-white bg-gradient-to-br from-[#120a3a] via-[#09051d] to-[#04020e] transition-all">
          
          {/* Symmetrical SVG contour wave lines at the bottom (matches reference image background) */}
          <div className="absolute bottom-0 left-0 right-0 h-24 overflow-hidden pointer-events-none opacity-30 z-0">
            <svg className="w-full h-full" viewBox="0 0 1000 100" preserveAspectRatio="none">
              <path
                d="M0,80 Q150,40 300,70 T600,40 T1000,80"
                fill="none"
                stroke="rgba(168, 85, 247, 0.4)"
                strokeWidth="1.5"
                className="animate-pulse"
              />
              <path
                d="M0,70 Q180,30 350,60 T700,30 T1000,70"
                fill="none"
                stroke="rgba(99, 102, 241, 0.3)"
                strokeWidth="1"
                style={{ animationDelay: "0.5s" }}
                className="animate-pulse"
              />
              <path
                d="M0,90 Q120,50 250,80 T500,50 T1000,90"
                fill="none"
                stroke="rgba(139, 92, 246, 0.2)"
                strokeWidth="1"
                style={{ animationDelay: "1s" }}
                className="animate-pulse"
              />
              <path
                d="M0,50 Q250,90 500,60 T750,90 T1000,50"
                fill="none"
                stroke="rgba(34, 211, 238, 0.3)"
                strokeWidth="1.5"
                className="animate-pulse"
              />
              <path
                d="M0,60 Q220,80 470,50 T720,80 T1000,60"
                fill="none"
                stroke="rgba(20, 184, 166, 0.2)"
                strokeWidth="1"
                style={{ animationDelay: "0.7s" }}
                className="animate-pulse"
              />
            </svg>
          </div>

          {/* Neon Star Accents inside agent container */}
          <div className="absolute top-4 right-4 animate-pulse text-brand-secondary/60">
            <Sparkles className="w-5 h-5 animate-star-float" />
          </div>
          <div className="absolute bottom-4 left-4 animate-pulse text-brand-primary/40" style={{ animationDelay: "1.5s" }}>
            <Star className="w-4 h-4 fill-current animate-star-float" />
          </div>

          <div className="flex flex-col items-center justify-center text-center relative z-10">
            <div className="mb-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                voiceAgentActive 
                  ? "bg-red-500/20 text-red-400 border-red-500/30 animate-pulse" 
                  : "bg-white/10 text-indigo-200 border-white/20"
              }`}>
                {voiceAgentActive 
                  ? (useRealtimeLive ? "🔴 Gemini Live Active (⚡ Real-time PCM)" : "🔴 Standard Voice Active (🌐 Browser Native)") 
                  : "⚪ Voice Session Offline"
                }
              </span>
            </div>
            
            <h2 className="font-display font-extrabold text-xl md:text-2xl tracking-tight mb-4">
              StudyGen Voice Q&A Tutor
            </h2>

            {/* Mode selection toggle */}
            <div className="mb-6 flex items-center gap-2 bg-[#0e0a30]/60 border border-white/10 p-1 rounded-full text-[11px] backdrop-blur-sm">
              <button
                onClick={() => {
                  if (voiceAgentActive) {
                    cleanupLiveVoiceSession();
                    setVoiceAgentActive(false);
                    setVoiceAgentState("idle");
                    setVoiceTranscript("Switched to Gemini Live! Click 'Start Voice Session' to begin. ⚡");
                  }
                  setUseRealtimeLive(true);
                }}
                className={`px-3.5 py-1.5 rounded-full font-bold transition-all cursor-pointer ${
                  useRealtimeLive 
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" 
                    : "text-indigo-300 hover:text-white"
                }`}
              >
                ⚡ Gemini Live (Audio Streaming)
              </button>
              <button
                onClick={() => {
                  if (voiceAgentActive) {
                    cleanupLiveVoiceSession();
                    setVoiceAgentActive(false);
                    setVoiceAgentState("idle");
                    setVoiceTranscript("Switched to Fallback! Click 'Start Voice Session' to begin. 🌐");
                  }
                  setUseRealtimeLive(false);
                }}
                className={`px-3.5 py-1.5 rounded-full font-bold transition-all cursor-pointer ${
                  !useRealtimeLive 
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20" 
                    : "text-indigo-300 hover:text-white"
                }`}
              >
                🌐 Browser Speech Fallback
              </button>
            </div>

            {/* Glowing Symmetrical Reference Design Visualizer */}
            <div className="flex items-center justify-center gap-4 md:gap-6 mb-6 w-full max-w-xl">
              
              {/* LEFT AUDIO WAVE (Tapering dots to vertical capsules) */}
              <div className="flex items-center gap-1.5 h-16">
                {/* Left Dots */}
                <div className="flex gap-1 items-center mr-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400/40 animate-ping" />
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400/60" />
                  <div className="w-2 h-2 rounded-full bg-indigo-400/80" />
                  <div className="w-2 h-2 rounded-full bg-purple-400" />
                </div>
                
                {/* Left Bars */}
                {[...Array(6)].map((_, i) => {
                  let hValue = "8px";
                  if (voiceAgentActive) {
                    if (voiceAgentState === "speaking") {
                      hValue = `${[18, 45, 30, 52, 38, 22][i] * (0.6 + Math.random() * 0.4)}px`;
                    } else if (voiceAgentState === "listening") {
                      hValue = `${[12, 22, 16, 28, 18, 12][i] * (0.8 + Math.sin(Date.now() / 200 + i) * 0.2)}px`;
                    } else {
                      hValue = `${[10, 14, 12, 16, 12, 10][i]}px`;
                    }
                  } else {
                    hValue = `${[8, 12, 10, 14, 10, 8][i]}px`;
                  }

                  return (
                    <div
                      key={`l-bar-${i}`}
                      className="w-1.5 rounded-full transition-all duration-300 bg-gradient-to-t from-[#3b82f6] via-[#6366f1] to-[#a855f7]"
                      style={{ 
                        height: hValue,
                        transition: "height 0.15s ease"
                      }}
                    />
                  );
                })}
              </div>

              {/* CENTRAL GLOSSY 3D APP ICON CARD */}
              <div 
                className={`w-24 h-24 rounded-[1.75rem] flex items-center justify-center shadow-[0_0_35px_rgba(99,102,241,0.5)] transition-all duration-500 relative p-[2px] bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-500 ${
                  voiceAgentActive ? "scale-105 animate-pulse" : "scale-100"
                }`}
              >
                <div className="w-full h-full rounded-[1.65rem] bg-gradient-to-br from-[#2e3fb8] via-[#1e2ea3] to-[#3b1fa3] flex flex-col items-center justify-center relative overflow-hidden border border-white/10">
                  {/* Glossy overlay reflection */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 pointer-events-none" />
                  
                  {/* AI Logo + Sparkle (Matches Image) */}
                  <div className="flex items-center gap-1">
                    <span className="font-sans font-black text-3xl tracking-tight text-white drop-shadow-md">
                      AI
                    </span>
                    <Sparkles className="w-6 h-6 text-white fill-current drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                  </div>
                </div>
              </div>

              {/* RIGHT AUDIO WAVE (Tapering vertical capsules to dots) */}
              <div className="flex items-center gap-1.5 h-16">
                {/* Right Bars */}
                {[...Array(6)].map((_, i) => {
                  const idx = 5 - i;
                  let hValue = "8px";
                  if (voiceAgentActive) {
                    if (voiceAgentState === "speaking") {
                      hValue = `${[18, 45, 30, 52, 38, 22][idx] * (0.6 + Math.random() * 0.4)}px`;
                    } else if (voiceAgentState === "listening") {
                      hValue = `${[12, 22, 16, 28, 18, 12][idx] * (0.8 + Math.sin(Date.now() / 200 + idx) * 0.2)}px`;
                    } else {
                      hValue = `${[10, 14, 12, 16, 12, 10][idx]}px`;
                    }
                  } else {
                    hValue = `${[8, 12, 10, 14, 10, 8][idx]}px`;
                  }

                  return (
                    <div
                      key={`r-bar-${i}`}
                      className="w-1.5 rounded-full transition-all duration-300 bg-gradient-to-t from-[#a855f7] via-[#6366f1] to-[#3b82f6]"
                      style={{ 
                        height: hValue,
                        transition: "height 0.15s ease"
                      }}
                    />
                  );
                })}

                {/* Right Dots */}
                <div className="flex gap-1 items-center ml-1">
                  <div className="w-2 h-2 rounded-full bg-purple-400" />
                  <div className="w-2 h-2 rounded-full bg-indigo-400/80" />
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400/60" />
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400/40 animate-ping" />
                </div>
              </div>

            </div>

            {/* Subtitle / Transcription Box */}
            <div className="w-full max-w-xl p-3.5 rounded-2xl mb-5 text-sm border bg-[#0e0a30]/80 border-white/10 text-indigo-100 backdrop-blur-md">
              <p className="leading-relaxed italic font-mono">
                {voiceTranscript}
              </p>
            </div>

            {/* Interactive Session Controls */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={toggleVoiceAgent}
                className={`px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all text-sm cursor-pointer ${
                  voiceAgentActive
                    ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/20 border border-red-400/30"
                    : "bg-indigo-600 text-white hover:bg-indigo-700 border border-indigo-500/30"
                }`}
              >
                <Volume2 className="w-4 h-4" />
                <span>{voiceAgentActive ? "Disconnect Session" : "Start Voice Session"}</span>
              </button>

              {voiceAgentActive && (
                <>
                  <button
                    onClick={triggerVoiceAgentListen}
                    disabled={voiceAgentState === "speaking"}
                    className={`px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all text-sm cursor-pointer ${
                      voiceAgentState === "listening"
                        ? "bg-brand-secondary text-[#2D1B69] animate-bounce"
                        : "bg-white/10 hover:bg-white/20 text-white border border-white/20 disabled:opacity-50"
                    }`}
                  >
                    <Mic className="w-4 h-4 text-brand-secondary" />
                    <span>{voiceAgentState === "listening" ? "Listening..." : "Speak/Ask"}</span>
                  </button>

                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition-all text-white cursor-pointer"
                    title={isMuted ? "Unmute AI speech synthesis" : "Mute AI speech synthesis"}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-green-400" />}
                  </button>
                </>
              )}
            </div>

            {/* Fast Suggestion Prompt Pills */}
            {voiceAgentActive && (
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <span className="text-xs font-semibold self-center text-indigo-200">Quick Prompts:</span>
                <button 
                  onClick={() => handleVoiceAgentQuery("Can you quiz me on my uploaded notes?", notesTextRef.current)} 
                  className="text-xs py-1 px-2.5 rounded-full border bg-white/10 hover:bg-white/20 text-white border-white/20 transition-all cursor-pointer"
                >
                  📝 "Quiz me on my notes"
                </button>
                <button 
                  onClick={() => handleVoiceAgentQuery("Explain the most difficult topic in my study material", notesTextRef.current)} 
                  className="text-xs py-1 px-2.5 rounded-full border bg-white/10 hover:bg-white/20 text-white border-white/20 transition-all cursor-pointer"
                >
                  🌟 "Explain hard concept"
                </button>
              </div>
            )}

          </div>
        </section>

        {/* Grid Workspace */}
        <div id="study-workspace-grid" className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* =======================================================
              LEFT SIDEBAR: UPLOAD NOTES & SETTINGS
              ======================================================= */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* 1. PDF / Notes Upload Card */}
            <div className={`p-6 rounded-3xl border transition-all ${
              darkMode 
                ? "bg-white/5 backdrop-blur-sm border-dashed border-white/20 shadow-xl" 
                : "bg-white border-dashed border-indigo-200 shadow-lg"
            }`}>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-brand-primary" />
                <h3 className="font-display font-extrabold text-lg">
                  1. Study Material Hub
                </h3>
              </div>

              {/* Upload Dropzone */}
              <div className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all ${
                darkMode 
                  ? "border-white/10 hover:border-brand-primary bg-[#2D1B69]/40" 
                  : "border-indigo-200 hover:border-brand-primary bg-indigo-50/20"
              }`}>
                <input
                  type="file"
                  id="pdf-input"
                  accept="application/pdf, text/plain"
                  onChange={handlePdfUpload}
                  className="hidden"
                />
                <label htmlFor="pdf-input" className="cursor-pointer block">
                  <div className={`mx-auto w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                    darkMode ? "bg-white/10" : "bg-indigo-100"
                  }`}>
                    <Upload className="w-6 h-6 text-brand-primary animate-pulse" />
                  </div>
                  <p className="text-sm font-bold">Upload Lecture Note PDF / TXT</p>
                  <p className={`text-xs mt-1 ${darkMode ? "text-indigo-200" : "text-slate-500"}`}>Supports notes, books up to 12 pages</p>
                </label>
              </div>

              {/* Uploading State */}
              {uploadLoading && (
                <div className="mt-3 flex items-center gap-2 text-xs text-brand-primary font-semibold">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing document content with AI...</span>
                </div>
              )}

              {/* pasted text option */}
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
                <p className={`text-xs font-semibold mb-2 ${darkMode ? "text-indigo-200" : "text-slate-500"}`}>Or paste study text directly:</p>
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste lecture text, key definitions, or formulas here..."
                  className={`w-full h-20 text-xs p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all ${
                    darkMode ? "bg-[#2D1B69]/60 border-white/15 text-white" : "bg-slate-50 border-indigo-100"
                  }`}
                />
                <button
                  onClick={handlePasteNotes}
                  className={`mt-2 w-full font-semibold py-1.5 px-3 rounded-xl text-xs transition-all cursor-pointer ${
                    darkMode 
                      ? "bg-white/10 hover:bg-white/20 text-white" 
                      : "bg-slate-800 hover:opacity-90 text-white"
                  }`}
                >
                  Add Pasted Text
                </button>
              </div>

              {/* Display Uploaded Context Meta */}
              {notesText && (
                <div className={`mt-4 p-3 rounded-xl text-xs flex items-center justify-between border ${
                  darkMode ? "bg-white/10 border-white/15 text-white" : "bg-indigo-50/50 border-indigo-200"
                }`}>
                  <div className="flex items-center gap-2 overflow-hidden mr-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <div className="truncate">
                      <p className={`font-bold truncate ${darkMode ? "text-white" : "text-slate-700"}`}>
                        {uploadedFileName || "Manual Text Input"}
                      </p>
                      <p className={`text-[10px] ${darkMode ? "text-indigo-200" : "text-slate-500"}`}>
                        Active context: {(notesText.length / 1000).toFixed(1)}k characters
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleResetNotes}
                    className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                    title="Clear current notes text"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* 1.5 DAILY STREAK & HABIT TRACKER CARD */}
            <div className={`p-6 rounded-3xl border transition-all ${
              darkMode 
                ? "bg-gradient-to-br from-[#120a3a]/90 via-[#0a0524]/95 to-[#04020e] border-white/10 shadow-[0_0_30px_rgba(249,115,22,0.15)] text-white" 
                : "bg-white border-orange-100 shadow-[0_8px_30px_rgba(249,115,22,0.06)] text-indigo-950"
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500 fill-orange-500 animate-pulse" />
                  <h3 className="font-display font-extrabold text-lg">
                    2. Daily Streak & Habits
                  </h3>
                </div>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                  loggedToday 
                    ? "bg-green-500/10 text-green-500 border border-green-500/20" 
                    : "bg-orange-500/10 text-orange-500 border border-orange-500/20 animate-pulse"
                }`}>
                  {loggedToday ? "Completed Today" : "Action Needed"}
                </span>
              </div>

              <p className={`text-xs mb-4 leading-relaxed ${darkMode ? "text-indigo-200" : "text-slate-500"}`}>
                Studying consistently builds high-retention habits. Check in daily to keep your learning streak burning!
              </p>

              {/* 7-Day Habit Grid */}
              <div className="grid grid-cols-7 gap-1.5 mb-5 text-center">
                {(() => {
                  const list = [];
                  const today = new Date();
                  for (let i = 6; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(today.getDate() - i);
                    list.push(d);
                  }
                  return list.map((dateObj, idx) => {
                    const dateStr = dateObj.toDateString();
                    const isLogged = streakHistory.includes(dateStr);
                    const isCurrentDay = dateStr === today.toDateString();
                    const dayLabel = dateObj.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 3);
                    const dayNum = dateObj.getDate();

                    return (
                      <div key={idx} className="flex flex-col items-center">
                        <span className={`text-[10px] font-bold mb-1.5 ${
                          isCurrentDay 
                            ? "text-orange-500" 
                            : darkMode ? "text-indigo-300" : "text-slate-400"
                        }`}>
                          {dayLabel}
                        </span>
                        
                        <div 
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border ${
                            isLogged 
                              ? "bg-gradient-to-tr from-orange-500 to-amber-400 border-transparent text-white shadow-[0_0_12px_rgba(249,115,22,0.4)]"
                              : isCurrentDay
                              ? "bg-orange-500/10 border-orange-400 border-dashed text-orange-500 animate-pulse"
                              : darkMode
                              ? "bg-white/5 border-white/10 text-indigo-400"
                              : "bg-slate-50 border-slate-200 text-slate-400"
                          }`}
                          title={`${dateStr}: ${isLogged ? "Logged" : "Not Logged"}`}
                        >
                          {isLogged ? (
                            <Flame className="w-4.5 h-4.5 fill-current text-white animate-pulse" />
                          ) : isCurrentDay ? (
                            <Flame className="w-4.5 h-4.5 text-orange-400 animate-pulse" />
                          ) : (
                            <span className="text-[11px] font-bold">{dayNum}</span>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Daily Habit Interaction Button */}
              {!loggedToday ? (
                <button
                  onClick={logStudySession}
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-95 text-white font-extrabold py-3 px-4 rounded-2xl text-sm transition-all shadow-[0_4px_15px_rgba(249,115,22,0.3)] hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Flame className="w-5 h-5 fill-current animate-bounce" />
                  <span>Log Today's Check-In (+50 XP)</span>
                </button>
              ) : (
                <div className={`w-full py-3 px-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 border ${
                  darkMode 
                    ? "bg-green-500/10 border-green-500/20 text-green-400" 
                    : "bg-green-50 border-green-100 text-green-600"
                }`}>
                  <CheckCircle2 className="w-4 h-4 fill-current animate-pulse text-green-500" />
                  <span>{streak} Day Streak Locked in For Today! 🔥</span>
                </div>
              )}
            </div>

            {/* 6. EXPLAIN LIKE I'M 10 (ELI5/10) CARD */}
            <div className={`p-6 rounded-3xl border transition-all ${
              darkMode ? "bg-white text-[#2D1B69] border-white/10 shadow-2xl" : "bg-indigo-50/50 text-indigo-950 border-indigo-100 shadow-lg"
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Lightbulb className={`w-5 h-5 ${darkMode ? "text-[#2D1B69] fill-indigo-100" : "text-brand-primary"}`} />
                  <h3 className="font-display font-extrabold text-lg">
                    6. Explain Like I'm 10
                  </h3>
                </div>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                  darkMode ? "text-[#2D1B69] bg-indigo-50" : "text-indigo-600 bg-indigo-100"
                }`}>
                  ELI10 Mode 🍭
                </span>
              </div>

              <p className={`text-xs mb-3 leading-relaxed ${darkMode ? "text-indigo-900/80" : "text-slate-500"}`}>
                Enter any difficult concept or word, and StudyGen will break it down into simple, fun analogies!
              </p>

              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={eliTopic}
                  onChange={(e) => setEliTopic(e.target.value)}
                  placeholder="e.g. Quantum Computing, Photosynthesis, DBMS..."
                  className={`flex-1 text-sm px-3.5 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all ${
                    darkMode ? "bg-indigo-50 border-indigo-100 text-indigo-950 placeholder-indigo-400" : "bg-slate-50 border-slate-200"
                  }`}
                />
                <button
                  onClick={handleELI10}
                  disabled={eliLoading || !eliTopic.trim()}
                  className="bg-[#2D1B69] text-white font-extrabold px-4 rounded-xl text-sm hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {eliLoading ? "Explaining..." : "Explain"}
                </button>
              </div>

              {eliExplanation && (
                <div className={`p-4 rounded-2xl border text-sm max-h-64 overflow-y-auto leading-relaxed ${
                  darkMode ? "bg-indigo-50/50 border-indigo-150 text-indigo-900" : "bg-indigo-50/20 border-indigo-100"
                }`}>
                  <p className="font-bold text-xs text-brand-primary mb-1 uppercase tracking-wider">👶 Simple Analogy:</p>
                  <p className="whitespace-pre-line">{eliExplanation}</p>
                </div>
              )}
            </div>

            {/* 7. STUDY PLANNER COMPONENT */}
            <div className={`p-6 rounded-3xl border transition-all ${
              darkMode ? "bg-[#342477] border-white/10 shadow-xl text-white" : "bg-white border-indigo-100 shadow-lg"
            }`}>
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-brand-primary" />
                <h3 className="font-display font-extrabold text-lg">
                  7. Study Planner
                </h3>
              </div>

              <div className="space-y-4 text-xs">
                {/* Subject Selector */}
                <div>
                  <label className={`block font-bold mb-1.5 ${darkMode ? "text-indigo-200" : "text-slate-500"}`}>Subjects to cover:</label>
                  <div className="flex gap-1.5 mb-2">
                    <input
                      type="text"
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      placeholder="e.g. Physics, Chemistry..."
                      className={`flex-1 text-xs p-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-brand-primary ${
                        darkMode ? "bg-[#2D1B69]/60 border-white/15 text-white placeholder-indigo-300" : "bg-slate-50 border-slate-200"
                      }`}
                    />
                    <button
                      onClick={addPlannerSubject}
                      className="bg-brand-primary text-slate-950 p-2 rounded-xl cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Subject Pills list */}
                  <div className="flex flex-wrap gap-1">
                    {plannerSubjects.map(subj => (
                      <span key={subj} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg font-bold ${
                        darkMode ? "bg-white/10 text-white" : "bg-indigo-100 text-indigo-900"
                      }`}>
                        {subj}
                        <button onClick={() => removePlannerSubject(subj)} className="text-red-400 font-bold hover:scale-110 ml-1">×</button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Exam Date & daily hours */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={`block font-bold mb-1 ${darkMode ? "text-indigo-200" : "text-slate-500"}`}>Exam Date:</label>
                    <input
                      type="date"
                      value={examDate}
                      onChange={(e) => setExamDate(e.target.value)}
                      className={`w-full text-xs p-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-brand-primary ${
                        darkMode ? "bg-[#2D1B69]/60 border-white/15 text-white" : "bg-slate-50 border-slate-200"
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block font-bold mb-1 ${darkMode ? "text-indigo-200" : "text-slate-500"}`}>Study hrs/day:</label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={studyHours}
                      onChange={(e) => setStudyHours(parseInt(e.target.value, 10))}
                      className={`w-full text-xs p-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-brand-primary ${
                        darkMode ? "bg-[#2D1B69]/60 border-white/15 text-white" : "bg-slate-50 border-slate-200"
                      }`}
                    />
                  </div>
                </div>

                <button
                  onClick={handleGeneratePlanner}
                  disabled={planLoading || plannerSubjects.length === 0}
                  className="w-full bg-gradient-to-r from-brand-primary to-brand-secondary text-slate-950 font-extrabold py-2.5 rounded-xl text-sm transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {planLoading ? "Generating Schedule..." : "Generate AI Study Plan 📅"}
                </button>

                {/* Study Plan Output */}
                {studyPlan && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10 space-y-3">
                    <h4 className="font-bold text-sm text-brand-primary">Your Timetable & Goals:</h4>
                    
                    <div className="space-y-3">
                      {studyPlan.studyDays.map((studyDay, idx) => (
                        <div key={idx} className={`p-3 rounded-2xl border ${
                          darkMode ? "bg-[#2D1B69]/40 border-white/10 text-white" : "bg-slate-50 border-slate-100"
                        }`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-extrabold text-brand-primary">{studyDay.day}</span>
                            <span className="text-[10px] bg-amber-400/20 text-brand-accent px-2 py-0.5 rounded-full font-bold">
                              {studyDay.focusSubject}
                            </span>
                          </div>
                          
                          <p className="text-[10px] text-slate-400 mb-2 italic">Method: {studyDay.studyMethod}</p>
                          
                          {/* Tasks Checkbox Checklist */}
                          <ul className="space-y-1.5">
                            {studyDay.tasks.map((task, taskIdx) => {
                              const taskId = `${idx}-${taskIdx}`;
                              const isDone = completedTasks[taskId];
                              return (
                                <li 
                                  key={taskId} 
                                  onClick={() => toggleTask(taskId)}
                                  className="flex items-start gap-2 cursor-pointer group"
                                >
                                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                                    isDone 
                                      ? "bg-green-500 border-green-500 text-white" 
                                      : "border-slate-300 dark:border-white/20 group-hover:border-brand-primary"
                                  }`}>
                                    {isDone && <Check className="w-2.5 h-2.5 stroke-[4]" />}
                                  </div>
                                  <span className={`text-xs ${isDone ? "line-through text-slate-400" : darkMode ? "text-indigo-100" : "text-slate-700"}`}>
                                    {task}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ))}
                    </div>

                    <div className={`p-3 rounded-2xl border ${
                      darkMode ? "bg-[#2D1B69]/30 border-white/10 text-indigo-100" : "bg-indigo-50/20 border-indigo-100"
                    }`}>
                      <h5 className="font-bold text-xs mb-1">⭐ General Tips:</h5>
                      <ul className="list-disc list-inside space-y-1 text-[11px]">
                        {studyPlan.generalSuccessTips.slice(0, 3).map((tip, i) => (
                          <li key={i}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* =======================================================
              RIGHT AREA: INTERACTIVE TABS & OUTPUT WORKSPACE
              ======================================================= */}
          <div className="lg:col-span-7">
            
            {/* WORKSPACE NAVIGATION TABS */}
            <div className={`flex items-center gap-1.5 p-1 rounded-2xl mb-6 border ${
              darkMode ? "bg-white/10 backdrop-blur-md border-white/15" : "bg-white border-indigo-100"
            }`}>
              <button
                onClick={() => setActiveTab("summary")}
                className={`flex-1 py-2.5 rounded-xl text-xs md:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "summary"
                    ? "bg-brand-primary text-slate-950 shadow-md"
                    : darkMode
                    ? "text-indigo-200 hover:text-white"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Summary</span>
              </button>

              <button
                onClick={() => setActiveTab("qa")}
                className={`flex-1 py-2.5 rounded-xl text-xs md:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "qa"
                    ? "bg-brand-primary text-slate-950 shadow-md"
                    : darkMode
                    ? "text-indigo-200 hover:text-white"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                <span>Ask AI</span>
              </button>

              <button
                onClick={() => setActiveTab("quiz")}
                className={`flex-1 py-2.5 rounded-xl text-xs md:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "quiz"
                    ? "bg-brand-primary text-slate-950 shadow-md"
                    : darkMode
                    ? "text-indigo-200 hover:text-white"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Quiz</span>
              </button>

              <button
                onClick={() => setActiveTab("flashcards")}
                className={`flex-1 py-2.5 rounded-xl text-xs md:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "flashcards"
                    ? "bg-brand-primary text-slate-950 shadow-md"
                    : darkMode
                    ? "text-indigo-200 hover:text-white"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Cards</span>
              </button>

              <button
                onClick={() => setActiveTab("visual")}
                className={`flex-1 py-2.5 rounded-xl text-xs md:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "visual"
                    ? "bg-brand-primary text-slate-950 shadow-md"
                    : darkMode
                    ? "text-indigo-200 hover:text-white"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Image className="w-4 h-4" />
                <span>Visual AI</span>
              </button>

              {user?.role === "admin" && (
                <button
                  onClick={() => setActiveTab("admin")}
                  className={`flex-1 py-2.5 rounded-xl text-xs md:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === "admin"
                      ? "bg-red-500 text-white shadow-md font-extrabold"
                      : darkMode
                      ? "text-red-300 hover:text-red-200"
                      : "text-red-600 hover:text-red-800"
                  }`}
                >
                  <Settings className="w-4 h-4 animate-spin-slow" />
                  <span>Admin</span>
                </button>
              )}
            </div>

            {/* TAB CONTAINER CONTENT */}
            <div className={`p-6 rounded-3xl border transition-all min-h-[450px] ${
              darkMode ? "bg-[#443195] border-white/10 shadow-xl text-white" : "bg-white border-indigo-150 shadow-lg text-indigo-950"
            }`}>

              {/* =======================================================
                  TAB 1: AI SUMMARIZER WORKSPACE
                  ======================================================= */}
              {activeTab === "summary" && (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-display font-extrabold text-xl">
                        AI Summarizer
                      </h3>
                      <p className={`text-xs ${darkMode ? "text-indigo-200" : "text-slate-500"}`}>
                        Get instant takeaways and details from notes
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleSummarize}
                        disabled={summarizeLoading || !notesText.trim()}
                        className="bg-brand-primary hover:opacity-95 text-slate-950 text-xs font-bold py-2 px-3.5 rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-50 shadow-md cursor-pointer"
                      >
                        {summarizeLoading ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Summarizing...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-slate-950 fill-current" />
                            <span>Generate AI Summary</span>
                          </>
                        )}
                      </button>

                      {summary && (
                        <button
                          onClick={handleDownloadPDF}
                          className={`text-xs font-bold py-2 px-3.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                            darkMode 
                              ? "bg-white/10 hover:bg-white/20 text-white" 
                              : "bg-slate-800 hover:opacity-90 text-white"
                          }`}
                          title="Download summary report as PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {!summary && !summarizeLoading ? (
                    <div className="py-12 text-center">
                      <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                        darkMode ? "bg-white/10 text-brand-secondary" : "bg-indigo-100 text-indigo-600"
                      }`}>
                        <Sparkles className="w-8 h-8 text-brand-primary" />
                      </div>
                      <p className={`text-sm font-bold ${darkMode ? "text-white" : "text-slate-600"}`}>
                        No summary generated yet
                      </p>
                      <p className={`text-xs mt-1 max-w-sm mx-auto ${darkMode ? "text-indigo-200" : "text-slate-400"}`}>
                        Upload lecture material or paste text on the left sidebar, then click "Generate AI Summary".
                      </p>
                    </div>
                  ) : summarizeLoading ? (
                    <div className="py-20 text-center space-y-3">
                      <RefreshCw className="w-10 h-10 text-brand-primary animate-spin mx-auto" />
                      <p className="text-sm font-bold animate-pulse">Analyzing materials and organizing facts...</p>
                    </div>
                  ) : (
                    <div className={`p-5 rounded-2xl border leading-relaxed text-sm overflow-y-auto max-h-[500px] whitespace-pre-wrap ${
                      darkMode ? "bg-indigo-950/40 border-white/10 text-white" : "bg-indigo-50/10 border-indigo-100 text-indigo-950"
                    }`}>
                      {/* Standard summary rendering */}
                      <p className="whitespace-pre-line leading-relaxed">{summary}</p>
                    </div>
                  )}
                </div>
              )}

              {/* =======================================================
                  TAB 2: ASK QUESTIONS WORKSPACE
                  ======================================================= */}
              {activeTab === "qa" && (
                <div className="space-y-5">
                  <div>
                    <h3 className="font-display font-extrabold text-xl">
                      Ask StudyGen AI
                    </h3>
                    <p className={`text-xs ${darkMode ? "text-indigo-200" : "text-slate-500"}`}>
                      Query your notes instantly (e.g. "What is DBMS?" or "Summarize photosynthesis")
                    </p>
                  </div>

                  {/* Ask Question Form */}
                  <form onSubmit={handleAskQuestion} className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="Ask anything about your studies..."
                        className={`w-full text-sm pl-4 pr-10 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all ${
                          darkMode ? "bg-indigo-950/60 border-white/10 text-white" : "bg-slate-50 border-indigo-200"
                        }`}
                      />
                      
                      {/* Voice Dictation Button */}
                      <button
                        type="button"
                        onClick={startQuestionDictation}
                        className={`absolute right-2 top-2 p-1.5 rounded-lg transition-all ${
                          isDictatingQuestion 
                            ? "bg-red-500 text-white animate-pulse" 
                            : "text-slate-400 hover:text-brand-primary"
                        }`}
                        title="Voice Input (Speech to Text)"
                      >
                        <Mic className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={qaLoading || !question.trim()}
                      className="bg-brand-primary hover:opacity-95 text-slate-950 font-extrabold px-5 rounded-xl text-sm transition-all shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {qaLoading ? "Thinking..." : "Send"}
                    </button>
                  </form>

                  {/* Q&A Chat History list */}
                  <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                    {qaHistory.length === 0 ? (
                      <div className="py-12 text-center text-slate-400">
                        <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className={`text-sm font-bold ${darkMode ? "text-white" : "text-slate-500"}`}>No questions asked yet</p>
                        <p className={`text-xs ${darkMode ? "text-indigo-200" : "text-slate-400"}`}>Type or dictate a question above to begin active study Q&A!</p>
                      </div>
                    ) : (
                      qaHistory.map((item, i) => (
                        <div key={i} className={`space-y-2 pb-4 border-b ${darkMode ? "border-white/10" : "border-slate-100"}`}>
                          <div className="flex items-start gap-2">
                            <span className="text-xs bg-brand-primary text-slate-950 py-0.5 px-2 rounded-full font-bold">Q</span>
                            <p className={`text-sm font-bold ${darkMode ? "text-white" : "text-slate-800"}`}>{item.q}</p>
                          </div>
                          <div className={`p-4 rounded-2xl border text-sm whitespace-pre-wrap ${
                            darkMode ? "bg-indigo-950/40 border-white/10 text-indigo-100" : "bg-indigo-50/10 border-indigo-100 text-indigo-900"
                          }`}>
                            <p className="whitespace-pre-line leading-relaxed">{item.a}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* =======================================================
                  TAB 3: QUIZ GENERATOR WORKSPACE
                  ======================================================= */}
              {activeTab === "quiz" && (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-display font-extrabold text-xl">
                        AI Practice Quiz
                      </h3>
                      <p className={`text-xs ${darkMode ? "text-indigo-200" : "text-slate-500"}`}>
                        Test your memory retention on your current notes
                      </p>
                    </div>

                    <button
                      onClick={handleGenerateQuiz}
                      disabled={quizLoading}
                      className={`text-xs font-bold py-2 px-3.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                        darkMode 
                          ? "bg-white/10 hover:bg-white/20 text-white border border-white/20" 
                          : "bg-slate-800 hover:opacity-90 text-white"
                      }`}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${quizLoading ? "animate-spin" : ""}`} />
                      <span>{quizzes.length > 0 ? "Regenerate Quiz" : "Generate Custom Quiz"}</span>
                    </button>
                  </div>

                  {quizLoading ? (
                    <div className="py-20 text-center space-y-3">
                      <RefreshCw className="w-10 h-10 text-brand-primary animate-spin mx-auto" />
                      <p className="text-sm font-bold animate-pulse">Formulating challenging academic questions...</p>
                    </div>
                  ) : quizzes.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                      <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className={`text-sm font-bold ${darkMode ? "text-white" : "text-slate-600"}`}>No active quiz</p>
                      <p className={`text-xs mb-4 ${darkMode ? "text-indigo-200" : "text-slate-400"}`}>StudyGen can extract test questions automatically based on your material.</p>
                      <button
                        onClick={handleGenerateQuiz}
                        className="bg-brand-primary text-slate-950 text-xs font-bold py-2 px-4 rounded-xl cursor-pointer"
                      >
                        Start AI Quiz Now
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Progress header */}
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-brand-primary">Question {currentQuizIndex + 1} of {quizzes.length}</span>
                        <span className="text-green-400">Score: {score}/{quizzes.length}</span>
                      </div>

                      <div className={`w-full h-1.5 rounded-full overflow-hidden ${darkMode ? "bg-white/10" : "bg-slate-100"}`}>
                        <div 
                          className="h-full bg-brand-primary transition-all duration-300" 
                          style={{ width: `${((currentQuizIndex + 1) / quizzes.length) * 100}%` }}
                        />
                      </div>

                      {/* Active Question Body */}
                      {(() => {
                        const activeQ = quizzes[currentQuizIndex];
                        const selectedAns = selectedAnswers[activeQ.id];
                        const isRevealed = revealedAnswers[activeQ.id];

                        return (
                          <div className="space-y-4">
                            <div className={`p-4 rounded-2xl border ${
                              darkMode 
                                ? "bg-indigo-950/40 border-white/10 text-white" 
                                : "bg-indigo-50/50 border-indigo-200/50 text-indigo-950"
                            }`}>
                              <span className="inline-block px-2 py-0.5 rounded bg-brand-primary/20 text-brand-primary text-[9px] font-bold uppercase mb-2">
                                {activeQ.type === "mcq" ? "Multiple Choice" : activeQ.type === "true_false" ? "True/False" : "Short Theory Answer"}
                              </span>
                              <h4 className="font-bold text-sm md:text-base leading-relaxed">
                                {activeQ.question}
                              </h4>
                            </div>

                            {/* Render Options */}
                            {activeQ.type !== "short" ? (
                              <div className="grid grid-cols-1 gap-2.5">
                                {activeQ.options.map((opt) => {
                                  const optKey = opt.trim().charAt(0); // e.g. 'A', 'B'
                                  const isSelected = selectedAns === optKey;
                                  const isCorrectOption = optKey === activeQ.correctAnswer;
                                  
                                  let optionStyle = darkMode ? "bg-indigo-950/60 border-white/10 text-indigo-100 hover:bg-indigo-950/80" : "bg-slate-50 border-slate-200 hover:bg-slate-100";
                                  if (isRevealed) {
                                    if (isCorrectOption) {
                                      optionStyle = "bg-green-500/15 border-green-500 text-green-400";
                                    } else if (isSelected) {
                                      optionStyle = "bg-red-500/15 border-red-500 text-red-400";
                                    } else {
                                      optionStyle = "opacity-40 border-white/10";
                                    }
                                  } else if (isSelected) {
                                    optionStyle = "border-brand-primary bg-brand-primary/10 text-brand-primary";
                                  }

                                  return (
                                    <button
                                      key={opt}
                                      disabled={isRevealed}
                                      onClick={() => handleSelectQuizAnswer(optKey)}
                                      className={`w-full text-left p-3.5 rounded-xl border font-semibold text-xs md:text-sm transition-all flex items-center justify-between ${optionStyle}`}
                                    >
                                      <span>{opt}</span>
                                      {isRevealed && isCorrectOption && <Check className="w-4 h-4 text-green-500 shrink-0" />}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              // Short Answer Input
                              <div className="space-y-3">
                                <textarea
                                  value={shortAnswerInputs[activeQ.id] || ""}
                                  disabled={isRevealed}
                                  onChange={(e) => setShortAnswerInputs({ ...shortAnswerInputs, [activeQ.id]: e.target.value })}
                                  placeholder="Type your study response..."
                                  className={`w-full p-3.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary ${
                                    darkMode ? "bg-indigo-950/60 border-white/10 text-white" : "bg-slate-50 border-slate-200"
                                  }`}
                                />
                                {!isRevealed ? (
                                  <button
                                    onClick={() => {
                                      setRevealedAnswers({ ...revealedAnswers, [activeQ.id]: true });
                                      addXp(15);
                                    }}
                                    className="bg-brand-primary text-slate-950 font-bold py-2 px-4 rounded-xl text-xs cursor-pointer"
                                  >
                                    Reveal Model Answer
                                  </button>
                                ) : (
                                  <div className={`p-4 rounded-2xl border text-xs ${
                                    darkMode ? "bg-indigo-950/50 border-white/10" : "bg-slate-50 border-slate-200"
                                  }`}>
                                    <p className="font-extrabold text-brand-primary uppercase mb-1">Model Answer:</p>
                                    <p className={`mb-2 ${darkMode ? "text-white" : "text-slate-800"}`}>{activeQ.correctAnswer}</p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Correct explanation display */}
                            {isRevealed && (
                              <div className={`p-4 rounded-2xl border text-xs leading-relaxed ${
                                darkMode ? "bg-indigo-950/40 border-white/10 text-indigo-100" : "bg-indigo-50/20 border-indigo-100 text-slate-700"
                              }`}>
                                <p className="font-bold text-brand-primary mb-1">💡 Study Lesson Explanation:</p>
                                <p>{activeQ.explanation}</p>
                              </div>
                            )}

                            {/* Prev/Next Navigation Controls */}
                            <div className="pt-4 flex items-center justify-between">
                              <button
                                onClick={() => setCurrentQuizIndex(prev => Math.max(0, prev - 1))}
                                disabled={currentQuizIndex === 0}
                                className={`px-4 py-2 rounded-xl text-xs border transition-all disabled:opacity-30 cursor-pointer ${
                                  darkMode 
                                    ? "border-white/15 hover:bg-white/10 text-white" 
                                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                                }`}
                              >
                                Previous
                              </button>

                              {currentQuizIndex < quizzes.length - 1 ? (
                                <button
                                  onClick={() => {
                                    setIsFlipped(false);
                                    setCurrentQuizIndex(prev => prev + 1);
                                  }}
                                  className="bg-brand-primary text-white font-bold py-2 px-4 rounded-xl text-xs cursor-pointer hover:opacity-90 flex items-center gap-1"
                                >
                                  <span>Next Question</span>
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={handleGenerateQuiz}
                                  className="bg-green-500 text-white font-bold py-2 px-4 rounded-xl text-xs cursor-pointer hover:bg-green-600"
                                >
                                  Complete & Retake!
                                </button>
                              )}
                            </div>

                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* =======================================================
                  TAB 4: FLASHCARD GENERATOR WORKSPACE
                  ======================================================= */}
              {activeTab === "flashcards" && (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-display font-extrabold text-xl">
                        AI Active Recall Flashcards
                      </h3>
                      <p className={`text-xs ${darkMode ? "text-indigo-200" : "text-slate-500"}`}>
                        Interactive flipping Q&A term cards
                      </p>
                    </div>

                    <button
                      onClick={handleGenerateFlashcards}
                      disabled={flashcardLoading}
                      className={`text-xs font-bold py-2 px-3.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                        darkMode 
                          ? "bg-white/10 hover:bg-white/20 text-white border border-white/20" 
                          : "bg-slate-800 hover:opacity-90 text-white"
                      }`}
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${flashcardLoading ? "animate-spin" : ""}`} />
                      <span>{flashcards.length > 0 ? "Regenerate Cards" : "Create Flashcards"}</span>
                    </button>
                  </div>

                  {flashcardLoading ? (
                    <div className="py-20 text-center space-y-3">
                      <RefreshCw className="w-10 h-10 text-brand-primary animate-spin mx-auto" />
                      <p className="text-sm font-bold animate-pulse">Extracting revision terms and answers...</p>
                    </div>
                  ) : flashcards.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                      <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className={`text-sm font-bold ${darkMode ? "text-white" : "text-slate-600"}`}>No flashcards active</p>
                      <p className={`text-xs mb-4 ${darkMode ? "text-indigo-200" : "text-slate-400"}`}>StudyGen extracts definitions, formula terms, and key history automatically.</p>
                      <button
                        onClick={handleGenerateFlashcards}
                        className="bg-brand-primary text-slate-950 text-xs font-bold py-2 px-4 rounded-xl cursor-pointer"
                      >
                        Extract Flashcards
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      
                      {/* Active recall card index status */}
                      <div className={`flex items-center justify-between text-xs font-bold ${darkMode ? "text-indigo-200" : "text-slate-500"}`}>
                        <span>Card {currentCardIndex + 1} of {flashcards.length}</span>
                        <span>Click card to reveal answer</span>
                      </div>

                      {/* 3D-Like Flipping card */}
                      <div className="flex justify-center py-4">
                        <div 
                          onClick={() => setIsFlipped(!isFlipped)}
                          className="w-full max-w-md h-56 cursor-pointer relative"
                          style={{ perspective: "1000px" }}
                        >
                          <div 
                             className="w-full h-full relative rounded-3xl shadow-xl transition-all duration-500"
                             style={{ 
                               transformStyle: "preserve-3d",
                               transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)"
                             }}
                          >
                            
                            {/* FRONT SIDE */}
                            <div 
                              className={`absolute inset-0 p-6 flex flex-col justify-between rounded-3xl border ${
                                darkMode 
                                  ? "bg-gradient-to-br from-[#4f3da3] to-[#392882] border-white/25 text-white" 
                                  : "bg-gradient-to-br from-indigo-50/70 to-indigo-100/50 border-indigo-200 text-indigo-950"
                              }`}
                              style={{ backfaceVisibility: "hidden" }}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] uppercase font-bold tracking-widest text-brand-primary">Front Question</span>
                                <Sparkles className="w-4.5 h-4.5 text-brand-secondary animate-pulse" />
                              </div>
                              <div className="text-center my-auto px-4">
                                <p className="font-extrabold text-sm md:text-base leading-relaxed">
                                  {flashcards[currentCardIndex].front}
                                </p>
                              </div>
                              <div className={`text-center text-[10px] font-bold ${darkMode ? "text-indigo-200" : "text-slate-400"}`}>
                                🔄 Click to flip & view answer
                              </div>
                            </div>

                            {/* BACK SIDE */}
                            <div 
                              className={`absolute inset-0 p-6 flex flex-col justify-between rounded-3xl border-2 ${
                                darkMode
                                  ? "bg-slate-900 border-brand-primary text-white"
                                  : "bg-white border-brand-primary text-slate-900"
                              }`}
                              style={{ 
                                backfaceVisibility: "hidden", 
                                transform: "rotateY(180deg)" 
                              }}
                            >
                              <div className="flex items-center justify-between text-brand-primary">
                                <span className="text-[10px] uppercase font-bold tracking-widest">Back Answer</span>
                                <GraduationCap className="w-4.5 h-4.5" />
                              </div>
                              <div className="text-center my-auto px-4">
                                <p className="font-semibold text-sm leading-relaxed">
                                  {flashcards[currentCardIndex].back}
                                </p>
                              </div>
                              <div className="text-center text-[10px] font-bold text-brand-primary">
                                🔄 Click to flip back
                              </div>
                            </div>

                          </div>
                        </div>
                      </div>

                      {/* Controls to verify got it */}
                      <div className="flex justify-center gap-3">
                        <button
                          onClick={() => {
                            addXp(5);
                            setIsFlipped(false);
                            setTimeout(() => {
                              setCurrentCardIndex(prev => (prev + 1) % flashcards.length);
                            }, 100);
                          }}
                          className={`px-4 py-2 font-bold text-xs rounded-xl cursor-pointer transition-all ${
                            darkMode
                              ? "bg-white/10 hover:bg-white/20 text-white"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                          }`}
                        >
                          Needs Review 🔄
                        </button>
                        <button
                          onClick={() => {
                            addXp(15);
                            setIsFlipped(false);
                            setTimeout(() => {
                              setCurrentCardIndex(prev => (prev + 1) % flashcards.length);
                            }, 100);
                          }}
                          className="px-4 py-2 bg-brand-primary text-slate-950 font-extrabold text-xs rounded-xl cursor-pointer hover:opacity-90 transition-all"
                        >
                          I got it! Check ⭐
                        </button>
                      </div>

                      {/* Prev/Next list indices */}
                      <div className={`pt-2 border-t flex items-center justify-between text-xs font-semibold ${
                        darkMode ? "border-white/10" : "border-slate-150"
                      }`}>
                        <button
                          onClick={() => {
                            setIsFlipped(false);
                            setCurrentCardIndex(prev => Math.max(0, prev - 1));
                          }}
                          disabled={currentCardIndex === 0}
                          className={`disabled:opacity-30 transition-colors ${darkMode ? "text-indigo-200 hover:text-white" : "text-slate-500 hover:text-slate-800"}`}
                        >
                          Back
                        </button>
                        <span className={darkMode ? "text-indigo-200" : "text-slate-400"}>Card {currentCardIndex + 1} of {flashcards.length}</span>
                        <button
                          onClick={() => {
                            setIsFlipped(false);
                            setCurrentCardIndex(prev => (prev + 1) % flashcards.length);
                          }}
                          className={`transition-colors ${darkMode ? "text-indigo-200 hover:text-white" : "text-slate-500 hover:text-slate-800"}`}
                        >
                          Next
                        </button>
                      </div>

                    </div>
                  )}

                </div>
              )}

              {/* =======================================================
                  TAB 5: VISUAL AI NOTE TUTOR WORKSPACE
                  ======================================================= */}
              {activeTab === "visual" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-display font-extrabold text-xl flex items-center gap-2">
                      <Image className="w-5 h-5 text-brand-primary" />
                      Visual AI Tutor
                    </h3>
                    <p className={`text-xs ${darkMode ? "text-indigo-200" : "text-slate-500"}`}>
                      Upload study sheets, handwritten notes, diagrams, or textbooks for visual tutoring!
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Upload and image preview area */}
                    <div className="space-y-4">
                      <div className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all ${
                        selectedImage 
                          ? darkMode ? "border-brand-primary bg-indigo-950/20" : "border-brand-primary bg-indigo-50/20"
                          : darkMode ? "border-white/10 hover:border-white/20 bg-white/5" : "border-indigo-100 hover:border-indigo-200 bg-slate-50"
                      }`}>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          id="visual-file-upload"
                          className="hidden"
                        />
                        <label htmlFor="visual-file-upload" className="cursor-pointer block space-y-3">
                          {selectedImage ? (
                            <div className="relative group">
                              <img
                                src={selectedImage}
                                alt="Selected note page"
                                className="max-h-48 rounded-xl mx-auto object-contain border border-white/15"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl text-white text-xs font-bold">
                                Change Image
                              </div>
                            </div>
                          ) : (
                            <div className="py-6">
                              <Upload className="w-10 h-10 text-brand-secondary mx-auto mb-2.5 animate-pulse-glow" />
                              <p className={`text-sm font-bold ${darkMode ? "text-white" : "text-indigo-950"}`}>
                                Click or drag academic photo here
                              </p>
                              <p className="text-[10px] text-slate-400 mt-1">
                                Supports PNG, JPG, WEBP (textbooks, slides, formulas)
                              </p>
                            </div>
                          )}
                        </label>
                      </div>

                      {/* Prompt / Instructions input */}
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-80">
                          Custom Instructions (Optional)
                        </label>
                        <textarea
                          value={imagePrompt}
                          onChange={(e) => setImagePrompt(e.target.value)}
                          placeholder="e.g. Solve the equation on line 3, summarize these notes, or explain this slide like I am 10..."
                          className={`w-full h-24 p-3 rounded-2xl text-xs border font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                            darkMode 
                              ? "bg-[#2D1B69] border-white/10 text-white placeholder-indigo-300/40" 
                              : "bg-slate-50 border-indigo-150 text-indigo-950 placeholder-slate-400 focus:bg-white"
                          }`}
                        />
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        {selectedImage && (
                          <button
                            onClick={() => {
                              setSelectedImage(null);
                              setImageAnalysis("");
                            }}
                            className={`flex-1 py-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                              darkMode ? "border-white/10 bg-white/5 hover:bg-white/10" : "border-indigo-100 bg-white hover:bg-indigo-50"
                            }`}
                          >
                            Reset
                          </button>
                        )}
                        <button
                          onClick={handleAnalyzeImage}
                          disabled={imageLoading || !selectedImage}
                          className={`flex-[2] py-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow ${
                            imageLoading 
                              ? "bg-indigo-600/50 text-white/50 cursor-not-allowed" 
                              : !selectedImage 
                              ? "bg-slate-600/30 text-slate-400 cursor-not-allowed"
                              : "bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-indigo-500/20"
                          }`}
                        >
                          {imageLoading ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Analyzing visual notes...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
                              <span>Analyze with Gemini 3.1 Pro</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Analysis results column */}
                    <div className={`p-5 rounded-2xl border ${
                      darkMode ? "bg-white/5 border-white/10" : "bg-slate-50 border-indigo-100"
                    }`}>
                      <h4 className="text-xs uppercase font-extrabold tracking-widest text-brand-primary mb-3">
                        Tutor Analysis & Solutions
                      </h4>

                      {imageLoading ? (
                        <div className="py-20 text-center space-y-3">
                          <RefreshCw className="w-10 h-10 text-brand-primary animate-spin mx-auto" />
                          <p className="text-xs font-bold animate-pulse">Running advanced visual OCR & tutor models...</p>
                        </div>
                      ) : imageAnalysis ? (
                        <div className="text-xs leading-relaxed max-h-[340px] overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                          <p className="whitespace-pre-wrap font-medium">{imageAnalysis}</p>
                        </div>
                      ) : (
                        <div className="py-16 text-center text-slate-400 space-y-2">
                          <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-1 opacity-50" />
                          <p className="text-xs font-bold">Waiting for image analysis</p>
                          <p className="text-[10px] opacity-75 max-w-[200px] mx-auto">Upload a file and click analyze to let Gemini analyze diagrams, code, or handwritten work!</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* =======================================================
                  TAB 6: ADMINISTRATOR CONTROL DASHBOARD
                  ======================================================= */}
              {activeTab === "admin" && user?.role === "admin" && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-display font-extrabold text-xl text-indigo-400 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-indigo-400" />
                        Administrator Management Panel
                      </h3>
                      <p className={`text-xs ${darkMode ? "text-indigo-200" : "text-slate-500"}`}>
                        Authorized account management dashboard for monitoring registered users, roles, and status.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={fetchUsers}
                        disabled={adminLoading}
                        className={`text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                          darkMode 
                            ? "bg-white/10 hover:bg-white/20 text-white border border-white/20" 
                            : "bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border border-indigo-200"
                        }`}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${adminLoading ? "animate-spin" : ""}`} />
                        <span>Refresh Users</span>
                      </button>
                    </div>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className={`p-4 rounded-2xl border ${darkMode ? "bg-white/5 border-white/10 text-white" : "bg-indigo-50/40 border-indigo-100 text-slate-800"}`}>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block mb-1">Total Registered Accounts</span>
                      <span className="text-2xl font-black">{allUsers.length}</span>
                    </div>
                    <div className={`p-4 rounded-2xl border ${darkMode ? "bg-white/5 border-white/10 text-white" : "bg-indigo-50/40 border-indigo-100 text-slate-800"}`}>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block mb-1">Administrator Accounts</span>
                      <span className="text-2xl font-black">{allUsers.filter((u: any) => u.role === "admin").length}</span>
                    </div>
                    <div className={`p-4 rounded-2xl border ${darkMode ? "bg-white/5 border-white/10 text-white" : "bg-indigo-50/40 border-indigo-100 text-slate-800"}`}>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">Security & Data Policy</span>
                      <span className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 mt-1">
                        <Shield className="w-4 h-4" /> Password Protected
                      </span>
                    </div>
                  </div>

                  {/* Supabase Database Connection Card */}
                  <div className={`p-5 rounded-2xl border ${
                    darkMode ? "bg-gradient-to-r from-emerald-950/40 via-emerald-900/20 to-indigo-950/40 border-emerald-500/30 text-white" : "bg-emerald-50/60 border-emerald-200 text-slate-800"
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400 mt-0.5">
                          <Database className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-sm">Supabase Integration Active</h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              Connected
                            </span>
                          </div>
                          <p className="text-xs opacity-80 mt-1">
                            Project ID: <code className="font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded text-emerald-300 font-bold">kjrqtvioflyrqomzeztm</code> • Region: <span className="font-bold">ap-northeast-1 (Tokyo)</span>
                          </p>
                          <p className="text-[11px] opacity-70 mt-0.5">
                            Endpoint: <code className="font-mono text-emerald-300">https://kjrqtvioflyrqomzeztm.supabase.co</code>
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={fetchSupabaseStatus}
                        className="self-start sm:self-center px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Check Status</span>
                      </button>
                    </div>
                  </div>

                  {/* Create New User Form Card */}
                  <div className={`p-5 rounded-2xl border ${
                    darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-indigo-100 text-slate-800 shadow-sm"
                  }`}>
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-indigo-400 mb-3 flex items-center gap-2">
                      <UserPlus className="w-4 h-4" />
                      Add New User Account & Credentials
                    </h4>
                    <form onSubmit={handleAdminCreateUser} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <input
                        type="text"
                        placeholder="Username / Email"
                        value={newAdminUsername}
                        onChange={(e) => setNewAdminUsername(e.target.value)}
                        className={`py-2 px-3 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          darkMode ? "bg-white/5 border-white/10 text-white placeholder-slate-400" : "bg-slate-50 border-slate-200 text-slate-800"
                        }`}
                      />
                      <input
                        type="text"
                        placeholder="Password"
                        value={newAdminPassword}
                        onChange={(e) => setNewAdminPassword(e.target.value)}
                        className={`py-2 px-3 rounded-xl text-xs font-mono font-medium border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          darkMode ? "bg-white/5 border-white/10 text-white placeholder-slate-400" : "bg-slate-50 border-slate-200 text-slate-800"
                        }`}
                      />
                      <select
                        value={newAdminRole}
                        onChange={(e) => setNewAdminRole(e.target.value)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          darkMode ? "bg-slate-900 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                        }`}
                      >
                        <option value="user">User Role</option>
                        <option value="admin">Admin Role</option>
                      </select>
                      <button
                        type="submit"
                        className="py-2 px-4 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Create Account</span>
                      </button>
                    </form>
                    {createUserError && (
                      <p className="text-xs text-red-400 mt-2 font-semibold">{createUserError}</p>
                    )}
                    {createUserSuccess && (
                      <p className="text-xs text-emerald-400 mt-2 font-semibold">{createUserSuccess}</p>
                    )}
                  </div>

                  {/* Search Bar & Global Password Toggle */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 opacity-60">
                        <Search className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        placeholder="Search accounts by username or email..."
                        value={adminSearchQuery}
                        onChange={(e) => setAdminSearchQuery(e.target.value)}
                        className={`w-full py-2.5 pl-10 pr-4 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                          darkMode 
                            ? "bg-[#2D1B69]/75 border-white/10 text-white placeholder-indigo-300/40" 
                            : "bg-white border-indigo-200 text-slate-800 placeholder-slate-400"
                        }`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setRevealAllPasswords(!revealAllPasswords)}
                      className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-2 ${
                        revealAllPasswords
                          ? "bg-amber-500/20 border-amber-500/30 text-amber-300"
                          : "bg-white/5 border-white/10 text-slate-300 hover:text-white"
                      }`}
                    >
                      {revealAllPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      <span>{revealAllPasswords ? "Mask Passwords" : "Show All Passwords"}</span>
                    </button>
                  </div>

                  {/* Users Table */}
                  {adminLoading ? (
                    <div className="py-20 text-center space-y-3">
                      <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin mx-auto" />
                      <p className="text-xs font-bold animate-pulse">Loading user directory...</p>
                    </div>
                  ) : allUsers.length === 0 ? (
                    <div className="py-16 text-center text-slate-400">
                      <p className="text-sm font-bold">No registered users found</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-white/10">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className={darkMode ? "bg-white/5 text-indigo-200" : "bg-indigo-50/50 text-indigo-950"}>
                            <th className="p-3.5 font-bold uppercase tracking-wider">Registered Email / Username</th>
                            <th className="p-3.5 font-bold uppercase tracking-wider">Password</th>
                            <th className="p-3.5 font-bold uppercase tracking-wider">Access Role</th>
                            <th className="p-3.5 font-bold uppercase tracking-wider">Last Active</th>
                            <th className="p-3.5 font-bold uppercase tracking-wider">Registered Date</th>
                            <th className="p-3.5 font-bold uppercase tracking-wider text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {allUsers
                            .filter((u: any) => 
                              !adminSearchQuery || 
                              u.username.toLowerCase().includes(adminSearchQuery.toLowerCase())
                            )
                            .map((userObj: any, index: number) => (
                              <tr 
                                key={index}
                                className={darkMode ? "hover:bg-white/5 transition-colors" : "hover:bg-slate-50 transition-colors"}
                              >
                                <td className="p-3.5 font-extrabold flex items-center gap-2">
                                  <span className="p-1.5 bg-indigo-600/20 text-indigo-400 rounded-lg">
                                    <User className="w-3.5 h-3.5" />
                                  </span>
                                  <span>{userObj.username}</span>
                                </td>
                                <td className="p-3.5 font-mono text-emerald-400 font-semibold">
                                  <div className="flex items-center gap-2">
                                    <span>{(revealAllPasswords || showPasswords[userObj.username]) ? (userObj.password || "••••••••") : "••••••••"}</span>
                                    <button
                                      onClick={() => togglePasswordVisibility(userObj.username)}
                                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                                      title={showPasswords[userObj.username] ? "Hide Password" : "Reveal Password"}
                                    >
                                      {(revealAllPasswords || showPasswords[userObj.username]) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                  </div>
                                </td>
                                <td className="p-3.5">
                                  <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                                    userObj.role === "admin" 
                                      ? "bg-purple-500/15 text-purple-400 border border-purple-500/20" 
                                      : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                                  }`}>
                                    {userObj.role}
                                  </span>
                                </td>
                                <td className="p-3.5 opacity-80 text-[11px]">
                                  {userObj.lastLogin ? new Date(userObj.lastLogin).toLocaleString() : "Active Now"}
                                </td>
                                <td className="p-3.5 opacity-60 text-[11px]">
                                  {userObj.createdAt ? new Date(userObj.createdAt).toLocaleString() : "N/A"}
                                </td>
                                <td className="p-3.5 text-right space-x-1.5">
                                  <button
                                    onClick={() => copyCredentials(userObj.username, userObj.password || "")}
                                    className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white/10 hover:bg-white/20 text-indigo-200 border border-white/10 transition-all cursor-pointer inline-flex items-center gap-1"
                                    title="Copy Username & Password"
                                  >
                                    {copiedUser === userObj.username ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                    <span>{copiedUser === userObj.username ? "Copied" : "Copy"}</span>
                                  </button>
                                  <button
                                    onClick={() => handleChangePassword(userObj.username)}
                                    className="px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-all cursor-pointer inline-flex items-center gap-1"
                                    title="Edit User Password"
                                  >
                                    <Key className="w-3 h-3" />
                                    <span>Pass</span>
                                  </button>
                                  <button
                                    onClick={() => handleUpdateRole(userObj.username, userObj.role)}
                                    className="px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 transition-all cursor-pointer"
                                    title="Toggle Admin / User Role"
                                  >
                                    {userObj.role === "admin" ? "Demote" : "Make Admin"}
                                  </button>
                                  {userObj.username !== user?.username && (
                                    <button
                                      onClick={() => handleDeleteUser(userObj.username)}
                                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 transition-all cursor-pointer"
                                      title="Remove User Account"
                                    >
                                      Remove
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Standard Security Notice */}
                  <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 text-xs text-indigo-300 flex gap-3">
                    <Shield className="w-5 h-5 flex-shrink-0 mt-0.5 text-indigo-400" />
                    <div>
                      <span className="font-extrabold uppercase tracking-wider block mb-1">Administrative Security Standard</span>
                      <span>User account management is strictly restricted to authenticated administrators. User authentication credentials are safely protected and stored according to standard authentication guidelines.</span>
                    </div>
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>

      </main>

      {/* Decorative footer with Application Admin Panel trigger */}
      <footer className={`border-t py-8 mt-12 text-center text-xs transition-colors relative ${
        darkMode ? "border-white/10 bg-[#2b1b70] text-indigo-200" : "border-indigo-100 bg-indigo-50/20 text-indigo-950/70"
      }`}>
        <p className="font-semibold">
          StudyGen — Your Intelligent Study Assistant ✨ Reach for the stars!
        </p>
        <p className="mt-1 opacity-80 flex items-center justify-center gap-1">
          <span>Powered by Gemini AI Studio • Made for student success and high-retention learning.</span>
        </p>

        {/* Application Admin Panel Trigger in Bottom Footer */}
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            onClick={handleOpenAdminPanel}
            className="px-4 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer border border-indigo-400/30"
          >
            <Shield className="w-4 h-4 text-indigo-200" />
            <span>🔑 Open Admin Panel (User Credentials)</span>
          </button>
        </div>
      </footer>

      {/* Bottom Application Admin Panel Modal */}
      {showBottomAdminPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-4xl p-6 sm:p-8 rounded-3xl border border-indigo-500/30 text-white bg-gradient-to-b from-[#1c124e] via-[#0b062b] to-[#04020e] shadow-[0_0_90px_rgba(99,102,241,0.35)] animate-scale-up max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/20 rounded-2xl text-indigo-400 border border-indigo-500/30">
                  <Settings className="w-6 h-6 animate-spin-slow" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-xl text-white flex items-center gap-2">
                    Application Admin Panel
                  </h3>
                  <p className="text-xs text-indigo-200 mt-0.5">
                    User Management & Registered Credentials Directory
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setOldPinInput("");
                    setNewPinInput("");
                    setChangePinError("");
                    setChangePinSuccess("");
                    setShowChangePinModal(true);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-all cursor-pointer flex items-center gap-1.5"
                  title="Change Master Admin PIN"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Change PIN</span>
                </button>
                <button
                  onClick={() => fetchUsers()}
                  disabled={adminLoading}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${adminLoading ? "animate-spin" : ""}`} />
                  <span>Refresh</span>
                </button>
                <button
                  onClick={() => {
                    setAdminKey("");
                    setShowBottomAdminPanel(false);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 transition-all cursor-pointer flex items-center gap-1.5"
                  title="Lock and exit admin panel"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Lock & Exit</span>
                </button>
              </div>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              
              {/* Metric stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block mb-0.5">Registered Users</span>
                  <span className="text-xl font-black">{allUsers.length} Accounts</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block mb-0.5">Admins</span>
                  <span className="text-xl font-black">{allUsers.filter((u: any) => u.role === "admin").length} Administrators</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-0.5">Application Status</span>
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 mt-1">
                    <Shield className="w-4 h-4" /> Live Application Database
                  </span>
                </div>
              </div>

              {/* Create New User Form Card */}
              <div className="p-4 rounded-2xl border border-white/10 bg-white/5 text-white">
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-indigo-400 mb-2 flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Add New User Account & Credentials
                </h4>
                <form onSubmit={handleAdminCreateUser} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <input
                    type="text"
                    placeholder="Username / Email"
                    value={newAdminUsername}
                    onChange={(e) => setNewAdminUsername(e.target.value)}
                    className="py-2 px-3 rounded-xl text-xs font-medium bg-white/10 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Password"
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    className="py-2 px-3 rounded-xl text-xs font-mono font-medium bg-white/10 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <select
                    value={newAdminRole}
                    onChange={(e) => setNewAdminRole(e.target.value)}
                    className="py-2 px-3 rounded-xl text-xs font-bold bg-slate-900 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="user">User Role</option>
                    <option value="admin">Admin Role</option>
                  </select>
                  <button
                    type="submit"
                    className="py-2 px-4 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Create Account</span>
                  </button>
                </form>
                {createUserError && (
                  <p className="text-xs text-red-400 mt-2 font-semibold">{createUserError}</p>
                )}
                {createUserSuccess && (
                  <p className="text-xs text-emerald-400 mt-2 font-semibold">{createUserSuccess}</p>
                )}
              </div>

              {/* Search Bar & Password Toggle */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 opacity-60">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Filter users by email or username..."
                    value={adminSearchQuery}
                    onChange={(e) => setAdminSearchQuery(e.target.value)}
                    className="w-full py-2.5 pl-10 pr-4 rounded-xl text-xs font-medium bg-white/5 border border-white/10 text-white placeholder-indigo-300/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setRevealAllPasswords(!revealAllPasswords)}
                  className={`py-2.5 px-3.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-2 ${
                    revealAllPasswords
                      ? "bg-amber-500/20 border-amber-500/30 text-amber-300"
                      : "bg-white/10 border-white/10 text-slate-300 hover:text-white"
                  }`}
                >
                  {revealAllPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span>{revealAllPasswords ? "Mask Passwords" : "Show Passwords"}</span>
                </button>
              </div>

              {/* Users & Credentials Table */}
              {adminLoading ? (
                <div className="py-12 text-center space-y-2">
                  <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
                  <p className="text-xs text-slate-300 font-bold animate-pulse">Loading user directory...</p>
                </div>
              ) : allUsers.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No registered users found. Use the form above to add an account!
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-white/10 text-indigo-200">
                        <th className="p-3 font-bold uppercase tracking-wider">User / Email</th>
                        <th className="p-3 font-bold uppercase tracking-wider">Credential Password</th>
                        <th className="p-3 font-bold uppercase tracking-wider">Role</th>
                        <th className="p-3 font-bold uppercase tracking-wider">Last Active</th>
                        <th className="p-3 font-bold uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {allUsers
                        .filter((u: any) => 
                          !adminSearchQuery || 
                          u.username.toLowerCase().includes(adminSearchQuery.toLowerCase())
                        )
                        .map((userObj: any, index: number) => (
                          <tr key={index} className="hover:bg-white/10 transition-colors">
                            <td className="p-3 font-bold flex items-center gap-2">
                              <span className="p-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg">
                                <User className="w-3.5 h-3.5" />
                              </span>
                              <span>{userObj.username}</span>
                            </td>
                            <td className="p-3 font-mono text-emerald-400 font-semibold">
                              <div className="flex items-center gap-2">
                                <span>{(revealAllPasswords || showPasswords[userObj.username]) ? (userObj.password || "••••••••") : "••••••••"}</span>
                                <button
                                  onClick={() => togglePasswordVisibility(userObj.username)}
                                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                                  title={showPasswords[userObj.username] ? "Hide Password" : "Reveal Password"}
                                >
                                  {(revealAllPasswords || showPasswords[userObj.username]) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase ${
                                userObj.role === "admin" 
                                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" 
                                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              }`}>
                                {userObj.role}
                              </span>
                            </td>
                            <td className="p-3 text-[11px] opacity-80">
                              {userObj.lastLogin ? new Date(userObj.lastLogin).toLocaleString() : "Active Now"}
                            </td>
                            <td className="p-3 text-right space-x-1.5">
                              <button
                                onClick={() => copyCredentials(userObj.username, userObj.password || "")}
                                className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white/10 hover:bg-white/20 text-indigo-200 border border-white/10 transition-all cursor-pointer inline-flex items-center gap-1"
                                title="Copy Username & Password"
                              >
                                {copiedUser === userObj.username ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedUser === userObj.username ? "Copied" : "Copy"}</span>
                              </button>
                              <button
                                onClick={() => handleChangePassword(userObj.username)}
                                className="px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-all cursor-pointer inline-flex items-center gap-1"
                                title="Edit Password"
                              >
                                <Key className="w-3 h-3" />
                                <span>Pass</span>
                              </button>
                              <button
                                onClick={() => handleUpdateRole(userObj.username, userObj.role)}
                                className="px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-500/30 transition-all cursor-pointer"
                              >
                                {userObj.role === "admin" ? "Demote" : "Make Admin"}
                              </button>
                              {userObj.username !== user?.username && (
                                <button
                                  onClick={() => handleDeleteUser(userObj.username)}
                                  className="px-2 py-1 rounded-lg text-[10px] font-bold bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 transition-all cursor-pointer"
                                >
                                  Delete
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>

            {/* Footer actions */}
            <div className="pt-4 border-t border-white/10 mt-4 flex items-center justify-between">
              <span className="text-xs text-indigo-300/80">
                Direct Application Storage • Live Account Records
              </span>
              <button
                onClick={() => setShowBottomAdminPanel(false)}
                className="px-5 py-2 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white text-xs transition-all shadow-md active:scale-95 cursor-pointer"
              >
                Close Admin Panel
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Master Admin PIN Verification Modal */}
      {showPinAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md p-6 sm:p-8 rounded-3xl border border-indigo-500/30 text-white bg-gradient-to-b from-[#1c124e] via-[#0b062b] to-[#04020e] shadow-[0_0_80px_rgba(99,102,241,0.4)] animate-scale-up">
            
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400 border border-indigo-500/30">
                <Lock className="w-6 h-6 text-indigo-300" />
              </div>
              <div>
                <h3 className="font-display font-extrabold text-xl text-white">
                  Admin Security Lock
                </h3>
                <p className="text-xs text-indigo-200 mt-0.5">
                  Enter Master Admin PIN to unlock panel
                </p>
              </div>
            </div>

            <form onSubmit={handleVerifyPin} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                    Master Security Key
                  </label>
                  <span className="text-[10px] text-indigo-300/70 font-mono">
                    Default key: admin123
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="Enter Master Key (e.g. admin123)..."
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    autoFocus
                    className="w-full py-3 px-4 rounded-xl text-sm font-mono bg-white/10 border border-white/20 text-white placeholder-indigo-300/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setPinInput("admin123")}
                    className="absolute right-3 top-2.5 px-2 py-1 rounded text-[10px] font-bold bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-500/30 transition-all cursor-pointer"
                    title="Fill default key"
                  >
                    Use Default
                  </button>
                </div>
              </div>

              {pinAuthError && (
                <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-bold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{pinAuthError}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowPinAuthModal(false)}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/20 text-slate-300 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition-all active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>Unlock Admin Panel</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Master Admin PIN Modal */}
      {showChangePinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md p-6 sm:p-8 rounded-3xl border border-amber-500/30 text-white bg-gradient-to-b from-[#1c124e] via-[#0b062b] to-[#04020e] shadow-[0_0_80px_rgba(245,158,11,0.3)] animate-scale-up">
            
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-amber-500/20 rounded-2xl text-amber-400 border border-amber-500/30">
                <Key className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <h3 className="font-display font-extrabold text-xl text-white">
                  Change Master Admin PIN
                </h3>
                <p className="text-xs text-amber-200/80 mt-0.5">
                  Update your Master Admin Security PIN
                </p>
              </div>
            </div>

            <form onSubmit={handleChangeAdminPin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1">
                  Current Admin PIN
                </label>
                <input
                  type="password"
                  placeholder="Enter current PIN..."
                  value={oldPinInput}
                  onChange={(e) => setOldPinInput(e.target.value)}
                  className="w-full py-2.5 px-3.5 rounded-xl text-xs font-mono bg-white/10 border border-white/20 text-white placeholder-amber-200/30 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1">
                  New Admin PIN
                </label>
                <input
                  type="password"
                  placeholder="Enter new PIN (min 4 characters)..."
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value)}
                  className="w-full py-2.5 px-3.5 rounded-xl text-xs font-mono bg-white/10 border border-white/20 text-white placeholder-amber-200/30 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {changePinError && (
                <p className="text-xs text-red-400 font-semibold">{changePinError}</p>
              )}
              {changePinSuccess && (
                <p className="text-xs text-emerald-400 font-semibold">{changePinSuccess}</p>
              )}

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowChangePinModal(false)}
                  className="px-4 py-2 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/20 text-slate-300 transition-all cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-500 text-white transition-all shadow-md cursor-pointer"
                >
                  Save New PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1.6 GORGEOUS STREAK CELEBRATION MODAL OVERLAY */}
      {showStreakCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md p-8 rounded-3xl border border-orange-500/30 text-center text-white bg-gradient-to-b from-[#1c124e] via-[#0b062b] to-[#04020e] shadow-[0_0_80px_rgba(249,115,22,0.4)] animate-scale-up">
            
            {/* Sparkle background elements */}
            <div className="absolute top-10 left-10 text-brand-secondary/40 animate-pulse">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="absolute bottom-10 right-10 text-brand-accent/30 animate-pulse" style={{ animationDelay: "1s" }}>
              <Star className="w-10 h-10 fill-current" />
            </div>

            {/* Giant Burning Flame Animation Container */}
            <div className="flex justify-center mb-6 relative">
              <div className="absolute inset-0 bg-orange-500/20 rounded-full blur-3xl w-28 h-28 mx-auto -top-4 animate-pulse" />
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-tr from-orange-600 via-amber-500 to-yellow-400 p-[3px] flex items-center justify-center shadow-[0_0_40px_rgba(249,115,22,0.6)] animate-bounce">
                <div className="w-full h-full rounded-full bg-[#1c124e] flex items-center justify-center">
                  <Flame className="w-14 h-14 text-orange-500 fill-orange-500 animate-pulse" />
                </div>
              </div>
            </div>

            {/* Content */}
            <h3 className="font-display font-black text-3xl text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-300 tracking-tight">
              STREAK LOGGED!
            </h3>
            <p className="mt-2 text-sm text-indigo-200">
              Your dedication is unmatched. Keep up the momentum!
            </p>

            <div className="mt-6 p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-around">
              <div className="text-center">
                <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">New Streak</span>
                <span className="text-2xl font-black text-orange-400">{streak} Days</span>
              </div>
              <div className="w-[1px] h-10 bg-white/10" />
              <div className="text-center">
                <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Rewards Gained</span>
                <span className="text-2xl font-black text-brand-secondary">+50 XP 🏆</span>
              </div>
            </div>

            <p className="mt-6 text-xs text-indigo-300/80 italic">
              "Continuous improvement is better than delayed perfection." ✨
            </p>

            {/* Action Button */}
            <button
              onClick={() => setShowStreakCelebration(false)}
              className="mt-8 w-full py-3.5 px-6 rounded-2xl font-bold bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-95 text-white shadow-lg transition-all hover:scale-[1.01] active:scale-95 cursor-pointer"
            >
              Let's Keep Studying!
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
