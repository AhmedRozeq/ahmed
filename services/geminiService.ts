import { GoogleGenAI, Type } from "@google/genai";
import { CollocationsResult, Collocation, ClozeTestResult, RelatedCollocation, QuizOptions, GeneratedCardData, RolePlayResult, RelatedExample, DictionaryResult, GroundingChunk, ImprovedSentenceResult, WeeklyStats, SavedCollocation, ThemeExplanationResult, StoryResult, CardDeepDiveResult } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const handleGeminiError = (error: unknown, context: string): string => {
    console.error(`Errore durante ${context}:`, error);
    if (error instanceof Error) {
        if (error.message.includes('RESOURCE_EXHAUSTED') || error.message.includes('429')) {
            return "Hai superato la quota di richieste. Attendi un minuto e riprova.";
        }
        // Specific check for JSON parsing errors, which throw SyntaxError
        if (error instanceof SyntaxError) {
             return `La risposta dell'IA non era nel formato JSON atteso per ${context}. Questo può accadere se il modello è sovraccarico o se la risposta è stata bloccata. Riprova.`;
        }
        if (error.message.toLowerCase().includes('json')) {
             return `La risposta dell'IA non è valida per ${context}. Riprova.`;
        }
        if (error.message.toLowerCase().includes('fetch')) {
            return "Errore di rete. Controlla la tua connessione e riprova.";
        }
        // This is for custom-thrown errors that should be displayed as-is
        if (error.message.startsWith("Impossibile") || error.message.startsWith("Hai superato") || error.message.startsWith("Formato JSON")) {
            return error.message;
        }
    }
    return `Si è verificato un errore imprevisto durante ${context}. Riprova più tardi.`;
};

export const extractCollocations = async (text: string, cefrLevel?: string): Promise<CollocationsResult> => {
    const prompt = `
Agisci come linguista computazionale e lessicografo italiano specializzato in collocazioni, con un'enfasi sulla didattica per studenti stranieri (L2).

Obiettivo: Dal testo fornito, estrai un dizionario di collocazioni organizzato per temi. Per ogni collocazione, fornisci la forma normalizzata (lemma), la frase esatta dal testo, una spiegazione in stile Feynman e delle parole correlate.

**Istruzioni per le Spiegazioni (Stile Feynman per studenti L2 - OBBLIGATORIO):**
La spiegazione è la parte più importante. Deve essere chiara, intuitiva e memorabile, non una semplice definizione.
- **Parti dal Concetto Base:** Isola l'idea centrale della collocazione. Qual è l'azione o lo stato fondamentale?
- **Usa un'Analogia Semplice:** Crea un paragone con un'esperienza quotidiana o un'immagine facile da visualizzare. Esempio per "avere un asso nella manica": "Immagina di giocare a carte. È come tenere nascosta la carta migliore per usarla al momento giusto e sorprendere tutti."
- **Spiega il "Perché" delle Parole:** Spiega perché si usa quella specifica combinazione di parole, se possibile. Che immagine mentale evoca? Esempio per "prendere una decisione": "La parola 'prendere' dà l'idea di afferrare qualcosa di concreto, come se la decisione fosse un oggetto che scegli da uno scaffale tra tante opzioni."
- **Linguaggio:** Usa frasi brevi, vocabolario comune e un tono diretto e amichevole. Evita definizioni da dizionario. La spiegazione deve essere al massimo di 2-3 frasi.

**Parole Correlate:** Per ogni collocazione, elenca 3-5 parole o brevi frasi strettamente correlate (sinonimi, antonimi, termini dello stesso campo semantico). Questo aiuta lo studente a costruire una rete lessicale.

${cefrLevel ?
`**Adattamento Obbligatorio al Livello CEFR: ${cefrLevel}**
È fondamentale che la tua analisi sia calibrata per uno studente di livello ${cefrLevel}.
- **Selezione Collocazioni:** Dai priorità assoluta alle collocazioni più rilevanti e utili per questo livello. Ignora quelle troppo avanzate o troppo semplici.
- **Spiegazioni:** Applica rigorosamente lo stile Feynman descritto sopra, ma adatta la complessità del linguaggio, la lunghezza e le analogie al livello ${cefrLevel}. Usa un vocabolario e strutture grammaticali che uno studente ${cefrLevel} possa comprendere senza sforzo.`
: ''}

Definizione di “collocazione”: combinazioni lessicali frequenti e stabili (non meramente libere) come:
- verbo + nome (es. prendere una decisione)
- aggettivo + nome (es. forte pressione)
- nome + nome (es. catena di montaggio)
- verbo + avverbio (es. crescere rapidamente)
- avverbio + aggettivo (es. profondamente convinto)
- locuzioni e pattern preposizionali fissi (es. in vigore, sotto esame)

Criteri di inclusione:
- Solo combinazioni 2–4 parole, con legame semantico/idiomatico evidente o alta naturalità nativa.
- Per il campo "voce", normalizza ai lemmi principali (es. “prendere una decisione”, non “prendeva decisioni”).
- Per il campo "frase_originale", estrai la sequenza di parole esatta dal testo (es. "prendeva decisioni"). È FONDAMENTALE che questo campo corrisponda letteralmente a una porzione del testo fornito.
- Mantieni preposizioni fisse quando parte della collocazione.

Criteri di esclusione:
- Non includere nomi propri (persone, luoghi, enti) e sigle.
- Non elencare singoli lemmi isolati, citazioni o titoli.
- Evita collocazioni spurie dovute a vicinanza casuale o punteggiatura.
- Niente metatesto, niente spiegazioni fuori schema.

Raggruppamento per tema:
- Inferisci 5–8 temi dal testo (es. Politica, Economia, Diritto, Tecnologia, Società).
- Assegna ogni collocazione a un unico tema per facilitare lo studio.

Quantità:
- Estrai un massimo di 40 voci. Se il testo è breve, estraine meno, ma almeno 15 se possibile.
- Dai priorità alle collocazioni più salienti, frequenti o didatticamente utili ${cefrLevel ? `per il livello ${cefrLevel}` : ''}.

Formato di output:
Rispondi SOLO con il JSON strutturato secondo lo schema fornito.

TESTO DA ANALIZZARE:
---
${text}
---
`;
    
    const schema = {
        type: Type.OBJECT,
        properties: {
            dizionario: {
                type: Type.ARRAY,
                description: "Un dizionario di collocazioni organizzato per temi.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        tema: { 
                            type: Type.STRING,
                            description: "Il tema a cui appartengono le collocazioni."
                        },
                        collocazioni: {
                            type: Type.ARRAY,
                            description: "Una lista di collocazioni per il tema specificato.",
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    voce: { 
                                        type: Type.STRING,
                                        description: "La forma normalizzata (lemma) della collocazione."
                                    },
                                    spiegazione: { 
                                        type: Type.STRING,
                                        description: "Una spiegazione chiara e intuitiva (stile Feynman)."
                                    },
                                    frase_originale: { 
                                        type: Type.STRING,
                                        description: "La frase esatta dal testo originale che contiene la collocazione."
                                    },
                                    parole_correlate: {
                                        type: Type.ARRAY,
                                        description: "Una lista di 3-5 parole o brevi frasi correlate.",
                                        items: { type: Type.STRING }
                                    }
                                },
                                required: ["voce", "spiegazione", "frase_originale", "parole_correlate"]
                            }
                        }
                    },
                    required: ["tema", "collocazioni"]
                }
            }
        },
        required: ["dizionario"]
    };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                temperature: 0.2,
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });

        let jsonString = response.text.trim();
        if (jsonString.startsWith('```json')) {
            jsonString = jsonString.substring(7).trim();
        }
        if (jsonString.endsWith('```')) {
            jsonString = jsonString.slice(0, -3).trim();
        }
        
        const parsedJson = JSON.parse(jsonString);

        if (!parsedJson.dizionario || !Array.isArray(parsedJson.dizionario)) {
            throw new Error("Formato JSON della risposta non valido.");
        }

        return parsedJson as CollocationsResult;
    } catch (error) {
        throw new Error(handleGeminiError(error, "l'estrazione delle collocazioni"));
    }
};

