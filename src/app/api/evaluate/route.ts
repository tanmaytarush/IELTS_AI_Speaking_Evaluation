import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from 'openai';

export async function POST(request: NextRequest) {
    try {
        const { transcription, testPart } = await request.json();
        
        if (!transcription) {
            return NextResponse.json({ error: 'No transcription provided' }, { status: 400 });
        }

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const prompt = `
You are an expert IELTS speaking examiner. Analyze the following response from a test-taker and provide a comprehensive evaluation based on the four IELTS speaking criteria:

TEST PART: ${testPart}
RESPONSE: "${transcription}"

Provide your evaluation in the following JSON format:
{
  "scores": {
    "fluency_coherence": [score out of 9],
    "lexical_resource": [score out of 9],
    "grammatical_range": [score out of 9],
    "pronunciation": [score out of 9],
    "overall": [average score out of 9]
  },
  "detailed_analysis": {
    "fluency_coherence": {
      "assessment": "[detailed assessment]",
      "strengths": ["strength 1", "strength 2"],
      "weaknesses": ["weakness 1", "weakness 2"]
    },
    "lexical_resource": {
      "assessment": "[detailed assessment]",
      "strengths": ["strength 1", "strength 2"],
      "weaknesses": ["weakness 1", "weakness 2"]
    },
    "grammatical_range": {
      "assessment": "[detailed assessment]",
      "strengths": ["strength 1", "strength 2"],
      "weaknesses": ["weakness 1", "weakness 2"]
    },
    "pronunciation": {
      "assessment": "[detailed assessment]",
      "strengths": ["strength 1", "strength 2"],
      "weaknesses": ["weakness 1", "weakness 2"]
    }
  },
  "recommendations": [
    "specific recommendation 1",
    "specific recommendation 2",
    "specific recommendation 3"
  ],
  "band_descriptor": "[explanation of overall band level]"
}

Be thorough and specific in your analysis. Consider the test part when evaluating appropriateness of response.
`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                { role: 'system', content: 'You are an expert IELTS speaking examiner.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.3
        });

        const analysis = JSON.parse(response.choices[0].message.content || '{}');
        return NextResponse.json(analysis);
    } catch (error) {
        console.error('Evaluation error:', error);
        return NextResponse.json({ error: 'Evaluation failed' }, { status: 500 });
    }
} 