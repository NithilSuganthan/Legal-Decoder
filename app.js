/* =====================================================
   LEGAL DOCUMENT DECODER - APPLICATION LOGIC
   Client-side document parsing, analysis, and Q&A
   NO API KEY REQUIRED - Runs entirely in browser
   ===================================================== */

// =====================================================
// LEGAL JARGON DICTIONARY
// =====================================================
const legalJargon = {
    'hereinafter': 'from now on referred to as',
    'heretofore': 'before now',
    'herein': 'in this document',
    'hereof': 'of this document',
    'hereby': 'by this document',
    'herewith': 'with this document',
    'whereas': 'considering that',
    'wherefore': 'for this reason',
    'thereof': 'of that',
    'therein': 'in that',
    'thereto': 'to that',
    'thereunder': 'under that',
    'thereafter': 'after that',
    'notwithstanding': 'despite',
    'aforementioned': 'mentioned earlier',
    'aforesaid': 'said earlier',
    'inter alia': 'among other things',
    'prima facie': 'on first impression / at first glance',
    'bona fide': 'genuine / in good faith',
    'de facto': 'in practice / actually',
    'de jure': 'by law / legally',
    'per se': 'by itself / in itself',
    'pro rata': 'proportionally',
    'ipso facto': 'by that very fact',
    'mutatis mutandis': 'with necessary changes',
    'ab initio': 'from the beginning',
    'ad hoc': 'for this specific purpose',
    'ultra vires': 'beyond legal authority',
    'intra vires': 'within legal authority',
    'mala fide': 'in bad faith',
    'res judicata': 'matter already decided by court',
    'obiter dictum': 'passing remark by judge (not binding)',
    'ratio decidendi': 'the reason for the decision',
    'stare decisis': 'following previous court decisions',
    'sub judice': 'under judicial consideration',
    'in lieu of': 'instead of',
    'pursuant to': 'in accordance with / following',
    'duly': 'properly / as required',
    'forthwith': 'immediately',
    'null and void': 'having no legal effect',
    'shall': 'must / is required to',
    'may': 'is allowed to / has permission to',
    'indemnify': 'protect against loss or damage',
    'waive': 'give up a right',
    'construe': 'interpret',
    'supersede': 'replace / take the place of',
    'stipulate': 'specify as a condition',
    'enjoin': 'order someone to do or not do something',
    'adjudicate': 'make a formal judgment',
    'appellant': 'person appealing a court decision',
    'respondent': 'person responding to an appeal',
    'petitioner': 'person filing a petition',
    'plaintiff': 'person bringing a lawsuit',
    'defendant': 'person being sued or accused',
    'pecuniary': 'relating to money',
    'cognizance': 'awareness or jurisdiction',
    'quash': 'reject or cancel',
    'remand': 'send back for reconsideration',
    'deponent': 'person giving sworn testimony',
    'affidavit': 'written statement confirmed by oath',
    'caveat': 'warning or caution',
    'locus standi': 'right to bring a case',
    'contravene': 'violate or go against',
    'vis-à-vis': 'in relation to',
    'liable': 'legally responsible',
    'culpable': 'deserving blame',
    'exonerate': 'free from blame',
    'acquit': 'declare not guilty',
    'convict': 'declare guilty'
};

// =====================================================
// RISK/RESTRICTION KEYWORDS
// =====================================================
const riskKeywords = [
    'penalty', 'penalties', 'fine', 'fines', 'punishable',
    'liable', 'liability', 'damages', 'compensation',
    'imprisonment', 'prison', 'jail', 'sentence',
    'prohibited', 'forbidden', 'restricted', 'restriction',
    'shall not', 'must not', 'cannot', 'may not',
    'forfeit', 'forfeiture', 'terminate', 'termination',
    'breach', 'violation', 'default', 'failure to',
    'indemnify', 'indemnification', 'hold harmless',
    'limit', 'limitation', 'cap', 'maximum', 'ceiling',
    'waive', 'waiver', 'disclaim', 'disclaimer',
    'suspend', 'suspension', 'revoke', 'revocation',
    'sanction', 'sanctions', 'punitive', 'consequential'
];

