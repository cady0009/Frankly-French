import { FrenchLevel, Message, FRENCH_LEVELS } from "../types";
export { FRENCH_LEVELS };
export type { FrenchLevel, Message };

export async function chatWithTutor(messages: Message[], level: FrenchLevel) {
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, level }),
    });
    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error("Chat Error:", error);
    return "Désolé, je n'ai pas pu me connecter au tuteur.";
  }
}

export async function generateSpeech(text: string) {
  try {
    const response = await fetch("/api/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
}

export async function translateText(text: string, toFrench: boolean) {
  try {
    const response = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, toFrench }),
    });
    const data = await response.json();
    return data.text;
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
    const response = await fetch("/api/dynamic-quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: lesson.title, content: lesson.content, level }),
    });
    return await response.json();
  } catch (error) {
    console.error("Error generating dynamic quiz:", error);
    return lesson.quiz; // Fallback to static quiz
  }
}

export async function getDynamicGrammar(grammarId: string, level: FrenchLevel) {
  const grammar = GRAMMAR_EXERCISES.find(g => g.id === grammarId);
  if (!grammar) return null;

  try {
    const response = await fetch("/api/dynamic-grammar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: grammar.title, description: grammar.description, level }),
    });
    return await response.json();
  } catch (error) {
    console.error("Error generating dynamic grammar:", error);
    return grammar.exercises; // Fallback to static exercises
  }
}