export interface DeepDiveOptions {
  cefrLevel?: string;
  register?: string;
}

export const generateDeepDive = async (item: string, options: DeepDiveOptions = {}): Promise<string> => {
    const { cefrLevel, register } = options;
    
    const prompt = `
Agisci come un esperto linguista e tutor di italiano L2. Il tuo obiettivo è creare una guida di approfondimento chiara e utile su un dato tema o una specifica collocazione.

**Input:**
- **Target:** "${item}"
${cefrLevel ? `- **Livello CEFR di riferimento per lo studente:** ${cefrLevel}` : ''}
${register && register !== 'Neutro' ? `- **Registro di riferimento per lo studente:** ${register}` : ''}

**Istruzioni:**
1.  **Stile:** Usa un tono amichevole e diretto (io/tu). Spiega i concetti con analogie semplici (stile Feynman).
2.  **Lingua:** Italiano standard, con esempi pratici e di uso comune.
3.  **Struttura:** Organizza la risposta in sezioni usando \`###\` come intestazione. La risposta deve essere in formato Markdown.

**Sezioni da includere (se pertinenti per il target):**

### Panoramica
Una breve spiegazione del concetto base di "${item}", cos'è e quando si usa.

### Livello e Registro
- **Livello QCER Stimato:** Stima il livello QCER (da A1 a C2) in cui questa espressione è più comunemente imparata e usata.
- **Registro Principale:** Indica il registro più comune (es. Formale, Informale, Neutro, Giornalistico, Letterario). Fornisci una breve motivazione.

### Espansioni e Collocazioni Correlate
Elenca 3-5 espressioni o collocazioni strettamente correlate a "${item}". Per ciascuna, fornisci una frase d'esempio e una brevissima spiegazione.

### Variazioni e Sfumature
Mostra 2-3 modi alternativi per esprimere un concetto simile, spiegando le differenze di registro (formale/informale) o di sfumatura. Se il target è una collocazione, mostra come può essere trasformata (es. cambio di tempo verbale, forma negativa).

### Consigli d'Uso ed Errori Comuni
Fornisci una breve guida pratica su come usare "${item}" correttamente. Includi 1-2 errori comuni che gli studenti L2 commettono.

### Mappa Lessicale
Crea una mappa di parole associate a "${item}". Rispondi usando una lista Markdown con i seguenti elementi in grassetto:
- **Verbi comuni:** (Elenca qui i verbi)
- **Nomi comuni:** (Elenca qui i nomi)
- **Aggettivi/Avverbi comuni:** (Elenca qui gli aggettivi/avverbi)

**Vincoli:**
- La tua risposta deve essere interamente in italiano.
- Mantieni la guida focalizzata e non troppo lunga. Privilegia la qualità e l'utilità didattica sulla quantità.
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                temperature: 0.5,
            },
        });
        return response.text;
    } catch (error) {
        throw new Error(handleGeminiError(error, `l'approfondimento per "${item}"`));
    }
};

export const generateThemeDeepDive = async (themeName: string, collocations: Collocation[], options: { cefrLevel?: string, register?: string }): Promise<string> => {
    const { cefrLevel, register } = options;

    const collocationList = collocations.map(c => `- ${c.voce}: "${c.spiegazione}"`).join('\n');

    const prompt = `
Agisci come un esperto linguista e tutor di italiano L2. Il tuo obiettivo è creare una guida di approfondimento completa e strategica sul tema "${themeName}", basandoti specificamente sulla lista di collocazioni fornita.

**Tema:** "${themeName}"
**Collocazioni di riferimento:**
${collocationList}

${cefrLevel ? `**Livello CEFR di riferimento per lo studente:** ${cefrLevel}` : ''}
${register && register !== 'Neutro' ? `**Registro di riferimento per lo studente:** ${register}` : ''}

**Istruzioni:**
1.  **Stile:** Usa un tono amichevole, didattico e incoraggiante (io/tu).
2.  **Struttura:** Organizza la risposta in sezioni usando \`###\` come intestazione. La risposta deve essere in formato Markdown.

**Sezioni Obbligatorie:**

### Panoramica del Tema: "${themeName}"
Spiega il tema in generale, collegandolo direttamente a come le collocazioni fornite lo rappresentano. Mostra come queste espressioni, insieme, dipingono un quadro del tema.

### Livello e Registro del Tema
- **Livello QCER Stimato:** Basandoti sulle collocazioni fornite, stima il livello QCER (es. B1-B2) in cui questo tema è più rilevante e utile.
- **Registro Principale:** Indica il registro più comune per questo tema (es. Formale, Informale, Giornalistico) e spiega brevemente perché.

### Analisi delle Collocazioni Chiave
Seleziona 3-5 collocazioni dalla lista che ritieni più rappresentative o didatticamente interessanti. Per ciascuna, approfondisci:
- **Significato nel contesto del tema:** Come questa collocazione specifica illumina un aspetto di "${themeName}"?
- **Esempio d'uso aggiuntivo:** Fornisci una NUOVA frase d'esempio, diversa da quelle implicite nelle spiegazioni, che sia adatta al livello e registro richiesti.

### Connessioni e Pattern Linguistici
Analizza le collocazioni fornite nel loro insieme.
- Ci sono verbi, nomi o aggettivi che ricorrono?
- Quali pattern linguistici o concetti comuni emergono da questo gruppo di espressioni? (Es. "Molte espressioni usano verbi di movimento come 'entrare' e 'uscire' per descrivere concetti astratti...").

### Mappa associativa e rete lessicale
Basandoti su TUTTE le collocazioni fornite, crea una mappa lessicale per aiutare lo studente a navigare le relazioni tra le parole. Analizza e raggruppa le espressioni in queste categorie:
- **Collocazioni vicine:** Gruppi di collocazioni della lista che sono semanticamente molto simili.
- **Sinonimi/paraforme:** Modi alternativi per esprimere un concetto chiave del tema, anche usando parole non presenti nella lista.
- **Contrari/evitabili:** Espressioni che indicano un concetto opposto o un errore comune da evitare.
- **Campi semantici e ambiti:** Sotto-categorie o contesti specifici in cui si usano gruppi di collocazioni (es. 'ambito legale', 'ambito economico').
- **Verbi/nomi/preposizioni compatibili:** Identifica i pattern ricorrenti (es. quale verbo si usa con certi nomi, quali preposizioni sono comuni).
- **Registro e pragmatica:** Note sul registro (formale/informale) e su quando è appropriato usare certe espressioni.
- **Falsi amici / errori tipici:** Evidenzia potenziali errori che uno studente potrebbe fare, specialmente se confonde espressioni simili.

### Errori Comuni e Trappole
Evidenzia 2-3 errori tipici o "trappole" che uno studente L2 potrebbe incontrare usando il lessico di questo tema. Ad esempio, falsi amici, uso scorretto di preposizioni, o confusione tra termini simili. Fornisci un esempio dell'errore e la forma corretta.

### Consigli Pratici ed Esempi d'Uso
Basandoti su tutta l'analisi precedente, fornisci consigli pratici e concreti.
- **Scenario Pratico Integrato:** Crea uno scenario pratico più esteso (es. un breve dialogo tra due persone o una mini-storia di 3-4 frasi) che metta in mostra l'uso combinato di 3-5 collocazioni dalla lista, dimostrando come interagiscono in un contesto realistico.
- **Attività Pratica:** Suggerisci una o due attività creative che lo studente può fare per esercitarsi, come scrivere un breve testo, preparare un piccolo discorso o creare frasi personalizzate.

**Vincoli:**
- La tua risposta deve essere interamente in italiano.
- Fai riferimento esplicito alle collocazioni fornite.
- La guida deve essere utile per uno studente che vuole padroneggiare il lessico relativo a "${themeName}".
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                temperature: 0.5,
            },
        });
        return response.text;
    } catch (error) {
        throw new Error(handleGeminiError(error, `l'approfondimento per il tema "${themeName}"`));
    }
};