// =====================================================
// OBLIGATION KEYWORDS
// =====================================================
const obligationKeywords = [
    'shall', 'must', 'required', 'obligated', 'obligation',
    'duty', 'duties', 'responsible', 'responsibility',
    'agrees to', 'undertakes', 'commits', 'covenant',
    'condition', 'conditions', 'contingent', 'subject to',
    'provided that', 'on condition that', 'prerequisite',
    'comply', 'compliance', 'adhere', 'adherence',
    'maintain', 'ensure', 'guarantee', 'warrant',
    'within', 'before', 'by', 'deadline', 'time limit',
    'notify', 'notification', 'inform', 'report',
    'submit', 'provide', 'deliver', 'furnish'
];

// =====================================================
// SENTIMENT INDICATORS
// =====================================================
const toneIndicators = {
    critical: ['dismiss', 'reject', 'fail', 'failure', 'misconduct', 'improper', 'erroneous', 'illegal', 'unlawful', 'wrongful', 'negligent', 'frivolous', 'baseless', 'meritless', 'devoid of merit', 'without merit', 'not sustainable', 'untenable', 'unsupportable'],
    restrictive: ['restrict', 'limit', 'prohibit', 'forbid', 'bar', 'exclude', 'deny', 'refuse', 'curtail', 'constrain', 'impose', 'mandatory', 'compulsory'],
    neutral: ['order', 'direct', 'hold', 'find', 'determine', 'conclude', 'state', 'note', 'observe', 'record', 'acknowledge']
};

// =====================================================
// STATE MANAGEMENT
// =====================================================
let documentText = '';
let documentParagraphs = [];
let analysisResults = {};

// =====================================================
// DOM ELEMENTS
// =====================================================
const themeToggle = document.getElementById('themeToggle');
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const pasteArea = document.getElementById('pasteArea');
const analyzeBtn = document.getElementById('analyzeBtn');
const uploadSection = document.getElementById('uploadSection');
const analysisSection = document.getElementById('analysisSection');
const newDocBtn = document.getElementById('newDocBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const chatMessages = document.getElementById('chatMessages');

// =====================================================
// THEME TOGGLE
// =====================================================
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
});

initTheme();

// =====================================================
// FILE UPLOAD HANDLING
// =====================================================
browseBtn.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('click', (e) => {
    if (e.target !== browseBtn) {
        fileInput.click();
    }
});

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

async function handleFile(file) {
    showLoading();
    try {
        if (file.type === 'application/pdf') {
            documentText = await extractTextFromPDF(file);
        } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
            documentText = await file.text();
        } else {
            documentText = await file.text();
        }

        if (documentText.trim()) {
            processDocument();
        } else {
            hideLoading();
            alert('Could not extract text from the file. Please try pasting the text directly.');
        }
    } catch (error) {
        hideLoading();
        console.error('Error reading file:', error);
        alert('Error reading file. Please try pasting the text directly.');
    }
}

async function extractTextFromPDF(file) {
    if (typeof pdfjsLib === 'undefined') {
        throw new Error('PDF.js not loaded');
    }
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n\n';
    }

    return fullText;
}

// =====================================================
// ANALYZE PASTED TEXT
// =====================================================
analyzeBtn.addEventListener('click', () => {
    const text = pasteArea.value.trim();
    if (text) {
        documentText = text;
        showLoading();
        setTimeout(() => processDocument(), 100);
    } else {
        alert('Please paste a legal document or upload a file first.');
    }
});

// =====================================================
// NEW DOCUMENT
// =====================================================
newDocBtn.addEventListener('click', () => {
    documentText = '';
    documentParagraphs = [];
    analysisResults = {};
    pasteArea.value = '';
    fileInput.value = '';
    uploadSection.style.display = 'block';
    analysisSection.style.display = 'none';
    resetChat();
});

// =====================================================
// DOCUMENT PROCESSING
// =====================================================
function processDocument() {
    // Parse paragraphs
    documentParagraphs = parseDocumentIntoParagraphs(documentText);

    // Run all analyses
    analysisResults = {
        entities: extractEntities(documentText),
        risks: extractRisks(documentParagraphs),
        obligations: extractObligations(documentParagraphs),
        precedents: extractPrecedents(documentText),
        tone: analyzeTone(documentText),
        tldr: generateTLDR(documentText, documentParagraphs)
    };

    // Render all sections
    renderClauses(documentParagraphs);
    renderEntities(analysisResults.entities);
    renderRisks(analysisResults.risks);
    renderObligations(analysisResults.obligations);
    renderPrecedents(analysisResults.precedents);
    renderTone(analysisResults.tone);
    renderTLDR(analysisResults.tldr);

    // Show analysis section
    uploadSection.style.display = 'none';
    analysisSection.style.display = 'block';
    hideLoading();
}

