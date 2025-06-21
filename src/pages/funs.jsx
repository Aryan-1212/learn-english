import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Volume2, Check, X, ArrowLeft, Play, Pause, RotateCcw, Star, ChevronLeft, ChevronRight, Mic, MicOff, BookOpen, Lightbulb } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { distance as levenshteinDistance } from 'fastest-levenshtein';
import grammarDetails from '../data/grammarDetails.json';

// Gemini API function for grammar correction
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
const correctGrammar = async (sentence) => {
  const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });
  const prompt = `Correct and enhance this sentence: '{sentence}'`;
  const result = await model.generateContent(prompt.replace('{sentence}', sentence));
  const response = await result.response;
  const text = response.text();
  // Try to split out the correction and explanation if possible
  // Expecting something like: "Corrected: ...\nExplanation: ..."
  let corrected = text;
  let explanation = "";
  let hasErrors = true;
  const match = text.match(/Corrected\s*[:：]\s*(.*?)(?:\n|$)/i);
  if (match) {
    corrected = match[1].trim();
    const expMatch = text.match(/Explanation\s*[:：]\s*(.*)/i);
    if (expMatch) explanation = expMatch[1].trim();
  } else {
    // Try to split by first line
    const lines = text.split('\n');
    if (lines.length > 1) {
      corrected = lines[0].trim();
      explanation = lines.slice(1).join(' ').trim();
    }
  }
  // If the correction is the same as input, no errors
  if (corrected.trim().toLowerCase() === sentence.trim().toLowerCase()) {
    hasErrors = false;
    if (!explanation) explanation = "Your sentence looks good! Minor formatting applied.";
  }
  return {
    original: sentence,
    corrected,
    hasErrors,
    explanation
  };
};

// Calculate pronunciation accuracy using fastest-levenshtein
const calculateAccuracy = (expected, spoken) => {
  const distance = levenshteinDistance(expected.toLowerCase(), spoken.toLowerCase());
  const maxLength = Math.max(expected.length, spoken.length);
  const accuracy = ((maxLength - distance) / maxLength) * 100;
  return Math.max(0, Math.round(accuracy));
};

// Grammar rules data
const grammarRules = [
  {
    id: 1,
    title: "Subject-Verb Agreement",
    rule: "The subject and verb must agree in number (singular or plural).",
    examples: [
      "✓ The cat runs quickly.",
      "✓ The cats run quickly.",
      "✗ The cat run quickly.",
      "✗ The cats runs quickly."
    ],
    difficulty: "Basic",
    tip: "Remember: Singular subjects take singular verbs, plural subjects take plural verbs."
  },
  {
    id: 2,
    title: "Past Perfect Tense",
    rule: "Use 'had' + past participle to show an action completed before another past action.",
    examples: [
      "✓ I had finished my homework before dinner.",
      "✓ She had left when I arrived.",
      "✗ I have finished my homework before dinner.",
      "✗ She left when I had arrived."
    ],
    difficulty: "Intermediate",
    tip: "Past perfect shows which action happened first in the past."
  },
  {
    id: 3,
    title: "Articles (A, An, The)",
    rule: "Use 'a' before consonant sounds, 'an' before vowel sounds, 'the' for specific things.",
    examples: [
      "✓ I saw a dog in the park.",
      "✓ She is an honest person.",
      "✓ The book on the table is mine.",
      "✗ I saw dog in park."
    ],
    difficulty: "Basic",
    tip: "Listen to the sound, not just the letter: 'an hour' (vowel sound), 'a university' (consonant sound)."
  },
  {
    id: 4,
    title: "Conditional Sentences",
    rule: "First conditional: If + present simple, will + base verb (for likely future situations).",
    examples: [
      "✓ If it rains, I will stay home.",
      "✓ If you study hard, you will pass.",
      "✗ If it will rain, I stay home.",
      "✗ If you studied hard, you will pass."
    ],
    difficulty: "Intermediate",
    tip: "First conditional is for real possibilities in the future."
  },
  {
    id: 5,
    title: "Present Perfect vs Past Simple",
    rule: "Present perfect connects past to present; past simple is for completed past actions.",
    examples: [
      "✓ I have lived here for 5 years. (still living)",
      "✓ I lived there in 2010. (finished)",
      "✗ I have lived there in 2010.",
      "✗ I lived here for 5 years. (if still living)"
    ],
    difficulty: "Intermediate",
    tip: "Use present perfect when the time period isn't finished or the action affects now."
  }
];

