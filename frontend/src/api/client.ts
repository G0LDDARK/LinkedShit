export type ResumeResponse = {
  resume: {
    summary: string;
    highlights: string[];
  };
};

export type CandidateAnalysis = {
  analysis: {
    linkedinUrl: string;
    candidateName?: string;
    bullshitScore: number;
    realSkills: string[];
    concreteProjects: string[];
    summary: string;
    usage: {
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
    };
  };
}

type ErrorResponse = {
  error?: string;
};

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

export class ApiError extends Error {
  readonly status: number;

  constructor(
    message: string,
    status: number,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function createShortResume(linkedinText: string): Promise<ResumeResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linkedinText }),
    });
  } catch {
    throw new ApiError('Le serveur est injoignable. Vérifie que le backend est lancé.', 0);
  }

  const data = (await response.json().catch(() => null)) as ResumeResponse | ErrorResponse | null;
  if (!response.ok) {
    throw new ApiError(
      data && 'error' in data && typeof data.error === 'string'
        ? data.error
        : 'Le backend a refusé la demande.',
      response.status,
    );
  }

  if (!data || !('resume' in data) || !data.resume || !Array.isArray(data.resume.highlights)) {
    throw new ApiError('Réponse inattendue du backend.', response.status);
  }

  return data as ResumeResponse;
}

export async function analyzeLinkedInProfile(linkedinUrl: string): Promise<CandidateAnalysis> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linkedinUrl }),
    });
  } catch {
    throw new ApiError('Le serveur est injoignable. Vérifie que le backend est lancé.', 0);
  }

  const data = (await response.json().catch(() => null)) as CandidateAnalysis | ErrorResponse | null;
  if (!response.ok) {
    throw new ApiError(
      data && 'error' in data && typeof data.error === 'string'
        ? data.error
        : 'Le backend a refusé la demande.',
      response.status,
    );
  }
  if (!data || !('analysis' in data) || !data.analysis) {
    throw new ApiError('Réponse inattendue du backend.', response.status);
  }
  return data as CandidateAnalysis;
}