function parseDocumentIntoParagraphs(text) {
    const rawParagraphs = text.split(/\n\s*\n|\n(?=\d+\.|[A-Z]{2,})/);

    return rawParagraphs
        .map((p, index) => ({
            index: index + 1,
            text: p.trim(),
            simplified: simplifyText(p.trim())
        }))
        .filter(p => p.text.length > 20);
}

function simplifyText(text) {
    let simplified = text;

    for (const [term, replacement] of Object.entries(legalJargon)) {
        const regex = new RegExp(`\\b${term}\\b`, 'gi');
        simplified = simplified.replace(regex, `${replacement}`);
    }

    simplified = simplified.replace(/([.;])\s+/g, '$1\n\n');

    return simplified;
}

// =====================================================
// ENTITY EXTRACTION
// =====================================================
function extractEntities(text) {
    const entities = {
        caseTitle: null,
        parties: [],
        court: null,
        dates: [],
        acts: []
    };

    const caseTitlePatterns = [
        /([A-Z][a-zA-Z\s]+)\s+(?:v\.?|vs\.?|versus)\s+([A-Z][a-zA-Z\s]+)/i,
        /(?:In the matter of|In re:?)\s+([A-Z][a-zA-Z\s]+)/i
    ];

    for (const pattern of caseTitlePatterns) {
        const match = text.match(pattern);
        if (match) {
            entities.caseTitle = match[0].trim();
            if (match[1]) entities.parties.push(match[1].trim());
            if (match[2]) entities.parties.push(match[2].trim());
            break;
        }
    }

    const courtPatterns = [
        /(?:Supreme Court|High Court|District Court|Sessions Court|Tribunal|Court of Appeal)[^\n.;]*/gi,
        /(?:Hon'ble|Honorable)\s+(?:Supreme|High|District|Sessions)?\s*Court/gi
    ];

    for (const pattern of courtPatterns) {
        const matches = text.match(pattern);
        if (matches) {
            entities.court = matches[0].trim();
            break;
        }
    }

    const datePatterns = [
        /\b\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}\b/g,
        /\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)[,]?\s+\d{4}\b/gi,
        /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}[,]?\s+\d{4}\b/gi
    ];

    for (const pattern of datePatterns) {
        const matches = text.match(pattern) || [];
        entities.dates.push(...matches);
    }
    entities.dates = [...new Set(entities.dates)].slice(0, 10);

    const actPatterns = [
        /(?:Section|Sec\.?)\s+\d+(?:\([a-z]\))?(?:\s+of\s+(?:the\s+)?[A-Z][a-zA-Z\s]+(?:Act|Code))?/gi,
        /(?:Article|Art\.?)\s+\d+(?:\([a-z]\))?/gi,
        /[A-Z][a-zA-Z\s]+(?:Act|Code),?\s+\d{4}/gi,
        /(?:IPC|CPC|CrPC|IT Act|Companies Act|Contract Act|Evidence Act)/gi
    ];

    for (const pattern of actPatterns) {
        const matches = text.match(pattern) || [];
        entities.acts.push(...matches.map(m => m.trim()));
    }
    entities.acts = [...new Set(entities.acts)].slice(0, 20);

    const partyPatterns = [
        /(?:Petitioner|Appellant|Plaintiff|Complainant)[:\s]+([A-Z][a-zA-Z\s]+)/gi,
        /(?:Respondent|Defendant|Accused)[:\s]+([A-Z][a-zA-Z\s]+)/gi
    ];

    for (const pattern of partyPatterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            if (match[1] && match[1].length < 100) {
                entities.parties.push(match[1].trim().split('\n')[0]);
            }
        }
    }
    entities.parties = [...new Set(entities.parties)].slice(0, 10);

    return entities;
}

// =====================================================
// RISK EXTRACTION
// =====================================================
function extractRisks(paragraphs) {
    const risks = [];

    for (const para of paragraphs) {
        const lowerText = para.text.toLowerCase();
        const matchedKeywords = riskKeywords.filter(kw => lowerText.includes(kw));

        if (matchedKeywords.length > 0) {
            risks.push({
                paragraph: para.index,
                text: para.text.substring(0, 300) + (para.text.length > 300 ? '...' : ''),
                keywords: matchedKeywords,
                simplified: para.simplified.substring(0, 300) + (para.simplified.length > 300 ? '...' : '')
            });
        }
    }

    return risks;
}

