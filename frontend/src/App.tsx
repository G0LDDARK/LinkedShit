import { useState } from 'react';
import {
  Search, Loader2, Sparkles, AlertCircle, ExternalLink,
  ShieldCheck, Target, ScanSearch, Filter, BadgeCheck,
} from 'lucide-react';
import type { CandidateAnalysis } from './types';

function ScoreRing({ value, size = 112 }: { value: number; size?: number }) {
  const v = Math.max(0, Math.min(100, value));
  const r = 28;
  const circ = 2 * Math.PI * r;
  const tone = v >= 70 ? 'text-emerald-500' : v >= 40 ? 'text-amber-500' : 'text-rose-500';

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Fiabilité du profil : ${v} pour cent`}
    >
      <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" strokeWidth="6" className="stroke-slate-900/10" />
        <circle
          cx="36" cy="36" r={r} fill="none" strokeWidth="6" strokeLinecap="round"
          className={`ring-progress stroke-current ${tone}`}
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - v / 100)}
          style={{ ['--ring-circ' as string]: circ }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold leading-none text-slate-900">{v}%</span>
        <span className="mt-1 text-[9px] font-bold uppercase tracking-widest text-slate-500">Fiabilité</span>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]" aria-hidden>
      <div className="glass-strong h-72 animate-pulse rounded-[28px]" />
      <div className="flex flex-col gap-6">
        <div className="glass-strong h-36 animate-pulse rounded-[28px]" />
        <div className="glass-strong h-44 animate-pulse rounded-[28px]" />
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: ScanSearch, title: 'Scan du profil', text: 'Posts, expériences et recommandations analysés.' },
  { icon: Filter, title: 'Filtre anti-bruit', text: 'Le jargon corporate et les buzzwords sont ignorés.' },
  { icon: BadgeCheck, title: 'Faits vérifiables', text: 'Seuls les skills et réalisations concrets remontent.' },
];

export default function App() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CandidateAnalysis | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.includes('linkedin.com/in/')) {
      setError('Veuillez entrer une URL de profil LinkedIn valide.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const mockData: CandidateAnalysis = {
        linkedinUrl: url,
        candidateName: 'Jean Dupont',
        bullshitScore: 85,
        realSkills: ['React', 'TypeScript', 'Architecture Microservices', 'Node.js'],
        concreteProjects: [
          'A migré la base de données de V1 à V2 sans downtime',
          'Gère une équipe de 3 développeurs',
          "Mise en place d'une pipeline CI/CD automatisée",
        ],
        summary:
          "Candidat technique solide. Les posts montrent une vraie maîtrise de TypeScript et de l'architecture logicielle, malgré quelques publications 'corporate' ignorées par le filtre.",
      };

      setResult(mockData);
    } catch {
      setError("Erreur lors de l'analyse du profil. Le serveur est injoignable.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden selection:bg-indigo-200">
      {/* Aurora */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="aurora-blob -left-32 -top-40 h-[520px] w-[520px] bg-indigo-300/50" />
        <div className="aurora-blob -right-40 top-1/4 h-[460px] w-[460px] bg-sky-200/70" style={{ animationDelay: '-6s' }} />
        <div className="aurora-blob -bottom-40 left-1/4 h-[520px] w-[520px] bg-fuchsia-200/60" style={{ animationDelay: '-12s' }} />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-10 px-8 py-14">
        {/* Hero */}
        <header className="space-y-4 text-center">
          <div className="glass inline-flex items-center gap-2 rounded-full px-5 py-2">
            <Sparkles className="h-4 w-4 text-indigo-500" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-600">
              Analyse de profils sans filtre corporate
            </span>
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight text-slate-900">
            Linked
            <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">Shit</span>
          </h1>
          <p className="mx-auto max-w-xl text-base font-medium text-slate-500">
            Filtrez le bruit. Extrayez les compétences.
          </p>
        </header>

        {/* Recherche */}
        <form
          onSubmit={handleAnalyze}
          className="group relative mx-auto w-full max-w-2xl"
          aria-busy={isLoading}
        >
          <label htmlFor="profile-url" className="sr-only">URL du profil LinkedIn</label>
          <Search
            className="pointer-events-none absolute left-5 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-600"
            aria-hidden
          />
          <input
            id="profile-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.linkedin.com/in/…"
            required
            className="glass w-full rounded-2xl py-4 pl-13 pr-40 text-base text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:bg-white/85 focus:ring-4 focus:ring-indigo-400/25"
            style={{ paddingLeft: '3.25rem' }}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary absolute inset-y-2 right-2 flex items-center gap-2 rounded-xl px-6 text-sm font-semibold text-white"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {isLoading ? 'Scan…' : 'Analyser'}
          </button>
        </form>

        {/* Erreur */}
        {error && (
          <div
            role="alert"
            className="fade-up glass mx-auto flex w-full max-w-2xl items-start gap-3 rounded-2xl border-rose-200/80 bg-rose-50/60 p-4 text-rose-600"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Etat vide */}
        {!result && !isLoading && !error && (
          <section className="fade-up grid gap-4 md:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="glass glass-hover rounded-[24px] p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/15 to-violet-500/15 text-indigo-600">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mb-1 text-sm font-bold text-slate-800">{title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{text}</p>
              </div>
            ))}
          </section>
        )}

        {/* Chargement */}
        {isLoading && <Skeleton />}

        {/* Résultats */}
        {result && (
          <section className="fade-up grid items-start gap-6 lg:grid-cols-[340px_1fr]">
            {/* Colonne gauche : identité + score + résumé */}
            <aside className="glass-strong flex flex-col items-center gap-5 rounded-[28px] p-6 text-center lg:sticky lg:top-8">
              <ScoreRing value={result.bullshitScore} />
              <div className="min-w-0 space-y-1">
                <h2 className="truncate text-2xl font-bold text-slate-900">
                  {result.candidateName || 'Anonyme'}
                </h2>
                <a
                  href={result.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-500 transition-colors hover:text-indigo-700"
                >
                  Ouvrir le profil <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              </div>

              <div className="w-full text-left">
                <div className="mb-2.5 flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Résumé IA</span>
                  <span className="h-px flex-1 bg-gradient-to-r from-slate-300/60 to-transparent" />
                </div>
                <p className="glass-subtle rounded-2xl border-l-2 !border-l-indigo-400 p-4 text-sm leading-relaxed text-slate-700">
                  {result.summary}
                </p>
              </div>
            </aside>

            {/* Colonne droite : skills + réalisations */}
            <div className="flex flex-col gap-6">
              <div className="glass-strong glass-hover rounded-[28px] p-6">
                <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-800">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" aria-hidden />
                  Hard Skills confirmés
                </h3>
                <ul className="flex flex-wrap gap-2.5">
                  {result.realSkills.map((skill) => (
                    <li
                      key={skill}
                      className="glass-subtle glass-hover rounded-full px-4 py-1.5 text-sm font-semibold text-slate-700 hover:!border-emerald-300 hover:bg-white/80"
                    >
                      {skill}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="glass-strong glass-hover rounded-[28px] p-6">
                <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-800">
                  <Target className="h-5 w-5 text-indigo-500" aria-hidden />
                  Réalisations concrètes
                </h3>
                <ul className="space-y-3">
                  {result.concreteProjects.map((project) => (
                    <li
                      key={project}
                      className="glass-subtle flex items-start gap-3 rounded-2xl p-4 text-sm text-slate-600"
                    >
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500" />
                      <span className="leading-snug">{project}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
