export interface RelatedWord {
  parola: string;
  esempio: string;
}

export interface Collocation {
  voce: string;
  spiegazione: string;
  frase_originale: string;
  parole_correlate?: RelatedWord[];
  deepDiveContent?: string;
  traduzione_arabo?: string;
  definizione_arabo?: string;
  esempio_arabo?: string;
  pronuncia_arabo?: string;
  contesto_culturale?: string;
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

export interface RolePlayScenario {
  titolo: string;
  contesto: string;
  dialogo: string;
}

export interface RolePlayResult {
  scenari: RolePlayScenario[];
}

export interface VoiceScenario {
  title: string;
  description: string;
  system_instruction: string;
}

export interface VoiceScenariosResult {
    scenari: VoiceScenario[];
}

export interface FollowUpQuestion {
  id: string;
  question: string;
  answer: string | null;
  chunks: GroundingChunk[];
  isLoading: boolean;
  error: string | null;
}

export interface ConversationTurn {
  id: string;
  speaker: 'user' | 'model' | 'system';
  text: string;
  format?: 'markdown';
  chunks?: GroundingChunk[];
  followUps?: FollowUpQuestion[];
}

export interface DictionaryEntry {
  termine_italiano: string;
  traduzione_arabo: string;
  definizione_italiano: string;
  definizione_arabo?: string;
  esempio_italiano: string;
  esempio_arabo: string;
  pronuncia_arabo: string;
  contesto_culturale: string;
}

export interface DictionaryResult {
  dizionario_tematico: {
    tema: string;
    voci: DictionaryEntry[];
  }[];
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

export interface ImprovedTextResult {
  improved_text: string;
  explanation_of_changes: string;
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

export interface AITutorResponse {
  response: string;
  suggestions: string[];
  chunks: GroundingChunk[];
}

export interface SuggestCollocationsResult {
  suggestions: string[];
}

export interface ThematicDeckResult {
  deck: GeneratedCardData[];
}

export interface MindMapNode {
  voce: string;
  tipo: 'collocazione' | 'sinonimo' | 'concetto_correlato' | 'antonimo';
}

export interface MindMapResult {
  nodi: MindMapNode[];
}
export interface DeepDiveOptions {
  cefrLevel?: string;
  register?: string;
  itemContext?: Collocation;
}

export interface CreativeSuggestion {
  id: string;
  original_snippet: string;
  suggested_change: string;
  explanation: string;
  type: 'collocazione' | 'grammatica' | 'stile' | 'chiarezza';
}

export interface CreativeFeedbackResult {
  suggestions: Omit<CreativeSuggestion, 'id'>[];
}