export interface Collocation {
  voce: string;
  spiegazione: string;
  frase_originale: string;
  parole_correlate?: string[];
  deepDiveContent?: string;
}

export interface SavedCollocation extends Collocation {
  id: string;
  tema: string;
  savedAt: number;
  srsLevel: number;
  nextReviewDate: number;
  cefrLevel?: string;
  register?: string;
  notes?: string;
  tags?: string[];
}

export interface ThemeGroup {
  tema: string;
  collocazioni: Collocation[];
}

export interface CollocationsResult {
  dizionario: ThemeGroup[];
}

export interface GeneratedCardData {
  voce: string;
  spiegazione: string;
  frase_originale: string;
  tema: string;
}

export interface ClozeTestResult {
  test_sentence: string;
  correct_answer: string;
  quiz_type: 'cloze' | 'multiple_choice';
  options?: string[];
}

export interface RelatedExample {
  titolo: string;
  contenuto: string;
}

export interface RelatedCollocation {
  voce: string;
  spiegazione: string;
}

export interface ThemeExplanationResult {
  explanation: string;
  related_collocations: RelatedCollocation[];
}

export interface StoryResult {
  story: string;
}


export interface QuizOptions {
  quizType: 'cloze' | 'multiple_choice';
  cefrLevel: string;
  register?: string;
}

// FIX: Define RolePlayResult and related types that were missing.
export interface RolePlayScenario {
  titolo: string;
  contesto: string;
  dialogo: string;
}

export interface RolePlayResult {
  scenari: RolePlayScenario[];
}

export interface ConversationTurn {
  id: string;
  speaker: 'user' | 'model' | 'system';
  text: string;
}

export interface DictionaryEntry {
  termine_italiano: string;
  traduzione_arabo: string;
  definizione_italiano: string;
  definizione_arabo: string;
  esempio_italiano: string;
  esempio_arabo: string;
  pronuncia_arabo: string;
  contesto_culturale: string;
}

export interface DictionaryResult {
  dizionario_approfondito: DictionaryEntry[];
}

export interface GroundingChunk {
  web: {
    uri: string;
    title: string;
  };
}

export interface ImprovedSentenceResult {
  improved_sentence: string;
  collocation_used: string;
  explanation: string;
}

export interface WeeklyGoal {
  type: 'learn_new';
  target: number;
  startDate: number;
  id: string;
}

export interface WeeklyStats {
    newWords: number;
    reviews: number;
    streak: number;
    topTheme: string | null;
    mostMasteredItem: SavedCollocation | null;
    needsReviewItem: SavedCollocation | null;
}

export interface PracticalExample {
  esempio: string;
  contesto?: string;
}

export interface CommonAlternative {
  alternativa: string;
  spiegazione: string;
}

export interface CardDeepDiveResult {
  esempi_pratici: PracticalExample[];
  registro_e_sfumature: string;
  alternative_comuni: CommonAlternative[];
}