export const generateCardDeepDive = async (item: string): Promise<CardDeepDiveResult> => {
    const schema = {
        type: Type.OBJECT,
        properties: {
            esempi_pratici: {
                type: Type.ARRAY,
                description: "Una lista di 3-4 esempi d'uso chiari e pratici.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        esempio: { type: Type.STRING, description: "La frase di esempio." },
                        contesto: { type: Type.STRING, description: "Un brevissimo contesto d'uso (es. 'formale', 'parlato', 'giornalistico')." }
                    },
                    required: ["esempio", "contesto"]
                }
            },
            registro_e_sfumature: {
                type: Type.STRING,
                description: "Una spiegazione concisa (1-2 frasi) del registro (formale/informale/neutro) e delle principali sfumature di significato."
            },
            alternative_comuni: {
                type: Type.ARRAY,
                description: "Una lista di 2-3 alternative comuni.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        alternativa: { type: Type.STRING, description: "La parola o espressione alternativa." },
                        spiegazione: { type: Type.STRING, description: "Una brevissima spiegazione della differenza o sfumatura." }
                    },
                    required: ["alternativa", "spiegazione"]
                }
            }
        },
        required: ["esempi_pratici", "registro_e_sfumature", "alternative_comuni"]
    };

    const prompt = `
Agisci come un tutor di lingua italiana esperto e conciso. Per la collocazione fornita, crea un'analisi rapida e strutturata, ideale per una piccola scheda informativa.

Collocazione: "${item}"

Istruzioni:
1.  **Esempi Pratici:** Fornisci 3-4 esempi d'uso chiari. Per ogni esempio, specifica un breve contesto (es. 'formale', 'in una conversazione').
2.  **Registro e Sfumature:** Spiega in 1-2 frasi il registro (formale/informale/neutro) e le sfumature di significato.
3.  **Alternative Comuni:** Elenca 2-3 alternative, con una brevissima spiegazione delle differenze.

Rispondi ESCLUSIVAMENTE con un oggetto JSON che segua lo schema fornito.
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.5,
            },
        });
        const jsonString = response.text.trim();
        return JSON.parse(jsonString) as CardDeepDiveResult;
    } catch (error) {
        throw new Error(handleGeminiError(error, `l'approfondimento rapido per "${item}"`));
    }
};

export const answerQuestionAboutCollocation = async (context: string, question: string): Promise<string> => {
    const prompt = `
Agisci come un tutor di lingua italiana esperto e preciso.
Ti viene fornito un testo di approfondimento (il "contesto") su una specifica collocazione o tema linguistico.
Il tuo unico compito è rispondere alla domanda dell'utente basandosi ESCLUSIVAMENTE sulle informazioni contenute nel contesto fornito.

**Regole Obbligatorie:**
1.  **Non usare conoscenze esterne.** La tua risposta deve derivare al 100% dal testo del contesto.
2.  Se la risposta non è presente nel contesto, rispondi onestamente: "Mi dispiace, ma la risposta a questa domanda non si trova nel testo di approfondimento fornito."
3.  Sii conciso e vai dritto al punto.
4.  Rispondi in italiano.

---
**CONTESTO:**
${context}
---

**DOMANDA DELL'UTENTE:**
"${question}"

**TUA RISPOSTA:**
`;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                temperature: 0.1,
            },
        });
        return response.text.trim();
    } catch (error) {
        throw new Error(handleGeminiError(error, `la risposta alla domanda "${question}"`));
    }
};

export const explainTheme = async (theme: string): Promise<ThemeExplanationResult> => {
    const schema = {
        type: Type.OBJECT,
        properties: {
            explanation: {
                type: Type.STRING,
                description: "Una spiegazione molto concisa (massimo 2 frasi) del tema in italiano, come se fosse una definizione da dizionario."
            },
            related_collocations: {
                type: Type.ARRAY,
                description: "Una lista di 3-5 collocazioni comuni e utili strettamente correlate al tema.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        voce: { type: Type.STRING, description: "La collocazione correlata." },
                        spiegazione: { type: Type.STRING, description: "Una brevissima spiegazione (1 frase) della collocazione." }
                    },
                    required: ["voce", "spiegazione"]
                }
            }
        },
        required: ["explanation", "related_collocations"]
    };

    const prompt = `
Agisci come un esperto di linguistica e lessicografo. Per il tema fornito:
1.  Fornisci una spiegazione molto concisa (massimo 2 frasi) del tema, come se lo stessi definendo in un dizionario.
2.  Suggerisci 3-5 collocazioni italiane comuni e utili strettamente correlate al tema, ognuna con una brevissima spiegazione.

Tema: "${theme}"

Rispondi SOLO con il JSON strutturato secondo lo schema fornito.
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.4,
            },
        });
        const jsonString = response.text.trim();
        return JSON.parse(jsonString) as ThemeExplanationResult;
    } catch (error) {
        throw new Error(handleGeminiError(error, `la spiegazione per il tema "${theme}"`));
    }
};

export const generateText = async (options: { cefrLevel?: string, topic?: string, useSearch?: boolean, register?: string }): Promise<string> => {
    const { cefrLevel, topic, useSearch = false, register } = options;
    let chosenTopic = topic?.trim();
    const registerPrompt = register && register !== 'Neutro' ? `Usa un registro ${register}.` : '';

    let prompt: string;

    if (useSearch) {
        // Web search needs a concrete topic
        if (!chosenTopic) {
             const topics = [
                "l'impatto dell'intelligenza artificiale sul mercato del lavoro",
                "le sfide dell'economia circolare",
                "l'evoluzione della cucina italiana nel mondo",
                "l'importanza della biodiversità per il pianeta",
                "il futuro delle città sostenibili",
            ];
            chosenTopic = topics[Math.floor(Math.random() * topics.length)];
        }
        prompt = `Agendo come un redattore esperto, scrivi un testo informativo e ben strutturato di circa 250 parole in italiano sull'argomento: "${chosenTopic}". Basa la tua risposta su informazioni verificate tramite ricerca web. ${cefrLevel ? `Adatta la difficoltà al livello ${cefrLevel} del QCER.` : ''} ${registerPrompt} Rispondi solo con il testo. Non includere titoli.`;
    } else if (chosenTopic) {
        // Standard generation with a provided topic
        prompt = `Scrivi un paragrafo in italiano sull'argomento: "${chosenTopic}". ${cefrLevel ? `Adatta la difficoltà al livello ${cefrLevel} del QCER.` : ''} ${registerPrompt} Rispondi solo con il paragrafo.`;
    } else {
        // Dynamic topic and text generation for random examples
        prompt = `Agendo come un insegnante di italiano, scrivi un paragrafo di esempio in italiano. Scegli tu stesso un argomento interessante e appropriato per uno studente di livello ${cefrLevel || 'B1'}. Il paragrafo deve essere lungo circa 150-200 parole. ${cefrLevel ? `Adatta la difficoltà del testo al livello ${cefrLevel} del QCER.` : ''} ${registerPrompt} Rispondi solo ed esclusivamente con il paragrafo generato. Non includere il titolo dell'argomento o altre frasi introduttive.`;
    }

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
             config: {
                ...(useSearch && { tools: [{ googleSearch: {} }] }),
                temperature: 0.7,
            }
        });
        return response.text.trim();
    } catch (error) {
        throw new Error(handleGeminiError(error, useSearch ? "la ricerca e generazione del testo" : "la generazione del testo di esempio"));
    }
};