// =====================================================
// OBLIGATION EXTRACTION
// =====================================================
function extractObligations(paragraphs) {
    const obligations = [];

    for (const para of paragraphs) {
        const lowerText = para.text.toLowerCase();
        const matchedKeywords = obligationKeywords.filter(kw => lowerText.includes(kw));

        if (matchedKeywords.length > 0) {
            obligations.push({
                paragraph: para.index,
                text: para.text.substring(0, 300) + (para.text.length > 300 ? '...' : ''),
                keywords: matchedKeywords,
                simplified: para.simplified.substring(0, 300) + (para.simplified.length > 300 ? '...' : '')
            });
        }
    }

    return obligations;
}

// =====================================================
// PRECEDENT EXTRACTION
// =====================================================
function extractPrecedents(text) {
    const precedents = [];

    const casePatterns = [
        /[A-Z][a-zA-Z\s]+v\.?\s+[A-Z][a-zA-Z\s]+,?\s*[\[(]\d{4}[\])]/gi,
        /\[\d{4}\]\s+\d+\s+[A-Z]+\s+\d+/gi,
        /\(\d{4}\)\s+\d+\s+[A-Z]+\s+\d+/gi,
        /AIR\s+\d{4}\s+[A-Z]+\s+\d+/gi
    ];

    for (const pattern of casePatterns) {
        const matches = text.match(pattern) || [];
        for (const match of matches) {
            if (!precedents.some(p => p.citation === match.trim())) {
                precedents.push({
                    type: 'Case',
                    citation: match.trim(),
                    context: getContext(text, match)
                });
            }
        }
    }

    const actMatches = text.match(/[A-Z][a-zA-Z\s]+(?:Act|Code),?\s+\d{4}/gi) || [];
    for (const match of actMatches) {
        if (!precedents.some(p => p.citation === match.trim())) {
            precedents.push({
                type: 'Statute',
                citation: match.trim(),
                context: getContext(text, match)
            });
        }
    }

    return precedents.slice(0, 20);
}

function getContext(text, match) {
    const index = text.indexOf(match);
    if (index === -1) return '';

    const start = Math.max(0, index - 50);
    const end = Math.min(text.length, index + match.length + 100);
    let context = text.substring(start, end);

    if (start > 0) context = '...' + context;
    if (end < text.length) context = context + '...';

    return context;
}

// =====================================================
// TONE ANALYSIS
// =====================================================
function analyzeTone(text) {
    const lowerText = text.toLowerCase();
    const scores = { critical: 0, restrictive: 0, neutral: 0 };

    for (const [tone, keywords] of Object.entries(toneIndicators)) {
        for (const keyword of keywords) {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            const matches = lowerText.match(regex) || [];
            scores[tone] += matches.length;
        }
    }

    const dominant = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];

    let description = '';
    if (dominant[0] === 'critical' && dominant[1] > 3) {
        description = 'The language in this document appears to be critical or unfavorable.';
    } else if (dominant[0] === 'restrictive' && dominant[1] > 3) {
        description = 'The document contains restrictive language, imposing limitations or constraints.';
    } else {
        description = 'The document uses largely neutral, formal legal language.';
    }

    return { dominant: dominant[0], scores, description };
}

// =====================================================
// TL;DR SUMMARY
// =====================================================
function generateTLDR(text, paragraphs) {
    const entities = extractEntities(text);

    const keySentences = paragraphs
        .slice(0, 5)
        .map(p => p.text.split(/[.!?]/)[0])
        .filter(s => s.length > 20);

    let decision = 'Decision details are contained within the document.';
    const decisionPatterns = [
        /(?:hereby|therefore|accordingly|in view of)[,]?\s+(?:ordered|directed|held|decreed|dismissed|allowed|granted)/gi,
        /(?:appeal|petition|case|suit|complaint)\s+(?:is|are|stands?)\s+(?:dismissed|allowed|granted|disposed)/gi
    ];

    for (const pattern of decisionPatterns) {
        const match = text.match(pattern);
        if (match) {
            const index = text.indexOf(match[0]);
            decision = text.substring(index, Math.min(text.length, index + 200)).split(/[.!]/)[0] + '.';
            break;
        }
    }

    return {
        parties: entities.parties.length > 0 ? entities.parties.join(' vs ') : 'See document for party names',
        court: entities.court || 'Not explicitly mentioned',
        dispute: keySentences[0] || 'Core dispute details in document body',
        provisions: entities.acts.slice(0, 5).join(', ') || 'See document for legal provisions',
        decision: simplifyText(decision)
    };
}

