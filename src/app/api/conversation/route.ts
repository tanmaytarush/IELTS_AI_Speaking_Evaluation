import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from 'openai';

export async function POST(request: NextRequest) {
    try {
        const { userResponse, testPart, conversationHistory = [] } = await request.json();
        
        if (!userResponse) {
            return NextResponse.json({ error: 'No user response provided' }, { status: 400 });
        }

        // Check if API key is available
        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
        }

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        // Create context-aware prompt based on test part
        let systemPrompt = '';
        let userPrompt = '';

        if (testPart === 1) {
            systemPrompt = `You are an IELTS Speaking examiner conducting Part 1 (Introduction and Interview). 
            Your role is to ask follow-up questions to encourage the candidate to speak more about familiar topics.
            Keep your responses natural, encouraging, and conversational. Ask one follow-up question at a time.
            Focus on topics like home, family, work, studies, hobbies, and daily routine.`;
            
            userPrompt = `The candidate just said: "${userResponse}"
            
            Based on their response, ask one natural follow-up question to encourage them to speak more. 
            Keep your response conversational and encouraging.`;
        } else if (testPart === 2) {
            systemPrompt = `You are an IELTS Speaking examiner conducting Part 2 (Individual Long Turn).
            The candidate has just completed their 1-2 minute monologue on a given topic.
            Your role is to ask a brief follow-up question related to what they just said.
            Keep your question concise and relevant to their response.`;
            
            userPrompt = `The candidate just completed their Part 2 response: "${userResponse}"
            
            Ask one brief follow-up question related to what they just said. Keep it concise and relevant.`;
        } else if (testPart === 3) {
            systemPrompt = `You are an IELTS Speaking examiner conducting Part 3 (Two-way Discussion).
            This is a deeper, more abstract discussion about broader themes and ideas.
            Ask thought-provoking questions that require analysis, comparison, and speculation.
            Encourage the candidate to express and justify opinions, discuss abstract concepts, and think critically.`;
            
            userPrompt = `The candidate just said: "${userResponse}"
            
            Ask a thought-provoking follow-up question that encourages deeper analysis, comparison, or speculation.
            Focus on broader themes and abstract concepts.`;
        }

        const response = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 150
        });

        const examinerResponse = response.choices[0].message.content?.trim() || 'Thank you for your response.';

        return NextResponse.json({
            examinerResponse,
            testPart,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Conversation error:', error);
        return NextResponse.json({ error: 'Failed to generate examiner response' }, { status: 500 });
    }
} 