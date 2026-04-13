import { FrenchLevel, Message, FRENCH_LEVELS } from "../types";
import { GoogleGenAI, Modality, Type } from "@google/genai";

export { FRENCH_LEVELS };
export type { FrenchLevel, Message };

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function chatWithTutor(messages: Message[], level: FrenchLevel) {
  try {
    const model = "gemini-3-flash-preview";
    const systemInstruction = `You are a friendly and encouraging French tutor named 'Poonam'. 
    The user is at the ${level} level. 
    - Always respond primarily in French, but provide English translations in parentheses for difficult words or phrases if the user is a Beginner.
    - Correct the user's French mistakes gently.
    - Encourage conversation about French culture, food, and daily life.
    - Keep responses concise and engaging.
    - If the user asks for a translation, provide it clearly.`;

    const response = await ai.models.generateContent({
      model,
      contents: messages.map((m: any) => ({ role: m.role, parts: [{ text: m.text }] })),
      config: {
        systemInstruction,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Chat Error:", error);
    return "Désolé, je n'ai pas pu me connecter au tuteur.";
  }
}

export async function generateSpeech(text: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
    return base64Audio;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
}

export async function translateText(text: string, toFrench: boolean) {
  try {
    const model = "gemini-3-flash-preview";
    const prompt = toFrench 
      ? `Translate the following English text to French: "${text}". Provide only the translation.`
      : `Translate the following French text to English: "${text}". Provide only the translation.`;

    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
    });

    return response.text;
  } catch (error) {
    console.error("Translate Error:", error);
    return "";
  }
}

export const DAILY_PHRASE = {
  french: "La vie est belle",
  english: "Life is beautiful",
  pronunciation: "La vee ay bell",
  context: "A common French expression about positivity."
};

export const LISTENING_EXERCISES = [
  {
    id: "listen-1",
    title: "Morning Routine",
    french: "Le matin, je bois un café et je lis le journal.",
    english: "In the morning, I drink a coffee and I read the newspaper.",
  },
  {
    id: "listen-2",
    title: "Weekend Plans",
    french: "Ce week-end, je vais aller au parc avec mes amis.",
    english: "This weekend, I am going to go to the park with my friends.",
  },
  {
    id: "listen-3",
    title: "Shopping",
    french: "Je cherche une nouvelle robe pour la fête de samedi.",
    english: "I am looking for a new dress for Saturday's party.",
  }
];

export const BADGES = [
  { id: 'first-step', title: 'First Step', description: 'Completed your first lesson', icon: 'Footprints' },
  { id: 'chatterbox', title: 'Chatterbox', description: 'Sent 10 messages to Poonam', icon: 'MessageSquare' },
  { id: 'polyglot', title: 'Polyglot', description: 'Reached 500 points', icon: 'Trophy' },
  { id: 'native-speaker', title: 'Native Speaker', description: 'Practiced 20 pronunciations', icon: 'Mic' },
  { id: 'streak-master', title: 'Streak Master', description: 'Maintained a 3-day streak', icon: 'Flame' },
  { id: 'quiz-whiz', title: 'Quiz Whiz', description: 'Scored 100% on a lesson quiz', icon: 'CheckCircle' },
];

export const GRAMMAR_EXERCISES = [
  {
    id: "grammar-1",
    level: "Beginner",
    title: "Present Tense: Être",
    description: "Fill in the correct form of 'être' (to be).",
    exercises: [
      { sentence: "Je ___ indien.", answer: "suis", hint: "I am Indian." },
      { sentence: "Tu ___ très gentil.", answer: "es", hint: "You are very kind." },
      { sentence: "Il ___ professeur.", answer: "est", hint: "He is a teacher." },
    ]
  },
  {
    id: "grammar-2",
    level: "Intermediate",
    title: "Passé Composé: Avoir",
    description: "Fill in the correct auxiliary verb 'avoir'.",
    exercises: [
      { sentence: "J'___ mangé une pomme.", answer: "ai", hint: "I have eaten an apple." },
      { sentence: "Nous ___ fini le travail.", answer: "avons", hint: "We have finished the work." },
      { sentence: "Ils ___ vu le film.", answer: "ont", hint: "They have seen the movie." },
    ]
  },
  {
    id: "grammar-3",
    level: "Advanced",
    title: "Subjunctive Mood",
    description: "Fill in the correct subjunctive form.",
    exercises: [
      { sentence: "Il faut que tu ___ (faire) tes devoirs.", answer: "fasses", hint: "It is necessary that you do your homework." },
      { sentence: "Je doute qu'il ___ (venir).", answer: "vienne", hint: "I doubt that he will come." },
      { sentence: "Bien qu'il ___ (être) fatigué, il travaille.", answer: "soit", hint: "Although he is tired, he works." },
    ]
  }
];

export const LESSONS = [
  {
    id: "greetings",
    title: "Greetings & Basics",
    description: "Learn how to say hello and introduce yourself.",
    level: "Beginner",
    content: [
      { french: "Bonjour", english: "Hello / Good morning" },
      { french: "Salut", english: "Hi / Bye (informal)" },
      { french: "Comment ça va ?", english: "How are you?" },
      { french: "Je m'appelle...", english: "My name is..." },
      { french: "Enchanté(e)", english: "Nice to meet you" },
    ],
    quiz: [
      {
        question: "How do you say 'Hello' in French?",
        options: ["Bonjour", "Merci", "S'il vous plaît", "Au revoir"],
        answer: "Bonjour"
      },
      {
        question: "What does 'Comment ça va ?' mean?",
        options: ["What is your name?", "How are you?", "Where are you from?", "Nice to meet you"],
        answer: "How are you?"
      }
    ]
  },
  {
    id: "food",
    title: "At the Boulangerie",
    description: "Ordering your favorite French pastries.",
    level: "Beginner",
    content: [
      { french: "Un croissant, s'il vous plaît", english: "A croissant, please" },
      { french: "Une baguette", english: "A baguette" },
      { french: "Je voudrais...", english: "I would like..." },
      { french: "C'est combien ?", english: "How much is it?" },
      { french: "Merci beaucoup", english: "Thank you very much" },
    ],
    quiz: [
      {
        question: "How do you say 'A croissant, please'?",
        options: ["Une baguette, s'il vous plaît", "Un croissant, s'il vous plaît", "Merci beaucoup", "C'est combien ?"],
        answer: "Un croissant, s'il vous plaît"
      },
      {
        question: "What does 'C'est combien ?' mean?",
        options: ["What is it?", "How much is it?", "Who is it?", "Where is it?"],
        answer: "How much is it?"
      }
    ]
  },
  {
    id: "travel",
    title: "Travel & Directions",
    description: "Navigating the streets of Paris.",
    level: "Intermediate",
    content: [
      { french: "Où est la gare ?", english: "Where is the train station?" },
      { french: "À gauche", english: "To the left" },
      { french: "À droite", english: "To the right" },
      { french: "Tout droit", english: "Straight ahead" },
      { french: "Je suis perdu(e)", english: "I am lost" },
    ],
    quiz: [
      {
        question: "How do you say 'To the left'?",
        options: ["À droite", "À gauche", "Tout droit", "Où est la gare ?"],
        answer: "À gauche"
      },
      {
        question: "What does 'Je suis perdu(e)' mean?",
        options: ["I am happy", "I am lost", "I am tired", "I am hungry"],
        answer: "I am lost"
      }
    ]
  },
  {
    id: "business",
    title: "Business French",
    description: "Professional vocabulary for the workplace.",
    level: "Advanced",
    content: [
      { french: "Une réunion", english: "A meeting" },
      { french: "Le compte rendu", english: "The report / minutes" },
      { french: "Négocier", english: "To negotiate" },
      { french: "Un partenariat", english: "A partnership" },
      { french: "Le chiffre d'affaires", english: "Turnover / Revenue" },
    ],
    quiz: [
      {
        question: "What is 'Une réunion'?",
        options: ["A reunion", "A meeting", "A party", "A break"],
        answer: "A meeting"
      },
      {
        question: "How do you say 'To negotiate'?",
        options: ["Négocier", "Vendre", "Acheter", "Travailler"],
        answer: "Négocier"
      }
    ]
  }
];

export async function getDynamicQuiz(lessonId: string, level: FrenchLevel) {
  const lesson = LESSONS.find(l => l.id === lessonId);
  if (!lesson) return null;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate 3 multiple-choice quiz questions for a French lesson about "${lesson.title}" for ${level} level. 
      The lesson content includes: ${JSON.stringify(lesson.content)}.
      Return the response as a JSON array of objects with 'question', 'options' (array of 4 strings), and 'answer' (string, must be one of the options).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              answer: { type: Type.STRING }
            },
            required: ["question", "options", "answer"]
          }
        }
      }
    });

    const text = response.text.trim();
    const jsonStr = text.startsWith("```json") 
      ? text.replace(/^```json\n?/, "").replace(/\n?```$/, "") 
      : text;
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Error generating dynamic quiz:", error);
    return lesson.quiz; // Fallback to static quiz
  }
}

export async function getDynamicGrammar(grammarId: string, level: FrenchLevel) {
  const grammar = GRAMMAR_EXERCISES.find(g => g.id === grammarId);
  if (!grammar) return null;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate 3 fill-in-the-blank grammar exercises for "${grammar.title}" at ${level} level.
      The topic is: ${grammar.description}.
      Return the response as a JSON array of objects with 'sentence' (use ___ for blank), 'answer' (the missing word), and 'hint' (English translation or clue).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              sentence: { type: Type.STRING },
              answer: { type: Type.STRING },
              hint: { type: Type.STRING }
            },
            required: ["sentence", "answer", "hint"]
          }
        }
      }
    });

    const text = response.text.trim();
    const jsonStr = text.startsWith("```json") 
      ? text.replace(/^```json\n?/, "").replace(/\n?```$/, "") 
      : text;
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Error generating dynamic grammar:", error);
    return grammar.exercises; // Fallback to static exercises
  }
}
