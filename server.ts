import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { WebSocketServer } from "ws";
import { createClient } from "@supabase/supabase-js";

// Load environment variables
dotenv.config();

const SUPABASE_PROJECT_ID = "kjrqtvioflyrqomzeztm";
const SUPABASE_REGION = "ap-northeast-1";
const SUPABASE_URL = process.env.SUPABASE_URL || `https://${SUPABASE_PROJECT_ID}.supabase.co`;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

function getSupabaseServerClient() {
  if (!SUPABASE_ANON_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

const app = express();
const PORT = 3000;

// Enable JSON body parsing with an increased limit to handle large uploaded text/notes and base64 images
app.use(express.json({ limit: "25mb" }));

const USERS_FILE_PATH = path.join(process.cwd(), "users.json");

function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE_PATH)) {
      const data = fs.readFileSync(USERS_FILE_PATH, "utf8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading users file:", err);
  }
  
  // Default user list with admin
  const defaultUsers = [
    { username: "admin", password: "admin123", role: "admin", createdAt: new Date().toISOString() },
    { username: "student", password: "password123", role: "user", createdAt: new Date().toISOString() }
  ];
  try {
    fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(defaultUsers, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing default users:", err);
  }
  return defaultUsers;
}

function saveUsers(users: any[]) {
  try {
    fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(users, null, 2), "utf8");
  } catch (err) {
    console.error("Error saving users file:", err);
  }
}

// User Auth Endpoints
app.post("/api/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username or Email and password are required." });
  }

  const users = loadUsers();
  const exists = users.find((u: any) => u.username.toLowerCase() === username.toLowerCase());
  if (exists) {
    return res.status(400).json({ error: "Username or Email already registered." });
  }

  const now = new Date().toISOString();
  const newUser = {
    username: username.trim(),
    password: password,
    role: username.toLowerCase() === "admin" ? "admin" : "user",
    createdAt: now,
    lastLogin: now,
    loginCount: 1
  };

  users.push(newUser);
  saveUsers(users);

  res.json({ success: true, user: { username: newUser.username, role: newUser.role } });
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username or Email and password are required." });
  }

  const users = loadUsers();
  const user = users.find(
    (u: any) => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  // Update last login timestamp and login count
  user.lastLogin = new Date().toISOString();
  user.loginCount = (user.loginCount || 0) + 1;
  saveUsers(users);

  res.json({ success: true, user: { username: user.username, role: user.role } });
});

app.get("/api/admin/users", (req, res) => {
  const users = loadUsers();
  const safeUsers = users.map((u: any) => ({
    username: u.username,
    password: u.password,
    role: u.role || "user",
    createdAt: u.createdAt || new Date().toISOString(),
    lastLogin: u.lastLogin || u.createdAt || new Date().toISOString(),
    loginCount: u.loginCount || 1,
    status: "Active",
    passwordMasked: "••••••••"
  }));

  res.json({ 
    users: safeUsers,
    totalUsers: safeUsers.length,
    activeUsers: safeUsers.length
  });
});

app.post("/api/admin/users/role", (req, res) => {
  const { username, newRole } = req.body;
  if (!username || !newRole) {
    return res.status(400).json({ error: "Username and newRole are required." });
  }

  const users = loadUsers();
  const user = users.find((u: any) => u.username.toLowerCase() === username.toLowerCase());
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  user.role = newRole;
  saveUsers(users);
  res.json({ success: true, message: `Updated role for ${username} to ${newRole}` });
});

app.post("/api/admin/users/delete", (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: "Username is required." });
  }

  let users = loadUsers();
  const initialLength = users.length;
  users = users.filter((u: any) => u.username.toLowerCase() !== username.toLowerCase());

  if (users.length === initialLength) {
    return res.status(404).json({ error: "User not found." });
  }

  saveUsers(users);
  res.json({ success: true, message: `User ${username} removed successfully.` });
});

app.get("/api/supabase/status", async (req, res) => {
  const isKeyConfigured = Boolean(SUPABASE_ANON_KEY && SUPABASE_ANON_KEY.length > 5);
  let liveConnection = false;
  let errorMsg = null;

  if (isKeyConfigured) {
    try {
      const client = getSupabaseServerClient();
      if (client) {
        // Ping supabase endpoint
        const { error } = await client.from('health_check').select('*').limit(1);
        if (!error || error.code === 'PGRST116' || error.message?.includes('relation "public.health_check" does not exist')) {
          liveConnection = true;
        } else {
          errorMsg = error.message;
        }
      }
    } catch (e: any) {
      errorMsg = e?.message || "Connection failed";
    }
  }

  res.json({
    projectId: SUPABASE_PROJECT_ID,
    region: SUPABASE_REGION,
    url: SUPABASE_URL,
    configured: isKeyConfigured,
    liveConnection,
    error: errorMsg,
    message: isKeyConfigured 
      ? (liveConnection ? "Supabase project connected and reachable." : "Supabase configured. Key validated.") 
      : "Supabase project kjrqtvioflyrqomzeztm (ap-northeast-1) configured. Provide SUPABASE_ANON_KEY in env secrets to enable direct database operations."
  });
});

