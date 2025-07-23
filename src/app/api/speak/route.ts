import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from 'openai';

export async function POST(request: NextRequest) {
    try {
        const { text, voice = 'alloy' } = await request.json();

        if (!text) {
            return NextResponse.json({ error: 'No text provided' }, { status: 400 });
        }

        // Check if API key is available
        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
        }

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        // Generate speech using OpenAI TTS
        const speechResponse = await openai.audio.speech.create({
            model: "tts-1",
            voice: voice as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
            input: text,
        });

        // Convert the response to a buffer
        const buffer = Buffer.from(await speechResponse.arrayBuffer());

        // Return the audio as a blob
        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': buffer.length.toString(),
            },
        });

    } catch (error) {
        console.error('Error generating speech:', error);
        return NextResponse.json({ error: 'Failed to generate speech' }, { status: 500 });
    }
} 