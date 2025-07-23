import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from 'openai';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const audioFile = formData.get('audio') as File;

        if(!audioFile) {
            return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
        }

        // Check if API key is available
        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
        }

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const transcription = await openai.audio.transcriptions.create({
            model: 'whisper-1',
            file: audioFile,
            response_format: 'verbose_json',
            language: 'en'
        });

        return NextResponse.json(transcription);
    } catch(error) {
        console.error('Error transcribing audio:', error);
        return NextResponse.json({ error: 'Failed to transcribe audio' }, { status: 500 });
    }
}