// Main App Component
const EnglishPracticeApp = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const navigate = useNavigate();

  const renderPage = () => {
    switch (currentPage) {
      case 'grammar':
        return <GrammarCorrector onBack={() => setCurrentPage('home')} />;
      case 'pronunciation':
        return <PronunciationChecker onBack={() => setCurrentPage('home')} />;
      case 'vocabulary':
        return <VocabularyCards onBack={() => setCurrentPage('home')} />;
      case 'grammarRules':
        return <GrammarRuleCards onBack={() => setCurrentPage('home')} />;
      case 'aboutMe':
        return <AboutMePage onBack={() => setCurrentPage('home')} />;
      default:
        return <HomePage setCurrentPage={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 relative">
      {/* Back to Home Button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 z-50 flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-semibold shadow-lg transition-all duration-200"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back</span>
      </button>
      {renderPage()}
    </div>
  );
};

// Home Page Component
const HomePage = ({ setCurrentPage }) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 pt-20">
      <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 max-w-full sm:max-w-md w-full border border-white/20">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Star className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">English Practice Bot</h1>
          <p className="text-purple-200">Choose how you want to practice</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => setCurrentPage('grammar')}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-4 px-6 rounded-xl flex items-center justify-center space-x-3 transition-all duration-200 transform hover:scale-105"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="font-medium">Grammar Correction</span>
          </button>

          <button
            onClick={() => setCurrentPage('pronunciation')}
            className="w-full bg-purple-500 hover:bg-purple-600 text-white py-4 px-6 rounded-xl flex items-center justify-center space-x-3 transition-all duration-200 transform hover:scale-105"
          >
            <Mic className="w-5 h-5" />
            <span className="font-medium">Pronunciation Check</span>
          </button>

          <button
            onClick={() => setCurrentPage('vocabulary')}
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-4 px-6 rounded-xl flex items-center justify-center space-x-3 transition-all duration-200 transform hover:scale-105"
          >
            <BookOpen className="w-5 h-5" />
            <span className="font-medium">Vocabulary Cards</span>
          </button>

          <button
            onClick={() => setCurrentPage('grammarRules')}
            className="w-full bg-pink-500 hover:bg-pink-600 text-white py-4 px-6 rounded-xl flex items-center justify-center space-x-3 transition-all duration-200 transform hover:scale-105"
          >
            <Lightbulb className="w-5 h-5" />
            <span className="font-medium">Grammar Rules</span>
          </button>

          {/* <button
            onClick={() => setCurrentPage('aboutMe')}
            className="w-full bg-green-500 hover:bg-green-600 text-white py-4 px-6 rounded-xl flex items-center justify-center space-x-3 transition-all duration-200 transform hover:scale-105"
          >
            <span className="font-medium">About Me</span>
          </button> */}
        </div>
      </div>
    </div>
  );
};

// Grammar Corrector Component
const GrammarCorrector = ({ onBack }) => {
  const [sentence, setSentence] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCorrect = async () => {
    if (!sentence.trim()) return;
    
    setLoading(true);
    try {
      const correction = await correctGrammar(sentence);
      setResult(correction);
    } catch (error) {
      // Error correcting grammar
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setSentence('');
    setResult(null);
  };

  return (
    <div className="min-h-screen p-4 pt-20">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center mb-6">
          <button
            onClick={onBack}
            className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-white ml-4">Grammar Correction & Enhancement</h1>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <div className="mb-6">
            <label className="block text-white font-medium mb-3">Enter your sentence:</label>
            <textarea
              value={sentence}
              onChange={(e) => setSentence(e.target.value)}
              placeholder="Type your sentence here..."
              className="w-full p-4 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-blue-400 resize-none"
              rows="3"
            />
          </div>

          <div className="flex space-x-3 mb-6">
            <button
              onClick={handleCorrect}
              disabled={!sentence.trim() || loading}
              className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 text-white py-3 px-6 rounded-xl font-medium transition-colors flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Correcting...</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>Correct & Enhance</span>
                </>
              )}
            </button>
            <button
              onClick={clearAll}
              className="bg-red-500 hover:bg-red-600 text-white py-3 px-6 rounded-xl font-medium transition-colors flex items-center space-x-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Clear</span>
            </button>
          </div>

          {result && (
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <div className="mb-4">
                <h3 className="text-white font-semibold mb-2">Original:</h3>
                <p className="text-red-300 bg-red-500/20 p-3 rounded-lg">{result.original}</p>
              </div>
              
              <div className="mb-4">
                <h3 className="text-white font-semibold mb-2">Corrected:</h3>
                <p className="text-green-300 bg-green-500/20 p-3 rounded-lg">
                  {(() => {
                    const lines = result.corrected.split(/\n|\r/).map(l => l.trim()).filter(Boolean);
                    let mainCorrection = lines.find(l => l.match(/^([*\-•\d.]+\s*)?([A-Z].*[.!?])$/));
                    if (!mainCorrection && lines.length > 0) mainCorrection = lines[0];
                    if (mainCorrection) mainCorrection = mainCorrection.replace(/^([*\-•\d.]+\s*)/, "").replace(/^\*\*|\*\*/g, "");
                    return mainCorrection || result.corrected;
                  })()}
                </p>
              </div>
              
              <div>
                <h3 className="text-white font-semibold mb-2">Explanation:</h3>
                <div className="text-blue-300 bg-blue-500/20 p-3 rounded-lg">
                  {(() => {
                    const exp = result.explanation.trim();
                    if (exp.match(/^[*\-•\d.]+\s+/m)) {
                      const items = exp.split(/\n|\r/).map(l => l.trim()).filter(l => l.match(/^[*\-•\d.]+\s+/));
                      if (items.length > 0) {
                        return (
                          <ul className="list-disc pl-6 space-y-1">
                            {items.map((item, idx) => (
                              <li key={idx}>{item.replace(/^([*\-•\d.]+\s*)/, "").replace(/^\*\*|\*\*/g, "")}</li>
                            ))}
                          </ul>
                        );
                      }
                    }
                    return <span>{exp}</span>;
                  })()}
                </div>
              </div>
              
              {/* Feedback message: Only show if correction is simple (not a list or multiple options) */}
              {(() => {
                // Show feedback only if the correction is a single sentence and not a list
                const lines = result.corrected.split(/\n|\r/).map(l => l.trim()).filter(Boolean);
                const isSimple = lines.length === 1 || (lines.length > 0 && !lines[0].toLowerCase().includes('option'));
                if (!isSimple) return null;
                if (result.hasErrors) {
                  return (
                    <div className="mt-4 flex items-center space-x-2 text-orange-300">
                      <X className="w-5 h-5" />
                      <span>Errors found and corrected</span>
                    </div>
                  );
                }
                return (
                  <div className="mt-4 flex items-center space-x-2 text-green-300">
                    <Check className="w-5 h-5" />
                    <span>Great! Your grammar looks good</span>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Pronunciation Checker Component
const PronunciationChecker = ({ onBack }) => {
  const [targetSentence, setTargetSentence] = useState('');
  const [spokenText, setSpokenText] = useState('');
  const [accuracy, setAccuracy] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recognitionError, setRecognitionError] = useState("");
  const recognitionRef = useRef(null);

  const commonSentences = [
    "The quick brown fox jumps over the lazy dog.",
    "She sells seashells by the seashore.",
    "How much wood would a woodchuck chuck?",
    "Peter Piper picked a peck of pickled peppers.",
    "I scream, you scream, we all scream for ice cream."
  ];

  const checkPronunciation = () => {
    if (!targetSentence.trim() || !spokenText.trim()) return;
    
    const accuracyScore = calculateAccuracy(targetSentence, spokenText);
    setAccuracy(accuracyScore);
  };

  const getAccuracyColor = (score) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getAccuracyMessage = (score) => {
    if (score >= 90) return 'Excellent pronunciation!';
    if (score >= 70) return 'Good job! Keep practicing.';
    return 'Needs improvement. Try again!';
  };

  // Real speech recognition logic
  const startRecording = () => {
    setRecognitionError("");
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setRecognitionError('Speech recognition is not supported in this browser.');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setIsRecording(true);
    setSpokenText("");

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setSpokenText(transcript);
      setIsRecording(false);
    };
    recognition.onerror = (event) => {
      setRecognitionError('Recognition error: ' + event.error);
      setIsRecording(false);
    };
    recognition.onend = () => {
      setIsRecording(false);
    };
    recognition.start();
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  useEffect(() => {
    // Clean up recognition on unmount
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  return (
    <div className="min-h-screen p-4 pt-20">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center mb-6">
          <button
            onClick={onBack}
            className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-white ml-4">Pronunciation Accuracy</h1>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <div className="mb-6">
            <label className="block text-white font-medium mb-3">Target Sentence:</label>
            <textarea
              value={targetSentence}
              onChange={(e) => setTargetSentence(e.target.value)}
              placeholder="Enter the sentence to practice..."
              className="w-full p-4 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-blue-400 resize-none"
              rows="2"
            />
          </div>

          <div className="mb-6">
            <label className="block text-white font-medium mb-3">Common Practice Sentences:</label>
            <div className="grid gap-2">
              {commonSentences.map((sentence, index) => (
                <button
                  key={index}
                  onClick={() => setTargetSentence(sentence)}
                  className="text-left p-3 bg-white/5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors"
                >
                  {sentence}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-white font-medium mb-3">Your Spoken Text:</label>
            <div className="flex space-x-3">
              <textarea
                value={spokenText}
                readOnly
                placeholder="Use the microphone..."
                className="flex-1 p-4 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-blue-400 resize-none"
                rows="2"
              />
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={!targetSentence.trim() || (isRecording && !('webkitSpeechRecognition' in window || 'SpeechRecognition' in window))}
                className={`p-4 rounded-xl transition-colors ${
                  isRecording 
                    ? 'bg-red-500 text-white' 
                    : 'bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-500'
                }`}
                title={isRecording ? 'Stop Recording' : 'Start Recording'}
              >
                {isRecording ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
            </div>
            {isRecording && (
              <p className="text-red-300 mt-2 text-sm">🎤 Recording... Speak now!</p>
            )}
            {recognitionError && (
              <p className="text-red-400 mt-2 text-sm">{recognitionError}</p>
            )}
          </div>

          <div className="flex space-x-3 mb-6">
            <button
              onClick={checkPronunciation}
              disabled={!targetSentence.trim() || !spokenText.trim()}
              className="flex-1 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-500 text-white py-3 px-6 rounded-xl font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <Volume2 className="w-5 h-5" />
              <span>Check Accuracy</span>
            </button>
            <button
              onClick={() => {
                setTargetSentence('');
                setSpokenText('');
                setAccuracy(null);
                setRecognitionError("");
              }}
              className="bg-red-500 hover:bg-red-600 text-white py-3 px-6 rounded-xl font-medium transition-colors flex items-center space-x-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Clear</span>
            </button>
          </div>

          {accuracy !== null && (
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <div className="text-center mb-4">
                <div className={`text-6xl font-bold ${getAccuracyColor(accuracy)} mb-2`}>
                  {accuracy}%
                </div>
                <p className={`text-lg font-medium ${getAccuracyColor(accuracy)}`}>
                  {getAccuracyMessage(accuracy)}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="text-white font-semibold mb-2">Expected:</h4>
                  <p className="text-green-300 bg-green-500/20 p-3 rounded-lg">{targetSentence}</p>
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-2">You said:</h4>
                  <p className="text-blue-300 bg-blue-500/20 p-3 rounded-lg">{spokenText}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Vocabulary Cards Component
const VocabularyCards = ({ onBack }) => {
  const [mode, setMode] = useState('top'); // 'top' or 'search'
  const [searchInput, setSearchInput] = useState("");
  const [searchedWord, setSearchedWord] = useState("");
  const [currentCard, setCurrentCard] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);
  const [favorites, setFavorites] = useState(new Set());
  const [wordData, setWordData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [topWords, setTopWords] = useState([]); // Today's top vocabulary words

  // Fetch today's top vocabulary words only once per day
  useEffect(() => {
    if (mode !== 'top') return;
    const today = getTodayString();
    const cached = localStorage.getItem('topVocab_' + today);
    if (cached) {
      setTopWords(JSON.parse(cached));
      return;
    }
    setLoading(true);
    const fetchValidWords = async () => {
      let validWords = [];
      let tries = 0;
      while (validWords.length < 10 && tries < 30) {
        tries++;
        // Try original API with CORS proxy first
        let words = [];
        try {
          const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent('https://random-word-api.herokuapp.com/word?number=' + (10 - validWords.length))}`);
          const data = await res.json();
          console.log("Fetched random words:", data);
          if (Array.isArray(data)) {
            words = data;
          } else {
            throw new Error("Invalid data format");
          }
        } catch {
          // Fallback to a curated word list if API fails
          const fallbackWords = ['serendipity', 'ephemeral', 'mellifluous', 'ubiquitous', 'serendipitous', 'quintessential', 'perspicacious', 'magnanimous', 'eloquent', 'resilient', 'authentic', 'profound', 'enigmatic', 'luminous', 'tranquil', 'arduous', 'benevolent', 'diligent', 'eloquent', 'frugal', 'gratitude', 'humility', 'integrity', 'jubilant', 'kindness'];
          words = fallbackWords.slice(0, 10 - validWords.length);
        }
        // Check each word in dictionaryapi.dev
        const checks = await Promise.all(words.map(async word => {
          try {
            const r = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
            const data = await r.json();
            if (
              Array.isArray(data) &&
              data[0] &&
              Array.isArray(data[0].meanings) &&
              data[0].meanings.length > 0
            ) {
              return word;
            }
          } catch {}
          return null;
        }));
        validWords = [...validWords, ...checks.filter(Boolean)];
      }
      validWords = validWords.slice(0, 10);
      setTopWords(validWords);
      localStorage.setItem('topVocab_' + today, JSON.stringify(validWords));
      setLoading(false);
    };
    fetchValidWords();
  }, [mode]);

  // For 'top' mode
  const currentWord = mode === 'top' ? topWords[currentCard] : undefined;
  // For 'search' mode
  const wordToFetch = mode === 'top' ? currentWord : searchedWord;

  // Fetch word data for the current card or searched word
  useEffect(() => {
    if (!wordToFetch) return;
    let ignore = false;
    setLoading(true);
    setError("");
    setWordData(null);
    fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${wordToFetch}`)
      .then(res => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(data => {
        if (ignore) return;
        // Extract info
        const entry = data[0];
        const phonetic = entry.phonetic || (entry.phonetics && entry.phonetics[0]?.text) || "";
        const audio = (entry.phonetics && entry.phonetics.find(p => p.audio))?.audio || "";
        const meaningObj = entry.meanings && entry.meanings[0];
        const meaning = meaningObj?.definitions[0]?.definition || "";
        const example = meaningObj?.definitions[0]?.example || "";
        setWordData({
          word: entry.word,
          phonetic,
          audio,
          meaning,
          example
        });
      })
      .catch(() => {
        if (!ignore) setError("No data found for this word.");
      })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [wordToFetch]);

  const nextCard = () => {
    setCurrentCard((prev) => (prev + 1) % (topWords.length || 1));
    setShowMeaning(false);
  };

  const prevCard = () => {
    setCurrentCard((prev) => (prev - 1 + (topWords.length || 1)) % (topWords.length || 1));
    setShowMeaning(false);
  };

  const toggleFavorite = (word) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(word)) {
        newFavorites.delete(word);
      } else {
        newFavorites.add(word);
      }
      return newFavorites;
    });
  };

  const speakWord = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new window.SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Helper to check if wordData is valid (has a meaning)
  const isValidWordData = (data) => data && data.meaning && data.meaning.length > 0;

  // Auto-skip invalid words in 'top' mode
  useEffect(() => {
    if (mode !== 'top' || !topWords.length) return;
    if (loading || error) return;
    if (!isValidWordData(wordData)) {
      // Prevent infinite loop by tracking attempts
      let attempts = 0;
      let idx = currentCard;
      while (attempts < topWords.length) {
        idx = (idx + 1) % topWords.length;
        if (topWords[idx] && topWords[idx] !== topWords[currentCard]) {
          setCurrentCard(idx);
          break;
        }
        attempts++;
      }
    }
  }, [mode, topWords, wordData, loading, error, currentCard]);

  return (
    <div className="min-h-screen p-4 pt-20">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-white">Vocabulary Cards</h1>
          <div className="text-white/60 text-sm">
            {mode === 'top' ? `${currentCard + 1} / ${topWords.length || 1}` : ''}
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex justify-center mb-6 gap-4">
          <button
            className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 ${mode === 'top' ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/70 hover:bg-blue-500/20'}`}
            onClick={() => { setMode('top'); setShowMeaning(false); setError(""); }}
          >
            Today's Top Vocabulary
          </button>
          <button
            className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 ${mode === 'search' ? 'bg-purple-500 text-white' : 'bg-white/10 text-white/70 hover:bg-purple-500/20'}`}
            onClick={() => { setMode('search'); setShowMeaning(false); setError(""); }}
          >
            Search Any Word
          </button>
        </div>

        {/* Search Input */}
        {mode === 'search' && (
          <form
            className="flex items-center gap-2 mb-6"
            onSubmit={e => {
              e.preventDefault();
              setSearchedWord(searchInput.trim());
              setShowMeaning(false);
            }}
          >
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Type a word..."
              className="flex-1 p-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              type="submit"
              className="px-5 py-3 bg-purple-500 hover:bg-purple-600 rounded-xl text-white font-semibold transition-all duration-200"
            >
              Search
            </button>
          </form>
        )}

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 min-h-[400px] flex flex-col">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4"></div>
              <span className="text-white/80">Loading...</span>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <span className="text-red-300">{mode === 'top' ? 'No valid vocabulary found for today. Please try again later.' : error}</span>
            </div>
          ) : wordData && isValidWordData(wordData) ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <span className="px-3 py-1 rounded-full text-xs font-medium text-white bg-blue-500">Word</span>
                <button
                  onClick={() => toggleFavorite(wordData.word)}
                  className={`p-2 rounded-full transition-colors ${
                    favorites.has(wordData.word) 
                      ? 'text-yellow-400 bg-yellow-400/20' 
                      : 'text-white/60 hover:text-yellow-400 hover:bg-yellow-400/20'
                  }`}
                >
                  <Star className="w-5 h-5" fill={favorites.has(wordData.word) ? 'currentColor' : 'none'} />
                </button>
              </div>

              <div className="flex-1 flex flex-col justify-center">
                <div className="text-center mb-6">
                  <div className="flex items-center justify-center space-x-3 mb-4">
                    <h2 className="text-4xl font-bold text-white">{wordData.word}</h2>
                    <button
                      onClick={() => speakWord(wordData.word)}
                      className="p-2 bg-blue-500 hover:bg-blue-600 rounded-full text-white transition-colors"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                    {wordData.audio && (
                      <button
                        onClick={() => new Audio(wordData.audio).play()}
                        className="p-2 bg-green-500 hover:bg-green-600 rounded-full text-white transition-colors"
                        title="Play Pronunciation Audio"
                      >
                        <Play className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  <p className="text-purple-200 text-lg mb-6">{wordData.phonetic}</p>
                </div>

                {showMeaning ? (
                  <div className="space-y-4">
                    <div className="bg-white/5 rounded-xl p-4">
                      <h3 className="text-white font-semibold mb-2">Meaning:</h3>
                      <p className="text-blue-200">{wordData.meaning}</p>
                    </div>
                    {wordData.example && (
                      <div className="bg-white/5 rounded-xl p-4">
                        <h3 className="text-white font-semibold mb-2">Example:</h3>
                        <p className="text-green-200 italic">"{wordData.example}"</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center">
                    <button
                      onClick={() => setShowMeaning(true)}
                      className="bg-purple-500 hover:bg-purple-600 text-white py-3 px-8 rounded-xl font-medium transition-colors"
                    >
                      Show Meaning & Example
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : null}

          {mode === 'top' && topWords.length > 0 && (
            <div className="mt-8">
              <div className="flex flex-wrap justify-center items-center gap-x-2 gap-y-1 mx-auto mb-3">
                {topWords.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 sm:w-1.5 sm:h-1.5 min-w-[8px] rounded-full transition-colors ${
                      index === currentCard ? 'bg-white' : 'bg-white/30'
                    }`}
                  />
                ))}
              </div>
              <div className="flex justify-between items-center">
                <button
                  onClick={prevCard}
                  className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span>Previous</span>
                </button>
                <button
                  onClick={nextCard}
                  className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Grammar Rule Cards Component
const GrammarRuleCards = ({ onBack }) => {
  const [currentRule, setCurrentRule] = useState(0);
  const [bookmarked, setBookmarked] = useState(new Set());
  const rules = grammarDetails.english_grammar_dataset;
  const contentRef = useRef(null);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentRule]);

  if (!rules || !rules.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-white/80">Loading grammar rules...</span>
      </div>
    );
  }
  const rule = rules[currentRule];

  const nextRule = () => {
    setCurrentRule((prev) => (prev + 1) % rules.length);
  };

  const prevRule = () => {
    setCurrentRule((prev) => (prev - 1 + rules.length) % rules.length);
  };

  const toggleBookmark = (ruleId) => {
    setBookmarked(prev => {
      const newBookmarked = new Set(prev);
      if (newBookmarked.has(ruleId)) {
        newBookmarked.delete(ruleId);
      } else {
        newBookmarked.add(ruleId);
      }
      return newBookmarked;
    });
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Basic': return 'bg-green-500';
      case 'Intermediate': return 'bg-yellow-500';
      case 'Advanced': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentRule]);

  return (
    <div className="min-h-screen p-4 pt-20">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8 items-stretch">
        <div ref={contentRef} className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={onBack}
              className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-white">Grammar Rules</h1>
            <div className="text-white/60 text-sm">
              {currentRule + 1} / {rules.length}
            </div>
          </div>

          {/* Rule Card with clean design */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 mb-8 transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getDifficultyColor(rule.level)}`}>{rule.level}</span>
              <button
                onClick={() => toggleBookmark(currentRule)}
                className={`p-2 rounded-full transition-colors ${bookmarked.has(currentRule) ? 'text-blue-400 bg-blue-400/20' : 'text-white/60 hover:text-blue-400 hover:bg-blue-400/20'}`}
              >
                <BookOpen className="w-5 h-5" fill={bookmarked.has(currentRule) ? 'currentColor' : 'none'} />
              </button>
            </div>

            <h2 className="text-3xl font-bold text-white mb-4">{rule.topic}</h2>
            <div className="bg-blue-500/20 border border-blue-400/30 rounded-xl p-4 mb-6">
              <p className="text-blue-200 text-lg">{rule.rule}</p>
            </div>
            <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-xl p-4 mb-6">
              <div className="flex items-start space-x-3">
                <Lightbulb className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-yellow-200 font-semibold mb-1">Tip:</h4>
                  <p className="text-yellow-100">{rule.tip}</p>
                </div>
              </div>
            </div>

            {/* Subtopics as cards */}
            {rule.subtopics && rule.subtopics.length > 0 && (
              <div className="mb-8 grid gap-6">
                {rule.subtopics.map((sub, idx) => (
                  <div key={idx} className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <h4 className="text-lg font-bold text-purple-200 mb-2">{sub.title}</h4>
                    <p className="text-blue-200 mb-2">{sub.rule}</p>
                    {sub.examples && sub.examples.length > 0 && (
                      <ul className="list-disc pl-6 space-y-1">
                        {sub.examples.map((ex, i) => (
                          <li key={i} className="text-green-200">{ex}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Navigation: Previous/Next only */}
            <div className="flex justify-between items-center mt-8">
              <button
                onClick={prevRule}
                className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white py-3 px-6 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                <span>Previous Rule</span>
              </button>
              <button
                onClick={nextRule}
                className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white py-3 px-6 rounded-lg transition-colors"
              >
                <span>Next Rule</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Vertical Quick Navigation on the right (desktop) or below (mobile) */}
        <div className="md:w-64 w-full md:ml-0 mt-6 md:mt-0 flex-shrink-0 flex flex-col">
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10 h-full flex flex-col">
            <h3 className="text-white font-medium mb-3">Quick Navigation:</h3>
            <div className="flex flex-col gap-2">
              {rules.map((ruleItem, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentRule(index)}
                  className={`break-words whitespace-normal px-4 py-2 rounded-full font-semibold transition-all duration-200 border-2 ${
                    index === currentRule
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white border-purple-400 shadow-lg'
                      : 'bg-white/10 text-white/70 border-white/20 hover:bg-white/20 hover:text-white'
                  }`}
                  style={{ minWidth: 120, wordBreak: 'break-word', whiteSpace: 'normal' }}
                >
                  {ruleItem.topic}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// About Me Page Component
const AboutMePage = ({ onBack }) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 max-w-lg w-full border border-white/20 relative">
        <button
          onClick={onBack}
          className="absolute top-6 left-6 z-50 flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-semibold shadow-lg transition-all duration-200"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <div className="flex flex-col items-center mt-8">
          <img
            src="https://randomuser.me/api/portraits/men/32.jpg"
            alt="Profile"
            className="w-32 h-32 rounded-full border-4 border-purple-400 shadow-lg mb-4 object-cover"
          />
          <h2 className="text-2xl font-bold text-white mb-2">Aryan Parvani</h2>
          <p className="text-purple-200 mb-4">English Tutor & App Developer</p>
          <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-white text-center">
            <p className="mb-2">Hi! I'm John, the creator of this English Practice Bot. I'm passionate about helping people improve their English skills in a fun and interactive way. With a background in linguistics and software development, I designed this app to make learning accessible and enjoyable for everyone.</p>
            <p className="mb-2">Feel free to explore the app and reach out if you have any feedback or suggestions!</p>
            <p className="text-purple-300 mt-4">Contact: johndoe@email.com</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper to get today's date string (YYYY-MM-DD)
const getTodayString = () => {
  const d = new Date();
  return d.toISOString().slice(0, 10);
};

export default EnglishPracticeApp;