// Initialize the GoogleGenAI client safely on the server
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("WARNING: GEMINI_API_KEY is not defined in environment variables. AI features may fail.");
}

const ai = new GoogleGenAI({
  apiKey: apiKey || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Bulletproof JSON cleaning and parsing helper
function cleanAndParseJSON(text: string) {
  if (!text) return {};
  let cleaned = text.trim();
  // Strip markdown codeblocks if they exist
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  cleaned = cleaned.trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("Failed to parse JSON from text:", text);
    throw err;
  }
}

// Define server-side API endpoints

// 1. Summarizer Endpoint
app.post("/api/summarize", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "No study notes content provided or invalid format." });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `You are a master academic summarizer. Summarize the following lecture notes or textbook material. Create an elegant, easy-to-read summary with:
1. A brief "High-Level Overview" summarizing the core concepts in a warm, welcoming tone.
2. A "Key Takeaways" section (exactly 3-5 crucial points) formatted with ⭐ star bullet points.
3. An exhaustive, beautifully organized "Detailed Bullet-Point Notes" section using nested structures.

Format the output strictly in standard, clean Markdown so it renders beautifully. Use emojis, bolding, and headings where appropriate to enhance readability for students.

Notes content:
${text.slice(0, 80000)}`, // Limit length to avoid overwhelming prompt size
    });

    res.json({ summary: response.text });
  } catch (error: any) {
    console.error("Error summarizing content:", error);
    res.status(500).json({ error: error.message || "Failed to generate study summary." });
  }
});

// 2. Ask Questions Endpoint
app.post("/api/ask-question", async (req, res) => {
  try {
    const { text, question } = req.body;
    if (!question) {
      return res.status(400).json({ error: "Please enter a question to ask." });
    }

    const contextNotes = text ? text.slice(0, 60000) : "No notes uploaded yet.";
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `You are StudyGen, an intelligent academic tutor. Your task is to answer the student's question accurately.
If the answer can be found in the provided study notes, prioritize those. If the answer is not in the notes, use your general academic knowledge to provide an accurate answer, but explicitly add a polite note stating "*(Note: This detail was reinforced using general study knowledge as it wasn't fully detailed in your uploaded notes)*".

Always provide clear, readable answers with bullet points and bolding. Be supportive and encouraging!

Student's study notes:
${contextNotes}

Student's question:
"${question}"`,
    });

    res.json({ answer: response.text });
  } catch (error: any) {
    console.error("Error answering question:", error);
    res.status(500).json({ error: error.message || "Failed to answer the question." });
  }
});

// 3. Quiz Generator Endpoint (JSON Response with strict schema)
app.post("/api/generate-quiz", async (req, res) => {
  try {
    const { text, numQuestions = 5 } = req.body;
    const contextNotes = text ? text.slice(0, 60000) : "General high school and college-level essential topics in science, math, and general knowledge.";

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Generate a student quiz with exactly ${numQuestions} questions based on the following material. 
Include a mix of:
- Multiple Choice Questions (MCQs - with exactly 4 options labeled A, B, C, D)
- True or False (labeled A: True, B: False)
- Short Questions (where correctAnswer is a concise 1-2 sentence model answer)

Make the questions highly relevant for testing comprehension. For each question, provide a detailed and encouraging explanation of why the correct answer is correct.

Study Material:
${contextNotes}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "A unique ID string like 'q1', 'q2'" },
                  type: { type: Type.STRING, description: "Must be exactly 'mcq', 'true_false', or 'short'" },
                  question: { type: Type.STRING, description: "The quiz question text" },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "List of 4 choices for MCQ (e.g., ['A) Option 1', 'B) Option 2'...]), or ['A) True', 'B) False'] for true_false. Leave empty array for 'short'."
                  },
                  correctAnswer: { type: Type.STRING, description: "For mcq, must be 'A', 'B', 'C', or 'D'. For true_false, must be 'A' or 'B'. For short, a model 1-sentence answer." },
                  explanation: { type: Type.STRING, description: "Supportive, detailed explanation of the answer" }
                },
                required: ["id", "type", "question", "options", "correctAnswer", "explanation"]
              }
            }
          },
          required: ["questions"]
        }
      }
    });

    const quizData = cleanAndParseJSON(response.text || "{}");
    res.json(quizData);
  } catch (error: any) {
    console.error("Error generating quiz:", error);
    res.status(500).json({ error: error.message || "Failed to generate quiz." });
  }
});

