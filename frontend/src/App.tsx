import { useState } from 'react';
import {
  AlertCircle, ArrowUpRight, BadgeCheck, Check, Clock3, Filter, History,
  Loader2, Search, ScanSearch, ShieldCheck, Sparkles, Target,
} from 'lucide-react';
import { analyzeLinkedInProfile, ApiError, type CandidateAnalysis } from './api/client';
import './App.css';

function Skeleton() {
  return (
    <div className="results-grid" aria-hidden>
      <div className="skeleton skeleton-tall" />
      <div className="skeleton-stack">
        <div className="skeleton skeleton-short" />
        <div className="skeleton skeleton-medium" />
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: ScanSearch, number: '01', title: 'On regarde vraiment', text: 'Posts, expériences et recommandations passent au tamis.' },
  { icon: Filter, number: '02', title: 'On jette le vernis', text: 'Le jargon corporate et les buzzwords repartent d’où ils viennent.' },
  { icon: BadgeCheck, number: '03', title: 'On garde le solide', text: 'Compétences, preuves et réalisations concrètes. Rien de plus.' },
];

const HISTORY = [
  { name: 'Julien Berson', role: 'Étudiant en informatique', date: 'Aujourd’hui · 00:42' },
  { name: 'Sarah Chen', role: 'Product designer · Paris', date: 'Hier · 18:16' },
  { name: 'Marc-Antoine Roy', role: 'Software engineer · Lyon', date: '09 oct. · 14:03' },
  { name: 'Nina Morel', role: 'Growth & opérations', date: '07 oct. · 09:27' },
];

