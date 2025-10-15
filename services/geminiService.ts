

import { GoogleGenAI, Type } from "@google/genai";
import { CollocationsResult, Collocation, ClozeTestResult, RelatedCollocation, QuizOptions, GeneratedCardData, RolePlayResult, RelatedExample, DictionaryResult, GroundingChunk, ImprovedSentenceResult, WeeklyStats, SavedCollocation, ThemeExplanationResult, StoryResult, CardDeepDiveResult, ConversationTurn, AITutorResponse, FollowUpQuestion, SuggestCollocationsResult, ThematicDeckResult, MindMapResult, ImprovedTextResult, DeepDiveOptions, VoiceScenariosResult, CreativeFeedbackResult, VoiceScenario } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const handleGeminiError = (error: unknown, context: string): string => {
    console.error(`Errore durante ${context}:`, error);
    if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();

        // Safety block (most common for unexpected content issues)
        if (errorMessage.includes('safety')) {
            return `La risposta dell'IA per "${context}" è stata bloccata per motivi di sicurezza. Questo può accadere se il testo di input o l'output generato contiene contenuti ritenuti sensibili. Prova a riformulare o a usare un testo diverso.`;
        }

        // Quota / Rate limiting
        if (errorMessage.includes('resource_exhausted') || errorMessage.includes('429')) {
            return "Hai superato la quota di richieste. Attendi un minuto e riprova.";
        }

        // Network errors
        if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
            return "Errore di rete. Controlla la tua connessione e riprova.";
        }
        
        // Invalid Argument (400)
        if (errorMessage.includes('invalid argument') || errorMessage.includes('400')) {
             return `La richiesta all'IA per "${context}" non è valida. Potrebbe esserci un problema con il formato dei dati inviati.`;
        }

        // Custom JSON validation errors
        if (error.message.includes("risposta JSON dall'IA")) {
            return error.message;
        }
        
        // General JSON parsing errors
        if (error instanceof SyntaxError || errorMessage.includes('json')) {
             return `La risposta dell'IA non era nel formato JSON atteso per ${context}. Questo può accadere se il modello è sovraccarico o se la risposta è stata bloccata. Riprova.`;
        }

        // Other custom-thrown errors
        if (error.message.startsWith("Impossibile") || error.message.startsWith("Hai superato")) {
            return error.message;
        }
    }
    // Default fallback
    return `Si è verificato un errore imprevisto durante ${context}. Riprova più tardi.`;
};

export const extractCollocations = async (text: string, cefrLevel?: string): Promise<CollocationsResult> => {
    const prompt = `
Agisci come linguista computazionale e lessicografo italiano specializzato in collocazioni, con un'enfasi sulla didattica per studenti stranieri (L2).

Obiettivo: Dal testo fornito, estrai un dizionario di collocazioni organizzato per temi. Per ogni collocazione, fornisci la forma normalizzata (lemma), la frase esatta dal testo, una spiegazione in stile Feynman e delle parole correlate con esempi.

**Istruzioni per le Spiegazioni (Metodo Feynman per Studenti L2 - OBBLIGATORIO):**
La spiegazione è la parte più importante. DEVE essere estremamente semplice, intuitiva e basata su un'analogia, non una definizione accademica.
- **Parti dall'Analogia:** Inizia con un paragone concreto. Esempio per "avere un asso nella manica": "Immagina di giocare a carte. È come tenere nascosta la carta migliore per usarla al momento giusto e sorprendere tutti."
- **Spiega il Concetto:** Subito dopo l'analogia, collega l'immagine all'idea astratta in modo semplice.
- **Linguaggio Semplice:** Usa frasi brevissime, vocabolario comune e un tono amichevole. Pensa di spiegarlo a un bambino.
- **Brevità Massima:** La spiegazione totale non deve superare le 3-4 frasi.

**Parole Correlate:** Per ogni collocazione, elenca 3-5 parole o brevi frasi strettamente correlate (sinonimi, antonimi, ecc.). Per ogni parola correlata, fornisci una brevissima frase d'esempio (massimo una frase) che ne mostri l'uso in un contesto semplice e naturale. Questo aiuta gli studenti a consolidare il vocabolario.

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
                                        description: "Una lista di 3-5 parole o brevi frasi correlate, ciascuna con una frase di esempio.",
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                parola: {
                                                    type: Type.STRING,
                                                    description: "La parola o frase correlata."
                                                },
                                                esempio: {
                                                    type: Type.STRING,
                                                    description: "Una brevissima frase d'esempio che mostra l'uso della parola correlata."
                                                }
                                            },
                                            required: ["parola", "esempio"]
                                        }
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

        if (!parsedJson) {
            throw new Error("La risposta JSON dall'IA era vuota (null o undefined). L'output non può essere elaborato.");
        }

        if (!parsedJson.dizionario) {
            throw new Error("La risposta JSON dall'IA non è valida. Manca il campo radice 'dizionario'. Il formato atteso è: { dizionario: [...] }.");
        }

        if (!Array.isArray(parsedJson.dizionario)) {
            throw new Error(`La risposta JSON dall'IA non è valida. Il campo 'dizionario' dovrebbe essere un array, ma è stato ricevuto un tipo '${typeof parsedJson.dizionario}'.`);
        }

        return parsedJson as CollocationsResult;
    } catch (error) {
        throw new Error(handleGeminiError(error, "l'estrazione delle collocazioni"));
    }
};