export const generateClozeTest = async (collocation: Collocation, options: QuizOptions): Promise<ClozeTestResult> => {
    const { quizType, cefrLevel, register } = options;

    const baseSchema = {
        type: Type.OBJECT,
        properties: {
            test_sentence: {
                type: Type.STRING,
                description: "Una frase di test con la collocazione mancante, rappresentata da '___'."
            },
            correct_answer: {
                type: Type.STRING,
                description: "La forma esatta della collocazione che completa la frase di test."
            },
            quiz_type: {
                type: Type.STRING,
                enum: [quizType]
            }
        },
        required: ["test_sentence", "correct_answer", "quiz_type"]
    };

    let schema: object;
    let promptInstructions: string;

    if (quizType === 'multiple_choice') {
        schema = {
            ...baseSchema,
            properties: {
                ...baseSchema.properties,
                options: {
                    type: Type.ARRAY,
                    description: "Un array di 4 opzioni di risposta in totale, inclusa quella corretta. Le opzioni devono essere mescolate.",
                    items: { type: Type.STRING }
                }
            },
            required: [...baseSchema.required, "options"]
        };
        promptInstructions = `
1.  Crea una NUOVA frase a scelta multipla.
2.  Sostituisci la collocazione con un segnaposto "___".
3.  Fornisci 4 opzioni in totale, mescolate casualmente. Una deve essere la risposta corretta.
4.  Le altre 3 opzioni (distrattori) devono essere plausibili ma errate (es. usare un verbo sbagliato, un sinonimo inappropriato, ecc.).
`;
    } else { // 'cloze'
        schema = baseSchema;
        promptInstructions = `
1.  Crea una NUOVA frase di completamento (cloze test).
2.  Sostituisci la collocazione nella frase con un segnaposto "___".
3.  La "correct_answer" deve essere la parte mancante esatta per completare la frase.
`;
    }
    
    const prompt = `
Agisci come un insegnante di lingua italiana che crea esercizi.

Obiettivo: Genera un esercizio di tipo "${quizType === 'multiple_choice' ? 'scelta multipla' : 'completamento'}" per la seguente collocazione.

Collocazione da testare: "${collocation.voce}"
Contesto originale: "${collocation.frase_originale}"
${cefrLevel ? `Livello di difficoltà (CEFR): ${cefrLevel}` : `Livello di difficoltà (CEFR): B1/B2`}
${register && register !== 'Neutro' ? `Registro linguistico: ${register}` : ''}

Istruzioni:
${promptInstructions}
La difficoltà e lo stile della frase devono essere appropriati per il livello CEFR e il registro specificati.
Rispondi SOLO con il JSON strutturato secondo lo schema fornito.
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.7,
            },
        });
        const jsonString = response.text.trim();
        return JSON.parse(jsonString) as ClozeTestResult;
    } catch (error) {
        throw new Error(handleGeminiError(error, `la generazione del quiz per "${collocation.voce}"`));
    }
};

export const generateClozeTestFromText = async (text: string, options: QuizOptions): Promise<ClozeTestResult> => {
    const { quizType, cefrLevel, register } = options;

    const baseSchema = {
        type: Type.OBJECT,
        properties: {
            test_sentence: {
                type: Type.STRING,
                description: "Una frase di test con un concetto chiave mancante, rappresentato da '___'."
            },
            correct_answer: {
                type: Type.STRING,
                description: "La parola o frase esatta che completa la frase di test."
            },
            quiz_type: {
                type: Type.STRING,
                enum: [quizType]
            }
        },
        required: ["test_sentence", "correct_answer", "quiz_type"]
    };

    let schema: object;
    let promptInstructions: string;

    if (quizType === 'multiple_choice') {
        schema = {
            ...baseSchema,
            properties: {
                ...baseSchema.properties,
                options: {
                    type: Type.ARRAY,
                    description: "Un array di 4 opzioni di risposta in totale, inclusa quella corretta. Le opzioni devono essere mescolate.",
                    items: { type: Type.STRING }
                }
            },
            required: [...baseSchema.required, "options"]
        };
        promptInstructions = `
1.  Crea una NUOVA frase a scelta multipla basata su un concetto chiave o una collocazione presente nel testo.
2.  Sostituisci la parte chiave con un segnaposto "___".
3.  Fornisci 4 opzioni in totale, mescolate casualmente. Una deve essere la risposta corretta.
4.  Le altre 3 opzioni (distrattori) devono essere plausibili ma errate.
`;
    } else { // 'cloze'
        schema = baseSchema;
        promptInstructions = `
1.  Crea una NUOVA frase di completamento (cloze test) basata su un concetto chiave o una collocazione presente nel testo.
2.  Sostituisci la parte chiave nella frase con un segnaposto "___".
3.  La "correct_answer" deve essere la parte mancante esatta per completare la frase.
`;
    }
    
    const prompt = `
Agisci come un insegnante di lingua italiana che crea esercizi.

Obiettivo: Genera un esercizio di tipo "${quizType === 'multiple_choice' ? 'scelta multipla' : 'completamento'}" basato sul testo fornito.

TESTO DI RIFERIMENTO:
---
${text}
---

${cefrLevel ? `Livello di difficoltà (CEFR): ${cefrLevel}` : `Livello di difficoltà (CEFR): B1/B2`}
${register && register !== 'Neutro' ? `Registro linguistico: ${register}` : ''}

Istruzioni:
${promptInstructions}
La difficoltà e lo stile della frase devono essere appropriati per il livello CEFR e il registro specificati.
Rispondi SOLO con il JSON strutturato secondo lo schema fornito.
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.7,
            },
        });
        const jsonString = response.text.trim();
        return JSON.parse(jsonString) as ClozeTestResult;
    } catch (error) {
        throw new Error(handleGeminiError(error, `la generazione del quiz dal testo`));
    }
};