// =====================================================
// RENDER FUNCTIONS
// =====================================================
function renderClauses(paragraphs) {
    const container = document.getElementById('clausesContent');

    if (paragraphs.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No paragraphs found in the document.</p></div>';
        return;
    }

    container.innerHTML = paragraphs.map(para => `
        <div class="clause-item">
            <div class="clause-label">Paragraph ${para.index}</div>
            <div class="clause-original">"${escapeHtml(para.text.substring(0, 500))}${para.text.length > 500 ? '...' : ''}"</div>
            <div class="clause-explanation">
                <strong>Plain English:</strong> ${escapeHtml(para.simplified.substring(0, 500))}${para.simplified.length > 500 ? '...' : ''}
            </div>
        </div>
    `).join('');
}

function renderEntities(entities) {
    const container = document.getElementById('entitiesContent');

    container.innerHTML = `
        <div class="entity-card">
            <div class="entity-label">Case Title</div>
            <div class="entity-value">${entities.caseTitle || 'Not identified'}</div>
        </div>
        <div class="entity-card">
            <div class="entity-label">Court</div>
            <div class="entity-value">${entities.court || 'Not identified'}</div>
        </div>
        <div class="entity-card">
            <div class="entity-label">Parties Involved</div>
            <ul class="entity-list">
                ${entities.parties.length > 0
            ? entities.parties.map(p => `<li>• ${escapeHtml(p)}</li>`).join('')
            : '<li>Not identified</li>'}
            </ul>
        </div>
        <div class="entity-card">
            <div class="entity-label">Important Dates</div>
            <ul class="entity-list">
                ${entities.dates.length > 0
            ? entities.dates.map(d => `<li>• ${escapeHtml(d)}</li>`).join('')
            : '<li>No dates found</li>'}
            </ul>
        </div>
        <div class="entity-card" style="grid-column: 1 / -1;">
            <div class="entity-label">Legal Provisions & Acts</div>
            <ul class="entity-list">
                ${entities.acts.length > 0
            ? entities.acts.map(a => `<li>• ${escapeHtml(a)}</li>`).join('')
            : '<li>No provisions identified</li>'}
            </ul>
        </div>
    `;
}

function renderRisks(risks) {
    const container = document.getElementById('risksContent');

    if (risks.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No significant risks or restrictions identified.</p></div>';
        return;
    }

    container.innerHTML = risks.map(risk => `
        <div class="risk-item">
            <div class="item-icon">⚠️</div>
            <div class="item-content">
                <p>${escapeHtml(risk.simplified)}</p>
                <div class="item-reference">
                    <span class="citation">¶${risk.paragraph}</span>
                    Keywords: ${risk.keywords.slice(0, 5).join(', ')}
                </div>
            </div>
        </div>
    `).join('');
}

function renderObligations(obligations) {
    const container = document.getElementById('obligationsContent');

    if (obligations.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No specific obligations identified.</p></div>';
        return;
    }

    container.innerHTML = obligations.map(obl => `
        <div class="obligation-item">
            <div class="item-icon">📌</div>
            <div class="item-content">
                <p>${escapeHtml(obl.simplified)}</p>
                <div class="item-reference">
                    <span class="citation">¶${obl.paragraph}</span>
                    Keywords: ${obl.keywords.slice(0, 5).join(', ')}
                </div>
            </div>
        </div>
    `).join('');
}

function renderPrecedents(precedents) {
    const container = document.getElementById('precedentsContent');

    if (precedents.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No case citations or legal references identified.</p></div>';
        return;
    }

    container.innerHTML = precedents.map(prec => `
        <div class="precedent-item">
            <div class="item-icon">${prec.type === 'Case' ? '⚖️' : '📖'}</div>
            <div class="item-content">
                <p><strong>${escapeHtml(prec.citation)}</strong></p>
                <div class="item-reference">${escapeHtml(prec.context)}</div>
            </div>
        </div>
    `).join('');
}

function renderTone(tone) {
    const container = document.getElementById('toneContent');

    const toneEmoji = { critical: '⛔', restrictive: '🚧', neutral: '⚖️' };
    const toneLabel = { critical: 'Critical / Unfavorable', restrictive: 'Restrictive / Limiting', neutral: 'Neutral / Formal' };

    container.innerHTML = `
        <p><strong>${toneEmoji[tone.dominant]} ${toneLabel[tone.dominant]}</strong></p>
        <p>${tone.description}</p>
        <div style="margin-top: 1rem; font-size: 0.85rem; color: var(--text-muted);">
            Analysis based on keyword frequency: Critical (${tone.scores.critical}), Restrictive (${tone.scores.restrictive}), Neutral (${tone.scores.neutral})
        </div>
    `;
}

