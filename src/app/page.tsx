'use client';

import { useState, useRef, useEffect } from 'react';

const questions = {
  1: [
    "Tell me about your hometown. What do you like most about it?",
    "Do you work or study? What do you enjoy most about your work/studies?",
    "What are your hobbies? How long have you been interested in them?",
    "Describe your daily routine. What's your favorite part of the day?",
    "Tell me about your family. Are you close to your family members?"
  ],
  2: [
    "Describe a memorable event from your childhood. You should say: what the event was, when it happened, who was involved, and explain why it was memorable.",
    "Talk about a person who has influenced you. You should say: who this person is, how you know them, what influence they had on you, and explain why this person is important to you.",
    "Describe a place you would like to visit. You should say: where it is, what you can do there, what it looks like, and explain why you want to visit this place.",
    "Talk about a skill you would like to learn. You should say: what the skill is, why you want to learn it, how you would learn it, and explain how this skill would be useful to you."
  ],
  3: [
    "What role does technology play in modern education?",
    "How do you think social media affects relationships between people?",
    "What are the advantages and disadvantages of living in a big city?",
    "How important is it for people to learn about their cultural heritage?",
    "Do you think traditional skills are being lost in modern society? Why or why not?"
  ]
};

interface DetailedAnalysis {
  assessment: string;
  strengths: string[];
  weaknesses: string[];
}

interface Evaluation {
  scores: {
    fluency_coherence: number;
    lexical_resource: number;
    grammatical_range: number;
    pronunciation: number;
    overall: number;
  };
  detailed_analysis: {
    fluency_coherence: DetailedAnalysis;
    lexical_resource: DetailedAnalysis;
    grammatical_range: DetailedAnalysis;
    pronunciation: DetailedAnalysis;
  };
  recommendations: string[];
  band_descriptor: string;
}

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  audioUrl?: string;
}