export const generateRelatedCollocations = async (item: string): Promise<RelatedCollocation[]> => {
    const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                voce: {
                    type: Type.STRING,
                    description: "La collocazione correlata, normalizzata al lemma."
                },
                spiegazione: {
                    type: Type.STRING,
                    description: "Una breve spiegazione (1-2 frasi) della collocazione."
                }
            },
            required: ["voce", "spiegazione"]
        }
    };

    const prompt = `
Agisci come un lessicografo italiano. Data la seguente parola chiave o collocazione, suggerisci 3-5 collocazioni italiane strettamente correlate, che un apprendista troverebbe utili.

Parola chiave: "${item}"

Per ogni suggerimento, fornisci la collocazione e una brevissima spiegazione.
Fornisci la risposta esclusivamente in formato JSON, seguendo lo schema fornito. Non includere la parola chiave originale nei risultati.
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.6,
            },
        });
        const jsonString = response.text.trim();
        return JSON.parse(jsonString) as RelatedCollocation[];
    } catch (error) {
        throw new Error(handleGeminiError(error, `la generazione di suggerimenti per "${item}"`));
    }
};

export const generateCollocationCard = async (topic: string): Promise<GeneratedCardData> => {
    const schema = {
        type: Type.OBJECT,
        properties: {
            voce: {
                type: Type.STRING,
                description: "La parola o collocazione fornita, normalizzata al lemma se necessario."
            },
            spiegazione: {
                type: Type.STRING,
                description: "Una spiegazione chiara e concisa in italiano (2-3 frasi, stile Feynman)."
            },
            frase_originale: {
                type: Type.STRING,
                description: "Una frase d'esempio naturale e comune che utilizza la voce."
            },
            tema: {
                type: Type.STRING,
                description: "Un singolo tema pertinente per la collocazione (es. Lavoro, Vita Quotidiana, Tecnologia, Cibo)."
            }
        },
        required: ["voce", "spiegazione", "frase_originale", "tema"]
    };

    const prompt = `
Agisci come un lessicografo e insegnante di italiano. Il tuo compito è creare una scheda di studio per la parola o collocazione fornita dall'utente.

Input: "${topic}"

Istruzioni:
1.  **Voce**: Normalizza l'input al suo lemma (es. "preso una decisione" -> "prendere una decisione"). Se è già un lemma, mantienilo.
2.  **Spiegazione**: Scrivi una spiegazione semplice e chiara, come la spiegheresti a uno studente di livello B1.
3.  **Frase Originale**: Crea una frase d'esempio realistica e di uso comune.
4.  **Tema**: Assegna un singolo tema appropriato. Scegli tra una lista di temi comuni come: Lavoro, Economia, Società, Tecnologia, Vita Quotidiana, Cibo, Viaggi, Studio, Politica, Salute.

Fornisci la risposta esclusivamente in formato JSON, seguendo lo schema fornito.
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.5,
            },
        });
        const jsonString = response.text.trim();
        return JSON.parse(jsonString) as GeneratedCardData;
    } catch (error) {
        throw new Error(handleGeminiError(error, `la creazione della scheda per "${topic}"`));
    }
};

export const explainText = async (text: string): Promise<string> => {
    const prompt = `
Agisci come un esperto linguista e tutor di italiano L2. Il tuo obiettivo è fornire una spiegazione completa, chiara e pratica della parola o frase fornita, pensata per uno studente di lingua.

Usa Markdown per formattare la tua risposta in sezioni distinte.

TESTO DA SPIEGARE:
---
${text}
---

Fornisci la tua risposta strutturata ESATTAMENTE come segue, in italiano:

### Spiegazione (Metodo Feynman)
Spiega il concetto in modo super semplice, come se lo stessi spiegando a un bambino.
- **Concetto Base:** Qual è l'idea centrale? (1 frase)
- **Analogia:** Crea un'immagine mentale o un paragone con qualcosa di quotidiano. (1-2 frasi)
- **Perché queste parole?:** Se rilevante, spiega perché si usa proprio questa combinazione di parole. (1 frase)

### Contesto d'Uso
Descrivi in quali situazioni si usa questa espressione.
- **Registro:** È formale, informale o neutro?
- **Quando si usa:** Fornisci esempi di contesti (es. "al lavoro, parlando di un progetto", "in una conversazione amichevole", "in un articolo di giornale").
- **Sfumatura:** C'è una connotazione positiva, negativa o neutra?

### Esempi Pratici
Fornisci 3-5 frasi d'esempio chiare e realistiche che mostrino come usare l'espressione in contesti diversi.

### Alternative Comuni
Elenca 1-2 sinonimi o modi alternativi per dire la stessa cosa, spiegando brevemente le differenze di sfumatura.

Mantieni un tono amichevole e didattico. La tua risposta deve contenere solo il risultato formattato, senza frasi introduttive.
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                temperature: 0.4,
            },
        });
        return response.text.trim();
    } catch (error) {
        throw new Error(handleGeminiError(error, `la spiegazione per "${text}"`));
    }
};

export const analyzeGrammarOfText = async (text: string, cefrLevel?: string): Promise<string> => {
    const prompt = `
Agisci come un esperto e amichevole professore di grammatica italiana.
Il tuo compito è fornire un'analisi grammaticale completa e didattica del testo fornito, identificando strutture, coniugazioni verbali e modelli sintattici.

${cefrLevel ? `Adatta la complessità della tua spiegazione e degli esempi a uno studente di livello ${cefrLevel}.` : ''}

TESTO DA ANALIZZARE:
---
${text}
---

Fornisci la tua analisi in italiano, formattata in Markdown e strutturata come segue:

### Analisi Generale
Offri una panoramica del livello di complessità grammaticale del testo.

### Tempi e Modi Verbali
Identifica i tempi e i modi verbali più utilizzati nel testo (es. Indicativo Presente, Passato Prossimo, Congiuntivo Imperfetto). Spiega il loro uso nel contesto con esempi specifici presi dal testo.

### Strutture Sintattiche
Analizza la struttura delle frasi. Sono prevalentemente semplici o complesse? Identifica e spiega l'uso di eventuali proposizioni subordinate (relative, finali, causali, ecc.), fornendo esempi.

### Punti Grammaticali Notevoli
Evidenzia e spiega almeno 3-5 aspetti grammaticali interessanti o difficili presenti nel testo. Esempi possono includere:
- Uso di preposizioni articolate specifiche.
- Concordanza di aggettivi o participi passati.
- Uso di pronomi (diretti, indiretti, combinati).
- Costruzioni particolari (es. forma passiva, periodo ipotetico).

Per ogni punto, cita la frase dal testo e spiega la regola in modo chiaro.

### Alternative e Variazioni
Per 2-3 dei punti grammaticali più interessanti che hai analizzato, suggerisci una costruzione alternativa o una parafrasi. Spiega brevemente le differenze di registro o di sfumatura. Ad esempio, se il testo usa una forma passiva, mostra come si potrebbe dire la stessa cosa con una forma attiva o con il "si" impersonale.

Mantieni un tono incoraggiante e didattico.
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                temperature: 0.3,
            },
        });
        return response.text.trim();
    } catch (error) {
        throw new Error(handleGeminiError(error, "l'analisi grammaticale del testo"));
    }
};