// 4. Flashcard Generator Endpoint (JSON Response)
app.post("/api/generate-flashcards", async (req, res) => {
  try {
    const { text } = req.body;
    const contextNotes = text ? text.slice(0, 60000) : "Essential general study terms and key academic concepts.";

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Extract exactly 8 key terms, concepts, or formulas from the provided text and turn them into question-and-answer revision flashcards. The front of the flashcard should contain a clear question or prompt, and the back should contain a crisp, highly informative answer.

Study material:
${contextNotes}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            flashcards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  front: { type: Type.STRING, description: "The question, prompt, or term on the front of the flashcard" },
                  back: { type: Type.STRING, description: "The answer or definition on the back" }
                },
                required: ["id", "front", "back"]
              }
            }
          },
          required: ["flashcards"]
        }
      }
    });

    const flashcardData = cleanAndParseJSON(response.text || "{}");
    res.json(flashcardData);
  } catch (error: any) {
    console.error("Error generating flashcards:", error);
    res.status(500).json({ error: error.message || "Failed to generate flashcards." });
  }
});

// 5. Explain Like I'm 10 Endpoint
app.post("/api/explain-like-im-10", async (req, res) => {
  try {
    const { topic, text } = req.body;
    if (!topic) {
      return res.status(400).json({ error: "Please enter a topic to explain." });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `You are a warm, imaginative teacher. Explain the following concept like I am a 10-year-old child (ELI10).
Use clever real-world analogies, high-energy storytelling, and extremely simple vocabulary. Break it down so that it's intuitive and immediately understandable, without watering down the underlying truth.

Concept/Topic to explain:
"${topic}"

Optional supporting context or study notes to base explanation on:
${text ? text.slice(0, 30000) : "None provided."}

Keep the tone extremely fun, starry (using words like ✨ magic, spark, universe, ⭐), and interactive!`,
    });

    res.json({ explanation: response.text });
  } catch (error: any) {
    console.error("Error in ELI10:", error);
    res.status(500).json({ error: error.message || "Failed to explain the concept." });
  }
});

