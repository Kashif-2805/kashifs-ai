import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileName, fileContent, fileType } = await req.json();

    if (!fileName || !fileContent) {
      throw new Error('File name and content are required');
    }

    console.log('Analyzing file:', fileName, 'Type:', fileType);

    let extractedText = '';

    // For images, use OpenAI Vision API
    if (fileType?.startsWith('image/')) {
      console.log('Processing image with OpenAI Vision...');
      
      const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Extract all text from this image. If it contains a document, transcribe it completely. If it\'s a photo or diagram, describe what you see in detail.'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: fileContent
                  }
                }
              ]
            }
          ],
          max_tokens: 4096
        }),
      });

      if (!visionResponse.ok) {
        throw new Error('Vision API error');
      }

      const visionData = await visionResponse.json();
      extractedText = visionData.choices[0].message.content;
    } 
    // For text-based files
    else if (fileType?.includes('text') || fileType?.includes('json') || fileName.endsWith('.txt') || fileName.endsWith('.md')) {
      // Decode base64 if needed
      if (fileContent.startsWith('data:')) {
        const base64Data = fileContent.split(',')[1];
        extractedText = atob(base64Data);
      } else {
        extractedText = fileContent;
      }
    }
    // For PDFs and other documents, return raw content for now
    else {
      extractedText = `File uploaded: ${fileName}\nType: ${fileType}\n\nThis file type requires advanced parsing. You can ask me questions about it or request specific analysis.`;
    }

    console.log('File analysis complete. Extracted text length:', extractedText.length);

    return new Response(
      JSON.stringify({ 
        extractedText,
        fileName,
        fileType 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error in analyze-file function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
