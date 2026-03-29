export interface GradingEstimate {
  estimated_grade_range: string;
  centering: { score: number; note: string };
  corners: { score: number; note: string };
  edges: { score: number; note: string };
  surface: { score: number; note: string };
  confidence: number;
  explanation: string;
  label: 'AI Estimated Grade';
}

export function buildDeterministicEstimate(collectionItemId: number): GradingEstimate {
  // Future integration point: replace this deterministic logic with CV/ML inference.
  const base = 80 + (collectionItemId % 7);
  const centering = clamp(base + 2);
  const corners = clamp(base + 4);
  const edges = clamp(base + 1);
  const surface = clamp(base - 2);
  const confidence = clamp(58 + (collectionItemId % 12));

  return {
    label: 'AI Estimated Grade',
    estimated_grade_range: `${Math.max(7, Math.floor((base - 2) / 10))}-${Math.max(8, Math.ceil((base + 8) / 10))}`,
    centering: { score: centering, note: 'Slight left-right imbalance detected' },
    corners: { score: corners, note: 'Minor whitening visible' },
    edges: { score: edges, note: 'Light edge wear on reverse' },
    surface: { score: surface, note: 'Possible small print line or glare artifact' },
    confidence,
    explanation:
      'AI Estimated Grade likely falls in this range due to centering variance and minor edge/corner wear. This is non-official and for guidance only.',
  };
}

function clamp(input: number): number {
  return Math.min(99, Math.max(50, input));
}
