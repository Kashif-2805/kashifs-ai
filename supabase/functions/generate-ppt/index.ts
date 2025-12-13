import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PPTSettings {
  presentationType: string;
  audienceLevel: string;
  intent: string;
  tone: string;
  slideCount: number;
  theme: string;
  contentDepth: string;
  includeSpeakerNotes: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, additionalContext, settings } = await req.json() as {
      topic: string;
      additionalContext?: string;
      settings: PPTSettings;
    };

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = buildSystemPrompt(settings);
    const userPrompt = buildUserPrompt(topic, additionalContext, settings);

    console.log('Generating PPT for topic:', topic);
    console.log('Settings:', JSON.stringify(settings));

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_presentation',
              description: 'Generate a professional presentation with slides',
              parameters: {
                type: 'object',
                properties: {
                  slides: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        slideNumber: { type: 'number' },
                        title: { type: 'string', description: 'Clear, concise slide title' },
                        bullets: {
                          type: 'array',
                          items: { type: 'string' },
                          description: '3-5 bullet points, max 12 words each',
                        },
                        speakerNotes: { type: 'string', description: '2-5 lines of speaker notes' },
                        visualSuggestion: { type: 'string', description: 'Optional diagram or visual suggestion' },
                      },
                      required: ['slideNumber', 'title', 'bullets', 'speakerNotes'],
                      additionalProperties: false,
                    },
                  },
                },
                required: ['slides'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'generate_presentation' } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'API credits exhausted. Please add funds.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error('Invalid response format from AI');
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-ppt function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function buildSystemPrompt(settings: PPTSettings): string {
  return `You are Kashif's AI PPT Generator - an expert presentation creator.

DETECTION & ADAPTATION:
- Presentation Type: ${settings.presentationType}
- Audience Level: ${settings.audienceLevel}
- Intent: ${settings.intent}
- Tone: ${settings.tone}
- Content Depth: ${settings.contentDepth}

SLIDE STRUCTURE REQUIREMENTS:
1. Title Slide - Main topic and subtitle
2. Agenda/Outline - Overview of presentation
3. Context/Background - Set the stage
4. Core Concept Slides - Main content (dynamic count)
5. Visual/Diagram slides - Conceptual representations
6. Case Study/Example - Real-world application
7. Key Takeaways - Summary of main points
8. Conclusion - Final thoughts
9. Thank You slide - Call to action or contact

QUALITY RULES:
- Each slide: Clear, concise title
- 3-5 bullet points per slide (≤12 words each)
- Logical progression between slides
- No repetition
- High factual accuracy
- No slide overcrowding
- No long paragraphs
- Titles must summarize the slide
- Maintain professional language
- Avoid generic filler content

STORYTELLING LOGIC:
- Apply Pyramid Principle for business decks
- Use Problem → Solution → Impact flow
- Follow Concept → Explanation → Example pattern
- Structure as Hook → Value → Insight → Summary

${settings.includeSpeakerNotes ? 'SPEAKER NOTES: Include 2-5 lines of speaker notes per slide with key talking points.' : ''}`;
}

function buildUserPrompt(topic: string, additionalContext: string | undefined, settings: PPTSettings): string {
  let prompt = `Create a ${settings.slideCount}-slide professional presentation on: "${topic}"`;
  
  if (additionalContext) {
    prompt += `\n\nAdditional context: ${additionalContext}`;
  }

  prompt += `\n\nGenerate exactly ${settings.slideCount} slides following the structure requirements.`;
  
  return prompt;
}