export const generateDeepDive = async (item: string, options: DeepDiveOptions = {}): Promise<string> => {
    const { cefrLevel, register, itemContext } = options;
    const isDictionaryEntry = itemContext && !!itemContext.traduzione_arabo;

    const prompt = isDictionaryEntry ? `
Agisci come un esperto linguista e tutor bilingue (italiano-arabo), con una profonda conoscenza della didattica L2. Il tuo obiettivo è creare una guida di approfondimento bilingue, completa e utile, sulla voce di dizionario fornita, usando una struttura analitica dettagliata.

**Input:**
- **Termine Italiano:** "${item}"
- **Traduzione Arabo:** "${itemContext.traduzione_arabo}"
- **Definizione Italiano:** "${itemContext.spiegazione}"
- **Definizione Arabo:** "${itemContext.definizione_arabo}"
- **Esempio Italiano:** "${itemContext.frase_originale}"
- **Esempio Arabo:** "${itemContext.esempio_arabo}"
${cefrLevel ? `- **Livello CEFR di riferimento per lo studente:** ${cefrLevel}` : ''}
${register && register !== 'Neutro' ? `- **Registro di riferimento per lo studente:** ${register}` : ''}

**Istruzioni:**
1.  **Stile:** Usa un tono amichevole. Per le spiegazioni, usa rigorosamente il Metodo Feynman: parti da un'analogia o un'immagine semplice e concreta, usa un linguaggio facilissimo e mantieni la spiegazione entro 3-4 frasi.
2.  **Lingua e Formattazione:** Per ogni punto o paragrafo all'interno di una sezione, fornisci prima la versione italiana, seguita immediatamente dalla sua traduzione araba sulla riga successiva, formattata in questo modo: \`AR: [testo arabo]\`. Questo formato è obbligatorio per ogni pezzo di contenuto. Non usare più il separatore \`---ARABIC---\`.
3.  **Struttura:** Organizza la risposta in sezioni usando \`###\` come intestazione. La risposta deve essere in formato Markdown.

**Sezioni Obbligatorie:**

### 🇮🇹 Panoramica / 🇦🇪 نظرة عامة
Spiega il concetto base di "${item}", cos'è e quando si usa.
AR: [Spiega il concetto base in arabo.]

### 🇮🇹 Dettagli Grammaticali / 🇦🇪 تفاصيل نحوية
- **Tipo:** (es. Sostantivo, Verbo, Aggettivo, Locuzione avverbiale)
AR: **النوع:** [Tipo in arabo]
- **Per Sostantivi:** Genere: [maschile/femminile], Plurale: [plurale]
AR: **للاسماء:** [informazioni su genere e plurale in arabo]
- **Per Verbi:**
  - io [coniugazione]
  - tu [coniugazione]
  - lui/lei [coniugazione]
AR: **للافعال:**
  - أنا [coniugazione araba]
  - أنت [coniugazione araba]
  - هو/هي [coniugazione araba]

### 🇮🇹 Etimologia e Radice / 🇦🇪 أصل الكلمة والجذر
Spiega brevemente l'origine etimologica della parola italiana.
AR: [Identifica la radice triconsonantica (الجذر الثلاثي) della parola araba e mostra 1-2 parole correlate dalla stessa radice.]

### 🇮🇹 Livello e Registro / 🇦🇪 المستوى والسياق
- **Livello QCER Stimato:** Stima il livello QCER dell'espressione italiana.
AR: **المستوى:** [Stima il livello dell'espressione araba]
- **Registro Principale:** Indica il registro più comune (es. Formale, Informale) per l'espressione italiana.
AR: **السياق:** [Indica il registro più comune per l'espressione araba, spiegando eventuali differenze con l'italiano.]

### 🇮🇹 Espansioni e Collocazioni Correlate / 🇦🇪 تعابير مترابطة
- [Espressione correlata 1] - [Esempio 1]
AR: [Traduzione/Equivalente arabo 1] - [Esempio arabo 1]
- [Espressione correlata 2] - [Esempio 2]
AR: [Traduzione/Equivalente arabo 2] - [Esempio arabo 2]

### 🇮🇹 Variazioni e Sfumature / 🇦🇪 بدائل وفروق دقيقة
- [Alternativa 1]: [Spiegazione sfumatura 1]
AR: [Equivalente arabo 1]: [Spiegazione sfumatura araba 1]
- [Alternativa 2]: [Spiegazione sfumatura 2]
AR: [Equivalente arabo 2]: [Spiegazione sfumatura araba 2]

### ⚠️ Consigli d'Uso ed Errori Comuni per Arabofoni
[Consiglio/Errore comune 1 in italiano]
AR: [Stesso consiglio/errore in arabo]
[Consiglio/Errore comune 2 in italiano]
AR: [Stesso consiglio/errore in arabo]

### 🇮🇹 Mappa Lessicale / 🇦🇪 خريطة المفردات
- **Verbi comuni:** [verbi in italiano]
AR: **الأفعال الشائعة:** [verbi in arabo]
- **Nomi comuni:** [nomi in italiano]
AR: **الأسماء الشائعة:** [nomi in arabo]
- **Aggettivi/Avverbi comuni:** [aggettivi/avverbi in italiano]
AR: **الصفات/الظروف الشائعة:** [aggettivi/avverbi in arabo]

**Vincoli:**
- Usa sempre il formato \`AR: [testo arabo]\` sulla riga successiva per ogni contenuto bilingue.
- Mantieni la guida focalizzata e utile a livello didattico.`
:
`
Agisci come un esperto linguista e tutor di italiano L2. Il tuo obiettivo è creare una guida di approfondimento chiara e utile su un dato tema o una specifica collocazione.

**Input:**
- **Target:** "${item}"
${cefrLevel ? `- **Livello CEFR di riferimento per lo studente:** ${cefrLevel}` : ''}
${register && register !== 'Neutro' ? `- **Registro di riferimento per lo studente:** ${register}` : ''}

**Istruzioni:**
1.  **Stile:** Usa un tono amichevole e diretto (io/tu). Spiega i concetti complessi con il Metodo Feynman: parti da un'analogia semplice e concreta (es. "Immagina di...") e usa un linguaggio facilissimo, per un massimo di 3-4 frasi.
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
Spiega il tema in generale, usando un'analogia semplice (stile Feynman) per introdurne l'essenza. Collega l'analogia a come le collocazioni fornite rappresentano il tema, mostrando come, insieme, dipingono un quadro dell'argomento.

### Livello e Registro del Tema
- **Livello QCER Stimato:** Basandoti sulle collocazioni fornite, stima il livello QCER (es. B1-B2) in cui questo tema è più rilevante e utile.
- **Registro Principale:** Indica il registro più comune per questo tema (es. Formale, Informale, Giornalistico) e spiega brevemente perché.

### Analisi delle Collocazioni Chiave
Seleziona 3-5 collocazioni dalla lista che ritieni più rappresentative o didatticamente interessanti. Per ciascuna, approfondisci:
- **Significato nel contesto del tema:** Spiega come questa collocazione specifica illumina un aspetto di "${themeName}", usando un'analogia semplice (stile Feynman).
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
                description: "Una spiegazione concisa (massimo 3-4 frasi) del registro e delle sfumature, usando un'analogia semplice in stile Feynman."
            },
            alternative_comuni: {
                type: Type.ARRAY,
                description: "Una lista di 2-3 alternative comuni.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        alternativa: { type: Type.STRING, description: "La parola o espressione alternativa." },
                        spiegazione: { type: Type.STRING, description: "Una brevissima spiegazione della differenza, usando un'analogia semplice se possibile." }
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

export const answerQuestionAboutCollocation = async (context: string, question: string): Promise<{ answer: string; chunks: GroundingChunk[] }> => {
    const prompt = `
Agisci come un tutor di lingua italiana esperto e preciso.
Ti viene fornito un testo di approfondimento (il "contesto") su una specifica collocazione o tema linguistico.
Il tuo compito è rispondere alla domanda dell'utente.

**Istruzioni:**
1.  **Dai priorità al contesto:** Basa la tua risposta principalmente sulle informazioni contenute nel testo di approfondimento fornito. Se la risposta è lì, usala.
2.  **Usa la ricerca web se necessario:** Se il contesto non contiene la risposta, o se può essere arricchita con informazioni più recenti o dettagliate, usa la ricerca web per trovare le informazioni.
3.  **Sintetizza:** Combina le informazioni dal contesto e dalla ricerca web in una risposta chiara e coesa.
4.  **Sii conciso:** Vai dritto al punto.
5.  **Lingua:** Rispondi in italiano.

---
**CONTESTO FORNITO:**
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
                temperature: 0.3,
                tools: [{googleSearch: {}}],
            },
        });
        
        const answer = response.text.trim();
        const chunks = (response.candidates?.[0]?.groundingMetadata?.groundingChunks || []) as GroundingChunk[];

        return { answer, chunks };
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
                description: "Una spiegazione del tema in stile Feynman (massimo 3-4 frasi): usa un'analogia semplice, un linguaggio facile e vai dritto al punto."
            },
            related_collocations: {
                type: Type.ARRAY,
                description: "Una lista di 3-5 collocazioni comuni e utili strettamente correlate al tema.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        voce: { type: Type.STRING, description: "La collocazione correlata." },
                        spiegazione: { type: Type.STRING, description: "Una brevissima spiegazione della collocazione (1-2 frasi) in stile Feynman, con un'analogia semplice." }
                    },
                    required: ["voce", "spiegazione"]
                }
            }
        },
        required: ["explanation", "related_collocations"]
    };

    const prompt = `
Agisci come un esperto di linguistica e lessicografo. Per il tema fornito:
1.  Fornisci una spiegazione del tema in stile Feynman (massimo 3-4 frasi): parti da un'analogia semplice e usa un linguaggio facile.
2.  Suggerisci 3-5 collocazioni italiane comuni e utili strettamente correlate al tema, ognuna con una brevissima spiegazione in stile Feynman.

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
        if (chosenTopic) {
            prompt = `Agendo come un redattore esperto, scrivi un testo informativo e ben strutturato di circa 250 parole in italiano sull'argomento: "${chosenTopic}". Basa la tua risposta su informazioni verificate tramite ricerca web. ${cefrLevel ? `Adatta la difficoltà al livello ${cefrLevel} del QCER.` : ''} ${registerPrompt} Rispondi solo con il testo. Non includere titoli.`;
        } else {
            prompt = `Agendo come un blogger o un redattore di una rivista online, scegli un argomento casuale e di interesse generale (es. viaggi, cibo, tecnologia, hobby, cultura pop). Usando la ricerca web per ottenere informazioni aggiornate e interessanti, scrivi un testo con un tono informale e coinvolgente di circa 200 parole in italiano su quell'argomento. ${cefrLevel ? `Adatta la difficoltà del testo al livello ${cefrLevel} del QCER.` : ''} ${register && register !== 'Neutro' ? `Il registro deve essere ${register}.` : 'Il registro deve essere colloquiale e informale.'} Rispondi solo ed esclusivamente con il testo generato. Non includere il titolo dell'argomento o altre frasi introduttive.`;
        }
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