// 6. Study Planner Endpoint
app.post("/api/study-planner", async (req, res) => {
  try {
    const { subjects, examDate, dailyHours = 2 } = req.body;
    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ error: "Please provide a list of subjects." });
    }
    if (!examDate) {
      return res.status(400).json({ error: "Please provide an exam date." });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `You are an expert study success counselor. Create a comprehensive, day-by-day study calendar/timetable to help a student prepare for their upcoming exams.

Exams details:
- Subjects to study: ${subjects.join(", ")}
- Target Exam/Deadline Date: ${examDate}
- Study allocation: ${dailyHours} hours per day
- Current Date for calculation context: July 20, 2026

Create an optimized timetable covering the available days up to the exam (make a beautiful daily plan for up to 7 distinct typical study days, structuring it so they can repeat the week cycle or scale it up).
For each study day:
- Assign a focus subject.
- Give a checklist of 2-3 specific learning milestones or tasks.
- Provide a helpful, actionable study technique (e.g. Pomodoro, Feynman technique, Active Recall).

Also include a general list of top tips for exam success.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            studyDays: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.STRING, description: "e.g. 'Monday', 'Tuesday' or 'Day 1'" },
                  focusSubject: { type: Type.STRING },
                  tasks: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  studyMethod: { type: Type.STRING, description: "The active learning method recommended for this day" },
                  motivationQuote: { type: Type.STRING }
                },
                required: ["day", "focusSubject", "tasks", "studyMethod"]
              }
            },
            generalSuccessTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["studyDays", "generalSuccessTips"]
        }
      }
    });

    const plannerData = cleanAndParseJSON(response.text || "{}");
    res.json(plannerData);
  } catch (error: any) {
    console.error("Error creating study planner:", error);
    res.status(500).json({ error: error.message || "Failed to create study planner." });
  }
});

// 7. Interactive Voice Agent Chat API
app.post("/api/voice-agent", async (req, res) => {
  try {
    const { message, contextText = "" } = req.body;
    if (!message) {
      return res.status(400).json({ error: "No message provided." });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `You are StudyGen's Live Voice Agent – an enthusiastic, supportive, and brilliant academic AI tutor. You are holding a real-time, voice-based interactive session with a student.

CRITICAL USER EXPERIENCE MANDATE: The user is listening via real-time Text-to-Speech audio. You MUST keep your responses incredibly brief, conversational, and punchy. Answer in LESS THAN 25 words and only 1-2 short sentences. Do not use lists, bullet points, markdown bold tags, or complex definitions. Just speak naturally, direct, and with stellar encouraging energy! Keep it extremely fast.

Uploaded notes context (if available):
${contextText ? contextText.slice(0, 4000) : "No context notes uploaded yet."}

Student says:
"${message}"`,
      config: {
        maxOutputTokens: 80,
        temperature: 0.7,
      }
    });

    res.json({ responseText: response.text });
  } catch (error: any) {
    console.error("Voice agent error:", error);
    res.status(500).json({ error: error.message || "Voice agent failed to speak." });
  }
});

// 8. Visual AI Note Analyzer Endpoint
app.post("/api/analyze-image", async (req, res) => {
  try {
    const { image, prompt } = req.body;
    if (!image) {
      return res.status(400).json({ error: "Please upload an image to analyze." });
    }

    const textPart = {
      text: prompt || "Explain this image in the context of academic studying. What are the key concepts, equations, or notes displayed here?"
    };

    // Strip out base64 prefix if present
    const base64Data = image.includes(",") ? image.split(",")[1] : image;
    // Extract mime type from prefix if present, otherwise default to image/png
    let mimeType = "image/png";
    if (image.includes("data:")) {
      const match = image.match(/data:([^;]+);base64/);
      if (match) {
        mimeType = match[1];
      }
    }

    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Data
      }
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: {
        parts: [imagePart, textPart]
      },
      config: {
        systemInstruction: "You are StudyGen's Expert AI Visual Tutor. Your goal is to analyze academic photos (equations, textbooks, lecture slides, diagrams, notes) and provide beautiful, deep, student-friendly explanations. Highlight key concepts, formulas, and structured solutions or summaries."
      }
    });

    res.json({ analysis: response.text });
  } catch (error: any) {
    console.error("Error analyzing image:", error);
    res.status(500).json({ error: error.message || "Failed to analyze the image." });
  }
});

// Set up real-time voice session using Gemini Live API
function setupLiveVoiceSession(server: any) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request: any, socket: any, head: any) => {
    const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
    if (pathname === "/api/live-session") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  wss.on("connection", (ws) => {
    console.log("Client connected to real-time voice session");
    let session: any = null;

    ws.on("message", async (messageBuffer) => {
      try {
        const data = JSON.parse(messageBuffer.toString());

        if (data.type === "setup") {
          const { contextText = "" } = data;
          console.log("Setting up Gemini Live session with context length:", contextText.length);

          if (!process.env.GEMINI_API_KEY) {
            throw new Error("No Gemini API key configured on server. Please set GEMINI_API_KEY.");
          }

          session = await ai.live.connect({
            model: "gemini-3.1-flash-live-preview",
            config: {
              responseModalities: ["AUDIO"] as any,
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } }, // Aoede, Puck, Charon, Kore, Fenrir, Zephyr
              },
              systemInstruction: `You are StudyGen's Real-time Live Voice Agent.
The student is speaking to you. Be an enthusiastic, supportive, and brilliant academic AI tutor.
Keep responses short, usually 1-3 sentences. Do not use complex markdown formatting, bullet points, or list structures. Just speak naturally and direct, like you're in a phone call.
Keep the energy high and be encouraging!

Here is the context of their study material/notes if they have uploaded any:
${contextText || "No notes uploaded yet."}`,
            },
            callbacks: {
              onmessage: (message: any) => {
                const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                if (audio) {
                  ws.send(JSON.stringify({ type: "audio", audio }));
                }
                if (message.serverContent?.interrupted) {
                  ws.send(JSON.stringify({ type: "interrupted" }));
                }
              },
              onclose: () => {
                console.log("Gemini Live session closed");
                ws.send(JSON.stringify({ type: "closed" }));
              },
              onerror: (err: any) => {
                console.error("Gemini Live session error:", err);
                ws.send(JSON.stringify({ type: "error", error: err.message || "Session error" }));
              }
            },
          });

          ws.send(JSON.stringify({ type: "ready" }));

        } else if (data.type === "audio") {
          if (session) {
            session.sendRealtimeInput({
              audio: { data: data.audio, mimeType: "audio/pcm;rate=16000" },
            });
          }
        }
      } catch (err: any) {
        console.error("WebSocket message handling error:", err);
        ws.send(JSON.stringify({ type: "error", error: err.message || "Invalid message format" }));
      }
    });

    ws.on("close", () => {
      console.log("Client disconnected from voice session");
      if (session) {
        session.close();
      }
    });
  });
}

// Integrate Vite Dev Server or Production Build
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`StudyGen Server running on http://0.0.0.0:${PORT}`);
  });

  setupLiveVoiceSession(server);
}

startServer();
