import express from "express";
import { GoogleGenAI, Modality, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

app.post("/api/chat", async (req, res) => {
  try {
    const { messages, level } = req.body;
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

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Chat Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/speech", async (req, res) => {
  try {
    const { text } = req.body;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say clearly: ${text}` }] }],
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
    res.json({ data: base64Audio });
  } catch (error: any) {
    console.error("TTS Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/translate", async (req, res) => {
  try {
    const { text, toFrench } = req.body;
    const model = "gemini-3-flash-preview";
    const prompt = toFrench 
      ? `Translate the following English text to French: "${text}". Provide only the translation.`
      : `Translate the following French text to English: "${text}". Provide only the translation.`;

    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Translate Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/dynamic-quiz", async (req, res) => {
  try {
    const { title, content, level } = req.body;
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate 3 multiple-choice quiz questions for a French lesson about "${title}" for ${level} level. 
      The lesson content includes: ${JSON.stringify(content)}.
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

    res.json(JSON.parse(response.text));
  } catch (error: any) {
    console.error("Quiz Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/dynamic-grammar", async (req, res) => {
  try {
    const { title, description, level } = req.body;
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate 3 fill-in-the-blank grammar exercises for "${title}" at ${level} level.
      The topic is: ${description}.
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

    res.json(JSON.parse(response.text));
  } catch (error: any) {
    console.error("Grammar Error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default app;
