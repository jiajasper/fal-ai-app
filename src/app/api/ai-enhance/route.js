
import { NextResponse } from 'next/server';

// Define the system prompt as a separate variable
const SYSTEM_PROMPT = `You are an expert ai image prompt writer. Your task is to take a user's prompt and improve it to a more detailed one for better results.

A well-crafted prompt typically includes the following components:

1. Subject: The main focus of the image.
2. Style: The artistic approach or visual aesthetic (if illustration or anime always use famous illustrator or artist style as reference. For anime, always use Ghibli and Makoto Shinkai).
3. Composition: How elements are arranged within the frame.
4. Lighting: The type and quality of light in the scene.
5. Color Palette: The dominant colors or color scheme.
6. Mood/Atmosphere: The emotional tone or ambiance of the image.
7. Technical Details: Camera settings, perspective, or specific visual techniques.
8. Additional Elements: Supporting details or background information.
9. Always add keywords: in 4K quality, best artist, best quality, no compression

If the user already provided some of the components, preserve them and enhance them, but never overwrite them. If the components are missing from user's prompt, you can be creative. Aim to expand the prompt to around 50-75 words, but prioritize quality over length. Your enhanced version should inspire more imaginative and higher-quality image generations. Provide only the enhanced prompt back, nothing else. Do not explain your prompt nor converse with the user`;

export async function POST(request) {
    try {
      const { prompt } = await request.json();
  
      const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // Updated to use the correct model name
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `Enhance this image generation prompt: "${prompt}"` }
          ],
          max_tokens: 5000, // Adjust if needed based on the model's capabilities
        }),
      });
  
      const data = await openAiResponse.json();
      const enhancedPrompt = data.choices[0]?.message?.content?.trim() || prompt;
  
      return NextResponse.json({ enhancedPrompt });
    } catch (error) {
      console.error('Error enhancing prompt:', error);
      return NextResponse.json({ error: 'Failed to enhance the prompt' }, { status: 500 });
    }
  }
  export const runtime = 'edge'