export default function Home() {
  const [testPart, setTestPart] = useState(1);
  const [question, setQuestion] = useState('');
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcription, setTranscription] = useState('');
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(false);
  const [conversationMode, setConversationMode] = useState(false);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [examinerSpeaking, setExaminerSpeaking] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<HTMLAudioElement[]>([]);

  // Initialize conversation with examiner introduction and first question
  useEffect(() => {
    if (conversationMode && conversation.length === 0) {
      const examinerIntro = {
        role: 'assistant' as const,
        content: `Hello! I'm your IELTS Speaking examiner. Welcome to Part ${testPart} of your IELTS Speaking test. Let's begin.`,
        timestamp: new Date()
      };
      
      // Get a question for the current test part
      const qs = questions[testPart as keyof typeof questions];
      const firstQuestion = qs[Math.floor(Math.random() * qs.length)];
      
      const questionMessage = {
        role: 'assistant' as const,
        content: firstQuestion,
        timestamp: new Date()
      };
      
      setConversation([examinerIntro, questionMessage]);
      speakText(examinerIntro.content + " " + firstQuestion);
    }
  }, [conversationMode, testPart]);

  const getQuestion = () => {
    const qs = questions[testPart as keyof typeof questions];
    setQuestion(qs[Math.floor(Math.random() * qs.length)]);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(blob);
      };
      
      mediaRecorderRef.current.start();
      setRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const transcribe = async () => {
    if (!audioBlob) return;
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'user_response.wav');
      
      const res = await fetch('/api/transcribe', { 
        method: 'POST', 
        body: formData 
      });
      
      if (!res.ok) throw new Error('Transcription failed');
      
      const data = await res.json();
      setTranscription(data.text);
      return data.text;
    } catch (error) {
      console.error('Transcription error:', error);
    } finally {
      setLoading(false);
    }
  };

  const evaluate = async () => {
    const text = transcription || await transcribe();
    if (!text) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcription: text, testPart })
      });
      
      if (!res.ok) throw new Error('Evaluation failed');
      
      const data = await res.json();
      setEvaluation(data);
    } catch (error) {
      console.error('Evaluation error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Voice-to-voice conversation functions
  const speakText = async (text: string) => {
    if (!text) return;
    
    setExaminerSpeaking(true);
    try {
      const res = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'alloy' }) // Using OpenAI's voice
      });
      
      if (!res.ok) throw new Error('Speech synthesis failed');
      
      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setExaminerSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.play();
    } catch (error) {
      console.error('Speech synthesis error:', error);
      setExaminerSpeaking(false);
    }
  };

  const processUserResponse = async (userText: string) => {
    // Add user message to conversation
    const userMessage: ConversationMessage = {
      role: 'user',
      content: userText,
      timestamp: new Date()
    };
    
    setConversation(prev => [...prev, userMessage]);
    
    // Get intelligent examiner response from API
    try {
      const res = await fetch('/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userResponse: userText, 
          testPart,
          conversationHistory: conversation
        })
      });
      
      if (!res.ok) throw new Error('Failed to get examiner response');
      
      const data = await res.json();
      const examinerResponse = data.examinerResponse;
      
      // Add examiner response to conversation
      const examinerMessage: ConversationMessage = {
        role: 'assistant',
        content: examinerResponse,
        timestamp: new Date()
      };
      
      setConversation(prev => [...prev, examinerMessage]);
      
      // Speak the examiner's response
      await speakText(examinerResponse);
    } catch (error) {
      console.error('Error getting examiner response:', error);
      // Fallback response
      const fallbackResponse = "Thank you for your response. Can you tell me more about that?";
      const examinerMessage: ConversationMessage = {
        role: 'assistant',
        content: fallbackResponse,
        timestamp: new Date()
      };
      setConversation(prev => [...prev, examinerMessage]);
      await speakText(fallbackResponse);
    }
  };

  const handleConversationResponse = async () => {
    if (!transcription) return;
    
    await processUserResponse(transcription);
    setTranscription('');
    setAudioBlob(null);
  };

  const startConversationMode = () => {
    setConversationMode(true);
    setConversation([]);
    setCurrentQuestionIndex(0);
    setEvaluation(null);
  };

  const stopConversationMode = () => {
    setConversationMode(false);
    setConversation([]);
    setExaminerSpeaking(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-8">
        🎤 IELTS Speaking Module
      </h1>
      
      {/* Mode Selection */}
      <div className="mb-6 flex gap-4 justify-center">
        <button
          onClick={() => setConversationMode(false)}
          className={`px-4 py-2 rounded ${!conversationMode ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Practice Mode
        </button>
        <button
          onClick={startConversationMode}
          className={`px-4 py-2 rounded ${conversationMode ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
        >
          Voice Conversation Mode
        </button>
      </div>

      {conversationMode ? (
        /* Voice Conversation Mode */
        <div className="space-y-6">
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-800">🎙️ Voice Conversation Mode</h3>
            <p className="text-green-700">
              {testPart === 1 && "Part 1: Introduction & Interview (4-5 minutes) - General questions about familiar topics"}
              {testPart === 2 && "Part 2: Individual Long Turn (3-4 minutes) - Speak for 1-2 minutes on a specific topic"}
              {testPart === 3 && "Part 3: Two-way Discussion (4-5 minutes) - Deeper discussion on abstract topics"}
            </p>
            {examinerSpeaking && (
              <div className="mt-2 text-green-600">🔊 Examiner is speaking...</div>
            )}
          </div>

          {/* Current Question Display */}
          {conversation.length > 1 && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Current Question:</h3>
              <p className="text-lg">{conversation[1]?.content}</p>
            </div>
          )}

          {/* Conversation Display */}
          <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
            <h3 className="font-semibold mb-4">Conversation:</h3>
            {conversation.map((message, index) => (
              <div key={index} className={`mb-3 p-3 rounded ${message.role === 'user' ? 'bg-blue-100 ml-8' : 'bg-green-100 mr-8'}`}>
                <div className="font-semibold text-sm">
                  {message.role === 'user' ? 'You' : 'Examiner'}
                </div>
                <div className="mt-1">{message.content}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>

          {/* Recording Controls for Conversation */}
          <div className="flex gap-4">
            <button 
              onClick={startRecording} 
              disabled={recording || examinerSpeaking}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
            >
              {recording ? 'Recording...' : 'Start Speaking'}
            </button>
            <button 
              onClick={stopRecording} 
              disabled={!recording}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
            >
              Stop Speaking
            </button>
          </div>

          {/* Audio Player and Processing */}
          {audioBlob && (
            <div className="space-y-4">
              <audio controls src={URL.createObjectURL(audioBlob)} className="w-full" />
              <button 
                onClick={transcribe}
                disabled={loading}
                className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
              >
                {loading ? 'Transcribing...' : 'Transcribe Response'}
              </button>
            </div>
          )}

          {/* Process Response */}
          {transcription && (
            <div className="space-y-4">
              <h3 className="font-semibold">Your Response:</h3>
              <p className="bg-gray-50 p-4 rounded">{transcription}</p>
              <button 
                onClick={handleConversationResponse}
                disabled={loading || examinerSpeaking}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
              >
                Send Response
              </button>
            </div>
          )}

          <button
            onClick={stopConversationMode}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            End Conversation
          </button>
        </div>
      ) : (
        /* Practice Mode - Original functionality */
        <div className="space-y-6">
          {/* Test Part Selection */}
          <div className="flex items-center gap-4">
            <label className="font-semibold">Test Part:</label>
            <select 
              value={testPart} 
              onChange={(e) => setTestPart(Number(e.target.value))}
              className="border rounded px-3 py-2"
            >
              <option value={1}>Part 1: Introduction & Interview</option>
              <option value={2}>Part 2: Individual Long Turn</option>
              <option value={3}>Part 3: Two-way Discussion</option>
            </select>
            <button 
              onClick={getQuestion}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Get Question
            </button>
          </div>

          {/* Question Display */}
          {question && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Your Question:</h3>
              <p className="text-lg">{question}</p>
            </div>
          )}

          {/* Recording Controls */}
          <div className="flex gap-4">
            <button 
              onClick={startRecording} 
              disabled={recording}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
            >
              Start Recording
            </button>
            <button 
              onClick={stopRecording} 
              disabled={!recording}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
            >
              Stop Recording
            </button>
          </div>

          {/* Audio Player */}
          {audioBlob && (
            <div className="space-y-4">
              <audio controls src={URL.createObjectURL(audioBlob)} className="w-full" />
              <button 
                onClick={transcribe}
                disabled={loading}
                className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
              >
                {loading ? 'Transcribing...' : 'Transcribe'}
              </button>
            </div>
          )}

          {/* Transcription */}
          {transcription && (
            <div className="space-y-4">
              <h3 className="font-semibold">Transcription:</h3>
              <p className="bg-gray-50 p-4 rounded">{transcription}</p>
              <button 
                onClick={evaluate}
                disabled={loading}
                className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:opacity-50"
              >
                {loading ? 'Evaluating...' : 'Get Evaluation'}
              </button>
            </div>
          )}

          {/* Evaluation Results */}
          {evaluation && (
            <div className="space-y-4">
              <h3 className="font-semibold text-xl">IELTS Evaluation Results</h3>
              <div className="bg-white border rounded-lg p-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{evaluation.scores.overall}</div>
                    <div className="text-sm text-gray-600">Overall</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-600">{evaluation.scores.fluency_coherence}</div>
                    <div className="text-sm text-gray-600">Fluency</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-purple-600">{evaluation.scores.lexical_resource}</div>
                    <div className="text-sm text-gray-600">Vocabulary</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-orange-600">{evaluation.scores.grammatical_range}</div>
                    <div className="text-sm text-gray-600">Grammar</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-red-600">{evaluation.scores.pronunciation}</div>
                    <div className="text-sm text-gray-600">Pronunciation</div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Band Descriptor:</h4>
                    <p className="text-gray-700">{evaluation.band_descriptor}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Recommendations:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {evaluation.recommendations.map((rec: string, i: number) => (
                        <li key={i} className="text-gray-700">{rec}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}