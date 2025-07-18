import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from 'openai';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const audioFile = formData.get('audio') as File;

        if(!audioFile) {
            return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
        }

        const bytes = await audioFile.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const tempPath = join('/tmp', `audio_${Date.now()}.wav`);
        await writeFile(tempPath, buffer);

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY});

        const transcription = await openai.audio.transcriptions.create({
            model: 'whisper-1',
            file: audioFile,
            response_format: 'verbose_json',
            language: 'en'
        })

        return NextResponse.json(transcription);
    }   catch(error) {
        console.error('Error transcribing audio:', error);
        return NextResponse.json({ error: 'Failed to transcribe audio' }, { status: 500 });
    }
}
