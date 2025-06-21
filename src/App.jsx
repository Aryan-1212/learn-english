import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, MessageCircle, Users, Settings, Sparkles, Star } from "lucide-react";
import AvatarViewer from "./components/AvatarViewer";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import Funs from "./pages/funs.jsx";
import AboutMe from './pages/AboutMe';

// Initialize the Google Generative AI
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

const conversationTypes = [
  {
    value: 'salesperson',
    label: '🛍️ Salesperson',
    prompt: `You are a friendly salesperson in a clothing store. Stay in character as a salesperson. Greet the customer, ask simple questions about what the customer is looking for, suggest items, and help them make a purchase decision. Only ask questions or respond as a salesperson. Do NOT switch to English tutor mode or explain English. Keep responses under 25 words and ask follow-up questions. Start the conversation now by greeting the customer and asking your first shopping-related question.`
  },
  {
    value: 'interviewer',
    label: '💼 Job Interviewer',
    prompt: `You are conducting a simple job interview. Stay in character as an interviewer. Greet the candidate, ask basic questions about experience, skills, and why they want the job. Be encouraging and ask one question at a time. Only ask questions or respond as an interviewer. Do NOT switch to English tutor mode or explain English. Keep responses under 25 words. Start the conversation now by greeting the candidate and asking your first interview question.`
  },
  {
    value: 'policeman',
    label: '👮 Police Officer',
    prompt: `You are a friendly police officer helping someone who is lost or needs directions. Stay in character as a police officer. Greet the person, be helpful, polite, and ask simple questions to understand how to help. Only ask questions or respond as a police officer. Do NOT switch to English tutor mode or explain English. Keep responses under 25 words. Start the conversation now by greeting the person and asking your first helpful question.`
  },
  {
    value: 'teacher',
    label: '👨‍🏫 English Teacher',
    prompt: `You are an encouraging English teacher. Stay in character as a teacher. Greet the student, help correct grammar, suggest better words, and ask questions to practice English conversation. Only ask questions or respond as a teacher. Do NOT switch to general English tutor mode or explain English unless correcting. Keep responses under 25 words and be supportive. Start the conversation now by greeting the student and asking your first English practice question.`
  },
  {
    value: 'doctor',
    label: '👩‍⚕️ Doctor',
    prompt: `You are a friendly doctor asking about symptoms and giving simple health advice. Stay in character as a doctor. Greet the patient, ask one question at a time about how the patient feels, and give simple advice. Only ask questions or respond as a doctor. Do NOT switch to English tutor mode or explain English. Keep responses under 25 words and be caring. Start the conversation now by greeting the patient and asking your first health-related question.`
  },
  {
    value: 'waiter',
    label: '🍽️ Restaurant Waiter',
    prompt: `You are a waiter taking orders at a restaurant. Stay in character as a waiter. Greet the customer, ask about food preferences, suggest menu items, and help with the order. Only ask questions or respond as a waiter. Do NOT switch to English tutor mode or explain English. Keep responses under 25 words and be helpful. Start the conversation now by greeting the customer and asking your first restaurant-related question.`
  },
  {
    value: 'receptionist',
    label: '🏨 Hotel Receptionist',
    prompt: `You are a hotel receptionist helping guests check in, book rooms, or answer questions about hotel services. Stay in character as a receptionist. Greet the guest, be professional and helpful, and only ask questions or respond as a receptionist. Do NOT switch to English tutor mode or explain English. Keep responses under 25 words. Start the conversation now by greeting the guest and asking your first hotel-related question.`
  },
  {
    value: 'friend',
    label: '😊 Casual Friend',
    prompt: `You are a friendly person having a casual conversation. Stay in character as a friend. Greet the other person, talk about hobbies, weather, daily life, and ask simple questions to keep the conversation going. Only ask questions or respond as a friend. Do NOT switch to English tutor mode or explain English. Keep responses under 25 words. Start the conversation now by greeting your friend and asking your first casual question.`
  }
];

