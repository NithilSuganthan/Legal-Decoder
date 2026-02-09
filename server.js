/* =====================================================
   LEGAL DOCUMENT DECODER - EXPRESS SERVER
   LLM-powered backend with Gemini API
   ===================================================== */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { v4: uuidv4 } = require('uuid');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const prompts = require('./prompts');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('.')); // Serve frontend files

// File upload configuration
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Session storage for document context
const sessions = new Map();

// =====================================================
// HELPER: Parse document into numbered paragraphs
// =====================================================
function parseIntoParagraphs(text) {
    const paragraphs = text
        .split(/\n\s*\n|\n(?=\d+\.|[A-Z]{2,})/)
        .map(p => p.trim())
        .filter(p => p.length > 20);

    return paragraphs.map((text, index) => ({
        id: index + 1,
        text: text
    }));
}

// =====================================================
// HELPER: Call Gemini API with retry
// =====================================================
async function callGemini(prompt, retries = 5) {
    for (let i = 0; i < retries; i++) {
        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            let text = response.text();

            // Clean up markdown code blocks if present
            text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

            return JSON.parse(text);
        } catch (error) {
            console.error(`Gemini API call failed (attempt ${i + 1}):`, error.message);

            // If rate limited (429), wait longer
            if (error.status === 429) {
                const waitTime = Math.min(30000, 5000 * (i + 1)); // Wait up to 30s
                console.log(`Rate limited. Waiting ${waitTime / 1000}s before retry...`);
                await new Promise(r => setTimeout(r, waitTime));
            } else if (i === retries - 1) {
                throw error;
            } else {
                await new Promise(r => setTimeout(r, 2000 * (i + 1))); // Normal backoff
            }
        }
    }
}

// =====================================================
// HELPER: Call Gemini for text response (Q&A) with retry
// =====================================================
async function callGeminiText(prompt, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            let text = response.text();
            text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            return JSON.parse(text);
        } catch (error) {
            console.error(`Gemini chat call failed (attempt ${i + 1}):`, error.message);

            if (error.status === 429) {
                const waitTime = Math.min(20000, 5000 * (i + 1));
                console.log(`Chat rate limited. Waiting ${waitTime / 1000}s...`);
                await new Promise(r => setTimeout(r, waitTime));
            } else if (i === retries - 1) {
                throw error;
            } else {
                await new Promise(r => setTimeout(r, 2000));
            }
        }
    }
}

// =====================================================
// API: Health check
// =====================================================
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', model: 'gemini-2.0-flash' });
});

// =====================================================
// API: Upload and analyze document
// =====================================================
app.post('/api/analyze', upload.single('file'), async (req, res) => {
    try {
        let documentText = '';

        // Get document text from file or body
        if (req.file) {
            if (req.file.mimetype === 'application/pdf') {
                const pdfData = await pdfParse(req.file.buffer);
                documentText = pdfData.text;
            } else {
                documentText = req.file.buffer.toString('utf-8');
            }
        } else if (req.body.text) {
            documentText = req.body.text;
        } else {
            return res.status(400).json({ error: 'No document provided' });
        }

        if (!documentText.trim()) {
            return res.status(400).json({ error: 'Document is empty or could not be parsed' });
        }

        // Parse into paragraphs
        const paragraphs = parseIntoParagraphs(documentText);
        const documentForPrompt = paragraphs.map(p => `[${p.id}] ${p.text}`).join('\n\n');

        // Create session for Q&A context
        const sessionId = uuidv4();
        sessions.set(sessionId, {
            documentText,
            paragraphs,
            documentForPrompt,
            createdAt: Date.now()
        });

        // Run all analyzers in parallel
        console.log('Starting parallel analysis with Gemini...');

        const [
            simplifiedResult,
            entitiesResult,
            risksResult,
            obligationsResult,
            toneResult,
            summaryResult,
            precedentsResult
        ] = await Promise.all([
            callGemini(prompts.SIMPLIFY_PROMPT + documentForPrompt).catch(e => ({ error: e.message, paragraphs: [] })),
            callGemini(prompts.ENTITY_PROMPT + documentForPrompt).catch(e => ({ error: e.message })),
            callGemini(prompts.RISK_PROMPT + documentForPrompt).catch(e => ({ error: e.message, risks: [] })),
            callGemini(prompts.OBLIGATION_PROMPT + documentForPrompt).catch(e => ({ error: e.message, obligations: [] })),
            callGemini(prompts.TONE_PROMPT + documentForPrompt).catch(e => ({ error: e.message })),
            callGemini(prompts.SUMMARY_PROMPT + documentForPrompt).catch(e => ({ error: e.message })),
            callGemini(prompts.PRECEDENT_PROMPT + documentForPrompt).catch(e => ({ error: e.message, precedents: [] }))
        ]);

        console.log('Analysis complete!');

        res.json({
            success: true,
            sessionId,
            paragraphCount: paragraphs.length,
            analysis: {
                simplified: simplifiedResult,
                entities: entitiesResult,
                risks: risksResult,
                obligations: obligationsResult,
                tone: toneResult,
                summary: summaryResult,
                precedents: precedentsResult
            }
        });

    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({ error: 'Analysis failed: ' + error.message });
    }
});

// =====================================================
// API: Q&A Chat
// =====================================================
app.post('/api/chat', async (req, res) => {
    try {
        const { sessionId, question } = req.body;

        if (!sessionId || !question) {
            return res.status(400).json({ error: 'Missing sessionId or question' });
        }

        const session = sessions.get(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Session not found. Please upload document again.' });
        }

        // Build Q&A prompt
        const qaPrompt = prompts.QA_PROMPT
            .replace('{document}', session.documentForPrompt)
            .replace('{question}', question);

        const result = await callGeminiText(qaPrompt);

        res.json({
            success: true,
            ...result
        });

    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Chat failed: ' + error.message });
    }
});

// =====================================================
// Cleanup old sessions (run every hour)
// =====================================================
setInterval(() => {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    for (const [id, session] of sessions.entries()) {
        if (session.createdAt < oneHourAgo) {
            sessions.delete(id);
            console.log(`Cleaned up session: ${id}`);
        }
    }
}, 60 * 60 * 1000);

// =====================================================
// Start server
// =====================================================
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║   LEGAL DOCUMENT DECODER - LLM Backend                ║
║   Powered by Google Gemini                            ║
╠═══════════════════════════════════════════════════════╣
║   Server running at: http://localhost:${PORT}            ║
║   API endpoints:                                      ║
║   • POST /api/analyze - Analyze document              ║
║   • POST /api/chat    - Q&A about document            ║
║   • GET  /api/health  - Health check                  ║
╚═══════════════════════════════════════════════════════╝
    `);
});

module.exports = app;