export const generateRelatedCollocations = async (item: string, options: { cefrLevel: string; register: string; }): Promise<RelatedCollocation[]> => {
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
                    description: "Una breve spiegazione della collocazione (massimo 3-4 frasi) in stile Feynman, usando un'analogia semplice."
                }
            },
            required: ["voce", "spiegazione"]
        }
    };

    const prompt = `
Agisci come un lessicografo italiano. Data la seguente parola chiave o collocazione, suggerisci 3-5 collocazioni italiane strettamente correlate.
Adatta la complessità e lo stile dei suggerimenti a uno studente di livello ${options.cefrLevel} e a un registro ${options.register}.

Parola chiave: "${item}"

Per ogni suggerimento, fornisci la collocazione e una brevissima spiegazione in stile Feynman (massimo 3-4 frasi, con un'analogia semplice).
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

export const generateCollocationCard = async (topic: string, options: { cefrLevel: string; register: string; }): Promise<GeneratedCardData> => {
    const schema = {
        type: Type.OBJECT,
        properties: {
            voce: {
                type: Type.STRING,
                description: "La parola o collocazione fornita, normalizzata al lemma se necessario."
            },
            spiegazione: {
                type: Type.STRING,
                description: "Una spiegazione in stile Feynman (massimo 3-4 frasi): usa un'analogia semplice, un linguaggio facile e vai dritto al punto."
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
2.  **Spiegazione**: Scrivi una spiegazione secondo il Metodo Feynman (massimo 3-4 frasi). Parti da un'analogia semplice e concreta, usa un linguaggio facilissimo e vai dritto al punto. Deve essere adatta a uno studente di livello ${options.cefrLevel}.
3.  **Frase Originale**: Crea una frase d'esempio realistica e di uso comune, usando un registro ${options.register}.
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

export const explainText = async (text: string, options: { cefrLevel?: string; register?: string; } = {}): Promise<string> => {
    const { cefrLevel, register } = options;
    const systemInstruction = `Agisci come un 'Virgilio' linguistico, un tutor di italiano di livello accademico ossessionato dalla precisione, dalla completezza e dalla chiarezza pedagogica. La tua missione è fornire la risposta DEFINITIVA, onnicomprensiva e multi-prospettica a qualsiasi domanda, anticipando le future curiosità dello studente. Ogni tua risposta deve essere un capolavoro di didattica, non lasciando nulla di intentato. È imperativo che le tue risposte siano sempre dettagliate ed esaustive, trattando tutti gli aspetti e i concetti rilevanti e pertinenti all'interrogativo posto.

**Struttura della Risposta Obbligatoria:**
La tua risposta DEVE essere organizzata in modo impeccabile usando Markdown. Segui sempre questa struttura:

1.  **Risposta Diretta (La Sintesi):** Inizia con una risposta cristallina e diretta alla domanda (massimo 2-3 frasi).

2.  **Analisi Enciclopedica:** Dopo la sintesi, fornisci un'analisi dettagliata. **È OBBLIGATORIO includere TUTTE le sezioni pertinenti tra le seguenti** per costruire una spiegazione enciclopedica. Sii creativo, approfondito e non omettere dettagli anche se sembrano secondari.

    *   \`### 📖 Spiegazione Dettagliata\`: Espandi la risposta diretta con maggiori dettagli, logica, contesto e tutte le sfumature necessarie.
    *   \`### 🏛️ Origine ed Etimologia\`: Racconta la storia della parola o espressione. Da dove viene? Come si è evoluta nel tempo?
    *   \`### 🎨 Metafore e Analogie Creative (Metodo Feynman)\`: Usa paragoni memorabili, semplici e VISIVI per spiegare il concetto, come se lo stessi spiegando a qualcuno che non ne sa assolutamente nulla.
    *   \`### 🌍 Contesto Culturale e Pragmatica\`: Spiega il 'non detto', le implicazioni sociali e culturali. In quali contesti sociali è appropriato? Che effetto produce sull'interlocutore?
    *   \`### 🗣️ Pronuncia e Fonetica\`: Se pertinente, fornisci note sulla pronuncia, suoni difficili per i non madrelingua o accenti particolari.
    *   \`### ✨ Esempi Pratici e Variazioni\`: Fornisci una lista ricca di frasi di esempio chiare, realistiche e diverse tra loro. Mostra come l'espressione può essere modificata (es. tempi verbali, forma negativa, uso figurato).
    *   \`### 🔄 Rete Lessicale (Alternative, Sinonimi, Contrari)\`: Crea una rete di parole correlate, spiegando le sottili differenze di significato e registro tra sinonimi, alternative comuni e contrari.
    *   \`### ⚠️ Errori Comuni e Falsi Amici\`: Evidenzia le trappole tipiche per gli studenti (es. falsi amici con altre lingue, preposizioni sbagliate, errori di concordanza).
    *   \`### 🧠 Tecniche di Memorizzazione\`: Offri tecniche mnemoniche VISIVE o ASSOCIATIVE per fissare il concetto nella memoria a lungo termine.
    *   \`### 📰 Dove Trovarla (Nel Mondo Reale)\`: Suggerisci esempi di dove lo studente può trovare questa espressione in uso reale (es. tipo di articoli di giornale, film, canzoni, libri).
    *   \`### ✍️ Esercizio Pratico Interattivo\`: Proponi un esercizio che richieda all'utente di PRODURRE attivamente lingua, non solo di riconoscere (es. 'Scrivi una frase che descriva...', 'Completa questo mini-dialogo...').

3.  **Stile:** Usa un linguaggio amichevole, incoraggiante ma estremamente preciso. Usa **grassetto** per evidenziare i termini chiave e rendere il testo più leggibile e strutturato.

4.  **Adattamento:** Adatta OBBLIGATORIAMENTE la complessità del linguaggio e degli esempi al livello QCER (${cefrLevel || 'B1'}) e al registro (${register || 'Neutro'}) richiesti.

La tua risposta deve essere solo il testo in markdown, senza JSON o altre formattazioni.`;
    
    const prompt = `Spiega in dettaglio il seguente testo: "${text}"`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction,
                temperature: 0.4,
            },
        });
        return response.text.trim();
    } catch (error) {
        throw new Error(handleGeminiError(error, `la spiegazione per "${text}"`));
    }
};