export const summarizeText = async (text: string, cefrLevel?: string): Promise<string> => {
    const prompt = `
Agisci come un abile redattore specializzato nella semplificazione di testi per studenti di italiano.

Obiettivo: Riassumi il seguente testo in modo chiaro, conciso e fedele al contenuto originale.

${cefrLevel ? `Adatta obbligatoriamente la complessità del linguaggio (lessico e sintassi) a uno studente di livello ${cefrLevel}.` : ''}

TESTO DA RIASSUMERE:
---
${text}
---

Istruzioni:
- Estrai solo le informazioni essenziali.
- Mantieni il registro e il tono del testo originale.
- Il riassunto deve essere un paragrafo unico e scorrevole.
- La tua risposta deve contenere ESCLUSIVAMENTE il testo del riassunto, senza frasi introduttive come "Ecco il riassunto:".
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                temperature: 0.4,
            },
        });
        return response.text.trim();
    } catch (error) {
        throw new Error(handleGeminiError(error, "la generazione del riassunto"));
    }
};

export const generateRelatedExample = async (collocation: Collocation): Promise<RelatedExample> => {
    const schema = {
        type: Type.OBJECT,
        properties: {
            titolo: {
                type: Type.STRING,
                description: "Un titolo conciso in italiano, come 'Alternativa Comune' o 'Vocabolario Correlato'."
            },
            contenuto: {
                type: Type.STRING,
                description: "Una singola frase di esempio o una breve lista (2-3 parole) di vocabolario correlato. Molto conciso."
            }
        },
        required: ["titolo", "contenuto"]
    };

    const prompt = `
Agisci come un tutor di lingua italiana. Data la seguente collocazione, fornisci UN solo esempio conciso: o un'alternativa comune o un breve elenco di 2-3 parole correlate.

Collocazione: "${collocation.voce}"
Spiegazione: "${collocation.spiegazione}"

Istruzioni:
- Scegli se fornire un'alternativa o del vocabolario, a seconda di cosa è più utile didatticamente.
- La risposta deve essere estremamente breve per essere inserita in una piccola card.
- Il "titolo" deve essere "Alternativa Comune" o "Vocabolario Correlato".
- Il "contenuto" deve essere una singola frase o una lista di parole separate da virgola.

Rispondi SOLO con il JSON strutturato secondo lo schema.
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.4,
            },
        });
        const jsonString = response.text.trim();
        return JSON.parse(jsonString) as RelatedExample;
    } catch (error) {
        throw new Error(handleGeminiError(error, `la generazione di un esempio per "${collocation.voce}"`));
    }
};

export const generateRolePlayScript = async (collocation: Collocation, options: { cefrLevel?: string; register?: string; } = {}): Promise<RolePlayResult> => {
    const { cefrLevel, register } = options;
    const schema = {
        type: Type.OBJECT,
        properties: {
            scenari: {
                type: Type.ARRAY,
                description: "Una lista di scenari di dialogo.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        titolo: {
                            type: Type.STRING,
                            description: "Un titolo breve e descrittivo per lo scenario."
                        },
                        contesto: {
                            type: Type.STRING,
                            description: "Una breve descrizione del contesto in cui si svolge il dialogo (1-2 frasi)."
                        },
                        dialogo: {
                            type: Type.STRING,
                            description: "Il dialogo completo tra due persone, formattato con 'Nome: Battuta' e a capo per ogni turno. Deve includere la collocazione target in modo naturale."
                        }
                    },
                    required: ["titolo", "contesto", "dialogo"]
                }
            }
        },
        required: ["scenari"]
    };

    const prompt = `
Agisci come un autore di materiale didattico per studenti di italiano L2.

Obiettivo: Crea 2-3 brevi scenari di dialogo che utilizzino in modo naturale la seguente collocazione o tema.

Target: "${collocation.voce}"
Spiegazione Contesto: "${collocation.spiegazione}"
Livello CEFR Target: ${cefrLevel || 'B1/B2'}
Registro Linguistico: ${register || 'Neutro'}

Istruzioni:
1.  Crea 2 o 3 scenari distinti, ciascuno con un titolo, un contesto e un dialogo.
2.  **Contesto**: Descrivi brevemente una situazione realistica per ogni scenario.
3.  **Dialogo**: Scrivi un dialogo scorrevole tra due persone (es. "Persona A", "Persona B", o ruoli specifici se adatti al contesto).
    -   Ogni battuta deve essere preceduta dal nome del parlante (es. "Anna: ...").
    -   La collocazione o il tema target deve essere inserito in modo naturale all'interno del dialogo.
    -   Il dialogo dovrebbe essere lungo circa 6-10 turni di parola in totale.
4.  Lo stile deve essere appropriato per il livello e registro specificati.

Fornisci la risposta esclusivamente in formato JSON, seguendo lo schema fornito.
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.7,
            },
        });
        const jsonString = response.text.trim();
        return JSON.parse(jsonString) as RolePlayResult;
    } catch (error) {
        throw new Error(handleGeminiError(error, `la generazione del dialogo per "${collocation.voce}"`));
    }
};

export const generateItalianArabicDictionary = async (text: string, cefrLevel?: string): Promise<DictionaryResult> => {
    const schema = {
        type: Type.OBJECT,
        properties: {
            dizionario_approfondito: {
                type: Type.ARRAY,
                description: "Un array di voci del dizionario italiano-arabo.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        termine_italiano: {
                            type: Type.STRING,
                            description: "Il termine o la frase chiave in italiano, normalizzato al lemma."
                        },
                        traduzione_arabo: {
                            type: Type.STRING,
                            description: "La traduzione accurata del termine in arabo."
                        },
                        definizione_italiano: {
                            type: Type.STRING,
                            description: "Una definizione chiara e concisa del termine in italiano."
                        },
                        definizione_arabo: {
                            type: Type.STRING,
                            description: "Una definizione chiara e concisa del termine in arabo."
                        },
                        esempio_italiano: {
                            type: Type.STRING,
                            description: "Una frase di esempio che utilizza il termine in italiano."
                        },
                        esempio_arabo: {
                            type: Type.STRING,
                            description: "La traduzione della frase di esempio in arabo."
                        },
                        pronuncia_arabo: {
                            type: Type.STRING,
                            description: "La traslitterazione fonetica della pronuncia araba (es. 'marhaban')."
                        },
                        contesto_culturale: {
                            type: Type.STRING,
                            description: "Una breve nota (1-2 frasi) sul contesto culturale o le differenze d'uso tra italiano e arabo. Spiega se è formale, informale, o ha connotazioni particolari."
                        }
                    },
                    required: ["termine_italiano", "traduzione_arabo", "definizione_italiano", "definizione_arabo", "esempio_italiano", "esempio_arabo", "pronuncia_arabo", "contesto_culturale"]
                }
            }
        },
        required: ["dizionario_approfondito"]
    };

    const prompt = `