function AppContent() {
  const [mode, setMode] = useState(''); // 'talk' or 'conversation'
  const [conversationType, setConversationType] = useState('');
  const [response, setResponse] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [conversation, setConversation] = useState([]);
  const [voice, setVoice] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [visemeData, setVisemeData] = useState(null);
  const [inputText, setInputText] = useState("");
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [dropdownValue, setDropdownValue] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownOptions = [
    { value: "grammar", label: "Grammar Quiz" },
    { value: "vocab", label: "Vocabulary Builder" },
    { value: "pronunciation", label: "Pronunciation Practice" },
    { value: "story", label: "Storytelling" },
  ];
  const dropdownRef = useRef(null);

  // Ref for chat container
  const chatContainerRef = useRef(null);

  const navigate = useNavigate();

  const [voiceLoading, setVoiceLoading] = useState(true);

  // --- Speech Recognition Setup ---
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Only set up if browser supports it
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript("");
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setTranscript(transcript);
      setInputText(transcript); // Autofill input box
      setIsListening(false);
      if (transcript && transcript.trim()) {
        askBot(transcript);
      }
    };
    recognition.onerror = (event) => {
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
    };

    // Clean up on unmount
    return () => {
      recognition.abort();
      recognitionRef.current = null;
    };
  }, []);

  // Auto-scroll to bottom when conversation changes
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [conversation]);

  // Initialize speech recognition and voice
  useEffect(() => {
    let ariaVoiceSet = false;
    let fallbackVoiceSet = false;
    let voicesLoaded = false;

    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return false;
      voicesLoaded = true;
      // Always try to find Aria first
      const ariaVoice = voices.find(
        (voice) =>
          voice.name ===
          "Microsoft Aria Online (Natural) - English (United States)"
      );
      if (ariaVoice) {
        setVoice(ariaVoice);
        ariaVoiceSet = true;
        setVoiceLoading(false);
        return true;
      }
      // If not found, pick a female voice
      let femaleVoice = voices.find(v => v.gender === 'female');
      if (!femaleVoice) {
        femaleVoice = voices.find(v =>
          v.name.toLowerCase().includes('female') ||
          v.name.toLowerCase().includes('zira') ||
          v.name.toLowerCase().includes('susan') ||
          v.name.toLowerCase().includes('linda') ||
          v.name.toLowerCase().includes('eva') ||
          v.name.toLowerCase().includes('jessa') ||
          v.name.toLowerCase().includes('samantha')
        );
      }
      if (femaleVoice) {
        setVoice(femaleVoice);
        fallbackVoiceSet = true;
        setVoiceLoading(false);
        return true;
      }
      // Otherwise, pick any available voice
      if (voices.length > 0) {
        setVoice(voices[0]);
        fallbackVoiceSet = true;
        setVoiceLoading(false);
        return true;
      }
      setVoice(null);
      setVoiceLoading(false);
      return false;
    };

    // Try to pick a voice immediately
    pickVoice();

    // Listen for voiceschanged to catch async loading
    const handleVoicesChanged = () => {
      if (!ariaVoiceSet) {
        const foundAria = pickVoice();
        if (foundAria) {
          ariaVoiceSet = true;
        }
      }
    };
    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    // In case voices load after a delay, poll a few times
    let pollCount = 0;
    const pollVoices = () => {
      if (!voicesLoaded && pollCount < 10) {
        pickVoice();
        pollCount++;
        setTimeout(pollVoices, 200);
      }
    };
    pollVoices();
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
    };
  }, []);

  useEffect(() => {
    // Simulate model loading (replace with real model loading if possible)
    setIsModelReady(false);
    const timer = setTimeout(() => {
      setIsModelReady(true);
    }, 1500); // Simulate 1.5s loading
    return () => clearTimeout(timer);
  }, []);

  const startListening = () => {
    if (recognitionRef.current && !isListening && !isSpeaking) {
      setTranscript("");
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  // Generate lip sync data with more accurate timing
  const generateLipSyncData = (text, speechRate = 1.0) => {
    const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(' ');
    const visemes = [];
    let currentTime = 0;
    
    // Adjust timing based on speech rate
    const rateMultiplier = 1.0 / speechRate;
    
    words.forEach((word, wordIndex) => {
      if (!word.trim()) return;
      
      // More accurate timing calculation
      const syllableCount = countSyllables(word);
      const complexity = word.length / syllableCount;
      
      // Base timing per syllable (adjusted for speech rate)
      const baseSyllableDuration = 350 * rateMultiplier;
      const complexityFactor = Math.max(0.8, Math.min(1.5, complexity));
      const wordDuration = syllableCount * baseSyllableDuration * complexityFactor;
      
      // Break word into phonemes
      const phonemes = wordToPhonemes(word);
      const phonemeDuration = wordDuration / phonemes.length;
      
      phonemes.forEach((phoneme, index) => {
        const viseme = phonemeToViseme(phoneme);
        const intensity = getIntensityForPhoneme(phoneme);
        
        // Add slight overlap between phonemes for smoother transitions
        const overlap = phonemeDuration * 0.1;
        const startTime = currentTime + (index * phonemeDuration) - overlap;
        const endTime = startTime + phonemeDuration + overlap;
        
        visemes.push({
          viseme,
          intensity,
          start: startTime,
          end: endTime
        });
      });
      
      currentTime += wordDuration;
    });
    
    return visemes;
  };

  const countSyllables = (word) => {
    return word.toLowerCase().replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '').match(/[aeiouy]{1,2}/g)?.length || 1;
  };
  
  // Convert word to basic phonemes
  const wordToPhonemes = (word) => {
    const phonemes = [];
    const chars = word.split('');
    
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      const nextChar = chars[i + 1];
      
      // Handle common digraphs
      if (char + nextChar === 'th') {
        phonemes.push('TH');
        i++; // Skip next character
      } else if (char + nextChar === 'ch') {
        phonemes.push('CH');
        i++;
      } else if (char + nextChar === 'sh') {
        phonemes.push('SH');
        i++;
      } else {
        phonemes.push(char);
      }
    }
    
    return phonemes;
  };
  
  // Enhanced phoneme to viseme mapping with better timing considerations
  const phonemeToViseme = (phoneme) => {
    const mapping = {
      // Bilabial sounds (lips together) - quick closure
      'p': 'PP', 'b': 'PP', 'm': 'PP',
      'PP': 'PP',
      
      // Labiodental sounds (lip to teeth) - visible lip movement
      'f': 'FF', 'v': 'FF',
      'FF': 'FF',
      
      // Dental sounds - tongue visible
      'TH': 'TH', 'th': 'TH',
      
      // Alveolar sounds - mouth slightly open
      't': 'DD', 'd': 'DD', 'n': 'DD', 'l': 'DD',
      'DD': 'DD',
      
      // Velar sounds - back of mouth
      'k': 'kk', 'g': 'kk',
      'kk': 'kk',
      
      // Fricatives - air flow
      's': 'SS', 'z': 'SS', 'SH': 'SS', 'sh': 'SS',
      'SS': 'SS',
      
      // Affricates - combination sounds
      'CH': 'CH', 'ch': 'CH', 'j': 'CH',
      
      // Liquids - flowing sounds
      'r': 'RR', 'RR': 'RR',
      
      // Vowels - mouth positions (most important for lip sync)
      'a': 'aa', 'ah': 'aa', 'aa': 'aa',
      'e': 'E', 'eh': 'E', 'E': 'E',
      'i': 'I', 'ih': 'I', 'I': 'I', 'ee': 'I',
      'o': 'O', 'oh': 'O', 'O': 'O', 'oo': 'O',
      'u': 'U', 'uh': 'U', 'U': 'U',
      
      // Silence and unknown sounds
      'sil': 'sil', ' ': 'sil'
    };
    
    return mapping[phoneme] || 'sil';
  };
  
  // Get intensity for different phonemes - Enhanced for more realistic speaking
  const getIntensityForPhoneme = (phoneme) => {
    const openVowels = ['a', 'aa', 'ah']; // Very open mouth sounds
    const midVowels = ['e', 'E', 'o', 'O']; // Medium open mouth sounds
    const closeVowels = ['i', 'I', 'u', 'U']; // Less open but still visible
    const strongConsonants = ['PP', 'FF', 'TH', 'DD', 'kk', 'CH'];
    
    if (openVowels.includes(phoneme)) {
      return 1.2; // Very strong mouth opening for open vowels
    } else if (midVowels.includes(phoneme)) {
      return 1.0; // Strong mouth opening for mid vowels
    } else if (closeVowels.includes(phoneme)) {
      return 0.8; // Good mouth movement for close vowels
    } else if (strongConsonants.includes(phoneme)) {
      return 0.7; // Clear consonant articulation
    } else {
      return 0.5; // Visible movement for other sounds
    }
  };

  const speakResponse = (text) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);

    if (voice) {
      utterance.voice = voice;
    }

    utterance.lang = "en-US";
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Pre-generate lip sync data
    const lipSyncData = generateLipSyncData(text, utterance.rate);
    let speechStartTime = null;
    let animationId = null;

    utterance.onstart = () => {
      setIsSpeaking(true);
      speechStartTime = performance.now();
      
      // Start real-time lip sync animation
      const animateLipSync = () => {
        if (!speechStartTime) return;
        
        const currentTime = performance.now() - speechStartTime;
        const currentViseme = lipSyncData.find(v => 
          currentTime >= v.start && currentTime <= v.end
        );
        
        if (currentViseme) {
          setVisemeData({
            current: currentViseme.viseme,
            intensity: currentViseme.intensity,
            timestamp: currentTime
          });
        } else {
          // Default mouth position when no specific viseme
          setVisemeData({
            current: 'sil',
            intensity: 0.2,
            timestamp: currentTime
          });
        }
        
        // Continue animation if speech is ongoing
        if (currentTime < Math.max(...lipSyncData.map(v => v.end))) {
          animationId = requestAnimationFrame(animateLipSync);
        }
      };
      
      animationId = requestAnimationFrame(animateLipSync);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setVisemeData(null);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };

    utterance.onerror = (event) => {
      setIsSpeaking(false);
      setVisemeData(null);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  const askBot = async (promptText) => {
    try {
      setIsModelLoading(true);
      const prompt = promptText || inputText;
      if (!prompt.trim()) { setIsModelLoading(false); return; }

      // If the conversationType has changed, reset the conversation to only the new greeting
      if (mode === 'conversation' && conversationType && conversation.length === 1 && conversation[0].role === 'assistant') {
        setConversation([conversation[0]]);
      }

      setConversation((prev) => [...prev, { role: "user", content: prompt }]);
      setInputText(""); // Clear input immediately after appending user message

      let systemPrompt = "";
      
      // Explicit logic to ensure correct prompt is used
      if (mode === 'conversation') {
        // Role-play mode - always use role-play prompt
        const selectedType = conversationTypes.find(type => type.value === conversationType);
        if (selectedType) {
          systemPrompt = selectedType.prompt;
        } else {
          // Fallback to a default role-play prompt if conversationType is not found
          systemPrompt = `You are a friendly person having a casual conversation. Stay in character as a conversational partner. Greet the other person, talk naturally, and ask simple questions to keep the conversation going. Only ask questions or respond as a conversational partner. Keep responses under 25 words. Start the conversation now by greeting your conversation partner and asking your first question.`;
        }
      } else if (mode === 'talk') {
        // Tutor mode - always use tutor prompt
        systemPrompt = `You are an experienced and encouraging English tutor helping a student improve their English skills. Your role is to:

1. **Provide detailed explanations** when correcting grammar, vocabulary, or pronunciation
2. **Give specific examples** to illustrate your points
3. **Ask follow-up questions** to encourage practice and deeper understanding
4. **Offer constructive feedback** that builds confidence
5. **Explain the reasoning** behind language rules and usage
6. **Suggest alternative expressions** to expand vocabulary
7. **Maintain a supportive and patient tone** throughout the conversation

When responding:
- If the student makes an error, explain what's wrong and why, then provide the correct version
- If they ask a question, give a comprehensive but clear answer
- If they share something, respond naturally and ask relevant follow-up questions
- Keep responses conversational but educational (aim for 2-4 sentences)
- Always encourage continued practice and learning

Remember: You're not just correcting mistakes, you're helping someone become more confident and proficient in English.`;
      }

      // Get the model
      const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });

      // Prepare the conversation history for context
      const conversationHistory = conversation.map(msg => 
        `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
      ).join('\n');

      // Create the full prompt with system instruction and conversation history
      const fullPrompt = `${systemPrompt}\n\nConversation history:\n${conversationHistory}\n\nUser: ${prompt}\n\nAssistant:`;

      // Generate content
      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      let responseText = response.text();
      // Remove leading 'Assistant:' (case-insensitive, with or without space)
      responseText = responseText.replace(/^Assistant:\s*/i, "");
      
      setConversation((prev) => [
        ...prev,
        { role: "assistant", content: responseText },
      ]);
      setResponse(responseText);
      speakResponse(responseText);
      setIsModelLoading(false);
    } catch (error) {
      setResponse(`Error: ${error.message}`);
      setIsModelLoading(false);
    }
  };

  const resetChat = () => {
    setConversation([]);
    setResponse("");
    setInputText("");
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setVisemeData(null);
    setTranscript("");
  };

  const startConversation = async () => {
    if (conversationType) {
      // Clear previous conversation when starting a new role-play
      resetChat();
      const selectedType = conversationTypes.find(type => type.value === conversationType);
      if (selectedType) {
        // Generate the greeting using the AI model with the correct system prompt
        const systemPrompt = selectedType.prompt;
        const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });
        const fullPrompt = `${systemPrompt}\n\nAssistant:`;
        try {
          setIsModelLoading(true);
          const result = await model.generateContent(fullPrompt);
          const response = await result.response;
          const greeting = response.text();
          setConversation([{ role: "assistant", content: greeting }]);
          speakResponse(greeting);
        } catch (error) {
          setConversation([{ role: "assistant", content: "Hello! Let's start our conversation!" }]);
        } finally {
          setIsModelLoading(false);
        }
      }
    }
  };

  // Helper to stop speech
  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setVisemeData(null);
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  if (!mode) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
          <div className={"absolute inset-0 bg-[url(\"data:image/svg+xml,%3Csvg width=...%3E\")] opacity-20"}></div>
          
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 max-w-full sm:max-w-md w-full">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">English Practice Bot</h1>
              <p className="text-white/70">Choose how you want to practice</p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => { stopSpeaking(); resetChat(); setMode('talk'); setConversationType(''); }}
                className="w-full p-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl text-white font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center space-x-3"
              >
                <MessageCircle className="w-5 h-5" />
                <span>Talk to Tutor</span>
              </button>
              
              <button
                onClick={() => { stopSpeaking(); resetChat(); setMode('conversation'); setConversationType(''); }}
                className="w-full p-4 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-xl text-white font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center space-x-3"
              >
                <Users className="w-5 h-5" />
                <span>Role-Play Conversation</span>
              </button>

              {/* Fun Practice Button */}
              <button
                onClick={() => navigate('/funs')}
                className="w-full p-4 bg-gradient-to-r from-pink-500 to-yellow-500 hover:from-pink-600 hover:to-yellow-600 rounded-xl text-white font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center space-x-3"
              >
                <Star className="w-5 h-5" />
                <span>Fun Practice</span>
              </button>
            </div>

            <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-white font-semibold mb-2 flex items-center">
                <MessageCircle className="w-4 h-4 mr-2" />
                Talk to Tutor
              </h3>
              <p className="text-white/70 text-sm">Get help with grammar, pronunciation, and English conversation practice.</p>
            </div>

            <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-white font-semibold mb-2 flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Role-Play Conversation
              </h3>
              <p className="text-white/70 text-sm">Practice real-world scenarios like job interviews, shopping, or casual conversations.</p>
            </div>
          </div>
        </div>
        {/* About Me Top Button - only on main menu */}
        <button
          onClick={() => navigate('/about')}
          className="fixed top-2 right-2 sm:top-6 sm:right-6 md:top-8 md:right-8 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-6 py-3 rounded-full shadow-lg font-semibold text-lg transition-all duration-200 flex items-center space-x-2"
        >
          <span>About Me</span>
        </button>
      </>
    );
  }

  if (mode === 'conversation' && !conversationType) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
          <div className={"absolute inset-0 bg-[url(\"data:image/svg+xml,%3Csvg width=...%3E\")] opacity-20"}></div>
          
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 max-w-2xl w-full">
            <div className="text-center mb-8">
              <button
                onClick={() => { stopSpeaking(); setMode(''); }}
                className="mb-4 text-white/70 hover:text-white transition-colors"
              >
                ← Back to main menu
              </button>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Choose Your Role-Play</h1>
              <p className="text-white/70">Select a conversation scenario to practice</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {conversationTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setConversationType(type.value)}
                  className={`p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                    conversationType === type.value
                      ? 'bg-purple-500/30 border-purple-400 shadow-lg transform scale-105'
                      : 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="text-white font-semibold text-lg">{type.label}</div>
                </button>
              ))}
            </div>

            {conversationType && (
              <div className="text-center">
                <button
                  onClick={startConversation}
                  className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl text-white font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
                >
                  Start Conversation
                </button>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Subtle loader if waiting for voices and no voice is set */}
      {voiceLoading && (
        <div className="fixed top-0 left-0 w-full flex items-center justify-center z-40 pointer-events-none">
          <div className="bg-black/60 text-white px-4 py-2 rounded-b-xl shadow-lg flex items-center gap-2 mt-2 animate-pulse">
            <svg className="animate-spin h-5 w-5 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
            </svg>
            <span>Loading voices...</span>
          </div>
        </div>
      )}
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <div className={"absolute inset-0 bg-[url(\"data:image/svg+xml,%3Csvg width=...%3E\")] opacity-20"}></div>
        <div className="relative z-10 max-w-4xl mx-auto pt-6 sm:pt-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 gap-y-2 flex-wrap">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  stopSpeaking();
                  setMode('');
                  setConversationType('');
                }}
                className="text-white/70 hover:text-white transition-colors"
              >
                ← Back
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {mode === 'talk' ? 'English Tutor' : `Role-Play: ${conversationTypes.find(t => t.value === conversationType)?.label || ''}`}
                </h1>
                <p className="text-white/70 text-sm">
                  {mode === 'talk' 
                    ? 'Get help with your English learning' 
                    : 'Practice real-world conversation scenarios'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={() => { stopSpeaking(); resetChat(); }}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
            >
              Reset Chat
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Avatar Section */}
            <div className="lg:col-span-1">
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-xl flex items-center justify-center min-h-[200px] max-h-[60vh] relative">
                {!isModelReady && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 rounded-2xl">
                    <svg className="animate-spin h-16 w-16 text-purple-400 mb-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                    </svg>
                    <span className="text-white text-xl font-semibold">Loading Model...</span>
                  </div>
                )}
                {isModelReady && <AvatarViewer isSpeaking={isSpeaking} visemeData={visemeData} />}
              </div>
            </div>

            {/* Chat Section */}
            <div className="lg:col-span-2 space-y-4">
              {/* Conversation History */}
              <div ref={chatContainerRef} className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl h-64 sm:h-80 overflow-y-auto scrollbar-hide relative">
                <div className="p-6 space-y-4">
                  {conversation.length === 0 ? (
                    <div className="text-center text-white/50 mt-20">
                      <MessageCircle className="w-12 h-12 mx-auto mb-4" />
                      <p>Start a conversation by typing or speaking!</p>
                    </div>
                  ) : (
                    <>
                      {conversation.map((message, index) => (
                        <div
                          key={index}
                          className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-xs sm:max-w-sm md:max-w-md px-4 py-3 rounded-2xl ${
                              message.role === "user"
                                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                                : "bg-white/20 text-white border border-white/20"
                            } shadow-lg`}
                          >
                            <p className="text-sm">{message.content}</p>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Input Section */}
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20 shadow-xl pb-6 sm:pb-8">
                <div className="flex flex-col space-y-2 lg:flex-row lg:space-y-0 lg:space-x-3 w-full">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !isSpeaking && askBot()}
                    placeholder="Type your message or use voice..."
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 sm:px-4 sm:py-3 text-base sm:text-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent w-full"
                    disabled={isSpeaking}
                  />
                  <button
                    onClick={() => askBot()}
                    disabled={!inputText.trim() || isSpeaking}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-semibold transition-all duration-300 w-full lg:w-auto"
                  >
                    Send
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <button
                    onClick={isListening ? stopListening : startListening}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
                      isListening
                        ? "bg-red-500 hover:bg-red-600 text-white"
                        : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                    }`}
                    disabled={isSpeaking}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    <span>{isListening ? "Stop Listening" : "Voice Input"}</span>
                  </button>

                  {isSpeaking && (
                    <button
                      onClick={stopSpeaking}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-semibold transition-colors ml-2"
                    >
                      Stop Speaking
                    </button>
                  )}

                  {isListening && (
                    <div className="flex items-center space-x-2 text-white/70">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                      <span className="text-sm">Listening...</span>
                    </div>
                  )}
                </div>
                {transcript && (
                  <div className="mt-3 p-3 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-white/70 text-sm">
                      <span className="font-semibold">Heard:</span> "{transcript}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppContent />} />
        <Route path="/funs" element={<Funs />} />
        <Route path="/about" element={<AboutMe />} />
      </Routes>
    </Router>
  );
}

// Add a fade-in animation for the dropdown
<style>{`
@keyframes fade-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
.animate-fade-in { animation: fade-in 0.18s ease; }
`}</style>