export const analyzeGrammarOfText = async (text: string, options: { cefrLevel?: string; register?: string } = {}): Promise<string> => {
    const { cefrLevel, register } = options;
    const prompt = `
Agisci come un esperto e amichevole professore di grammatica italiana.
Il tuo compito è fornire un'analisi grammaticale completa e didattica del testo fornito, identificando strutture, coniugazioni verbali e modelli sintattici.

${cefrLevel ? `Adatta la complessità della tua spiegazione e degli esempi a uno studente di livello ${cefrLevel}.` : ''}
${register && register !== 'Neutro' ? `Usa un registro ${register} nella tua analisi e negli esempi.` : ''}

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

export const generateVoiceScenarios = async (topic: string, cefrLevel: string, register: string, context?: string | null): Promise<VoiceScenariosResult> => {
    const schema = {
        type: Type.OBJECT,
        properties: {
            scenari: {
                type: Type.ARRAY,
                description: "A list of voice role-play scenarios.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING, description: "A short, engaging title for the scenario (e.g., 'Al Ristorante')." },
                        description: { type: Type.STRING, description: "A brief, one-sentence description for the user of what the scenario is about." },
                        system_instruction: { type: Type.STRING, description: "A detailed system instruction for the AI tutor, defining its role and objective. This will be used in a Gemini Live API call." }
                    },
                    required: ["title", "description", "system_instruction"]
                }
            }
        },
        required: ["scenari"]
    };

    const prompt = context
        ? `
Agisci come un tutor di lingua italiana che progetta attività di conversazione. Il tuo compito è creare uno scenario di conversazione vocale per un utente che vuole discutere e approfondire il contenuto di un testo esplicativo fornito.

**Contenuto di riferimento (il testo da discutere):**
---
${context}
---

**Argomento Principale:** "${topic}"
**Livello Studente:** ${cefrLevel}
**Registro:** ${register}

**Istruzioni:**
1.  Crea **UN UNICO** scenario di conversazione (non un role-play).
2.  **title:** Deve essere "Discussione Approfondita".
3.  **description:** Deve essere "Parliamo insieme del testo che hai appena letto per assicurarci che tu abbia capito tutto."
4.  **system_instruction:** Crea un'istruzione di sistema DETTAGLIATA per il tutor IA.
    -   Il ruolo dell'IA è quello di un tutor amichevole che verifica la comprensione e stimola la conversazione.
    -   L'IA deve basare la conversazione ESCLUSIVAMENTE sul contenuto fornito nel "Contenuto di riferimento".
    -   **L'IA deve iniziare la conversazione** con un saluto e una domanda aperta sul testo, ad esempio: "Ciao! Ho visto che hai letto l'approfondimento su '${topic}'. C'è qualcosa in particolare che ti ha colpito o che vorresti discutere?"
    -   L'obiettivo è far parlare lo studente, fargli riassumere concetti con parole sue, chiedere chiarimenti e usare il lessico del testo.
    -   Il linguaggio dell'IA deve essere calibrato per un livello ${cefrLevel} e un registro ${register}.

Rispondi ESCLUSIVAMENTE con un oggetto JSON che segua lo schema fornito.
`
        : `
Agisci come un autore di materiale didattico per l'apprendimento dell'italiano. Il tuo compito è creare 2-3 scenari di role-play vocale per un utente che vuole praticare l'argomento "${topic}".

**Istruzioni:**
1.  Crea 2-3 scenari distinti e creativi in cui l'utente possa usare naturalmente il concetto di "${topic}".
2.  Per ogni scenario, fornisci:
    *   **title:** Un titolo breve e accattivante (es. "Chiedere Indicazioni").
    *   **description:** Una descrizione di una riga per l'utente (es. "Sei un turista a Roma e devi chiedere come arrivare al Colosseo.").
    *   **system_instruction:** Un'istruzione di sistema DETTAGLIATA per il tutor IA (che verrà utilizzata in una chiamata all'API Gemini Live). Questa istruzione deve definire chiaramente il ruolo dell'IA, il contesto, l'obiettivo della conversazione e come deve interagire con l'utente. È OBBLIGATORIO che l'IA inizi la conversazione. Deve essere calibrata per un livello ${cefrLevel} e un registro ${register}. Ad esempio: "Sei un passante amichevole a Roma. L'utente è un turista. Inizia tu la conversazione salutandolo e chiedendogli se ha bisogno di aiuto. L'obiettivo è guidare l'utente e praticare il lessico relativo alle direzioni. Sii paziente e incoraggiante."

Rispondi ESCLUSIVAMENTE con un oggetto JSON che segua lo schema fornito.
`;

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
        return JSON.parse(jsonString) as VoiceScenariosResult;
    } catch (error) {
        throw new Error(handleGeminiError(error, `la generazione degli scenari vocali per "${topic}"`));
    }
};

export const analyzeConversationPerformance = async (userTranscript: string, scenarioContext: string, cefrLevel: string, register: string): Promise<string> => {
    const prompt = `
Agisci come un tutor di lingua italiana esperto, amichevole e incoraggiante. Il tuo compito è analizzare la performance di uno studente in una conversazione di role-playing e fornire un feedback costruttivo.

**Contesto dello Scenario:**
${scenarioContext}

**Trascrizione delle battute dello studente:**
---
${userTranscript}
---

**Livello dello studente (QCER):** ${cefrLevel}
**Registro richiesto:** ${register}