export default function App() {
  const [activePage, setActivePage] = useState<'home' | 'history'>('home');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CandidateAnalysis['analysis'] | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkedinUrl.trim()) {
      setError('Colle une URL de profil LinkedIn pour commencer.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await analyzeLinkedInProfile(linkedinUrl);
      setResult(response.analysis);
    } catch (error) {
      setError(error instanceof ApiError ? error.message : "Erreur lors de l'analyse du profil.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="paper-noise" aria-hidden />
      {activePage === 'home' && (
        <>
          <div className="fly fly-one" aria-hidden>
            <span className="fly-wing fly-wing-left" />
            <span className="fly-body" />
            <span className="fly-wing fly-wing-right" />
          </div>
          <div className="fly fly-two" aria-hidden>
            <span className="fly-wing fly-wing-left" />
            <span className="fly-body" />
            <span className="fly-wing fly-wing-right" />
          </div>
          <div className="dotted-path dotted-path-one" aria-hidden />
          <div className="dotted-path dotted-path-two" aria-hidden />
        </>
      )}

      <main className="page">
        <nav className="topbar">
          <a className="wordmark" href="/" aria-label="LinkedSheet, accueil">
            Linked<span>Sheet</span>
          </a>
          <div className="nav-note"><span className="status-dot" /> version anti-bullshit / 01</div>
          <div className="account-actions">
            <button className="history-button" type="button" onClick={() => setActivePage(activePage === 'history' ? 'home' : 'history')}>
              <History size={15} /> Historique
            </button>
            <button className="user-chip" type="button" onClick={() => setActivePage('home')} aria-label="Revenir à l’accueil">
              <span className="avatar">CM</span>
              <span className="user-name">Camille Martin</span>
            </button>
          </div>
        </nav>

        {activePage === 'history' ? (
          <section className="history-page result-animation">
            <div className="history-heading">
              <div>
                <p className="eyebrow"><Clock3 size={15} /> Votre espace</p>
                <h1>Les profils<br /><em>déjà nettoyés</em><span className="lime-dot">.</span></h1>
                <p className="hero-subtitle">Retrouvez vos dernières analyses et reprenez votre veille là où vous l’avez laissée.</p>
              </div>
              <button className="back-button" type="button" onClick={() => setActivePage('home')}><ArrowUpRight size={16} /> Nouvelle analyse</button>
            </div>
            <div className="history-list">
              {HISTORY.map((entry) => (
                <button className="history-entry" type="button" key={entry.name} onClick={() => setActivePage('home')}>
                  <span className="history-avatar">{entry.name.split(' ').map((part) => part[0]).join('')}</span>
                  <span className="history-person"><strong>{entry.name}</strong><small>{entry.role}</small></span>
                  <span className="history-date">{entry.date}</span>
                  <ArrowUpRight size={17} />
                </button>
              ))}
            </div>
          </section>
        ) : (
          <>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow"><Sparkles size={15} /> L’outil des recruteurs qui ont autre chose à faire</p>
            <h1>Lisez le<br /><em>candidat</em>,<br />pas le bruit<span className="lime-dot">.</span></h1>
            <p className="hero-subtitle">
              Un profil LinkedIn sans la couche de vernis. On extrait ce qui compte,
              on oublie le reste.
            </p>
          </div>
          <div className="hero-aside">
            <div className="aside-line" />
            <p>« Enfin un endroit où<br />le mot synergie<br />ne sert à rien. »</p>
            <span>— un recruteur soulagé</span>
          </div>
        </section>

        <form onSubmit={handleAnalyze} className="scan-form" aria-busy={isLoading}>
          <div className="scan-label"><span>01</span> Lancer le décapage</div>
          <div className="input-row">
            <Search className="input-icon" size={21} aria-hidden />
            <label htmlFor="profile-url" className="sr-only">URL LinkedIn</label>
            <input
              id="profile-url"
              type="url"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://www.linkedin.com/in/… ou /posts/…"
              required
            />
            <button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 size={17} className="spin" /> : <ArrowUpRight size={17} />}
              {isLoading ? 'On gratte…' : 'Analyser'}
            </button>
          </div>
          <div className="form-foot"><span>Historique sauvegardé automatiquement.</span><span>Un résultat en environ une minute.</span></div>
        </form>

        {error && (
          <div role="alert" className="error-message">
            <AlertCircle size={19} /> <p>{error}</p>
          </div>
        )}

        {!result && !isLoading && !error && (
          <section className="feature-grid" id="how-it-works">
            {FEATURES.map(({ icon: Icon, number, title, text }) => (
              <article className="feature-card" key={title}>
                <div className="feature-top"><span>{number}</span><Icon size={20} /></div>
                <h2>{title}</h2>
                <p>{text}</p>
              </article>
            ))}
          </section>
        )}

        {isLoading && <Skeleton />}

        {result && (
          <section className="results-grid result-animation">
            <aside className="profile-card">
              <span className="card-kicker">Fiche nettoyée / 01</span>
              <div className="result-mark">✓</div>
              <h2>{result.candidateName || 'Le bruit est parti.'}</h2>
              <div className="summary-block">
                <span className="card-kicker">Verdict express</span>
                <p>{result.summary}</p>
              </div>
            </aside>
            <div className="result-stack">
              <div className="result-card">
                <div className="result-heading"><ShieldCheck size={20} /><div><span className="card-kicker">Ce qui reste</span><h3>Compétences confirmées</h3></div></div>
                <ul className="skill-list">{result.realSkills.map((skill) => <li key={skill}><Check size={14} />{skill}</li>)}</ul>
              </div>
              <div className="result-card">
                <div className="result-heading"><Target size={20} /><div><span className="card-kicker">Pas du blabla</span><h3>Réalisations concrètes</h3></div></div>
                <ul className="project-list">{result.concreteProjects.map((project) => <li key={project}><span />{project}</li>)}</ul>
              </div>
              <div className="usage-note">
                Ollama : {result.usage.totalTokens ?? '—'} tokens au total
                {result.usage.promptTokens !== undefined && result.usage.completionTokens !== undefined
                  ? ` (${result.usage.promptTokens} entrée · ${result.usage.completionTokens} sortie)`
                  : ''}
              </div>
            </div>
          </section>
        )}
          </>
        )}

        <footer><span>LinkedSheet © 2026</span><span>Lisez le candidat, pas le bruit.</span><span>Fait avec moins de jargon.</span></footer>
      </main>
    </div>
  );
}
