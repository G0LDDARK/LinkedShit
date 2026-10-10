import { useState } from 'react';
import { Search, Loader2, Sparkles, AlertCircle, ExternalLink, ShieldCheck, Target } from 'lucide-react';
import type { CandidateAnalysis } from './types';

export default function App() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CandidateAnalysis | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.includes('linkedin.com/in/')) {
      setError("Veuillez entrer une URL de profil LinkedIn valide.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // MOCK POUR LE FRONT (Simulation de l'attente scraping + IA)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockData: CandidateAnalysis = {
        linkedinUrl: url,
        candidateName: "Jean Dupont",
        bullshitScore: 85,
        realSkills: ["React", "TypeScript", "Architecture Microservices", "Node.js"],
        concreteProjects: [
          "A migré la base de données de V1 à V2 sans downtime",
          "Gère une équipe de 3 développeurs",
          "Mise en place d'une pipeline CI/CD automatisée"
        ],
        summary: "Candidat technique solide. Les posts montrent une vraie maîtrise de TypeScript et de l'architecture logicielle, malgré quelques publications 'corporate' ignorées par le filtre."
      };
      
      setResult(mockData);
    } catch (err) {
      setError("Erreur lors de l'analyse du profil. Le serveur est peut-être injoignable.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Fond global avec de la profondeur
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-200 relative overflow-hidden flex flex-col justify-center">
      
      {/* Formes colorées en arrière-plan pour révéler le glassmorphism */}
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-indigo-300/40 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-teal-300/40 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] left-[60%] w-[30rem] h-[30rem] bg-blue-300/30 rounded-full blur-[100px] pointer-events-none" />

      {/* Conteneur principal (au-dessus du fond) */}
      <div className="max-w-4xl mx-auto px-6 py-12 lg:py-20 relative z-10 w-full">
        
        {/* Header en mode "Bulle de verre" */}
        <header className="mb-12 text-center space-y-5">
          <div className="inline-flex items-center justify-center gap-2 bg-white/40 backdrop-blur-md px-6 py-3 rounded-full border border-white/60 shadow-sm">
            <Sparkles className="text-indigo-500 w-5 h-5" />
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">
              Linked<span className="text-indigo-600">Shit</span>
            </h1>
          </div>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto font-medium">
            Filtrez le bruit. Extrayez les vraies compétences.
          </p>
        </header>

        {/* Search Bar Glassmorphe */}
        <form onSubmit={handleAnalyze} className="mb-16 relative max-w-2xl mx-auto group">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none z-10">
            <Search className="h-5 w-5 text-slate-500 group-focus-within:text-indigo-600 transition-colors" />
          </div>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.linkedin.com/in/candidat/"
            className="w-full pl-14 pr-36 py-4 bg-white/40 backdrop-blur-lg border border-white/60 rounded-2xl text-slate-800 placeholder-slate-500 focus:outline-none focus:bg-white/60 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all shadow-[0_8px_32px_rgba(0,0,0,0.04)]"
            required
          />
          <button
            type="submit"
            disabled={isLoading}
            className="absolute inset-y-2 right-2 bg-indigo-600 text-white px-6 rounded-xl font-semibold hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/30 transition-all flex items-center gap-2 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none disabled:cursor-not-allowed z-10"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {isLoading ? 'Analyse...' : 'Scanner'}
          </button>
        </form>

        {/* Error State */}
        {error && (
          <div className="max-w-2xl mx-auto bg-red-100/50 backdrop-blur-md border border-red-200/60 text-red-700 p-4 rounded-2xl mb-8 flex items-start gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* Results Dashboard - La carte en verre principale */}
        {result && (
          <div className="bg-white/50 backdrop-blur-xl border border-white/80 rounded-[2rem] p-8 md:p-10 shadow-[0_8px_32px_rgba(31,38,135,0.05)] animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            {/* Header Resultat */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-8 mb-8 gap-6 border-b border-slate-200/50">
              <div>
                <h2 className="text-3xl font-black text-slate-900 mb-2">{result.candidateName || "Candidat Anonyme"}</h2>
                <a 
                  href={result.linkedinUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 hover:underline text-sm font-semibold transition-colors"
                >
                  Voir le profil original <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              
              {/* Score Box Glass */}
              <div className="bg-white/60 backdrop-blur-md border border-white/60 px-6 py-4 rounded-2xl text-center min-w-[140px] shadow-sm">
                <div className="text-4xl font-black text-indigo-600 mb-1">{result.bullshitScore}%</div>
                <div className="text-[11px] text-slate-500 uppercase tracking-widest font-bold">Bullshit Filtré</div>
              </div>
            </div>

            {/* Résumé IA */}
            <div className="mb-12">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                Résumé Factuel 
                <span className="bg-indigo-100/80 text-indigo-700 text-[10px] px-2.5 py-1 rounded-md border border-indigo-200/50">Généré par IA</span>
              </h3>
              <div className="bg-white/40 backdrop-blur-md border border-white/60 rounded-2xl p-6 text-slate-700 leading-relaxed text-lg border-l-4 border-l-indigo-500 shadow-sm">
                "{result.summary}"
              </div>
            </div>

            {/* Grille Compétences / Projets */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Compétences Box Glass */}
              <div className="bg-white/30 backdrop-blur-md rounded-3xl p-7 border border-white/60 shadow-sm hover:bg-white/40 transition-colors">
                <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  Compétences Détectées
                </h3>
                <div className="flex flex-wrap gap-2.5">
                  {result.realSkills.map((skill, idx) => (
                    <span 
                      key={idx} 
                      className="px-4 py-2 bg-white/70 backdrop-blur-sm text-slate-700 border border-white/80 rounded-xl text-sm font-semibold shadow-sm hover:border-emerald-300 hover:text-emerald-700 transition-colors"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Projets Box Glass */}
              <div className="bg-white/30 backdrop-blur-md rounded-3xl p-7 border border-white/60 shadow-sm hover:bg-white/40 transition-colors">
                <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <Target className="w-5 h-5 text-indigo-500" />
                  Faits Concrets & Projets
                </h3>
                <ul className="space-y-4">
                  {result.concreteProjects.map((project, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-slate-700 font-medium">
                      <span className="w-2 h-2 bg-indigo-500 rounded-full mt-2.5 shrink-0 shadow-sm"></span>
                      <span className="leading-relaxed">{project}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