**Istruzioni:**
1.  **Analisi:** Leggi attentamente la trascrizione dello studente. Analizza la grammatica, la scelta del lessico (inclusa la pertinenza all'argomento), l'uso delle collocazioni e la fluidità generale.
2.  **Feedback Strutturato:** Fornisci il tuo feedback in formato Markdown. La tua risposta DEVE essere organizzata nelle seguenti sezioni:
    *   \`### 👍 Punti di Forza\`: Inizia in modo positivo. Evidenzia 1-2 cose che lo studente ha fatto bene (es. "Ottimo uso del congiuntivo qui!", "Hai usato l'espressione '___' in modo molto naturale.").
    *   \`### 🎯 Aree di Miglioramento\`: Identifica 1-3 punti principali su cui lo studente può migliorare. Sii specifico. Per ogni punto:
        *   Cita la frase originale dello studente.
        *   Spiega l'errore o l'imprecisione in modo semplice.
        *   Fornisci la versione corretta o più naturale.
    *   \`### ✨ Suggerimenti per la Prossima Volta\`: Offri 1-2 consigli pratici o suggerimenti di espressioni/collocazioni alternative che lo studente avrebbe potuto usare per arricchire la conversazione.
3.  **Tono:** Mantieni un tono costruttivo e motivazionale. L'obiettivo è aiutare lo studente a imparare, non a sentirsi giudicato.
4.  **Adattamento:** Calibra la complessità delle tue spiegazioni al livello QCER dello studente.

Rispondi solo con l'analisi in formato Markdown.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                temperature: 0.6,
            },
        });
        return response.text.trim();
    } catch (error) {
        throw new Error(handleGeminiError(error, "l'analisi della performance della conversazione"));
    }
};


export const generateItalianArabicDictionary = async (text: string, options: { cefrLevel?: string; register?: string } = {}): Promise<DictionaryResult> => {
    const { cefrLevel, register } = options;
    const schema = {
        type: Type.OBJECT,
        properties: {
            dizionario_tematico: {
                type: Type.ARRAY,
                description: "Un dizionario di voci italiano-arabo, organizzato per temi.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        tema: { type: Type.STRING, description: "Il tema a cui appartengono le voci del dizionario." },
                        voci: {
                            type: Type.ARRAY,
                            description: "Una lista di voci del dizionario per il tema specificato.",
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    termine_italiano: { type: Type.STRING, description: "Il termine o la frase chiave in italiano, normalizzato al lemma." },
                                    traduzione_arabo: { type: Type.STRING, description: "La traduzione accurata del termine in arabo." },
                                    definizione_italiano: { type: Type.STRING, description: "Una definizione chiara e concisa del termine in italiano." },
                                    definizione_arabo: { type: Type.STRING, description: "Una definizione chiara e concisa del termine in arabo." },
                                    esempio_italiano: { type: Type.STRING, description: "Una frase di esempio che utilizza il termine in italiano." },
                                    esempio_arabo: { type: Type.STRING, description: "La traduzione della frase di esempio in arabo." },
                                    pronuncia_arabo: { type: Type.STRING, description: "La traslitterazione fonetica della pronuncia araba (es. 'marhaban')." },
                                    contesto_culturale: { type: Type.STRING, description: "Una breve nota (1-2 frasi) sul contesto culturale o le differenze d'uso tra italiano e arabo." }
                                },
                                required: ["termine_italiano", "traduzione_arabo", "definizione_italiano", "definizione_arabo", "esempio_italiano", "esempio_arabo", "pronuncia_arabo", "contesto_culturale"]
                            }
                        }
                    },
                    required: ["tema", "voci"]
                }
            }
        },
        required: ["dizionario_tematico"]
    };

    const prompt = `
Agisci come un esperto lessicografo e traduttore bilingue, specializzato in italiano e arabo, con un focus sulla didattica per studenti.

Obiettivo: Dal testo fornito, estrai in modo **esaustivo** le **collocazioni** (combinazioni di 2-4 parole, es. "prendere una decisione", "tenere in considerazione") più importanti e didatticamente rilevanti. Dai priorità assoluta alle collocazioni rispetto ai termini singoli. Includi termini singoli solo se sono eccezionalmente importanti e non fanno parte di una collocazione più ampia. Per ogni voce estratta, crea una voce di dizionario approfondito italiano-arabo.

**Raggruppamento per Tema:**
- Inferisci 3-5 temi principali dal testo (es. Economia, Società, Tecnologia).
- Assegna ogni voce a un tema pertinente. Organizza l'output per temi.

${cefrLevel ? `**Adattamento Obbligatorio al Livello CEFR: ${cefrLevel}**
È fondamentale che la tua analisi sia calibrata per uno studente di livello ${cefrLevel}. Seleziona termini appropriati per questo livello.` : ''}
${register && register !== 'Neutro' ? `**Adattamento Obbligatorio al Registro: ${register}**
È fondamentale che il registro (formale, informale, etc.) della tua analisi sia calibrato su ${register}.` : ''}

Istruzioni per ogni voce del dizionario:
1.  **termine_italiano**: Usa il termine estratto. Normalizzalo alla sua forma base (lemma) se necessario.
2.  **traduzione_arabo**: Fornisci la traduzione più accurata e contestualmente appropriata in arabo.
3.  **definizione_italiano**: Scrivi una definizione chiara e semplice del termine in italiano.
4.  **definizione_arabo**: Scrivi una definizione chiara e semplice del termine in arabo.
5.  **esempio_italiano**: Crea una frase d'esempio **autentica, comune e didatticamente valida** in italiano. La frase DEVE suonare come parlerebbe un madrelingua in un contesto reale. Evita frasi artificiali o create solo per contenere il termine. La naturalezza è l'obiettivo principale.
6.  **esempio_arabo**: Traduci la frase d'esempio in arabo.
7.  **pronuncia_arabo**: Fornisci una traslitterazione fonetica della traduzione araba.
8.  **contesto_culturale**: Fornisci una breve nota sul contesto culturale, il registro o le differenze d'uso.

Quantità: Estrai il maggior numero possibile di collocazioni rilevanti dal testo, idealmente tra 15 e 25, per coprire in modo esauriente il contenuto. Se il testo è breve o contiene poche collocazioni, estraine meno, ma sforzati di essere il più completo possibile. Se il testo fornito è un singolo termine, analizza solo quello.

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

        if (!parsedJson.dizionario_tematico || !Array.isArray(parsedJson.dizionario_tematico)) {
            throw new Error("Formato JSON della risposta non valido per il dizionario tematico.");
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
        description: "Una spiegazione in stile Feynman (massimo 3-4 frasi) del perché la nuova frase è migliore, usando un'analogia semplice per illustrare la naturalezza della collocazione."
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
4. Fornisci una spiegazione in stile Feynman (massimo 3-4 frasi) del miglioramento, usando un'analogia semplice per spiegare perché la collocazione scelta rende la frase più naturale.

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

export const improveText = async (text: string, options: { cefrLevel: string; register: string }): Promise<ImprovedTextResult> => {
  const schema = {
    type: Type.OBJECT,
    properties: {
      improved_text: {
        type: Type.STRING,
        description: "Il testo originale, riscritto in modo impeccabile per suonare più naturale, idiomatico e stilisticamente appropriato."
      },
      explanation_of_changes: {
        type: Type.STRING,
        description: "Un'analisi dettagliata in formato Markdown delle modifiche. Per ogni modifica, spiega il motivo del miglioramento usando lo stile Feynman (analogie semplici per illustrare la naturalezza o lo stile)."
      }
    },
    required: ["improved_text", "explanation_of_changes"]
  };

  const prompt = `
Agisci come un esperto editor e tutor di lingua italiana, con una profonda conoscenza delle sfumature lessicali e stilistiche.

Obiettivo: Migliora il testo fornito per renderlo perfettamente naturale, idiomatico e appropriato per il livello e il registro specificati.

Testo Originale:
---
${text}
---

Livello di riferimento (QCER): ${options.cefrLevel}
Registro linguistico: ${options.register}

Istruzioni:
1.  **Riscrivi il testo:** Riscrivi l'intero testo per migliorarlo. Correggi errori grammaticali, sintattici e di punteggiatura. Sostituisci parole o frasi innaturali con espressioni più comuni e idiomatiche, incluse collocazioni appropriate. Migliora la fluidità e lo stile generale del testo, adattandolo scrupolosamente al livello QCER e al registro richiesti.
2.  **Spiega le modifiche:** Fornisci un'analisi dettagliata in formato Markdown delle modifiche più significative che hai apportato.
    -   Usa una struttura a punti per ogni modifica.
    -   Per ogni punto, cita la parte originale e quella corretta (es. **Originale:** "ho fatto una scelta" -> **Miglioramento:** "ho preso una decisione").
    -   Spiega chiaramente il motivo del cambiamento usando lo stile Feynman: usa un'analogia semplice per far capire perché una scelta è più naturale, grammaticalmente corretta o stilisticamente migliore.

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
        return JSON.parse(jsonString) as ImprovedTextResult;
    } catch (error) {
        throw new Error(handleGeminiError(error, `il miglioramento del testo`));
    }
};


export const generateAdditionalExample = async (collocation: Collocation, options: { cefrLevel: string; register: string; }): Promise<string> => {
    const prompt = `Data la collocazione "${collocation.voce}", crea una NUOVA frase d'esempio, diversa da quella originale ("${collocation.frase_originale}"). La frase deve essere naturale per un livello ${options.cefrLevel}, usare un registro ${options.register} e usare la collocazione. Rispondi SOLO con la nuova frase.`;
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

export const getTutorResponse = async (history: ConversationTurn[], question: string, cefrLevel: string, register: string): Promise<AITutorResponse> => {
    const formattedHistory = history
        .filter(turn => turn.speaker === 'user' || turn.speaker === 'model')
        .map(turn => `${turn.speaker === 'user' ? 'Utente' : 'Tutor'}: ${turn.text}`)
        .join('\n');

    const schema = {
        type: Type.OBJECT,
        properties: {
            response: {
                type: Type.STRING,
                description: "La risposta del tutor alla domanda dell'utente."
            },
            suggestions: {
                type: Type.ARRAY,
                description: "Una lista di 3 domande di approfondimento brevi e pertinenti che l'utente potrebbe fare dopo aver letto la risposta.",
                items: {
                    type: Type.STRING
                }
            }
        },
        required: ["response", "suggestions"]
    };
    
    const systemInstruction = `Agisci come un 'Virgilio' linguistico, un tutor di italiano di livello accademico ossessionato dalla precisione, dalla completezza e dalla chiarezza pedagogica. La tua missione è fornire la risposta DEFINITIVA, onnicomprensiva e multi-prospettica a qualsiasi domanda, anticipando le future curiosità dello studente. Ogni tua risposta deve essere un capolavoro di didattica, non lasciando nulla di intentato. È imperativo che le tue risposte siano sempre dettagliate ed esaustive, trattando tutti gli aspetti e i concetti rilevanti e pertinenti all'interrogativo posto.

**Struttura della Risposta Obbligatoria:**
La tua risposta DEVE essere organizzata in modo impeccabile usando Markdown. Segui sempre questa struttura:

1.  **Risposta Diretta (La Sintesi):** Inizia con una risposta cristallina e diretta alla domanda (massimo 2-3 frasi).

2.  **Analisi Enciclopedica:** Dopo la sintesi, fornisci un'analisi dettagliata. **È OBBLIGATORIO includere TUTTE le sezioni pertinenti tra le seguenti** per costruire una spiegazione enciclopedica. Sii creativo, approfondito e non omettere dettagli anche se sembrano secondari.

    *   \`### 📖 Spiegazione Dettagliata\`: Espandi la risposta diretta con maggiori dettagli, logica, contesto e tutte le sfumature necessarie.
    *   \`### 🏛️ Origine ed Etimologia\`: Racconta la storia della parola o espressione. Da dove viene? Come si è evoluta nel tempo?
    *   \`### 🎨 Metafore e Analogie Creative (Metodo Feynman)\`: Usa paragoni memorabili, semplici e VISIVI per spiegare il concetto, come se lo stessi spiegando a qualcuno che non ne sa assolutamente nulla.
    *   \`### 🌍 Contesto Culturale e Pragmatica\`: Spiega il 'non detto', le implicazioni sociali e culturali. In quali contesti sociali è appropriato? Che effetto produce sull'interlocutore?
    *   \`### 🗣️ Pronuncia e Fonetica\`: Se pertinente, fornisci note sulla pronuncia, suoni difficili per i non madrelingua o accenti particolari.
    *   \`### ✨ Esempi Pratici e Variazioni\`: Fornisci una lista ricca di frasi di esempio chiare, realistiche e diverse tra loro. Mostra come l'espressione può essere modificata (es. tempi verbali, forma negativa, uso figurato).
    *   \`### 🔄 Rete Lessicale (Alternative, Sinonimi, Contrari)\`: Crea una rete di parole correlate, spiegando le sottili differenze di significato e registro tra sinonimi, alternative comuni e contrari.
    *   \`### ⚠️ Errori Comuni e Falsi Amici\`: Evidenzia le trappole tipiche per gli studenti (es. falsi amici con altre lingue, preposizioni sbagliate, errori di concordanza).
    *   \`### 🧠 Tecniche di Memorizzazione\`: Offri tecniche mnemoniche VISIVE o ASSOCIATIVE per fissare il concetto nella memoria a lungo termine.
    *   \`### 📰 Dove Trovarla (Nel Mondo Reale)\`: Suggerisci esempi di dove lo studente può trovare questa espressione in uso reale (es. tipo di articoli di giornale, film, canzoni, libri).
    *   \`### ✍️ Esercizio Pratico Interattivo\`: Proponi un esercizio che richieda all'utente di PRODURRE attivamente lingua, non solo di riconoscere (es. 'Scrivi una frase che descriva...', 'Completa questo mini-dialogo...').

3.  **Stile:** Usa un linguaggio amichevole, incoraggiante ma estremamente preciso. Usa **grassetto** per evidenziare i termini chiave e rendere il testo più leggibile e strutturato.

4.  **Adattamento:** Adatta OBBLIGATORIAMENTE la complessità del linguaggio e degli esempi al livello QCER (${cefrLevel}) e al registro (${register}) richiesti.

**Formato JSON Obbligatorio:**
La tua intera risposta (la risposta approfondita in Markdown e i suggerimenti) deve essere contenuta all'interno di un oggetto JSON, come specificato nello schema.

**Compito Specifico:**
Rispondi alla domanda dell'utente seguendo scrupolosamente le istruzioni di formattazione sopra. Dopo aver fornito la risposta approfondita, genera 3 domande di approfondimento intelligenti e pertinenti che stimolino la curiosità e portino la conversazione a un livello superiore.`;

    const prompt = `
---
CONVERSAZIONE PRECEDENTE:
${formattedHistory}
---
NUOVA DOMANDA:
Utente: ${question}
---
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.6,
            }
        });
        const jsonString = response.text.trim();
        const parsedResult = JSON.parse(jsonString) as Omit<AITutorResponse, 'chunks'>;
        return { ...parsedResult, chunks: [] };
    } catch (error) {
        throw new Error(handleGeminiError(error, "la risposta del tutor IA"));
    }
};

export const answerTutorFollowUp = async (context: string, question: string): Promise<{ answer: string; chunks: GroundingChunk[] }> => {
    const prompt = `
Agisci come un tutor di lingua italiana esperto. Ti viene fornito un "contesto" (la tua risposta precedente) e una domanda di approfondimento dell'utente.
Rispondi alla domanda in modo chiaro e conciso, usando la ricerca web se necessario per arricchire la risposta.

---
**CONTESTO (TUA RISPOSTA PRECEDENTE):**
${context}
---

**DOMANDA DI APPROFONDIMENTO:**
"${question}"
---

Rispondi solo con la risposta alla domanda.
`;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                temperature: 0.3,
                tools: [{googleSearch: {}}],
            },
        });
        
        const answer = response.text.trim();
        const chunks = (response.candidates?.[0]?.groundingMetadata?.groundingChunks || []) as GroundingChunk[];

        return { answer, chunks };
    } catch (error) {
        throw new Error(handleGeminiError(error, `la risposta alla domanda di approfondimento "${question}"`));
    }
};

export const getProactiveTutorIntro = async (item: SavedCollocation, cefrLevel: string, register: string): Promise<string> => {
    const prompt = `
Agisci come un tutor di lingua italiana amichevole e proattivo.
Hai notato che il tuo studente deve ripassare la seguente collocazione dal suo deck di studio:
- Voce: "${item.voce}"
- Spiegazione: "${item.spiegazione}"

Il tuo compito è iniziare una conversazione per esercitarsi su questa specifica collocazione.
- Inizia con un saluto amichevole.
- Menziona che hai visto che è ora di ripassare l'espressione.
- Poni una domanda aperta e creativa che incoraggi lo studente a usare la collocazione in modo naturale.
- Adatta il tuo linguaggio al livello QCER ${cefrLevel} e al registro linguistico ${register}.

Esempio di output: "Ciao! Ho notato che nel tuo deck di studio c'è l'espressione '**prendere una decisione**'. Che ne dici se la ripassiamo insieme? Raccontami di una decisione importante che hai dovuto prendere di recente."

Rispondi ESCLUSIVAMENTE con la tua frase di apertura. Non includere altre spiegazioni o metatesto.
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
        throw new Error(handleGeminiError(error, `la generazione dell'introduzione proattiva per "${item.voce}"`));
    }
};

export const analyzeUserTextForTutor = async (text: string, cefrLevel: string): Promise<string> => {
    const prompt = `Agisci come un esperto revisore di testi e tutor di italiano L2. L'utente ha fornito un testo da analizzare. Il tuo compito è correggerlo e fornire una spiegazione didattica.

TESTO DELL'UTENTE:
---
${text}
---

**Istruzioni:**
1.  **Correggi il testo:** Riscrivi il testo in un italiano naturale e corretto.
2.  **Evidenzia gli errori:** Analizza il testo originale e identifica gli errori (grammaticali, lessicali, di stile).
3.  **Spiega gli errori:** Per ogni errore, spiega brevemente e chiaramente perché è sbagliato.
4.  **Suggerisci miglioramenti:** Proponi l'uso di collocazioni o espressioni idiomatiche più appropriate per rendere il testo più fluente, come parlerebbe un madrelingua.
5.  **Adatta al livello:** Calibra la complessità delle tue spiegazioni per uno studente di livello ${cefrLevel}.

**Formato della risposta (Markdown obbligatorio):**
Usa la seguente struttura:

### Testo Corretto
*Qui inserisci la versione riscritta del testo.*

### Analisi e Suggerimenti
*Qui fornisci l'analisi punto per punto. Per ogni punto, usa una lista:*
- **Errore:** [cita la parte errata] -> **Correzione:** [cita la parte corretta]
  - **Spiegazione:** [spiegazione chiara e concisa dell'errore]
- **Suggerimento (Collocazione):** Per [contesto], invece di [frase originale], potresti usare "**[collocazione suggerita]**".
  - **Esempio:** [frase di esempio con la nuova collocazione]

Sii incoraggiante e didattico. La tua risposta deve contenere solo il risultato formattato.
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
        throw new Error(handleGeminiError(error, "l'analisi del testo"));
    }
};

export const getCollaborativeFeedback = async (text: string, options: { cefrLevel: string, register: string }): Promise<CreativeFeedbackResult> => {
  const schema = {
    type: Type.OBJECT,
    properties: {
      suggestions: {
        type: Type.ARRAY,
        description: "Una lista di suggerimenti concreti per migliorare il testo.",
        items: {
          type: Type.OBJECT,
          properties: {
            original_snippet: { 
              type: Type.STRING, 
              description: "La porzione di testo ESATTA dall'originale a cui si riferisce il suggerimento." 
            },
            suggested_change: { 
              type: Type.STRING,
              description: "La versione modificata o alternativa del frammento."
            },
            explanation: { 
              type: Type.STRING,
              description: "Una spiegazione chiara e didattica del perché la modifica è un miglioramento."
            },
            type: { 
              type: Type.STRING, 
              enum: ['collocazione', 'grammatica', 'stile', 'chiarezza'], 
              description: "Il tipo di suggerimento." 
            }
          },
          required: ["original_snippet", "suggested_change", "explanation", "type"]
        }
      }
    },
    required: ["suggestions"]
  };

  const prompt = `
Agisci come un partner di scrittura collaborativo e un tutor di italiano L2. Analizza il testo fornito dall'utente e, invece di correggerlo direttamente, offri una lista di suggerimenti specifici e azionabili per migliorarlo.

**Testo dell'utente:**
---
${text}
---

**Istruzioni:**
1.  **Identifica i punti di miglioramento:** Cerca errori grammaticali, uso di collocazioni innaturali, problemi di stile o frasi poco chiare.
2.  **Crea suggerimenti:** Per ogni punto identificato, crea un suggerimento. Ogni suggerimento deve includere:
    *   \`original_snippet\`: La porzione di testo ESATTA dall'originale. Deve corrispondere perfettamente.
    *   \`suggested_change\`: La tua proposta di miglioramento.
    *   \`explanation\`: Una spiegazione breve ma chiara del "perché" il tuo suggerimento è migliore (es. "Questa è una collocazione più comune", "L'accordo del participio passato non era corretto", "Questa versione è più concisa").
    *   \`type\`: Categorizza il suggerimento come 'collocazione', 'grammatica', 'stile', o 'chiarezza'.
3.  **Priorità:** Concentrati sui 3-5 suggerimenti più importanti e didatticamente utili. Non essere troppo pedante.
4.  **Adattamento:** Adatta la complessità dei suggerimenti al livello QCER ${options.cefrLevel} e al registro ${options.register}.

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
    return JSON.parse(jsonString) as CreativeFeedbackResult;
  } catch (error) {
    throw new Error(handleGeminiError(error, `l'analisi collaborativa del testo`));
  }
};


export const getCulturalContext = async (expression: string): Promise<string> => {
    const prompt = `
Agisci come un esperto di linguistica e cultura italiana, specializzato nella didattica per studenti L2.

Obiettivo: Fornisci un'analisi approfondita dell'espressione fornita.

Espressione: "${expression}"

**Istruzioni:**
1.  **Formato:** Rispondi in formato Markdown, usando \`###\` per le intestazioni.
2.  **Stile:** Usa un tono amichevole, didattico e accessibile.
3.  **Lingua:** Rispondi interamente in italiano.

**Sezioni Obbligatorie:**

### Origine e Significato Letterale
Spiega da dove deriva l'espressione, se l'origine è nota. Analizza il significato letterale delle parole (es. "Rompere il ghiaccio" significa letteralmente frantumare del ghiaccio).

### Connotazioni e Sfumature Culturali
Descrivi le connotazioni (positive, negative, ironiche?) e le sfumature di significato che un madrelingua percepisce. Quali immagini o idee evoca?

### Contesto d'Uso: Quando e Come
Fornisci esempi chiari di situazioni in cui un madrelingua userebbe questa espressione.
- **Quando usarla:** Descrivi 2-3 scenari tipici (es. al lavoro, tra amici, in una situazione imbarazzante).
- **Quando NON usarla:** Indica contesti in cui l'espressione sarebbe inappropriata o suonerebbe strana (es. in un contesto troppo formale, o se presa alla lettera).

### Esempi Pratici
Fornisci 2-3 frasi di esempio che mostrino l'espressione in azione in contesti diversi.

Mantieni l'analisi focalizzata e utile per uno studente che vuole andare oltre la semplice definizione da dizionario. La tua risposta deve contenere solo il risultato formattato.
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                temperature: 0.5,
            },
        });
        return response.text.trim();
    } catch (error) {
        throw new Error(handleGeminiError(error, `l'analisi culturale per "${expression}"`));
    }
};