function renderTLDR(tldr) {
    const container = document.getElementById('tldrContent');

    container.innerHTML = `
        <p><strong>Parties:</strong> ${escapeHtml(tldr.parties)}</p>
        <p><strong>Court:</strong> ${escapeHtml(tldr.court)}</p>
        <p><strong>Core Dispute:</strong> ${escapeHtml(tldr.dispute)}</p>
        <p><strong>Key Legal Provisions:</strong> ${escapeHtml(tldr.provisions)}</p>
        <p><strong>Decision:</strong> ${escapeHtml(tldr.decision)}</p>
    `;
}

// =====================================================
// TAB NAVIGATION
// =====================================================
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const tabId = tab.dataset.tab;
        document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
        document.getElementById(tabId).classList.add('active');
    });
});

// =====================================================
// CHAT FUNCTIONALITY
// =====================================================
function resetChat() {
    chatMessages.innerHTML = `
        <div class="chat-message assistant">
            <div class="message-avatar">🤖</div>
            <div class="message-content">
                <p>Hello! I've analyzed your document. Ask me anything about its contents, and I'll explain it in simple terms. Remember, I can only answer questions based on what's in this document.</p>
            </div>
        </div>
    `;
}

sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    addChatMessage(message, 'user');
    chatInput.value = '';

    setTimeout(() => {
        const response = generateResponse(message);
        addChatMessage(response, 'assistant');
    }, 500);
}

function addChatMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}`;
    messageDiv.innerHTML = `
        <div class="message-avatar">${sender === 'user' ? '👤' : '🤖'}</div>
        <div class="message-content"><p>${text}</p></div>
    `;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function generateResponse(question) {
    const lowerQuestion = question.toLowerCase();

    // Check for legal advice requests
    const advicePatterns = [
        /what should i do/i, /should i/i, /do you think/i, /is it fair/i,
        /is it right/i, /who is right/i, /who is wrong/i, /recommend/i,
        /suggest/i, /advice/i, /what action/i, /help me decide/i,
        /what would you/i, /can i sue/i, /will i win/i
    ];

    for (const pattern of advicePatterns) {
        if (pattern.test(question)) {
            return "I cannot help with that because it goes beyond explaining the document. However, I can simplify or explain the relevant section if you want. For legal advice, please consult a qualified attorney.";
        }
    }

    // Search for relevant content
    const relevantParagraphs = findRelevantParagraphs(lowerQuestion);

    if (relevantParagraphs.length === 0) {
        return "I cannot find information about that in the uploaded document. Could you rephrase your question, or ask about a specific section?";
    }

    return buildResponse(question, relevantParagraphs);
}

function findRelevantParagraphs(question) {
    const stopWords = ['what', 'who', 'where', 'when', 'why', 'how', 'is', 'are', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'this', 'that', 'it', 'does', 'do', 'did', 'was', 'were', 'has', 'have', 'had', 'been', 'be', 'being', 'about', 'mean', 'means', 'explain', 'tell', 'me', 'can', 'you'];

    const terms = question.replace(/[?.,!]/g, '').split(/\s+/)
        .filter(term => !stopWords.includes(term) && term.length > 2);

    const scored = documentParagraphs.map(para => {
        const lowerText = para.text.toLowerCase();
        let score = 0;
        for (const term of terms) {
            if (lowerText.includes(term)) score += 1;
        }
        return { ...para, score };
    });

    return scored.filter(p => p.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
}

function buildResponse(question, paragraphs) {
    const mainPara = paragraphs[0];
    let response = `Based on the document (Paragraph ${mainPara.index}):\n\n${mainPara.simplified.substring(0, 400)}`;

    if (paragraphs.length > 1) {
        response += `\n\nRelated information can also be found in Paragraph ${paragraphs[1].index}.`;
    }

    return response;
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================
function showLoading() { loadingOverlay.classList.add('active'); }
function hideLoading() { loadingOverlay.classList.remove('active'); }

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// =====================================================
// INITIALIZE
// =====================================================
console.log('Legal Document Decoder v1.0 - Client-side (No API key required)');
