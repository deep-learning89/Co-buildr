import Groq from 'groq-sdk';

const groqApiKey = process.env.GROQ_API_KEY?.trim();

console.log('🔍 Groq API key available:', !!groqApiKey);
console.log('🔍 Groq API key length:', groqApiKey?.length || 0);

// Shared Groq client instance used by server-side pipeline utilities.
export const groqClient = groqApiKey ? new Groq({ apiKey: groqApiKey }) : null;