Agisci come un esperto lessicografo e traduttore bilingue, specializzato in italiano e arabo, con un focus sulla didattica per studenti.

Obiettivo: Dal testo italiano fornito, estrai i termini e le espressioni chiave e crea un dizionario approfondito italiano-arabo.

${cefrLevel ? `**Adattamento Obbligatorio al Livello CEFR: ${cefrLevel}**
È fondamentale che la tua analisi sia calibrata per uno studente di livello ${cefrLevel}. Seleziona i termini più rilevanti per questo livello.` : ''}

Istruzioni per ogni voce del dizionario:
1.  **termine_italiano**: Estrai una parola o una breve frase chiave dal testo. Normalizzala alla sua forma base (lemma).
2.  **traduzione_arabo**: Fornisci la traduzione più accurata e contestualmente appropriata in arabo, con la scrittura araba corretta.
3.  **definizione_italiano**: Scrivi una definizione chiara e semplice del termine in italiano, adatta a uno studente.
4.  **definizione_arabo**: Scrivi una definizione chiara e semplice del termine in arabo.
5.  **esempio_italiano**: Crea una frase d'esempio naturale in italiano che mostri come usare il termine.
6.  **esempio_arabo**: Traduci la frase d'esempio in arabo.
7.  **pronuncia_arabo**: Fornisci una traslitterazione fonetica della traduzione araba per aiutare nella pronuncia (es. 'kitab', 'shukran').
8.  **contesto_culturale**: Fornisci una breve nota (1-2 frasi) sul contesto culturale, il registro (formale/informale) o le differenze d'uso tra l'italiano e l'arabo. Se non ci sono differenze significative, descrivi il contesto d'uso tipico.

Quantità: Estrai tra 15 e 25 termini chiave dal testo, dando priorità a quelli più utili e frequenti.

Lingua: La tua intera risposta deve essere in italiano e arabo dove specificato, formattata come JSON secondo lo schema fornito.

TESTO DA ANALIZZARE:
---
${text}
---
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.3,
            },
        });

        const jsonString = response.text.trim();
        const parsedJson = JSON.parse(jsonString);

        if (!parsedJson.dizionario_approfondito || !Array.isArray(parsedJson.dizionario_approfondito)) {
            throw new Error("Formato JSON della risposta non valido per il dizionario.");
        }

        return parsedJson as DictionaryResult;
    } catch (error) {
        throw new Error(handleGeminiError(error, "la creazione del dizionario italiano-arabo"));
    }
};

export const translateArabicToItalian = async (text: string, cefrLevel?: string, register?: string): Promise<string> => {
    const prompt = `
Agisci come un traduttore professionista specializzato in traduzioni dall'arabo all'italiano per studenti di lingua.

Obiettivo: Traduci il seguente testo arabo in italiano.

**Istruzioni:**
- La traduzione deve essere naturale e fluida in italiano.
${cefrLevel ? `- È FONDAMENTALE adattare la complessità del lessico e della sintassi al livello ${cefrLevel} del QCER (CEFR).` : '- Usa un linguaggio standard (livello B1/B2).'}
${register ? `- Adatta il registro (tono) della traduzione a **${register}**.` : ''}
- La tua risposta deve contenere ESCLUSIVAMENTE il testo tradotto, senza alcuna frase introduttiva, commento o metatesto.

TESTO ARABO DA TRADURRE:
---
${text}
---
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                temperature: 0.3,
            },
        });
        return response.text.trim();
    } catch (error) {
        throw new Error(handleGeminiError(error, "la traduzione del testo dall'arabo"));
    }
};

export const translateItalianToArabic = async (text: string, cefrLevel?: string, register?: string): Promise<string> => {
    const prompt = `
Agisci come un traduttore professionista specializzato in traduzioni dall'italiano all'arabo per studenti di lingua.

Obiettivo: Traduci il seguente testo italiano in arabo.

**Istruzioni:**
- La traduzione deve essere naturale e fluida in arabo, mantenendo il significato e il tono originali.
${cefrLevel ? `- È FONDAMENTALE adattare la complessità del lessico e della sintassi al livello ${cefrLevel} del QCER (CEFR).` : '- Usa un linguaggio standard (livello B1/B2).'}
${register ? `- Adatta il registro (tono) della traduzione a **${register}**.` : ''}
- La tua risposta deve contenere ESCLUSIVAMENTE il testo tradotto, senza alcuna frase introduttiva, commento o metatesto.

TESTO ITALIANO DA TRADURRE:
---
${text}
---
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                temperature: 0.3,
            },
        });
        return response.text.trim();
    } catch (error) {
        throw new Error(handleGeminiError(error, "la traduzione del testo in arabo"));
    }
};

export const getWebExamples = async (item: string): Promise<{ summary: string; chunks: GroundingChunk[] }> => {
    const prompt = `Fornisci un breve riassunto (2-3 frasi) su come la collocazione "${item}" viene utilizzata nel web oggi, basandoti sui risultati di ricerca. Sii conciso e informativo.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{googleSearch: {}}],
                temperature: 0.1,
            },
        });
        
        const summary = response.text;
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

        return { summary, chunks: chunks as GroundingChunk[] };

    } catch (error) {
        throw new Error(handleGeminiError(error, `la ricerca di esempi web per "${item}"`));
    }
};

export const improveSentence = async (sentence: string, targetCollocation?: string, cefrLevel?: string, register?: string): Promise<ImprovedSentenceResult> => {
  const schema = {
    type: Type.OBJECT,
    properties: {
      improved_sentence: {
        type: Type.STRING,
        description: "La frase riscritta in modo più naturale e idiomatico, usando una collocazione appropriata."
      },
      collocation_used: {
        type: Type.STRING,
        description: "La collocazione esatta che è stata usata nella frase migliorata."
      },
      explanation: {
        type: Type.STRING,
        description: "Una breve spiegazione (1-2 frasi) del perché la nuova frase è migliore o più naturale, concentrandosi sull'uso della collocazione."
      }
    },
    required: ["improved_sentence", "collocation_used", "explanation"]
  };

  const prompt = `
Agisci come un esperto tutor di lingua italiana specializzato nell'uso naturale delle collocazioni.

Obiettivo: Riscrivi la frase fornita dall'utente per renderla più idiomatica e fluente, incorporando una collocazione appropriata.

Frase da migliorare: "${sentence}"
${targetCollocation ? `Collocazione suggerita (da usare se possibile): "${targetCollocation}"` : ''}
${cefrLevel ? `**Livello di riferimento:** Adatta la frase riscritta a un livello QCER ${cefrLevel}.` : ''}
${register ? `**Registro linguistico:** Usa un registro ${register}.` : ''}

Istruzioni:
1. Analizza la frase originale per capirne il significato e l'intento.
2. Scegli la collocazione italiana più naturale e adatta per esprimere quel concetto. Se una collocazione è stata suggerita, usala se si adatta bene al contesto. Altrimenti, scegline una migliore.
3. Riscrivi la frase in modo che suoni come parlerebbe un madrelingua, integrando la collocazione scelta. Mantieni il significato originale.
4. Fornisci una breve spiegazione del miglioramento, focalizzandosi sul perché la collocazione scelta rende la frase più efficace o naturale.

Rispondi ESCLUSIVAMENTE con un oggetto JSON che segua lo schema fornito.
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.6,
            },
        });
        const jsonString = response.text.trim();
        return JSON.parse(jsonString) as ImprovedSentenceResult;
    } catch (error) {
        throw new Error(handleGeminiError(error, `il miglioramento della frase`));
    }
};

