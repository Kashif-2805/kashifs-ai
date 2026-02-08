import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Map MIME types to file extensions for Whisper API
const getFileExtension = (mimeType: string): string => {
  const mimeToExt: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/webm;codecs=opus': 'webm',
    'audio/mp4': 'mp4',
    'audio/mp4;codecs=mp4a.40.2': 'mp4',
    'audio/aac': 'aac',
    'audio/mpeg': 'mp3',
    'audio/ogg': 'ogg',
    'audio/ogg;codecs=opus': 'ogg',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/flac': 'flac',
    'audio/x-m4a': 'm4a',
  };
  
  // Normalize the MIME type (remove extra spaces, lowercase)
  const normalizedMime = mimeType.toLowerCase().trim();
  
  // Try exact match first
  if (mimeToExt[normalizedMime]) {
    return mimeToExt[normalizedMime];
  }
  
  // Try matching just the base type (before semicolon)
  const baseMime = normalizedMime.split(';')[0].trim();
  if (mimeToExt[baseMime]) {
    return mimeToExt[baseMime];
  }
  
  // Default to webm if unknown
  console.log(`Unknown MIME type: ${mimeType}, defaulting to webm`);
  return 'webm';
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Please log in' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Transcribe request from user:', user.id);

    const { audio, mimeType } = await req.json();
    
    // Input validation
    if (!audio || typeof audio !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Audio data must be a base64 encoded string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check base64 size (approximate byte size = length * 0.75)
    const approximateBytes = audio.length * 0.75;
    const maxBytes = 25 * 1024 * 1024; // 25MB
    if (approximateBytes > maxBytes) {
      return new Response(
        JSON.stringify({ error: 'Audio file size cannot exceed 25MB' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine file format from MIME type
    const audioMimeType = mimeType || 'audio/webm';
    const fileExtension = getFileExtension(audioMimeType);
    const fileName = `audio.${fileExtension}`;
    
    console.log(`Transcribing audio... MIME: ${audioMimeType}, File: ${fileName}, Size: ${approximateBytes} bytes`);

    // Decode base64 audio
    const binaryString = atob(audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Prepare form data with correct MIME type and filename
    const formData = new FormData();
    const blob = new Blob([bytes], { type: audioMimeType });
    formData.append('file', blob, fileName);
    formData.append('model', 'whisper-1');
    
    // Add language hint for better accuracy (optional, Whisper auto-detects)
    // formData.append('language', 'en');

    // Call OpenAI Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      
      // Provide specific error messages
      if (response.status === 400) {
        return new Response(
          JSON.stringify({ error: 'Invalid audio format. Please try recording again.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Transcription service unavailable. Please try again later.' }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('Transcription complete:', result.text?.substring(0, 100) + '...');

    // Check if transcription is empty
    if (!result.text || result.text.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'No speech detected. Please speak clearly and try again.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ text: result.text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in transcribe function:', error);
    return new Response(
      JSON.stringify({ error: 'Transcription failed. Please try again.' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