export const suggestCollocationsFromConcept = async (concept: string, options: { cefrLevel: string; register: string; }): Promise<SuggestCollocationsResult> => {
    const schema = {
        type: Type.OBJECT,
        properties: {
            suggestions: {
                type: Type.ARRAY,
                description: "Una lista di 3-5 collocazioni suggerite che esprimono il concetto.",
                items: { type: Type.STRING }
            }
        },
        required: ["suggestions"]
    };

    const prompt = `
Agisci come un linguista computazionale italiano. Dato un concetto o un'intenzione dell'utente, suggerisci una lista di 3-5 collocazioni comuni e naturali in italiano che esprimono quel concetto.

Adatta la complessità e lo stile delle collocazioni suggerite a uno studente di livello ${options.cefrLevel} e a un registro ${options.register}.

Concetto fornito: "${concept}"

Rispondi ESCLUSIVAMENTE con un oggetto JSON che segua lo schema fornito. Non includere metatesto.`;

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
        return JSON.parse(jsonString) as SuggestCollocationsResult;
    } catch (error) {
        throw new Error(handleGeminiError(error, `la ricerca di collocazioni per il concetto "${concept}"`));
    }
};

export const generateThematicDeck = async (theme: string, options: { cefrLevel: string; register: string; }): Promise<ThematicDeckResult> => {
    const cardSchema = {
        type: Type.OBJECT,
        properties: {
            voce: { type: Type.STRING, description: "La collocazione, normalizzata al lemma." },
            spiegazione: { type: Type.STRING, description: "Una spiegazione chiara e concisa (stile Feynman)." },
            frase_originale: { type: Type.STRING, description: "Una frase d'esempio naturale." },
            tema: { type: Type.STRING, description: `Il tema richiesto: "${theme}".` }
        },
        required: ["voce", "spiegazione", "frase_originale", "tema"]
    };

    const schema = {
        type: Type.OBJECT,
        properties: {
            deck: {
                type: Type.ARRAY,
                description: "Una lista di 5-7 schede di collocazioni relative al tema.",
                items: cardSchema
            }
        },
        required: ["deck"]
    };
    
    const prompt = `
Agisci come un esperto insegnante di lingua italiana. Dato un tema, genera un mini-deck di 5-7 collocazioni essenziali e comuni relative a quel tema.

Tema: "${theme}"

Per ogni collocazione:
1.  **voce**: Fornisci la collocazione normalizzata.
2.  **spiegazione**: Scrivi una spiegazione chiara e semplice (stile Feynman), adatta al livello ${options.cefrLevel}.
3.  **frase_originale**: Crea una frase d'esempio realistica, adatta al registro ${options.register}.
4.  **tema**: Assegna il tema originale ("${theme}").

Rispondi ESCLUSIVAMENTE con un oggetto JSON che segua lo schema fornito.`;

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
        return JSON.parse(jsonString) as ThematicDeckResult;
    } catch (error) {
        throw new Error(handleGeminiError(error, `la generazione del deck per il tema "${theme}"`));
    }
};

