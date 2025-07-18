'use client';

import { useState, useRef } from 'react';

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

export default function Home() {
  const [testPart, setTestPart] = useState(1);
  const [question, setQuestion] = useState('');
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcription, setTranscription] = useState('');
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-8">
        🎤 IELTS Speaking Module
      </h1>
      
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
    </div>
  );
}