export const generateAdditionalExample = async (collocation: Collocation): Promise<string> => {
    const prompt = `Data la collocazione "${collocation.voce}", crea una NUOVA frase d'esempio, diversa da quella originale ("${collocation.frase_originale}"). La frase deve essere naturale per un livello B1/B2 e usare la collocazione. Rispondi SOLO con la nuova frase.`;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                temperature: 0.8,
            },
        });
        return response.text.trim();
    } catch (error) {
        throw new Error(handleGeminiError(error, `la generazione di un nuovo esempio per "${collocation.voce}"`));
    }
};

export const generateWeeklySummary = async (stats: WeeklyStats): Promise<string> => {
    const prompt = `
Agisci come un amichevole e incoraggiante tutor di lingua italiana.
Basandoti sulle statistiche di studio dell'utente dell'ultima settimana, scrivi un breve riepilogo personalizzato (3-4 frasi).
- Rivolgiti all'utente direttamente usando "tu".
- Sii positivo e congratulati per l'impegno (anche se piccolo).
- Menziona un tema su cui si è concentrato o un progresso specifico.
- Offri un piccolo suggerimento per la prossima settimana basato sui dati.
- Mantieni un tono motivazionale.

Statistiche dell'utente:
- Voci nuove imparate: ${stats.newWords}
- Voci ripassate: ${stats.reviews}
- Giorni di studio consecutivi: ${stats.streak}
- Tema più studiato: ${stats.topTheme || 'Nessuno in particolare'}
- Esempio di voce imparata bene: ${stats.mostMasteredItem ? `"${stats.mostMasteredItem.voce}"` : 'N/D'}
- Esempio di voce da ripassare: ${stats.needsReviewItem ? `"${stats.needsReviewItem.voce}"` : 'N/D'}

Scrivi solo il paragrafo di riepilogo, senza titoli o introduzioni.
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                temperature: 0.7,
            },
        });
        return response.text.trim();
    } catch (error) {
        throw new Error(handleGeminiError(error, "la generazione del riepilogo settimanale"));
    }
};

export const generateMnemonicImage = async (collocation: string, explanation: string): Promise<string> => {
    const prompt = `Create a simple, clear, and memorable mnemonic image for the Italian collocation "${collocation}". The core concept is: "${explanation}". The image should be symbolic or metaphorical, helping a language learner remember the meaning. Style: clean, simple, vector illustration. No text in the image.`;
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/png',
              aspectRatio: '1:1',
            },
        });
        if (response.generatedImages && response.generatedImages.length > 0 && response.generatedImages[0].image.imageBytes) {
            return response.generatedImages[0].image.imageBytes;
        } else {
            throw new Error("Nessuna immagine generata dall'IA.");
        }
    } catch (error) {
        throw new Error(handleGeminiError(error, `la generazione dell'immagine per "${collocation}"`));
    }
};

export const generateStoryForCollocation = async (collocation: Collocation, options: { cefrLevel?: string; register?: string; } = {}): Promise<StoryResult> => {
    const { cefrLevel, register } = options;
    const schema = {
        type: Type.OBJECT,
        properties: {
            story: {
                type: Type.STRING,
                description: "Una breve storia (2-3 frasi) che usa la collocazione in un contesto memorabile."
            }
        },
        required: ["story"]
    };

    const prompt = `
Agisci come un insegnante e storyteller. Data la collocazione "${collocation.voce}", crea una breve storia memorabile (2-3 frasi) che la utilizzi in modo naturale.

Istruzioni:
- La storia deve essere adatta a uno studente di livello ${cefrLevel || 'B1'}.
- Usa un registro ${register || 'Neutro'}.
- La storia deve contestualizzare la collocazione per aiutare a ricordarne il significato.

Rispondi SOLO con un oggetto JSON che contenga la storia nel campo 'story'.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.8,
            },
        });
        const jsonString = response.text.trim();
        return JSON.parse(jsonString) as StoryResult;
    } catch (error) {
        throw new Error(handleGeminiError(error, `la creazione della storia per "${collocation.voce}"`));
    }
};

export const generateStudyPlan = async (stats: WeeklyStats): Promise<string> => {
    const prompt = `
Agisci come un tutor di lingua italiana esperto e motivazionale.
Basandoti sulle statistiche di studio dell'utente, crea un piano di studio personalizzato e realistico per la prossima settimana in formato Markdown.

Statistiche dell'utente:
- Voci nuove imparate: ${stats.newWords}
- Voci ripassate: ${stats.reviews}
- Giorni di studio consecutivi: ${stats.streak}
- Tema più studiato: ${stats.topTheme || 'Nessuno in particolare'}
- Esempio di voce imparata bene: ${stats.mostMasteredItem ? `"${stats.mostMasteredItem.voce}"` : 'N/D'}
- Esempio di voce da ripassare: ${stats.needsReviewItem ? `"${stats.needsReviewItem.voce}"` : 'N/D'}

Istruzioni per il piano:
1.  **Stile:** Usa un tono amichevole, incoraggiante e diretto (usa il "tu").
2.  **Struttura:** Organizza il piano con intestazioni per ogni sezione.
3.  **Sezioni da includere:**
    -   **### Riepilogo e Complimenti:** Inizia con una breve frase positiva sulla settimana passata.
    -   **### Obiettivo Principale:** Definisci un obiettivo chiaro e misurabile per la prossima settimana (es. "Imparare 10 nuove voci", "Ripassare tutte le voci in sospeso").
    -   **### Focus Tematico:** Suggerisci 1-2 temi su cui concentrarsi, basandoti sui temi già studiati o suggerendone di nuovi.
    -   **### Piano Giornaliero (Suggerito):** Proponi un semplice programma per 3-5 giorni, con piccole attività (es. "Lunedì: Ripassa 5 voci", "Mercoledì: Impara 3 nuove voci sul tema '${stats.topTheme || 'Economia'}'").
    -   **### Attività Extra:** Suggerisci una o due attività pratiche per la settimana (es. "Prova a usare '${stats.mostMasteredItem ? stats.mostMasteredItem.voce : 'una nuova collocazione'}' in una frase scritta", "Fai un quiz mirato sui tuoi punti deboli").
    -   **### Motivazione:** Concludi con una frase di incoraggiamento.

Mantieni il piano conciso, realistico e facile da seguire. La risposta deve essere solo il piano in Markdown.
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                temperature: 0.7,
            },
        });
        return response.text.trim();
    } catch (error) {
        throw new Error(handleGeminiError(error, "la generazione del piano di studio"));
    }
};