export const generateLanguageMindMap = async (concept: string, options: { cefrLevel: string; register: string; }): Promise<MindMapResult> => {
    const schema = {
        type: Type.OBJECT,
        properties: {
            nodi: {
                type: Type.ARRAY,
                description: "Una lista di nodi per la mappa mentale.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        voce: { type: Type.STRING, description: "La parola o frase per il nodo." },
                        tipo: {
                            type: Type.STRING,
                            description: "Il tipo di nodo.",
                            enum: ["collocazione", "sinonimo", "concetto_correlato", "antonimo"]
                        }
                    },
                    required: ["voce", "tipo"]
                }
            }
        },
        required: ["nodi"]
    };

    const prompt = `
Agisci come un lessicografo e linguista computazionale. Dato un concetto centrale, crea una mappa mentale di termini correlati in italiano. La mappa deve includere:
- \`collocazioni\`: 3-5 collocazioni comuni che usano il concetto.
- \`sinonimi\`: 2-3 sinonimi stretti.
- \`concetti_correlati\`: 2-3 concetti semanticamente vicini che possono essere ulteriormente esplorati.
- \`antonimi\`: 1-2 antonimi, se applicabile.

Adatta la complessità dei suggerimenti a uno studente di livello ${options.cefrLevel} e a un registro ${options.register}.

Concetto Centrale: "${concept}"

Rispondi SOLO con il JSON strutturato secondo lo schema fornito. Non includere il concetto centrale stesso nei nodi.
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
        return JSON.parse(jsonString) as MindMapResult;
    } catch (error) {
        throw new Error(handleGeminiError(error, `la generazione della mappa mentale per "${concept}"`));
    }
};