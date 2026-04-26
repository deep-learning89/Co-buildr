import { groqClient } from '@/lib/groq-client';
import type { IntentType } from '@/types';

const INTENT_VALUES: IntentType[] = ['seeking', 'discussion', 'pain'];
const INTENT_SET = new Set<IntentType>(INTENT_VALUES);
export function truncateIntentInput(text: string): string {
  return text.slice(0, 500);
}

export function isIntentType(value: string): value is IntentType {
  return INTENT_SET.has(value as IntentType);
}

export function normalizeIntent(rawIntent: string): IntentType {
  const normalized = rawIntent.trim().toLowerCase();
  return isIntentType(normalized) ? normalized : 'discussion';
}

export async function classifyBatchIntents(
  userQuery: string,
  posts: { id: string; text: string }[]
): Promise<{ id: string; intent: IntentType; summary: string; relevanceScore: number }[]> {
  // Slice to max 6 posts only
  const limitedPosts = posts.slice(0, 6);
  
  // Truncate each post text to 200 chars
  const truncatedPosts = limitedPosts.map(post => ({
    ...post,
    text: post.text.slice(0, 200)
  }));

  // Build fallback array where every item has intent: "discussion", summary: "No summary available", relevanceScore: 3
  const fallback = truncatedPosts.map(post => ({
    id: post.id,
    intent: 'discussion' as IntentType,
    summary: 'No summary available',
    relevanceScore: 3
  }));

  // If groqClient is null, return fallback immediately with console.warn
  if (!groqClient) {
    console.warn('Groq client unavailable, returning fallback intents');
    return fallback;
  }

  try {
    const userPrompt = `User is searching for: "${userQuery}"

Analyze these Reddit posts against that search query:

${truncatedPosts.map(post =>
  `---
POST_ID: ${post.id}
CONTENT: ${post.text}
---`
).join('\n')}

Return this exact JSON:
{
  "results": [
    {
      "id": "<copy POST_ID exactly>",
      "intent": "seeking or pain or discussion",
      "summary": "<two sentence description of what this post says and why it matters to someone searching this topic>",
      "relevanceScore": <1-5, how closely this post matches the user search query>
    }
  ]
}

STRICT RULES:
- id must match POST_ID exactly
- summary must be about post content only, not the search query
- seeking = person wants something, pain = person struggling, discussion = general talk
- relevanceScore 5 = post directly answers user query, 1 = unrelated
- return only JSON, nothing else`;

    // Build ONE groqClient.chat.completions.create call
    const completion = await groqClient.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0,
      max_tokens: 800,
      messages: [
        {
          role: 'system',
          content: 'You are an AI assistant for startup founders searching Reddit.\nRead each post carefully and return a JSON summary of what \nthe post actually says, how relevant it is to the user query,\nand what the poster wants.\nReturn only valid JSON. No markdown. No explanation.',
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const responseText = completion.choices[0]?.message?.content ?? '';
    
    // Strip markdown fences using .replace(/```json|```/g, '').trim() before JSON.parse
    const cleanedResponse = responseText.replace(/```json|```/g, '').trim();
    
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse LLM response:', parseError);
      return fallback;
    }

    // Map each original post back using .find() by ID
    const results = truncatedPosts.map(post => {
      const llmResult = parsedResponse.results?.find((result: { id: string; intent: string; summary: string; relevanceScore: number }) => result.id === post.id);
      
      if (!llmResult) {
        // If no result found for this ID, use fallback
        return fallback.find(f => f.id === post.id)!;
      }

      // Validate and fix each field, using fallback if invalid
      const intent = isIntentType(llmResult.intent) ? llmResult.intent : 'discussion';
      const summary = typeof llmResult.summary === 'string' && llmResult.summary.trim() ? llmResult.summary.trim() : 'No summary available';
      const relevanceScore = typeof llmResult.relevanceScore === 'number' && llmResult.relevanceScore >= 1 && llmResult.relevanceScore <= 5 ? llmResult.relevanceScore : 3;

      return {
        id: post.id,
        intent,
        summary,
        relevanceScore
      };
    });

    return results;
  } catch (error) {
    console.error('Error in batch intent classification:', error);
    return fallback;
  }
}
