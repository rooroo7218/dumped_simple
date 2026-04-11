import React, { useState } from 'react';
import { RocketLaunchIcon } from '@heroicons/react/24/outline';

interface PlaybookHubProps {
    themeClasses: any;
}

export const PlaybookHub: React.FC<PlaybookHubProps> = ({ themeClasses }) => {
    const [activeSection, setActiveSection] = useState('overview');

    const sections = [
        { id: 'overview', label: 'Overview', num: '00', icon: '🚀' },
        { id: 'vcs', label: '01 Version Control', num: '01', icon: '🌿' },
        { id: 'frontend', label: '02 Frontend', num: '02', icon: '🎨' },
        { id: 'backend', label: '03 Backend', num: '03', icon: '⚙️' },
        { id: 'database', label: '04 Database', num: '04', icon: '🗄️' },
        { id: 'llm', label: '05 Local LLM', num: '05', icon: '🧠' },
        { id: 'crossplatform', label: '06 Cross-Platform', num: '06', icon: '📱' },
        { id: 'deploy', label: '07 Deploy', num: '07', icon: '🚀' },
    ];

    return (
        <div className="playbook-container font-['Syne']">
            {/* Embedded styles to match the requested design exactly */}
            <style>{`
                .playbook-container {
                    --pb-bg: #0a0a0f;
                    --pb-surface: #111118;
                    --pb-border: #1e1e2e;
                    --pb-accent1: #00ffb3;
                    --pb-accent2: #ff6b35;
                    --pb-accent3: #7c6af7;
                    --pb-accent4: #ffde59;
                    --pb-text: #e8e8f0;
                    --pb-muted: #6b6b80;
                    --pb-card: #14141f;
                }

                .pb-header {
                    padding: 40px 0 20px;
                    border-bottom: 1px solid var(--pb-border);
                    position: relative;
                }

                .pb-tag-line {
                    font-family: 'Space Mono', monospace;
                    font-size: 11px;
                    letter-spacing: 3px;
                    color: var(--pb-accent1);
                    text-transform: uppercase;
                    margin-bottom: 16px;
                }

                .pb-h1 {
                    font-size: clamp(1.8rem, 5vw, 3rem);
                    font-weight: 800;
                    line-height: 1.05;
                    margin-bottom: 20px;
                }

                .pb-arrow { color: var(--pb-accent2); display: inline-block; }
                .pb-highlight { color: var(--pb-accent1); }

                .pb-subtitle {
                    color: var(--pb-muted);
                    font-size: 0.95rem;
                    line-height: 1.6;
                    max-width: 580px;
                }

                .pb-nav-pills {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    padding: 24px 0 0;
                }

                .pb-pill {
                    font-family: 'Space Mono', monospace;
                    font-size: 10px;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                    padding: 6px 14px;
                    border-radius: 100px;
                    border: 1px solid var(--pb-border);
                    background: var(--pb-surface);
                    color: var(--pb-muted);
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .pb-pill:hover, .pb-pill.active {
                    border-color: var(--pb-accent1);
                    color: var(--pb-accent1);
                    background: rgba(0,255,179,0.06);
                }

                .pb-section {
                    padding: 40px 0;
                    border-bottom: 1px solid var(--pb-border);
                    animation: pbFadeUp 0.4s forwards;
                }

                @keyframes pbFadeUp {
                    from { opacity: 0; transform: translateY(16px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .pb-section-header {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    margin-bottom: 24px;
                }

                .pb-section-num {
                    font-family: 'Space Mono', monospace;
                    font-size: 11px;
                    color: var(--pb-accent1);
                    background: rgba(0,255,179,0.1);
                    border: 1px solid rgba(0,255,179,0.3);
                    padding: 4px 10px;
                    border-radius: 4px;
                }

                .pb-h2 { font-size: 1.5rem; font-weight: 800; }
                .pb-h3 { font-size: 1rem; font-weight: 600; margin-bottom: 10px; color: var(--pb-text); }

                .pb-cards {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 16px;
                    margin-top: 24px;
                }

                .pb-card {
                    background: var(--pb-card);
                    border: 1px solid var(--pb-border);
                    border-radius: 10px;
                    padding: 20px;
                    transition: all 0.2s;
                    position: relative;
                }

                .pb-card:hover {
                    border-color: var(--pb-accent1);
                    transform: translateY(-2px);
                }

                .pb-card-icon { font-size: 1.4rem; margin-bottom: 10px; display: block; }
                .pb-card-title { font-size: 0.85rem; font-weight: 600; margin-bottom: 6px; }
                .pb-card-desc { font-size: 0.75rem; color: var(--pb-muted); line-height: 1.55; }

                .pb-badge {
                    display: inline-block;
                    font-family: 'Space Mono', monospace;
                    font-size: 8px;
                    padding: 2px 7px;
                    border-radius: 3px;
                    margin-top: 8px;
                    text-transform: uppercase;
                }
                .pb-badge-free { background: rgba(0,255,179,0.12); color: var(--pb-accent1); }
                .pb-badge-cheap { background: rgba(255,222,89,0.12); color: var(--pb-accent4); }
                .pb-badge-powerful { background: rgba(124,106,247,0.12); color: var(--pb-accent3); }

                .pb-code-block {
                    background: #080810;
                    border: 1px solid var(--pb-border);
                    border-radius: 8px;
                    padding: 18px 20px;
                    margin: 16px 0;
                    font-family: 'Space Mono', monospace;
                    font-size: 0.7rem;
                    line-height: 1.7;
                    color: #b8b8d0;
                    overflow-x: auto;
                }

                .pb-code-block .pb-comment { color: #4a4a6a; }
                .pb-code-block .pb-cmd { color: var(--pb-accent1); }
                .pb-code-block .pb-string { color: var(--pb-accent4); }
                .pb-code-block .pb-keyword { color: var(--pb-accent2); }

                .pb-compare-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 0.78rem;
                    margin-top: 15px;
                }

                .pb-compare-table th {
                    font-family: 'Space Mono', monospace;
                    font-size: 9px;
                    text-transform: uppercase;
                    color: var(--pb-muted);
                    text-align: left;
                    padding: 10px;
                    border-bottom: 1px solid var(--pb-border);
                }

                .pb-compare-table td {
                    padding: 10px;
                    border-bottom: 1px solid rgba(30,30,46,0.3);
                }

                .pb-compare-table td:first-child { font-weight: 600; color: var(--pb-accent1); }

                .pb-callout {
                    border-left: 3px solid var(--pb-accent3);
                    background: rgba(124,106,247,0.07);
                    border-radius: 0 8px 8px 0;
                    padding: 14px 18px;
                    margin: 16px 0;
                    font-size: 0.8rem;
                    color: var(--pb-text);
                }

                .pb-overview-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
                    gap: 12px;
                    margin-top: 24px;
                }

                .pb-overview-item {
                    background: var(--pb-card);
                    border: 1px solid var(--pb-border);
                    border-radius: 10px;
                    padding: 16px 12px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .pb-overview-item:hover { border-color: var(--pb-accent1); transform: translateY(-3px); }
                .pb-overview-item span { font-size: 1.5rem; margin-bottom: 8px; display: block; }
                .pb-overview-item div { font-size: 0.65rem; font-weight: 600; color: var(--pb-muted); text-transform: uppercase; }

                .pb-checklist { list-style: none; margin-top: 16px; }
                .pb-checklist li { display: flex; align-items: flex-start; gap: 10px; padding: 6px 0; font-size: 0.8rem; }
                .pb-checklist li::before { content: '→'; color: var(--pb-accent1); font-family: 'Space Mono', monospace; }

                .pb-flow { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 20px 0; }
                .pb-flow-step { background: var(--pb-card); border: 1px solid var(--pb-border); border-radius: 8px; padding: 10px 14px; font-size: 0.75rem; font-weight: 600; }
                .pb-flow-step span { display: block; font-family: 'Space Mono'; font-size: 8px; color: var(--pb-muted); }
                .pb-flow-arrow { color: var(--pb-accent2); font-size: 0.9rem; }
            `}</style>

            <header className="pb-header">
                <div className="pb-tag-line">// vibe coding → production-grade</div>
                <h1 className="pb-h1">Vibe <span className="pb-arrow">→</span> <span className="pb-highlight">Robust</span><br />Full Stack Playbook</h1>
                <p className="pb-subtitle">Level up from prototypes to version-controlled, deployed applications with the best tools at every price point.</p>

                <nav className="pb-nav-pills">
                    {sections.map(s => (
                        <button
                            key={s.id}
                            className={`pb-pill ${activeSection === s.id ? 'active' : ''}`}
                            onClick={() => setActiveSection(s.id)}
                        >
                            {s.label}
                        </button>
                    ))}
                </nav>
            </header>

            {activeSection === 'overview' && (
                <section className="pb-section">
                    <div className="pb-section-header">
                        <div className="pb-section-num">00</div>
                        <h2 className="pb-h2">The Full Picture</h2>
                    </div>
                    <p style={{ color: 'var(--pb-muted)', fontSize: '0.85rem', lineHeight: '1.7', maxWidth: '640px' }}>
                        You've got a working prototype — that's the hardest part. Now it's about adding structure without killing the fun. This guide gives you the minimum viable discipline for each layer of the stack.
                    </p>

                    <div className="pb-overview-grid">
                        {sections.slice(1).map(s => (
                            <div key={s.id} className="pb-overview-item" onClick={() => setActiveSection(s.id)}>
                                <span>{s.icon}</span>
                                <div>{s.label.split(' ').slice(1).join(' ')}</div>
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: '36px' }}>
                        <h3 className="pb-h3" style={{ color: 'var(--pb-muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Quick Start Stack</h3>
                        <table className="pb-compare-table">
                            <thead><tr><th>Layer</th><th>Tool</th><th>Cost</th><th>Why</th></tr></thead>
                            <tbody>
                                <tr><td>VCS</td><td>Git + GitHub</td><td>Free</td><td>Universal standard</td></tr>
                                <tr><td>Frontend</td><td>React + Vite</td><td>Free</td><td>Fastest DX</td></tr>
                                <tr><td>Backend</td><td>FastAPI / Hono</td><td>Free</td><td>Lightweight & Typed</td></tr>
                                <tr><td>Database</td><td>Supabase</td><td>Free Tier</td><td>Scale painlessly</td></tr>
                                <tr><td>Local LLM</td><td>Ollama</td><td>Free</td><td>Easiest inference</td></tr>
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {activeSection === 'vcs' && (
                <section className="pb-section">
                    <div className="pb-section-header">
                        <div className="pb-section-num">01</div>
                        <h2 className="pb-h2">Version Control Workflow</h2>
                    </div>
                    <div className="pb-callout">
                        <strong>Rule:</strong> Commit early, commit often. A commit is a save point — the worst that can happen is you go back to one.
                    </div>
                    <h3 className="pb-h3">Minimal Git Workflow</h3>
                    <div className="pb-flow">
                        <div className="pb-flow-step">main<span>stable</span></div>
                        <div className="pb-flow-arrow">→</div>
                        <div className="pb-flow-step">dev<span>integration</span></div>
                        <div className="pb-flow-arrow">→</div>
                        <div className="pb-flow-step">feature/xxx<span>active work</span></div>
                    </div>
                    <div className="pb-code-block">
                        <div className="pb-comment"># Initial setup</div>
                        <div><span className="pb-cmd">git init</span></div>
                        <div><span className="pb-cmd">git add .</span></div>
                        <div><span className="pb-cmd">git commit -m "feat: initial prototype"</span></div>
                    </div>
                </section>
            )}

            {activeSection === 'frontend' && (
                <section className="pb-section">
                    <div className="pb-section-header">
                        <div className="pb-section-num">02</div>
                        <h2 className="pb-h2">Frontend Tools</h2>
                    </div>
                    <h3 className="pb-h3">Recommended: React + Vite + Tailwind</h3>
                    <div className="pb-code-block">
                        <div className="pb-comment"># Scaffold in 30s</div>
                        <div><span className="pb-cmd">npm create vite@latest my-app -- --template react</span></div>
                        <div><span className="pb-cmd">npm install -D tailwindcss postcss autoprefixer</span></div>
                        <div><span className="pb-cmd">npx tailwindcss init -p</span></div>
                    </div>
                    <div className="pb-cards">
                        <div className="pb-card">
                            <span className="pb-card-icon">⚡</span>
                            <div className="pb-card-title">Vite</div>
                            <div className="pb-card-desc">Instant HMR. Production optimized builds.</div>
                            <span className="pb-badge pb-badge-free">Free</span>
                        </div>
                        <div className="pb-card" style={{ borderColor: 'var(--pb-accent3)' }}>
                            <span className="pb-card-icon">🌊</span>
                            <div className="pb-card-title">Tailwind</div>
                            <div className="pb-card-desc">Utility-first CSS. No more fighting stylesheets.</div>
                            <span className="pb-badge pb-badge-free">Free</span>
                        </div>
                    </div>
                </section>
            )}

            {activeSection === 'backend' && (
                <section className="pb-section">
                    <div className="pb-section-header">
                        <div className="pb-section-num">03</div>
                        <h2 className="pb-h2">Backend Tools</h2>
                    </div>
                    <table className="pb-compare-table">
                        <thead><tr><th>Framework</th><th>Lang</th><th>Best For</th></tr></thead>
                        <tbody>
                            <tr><td>FastAPI</td><td>Python</td><td>AI apps & Data</td></tr>
                            <tr><td>Hono</td><td>TS</td><td>Edge/Ultra-light</td></tr>
                            <tr><td>Express</td><td>Node</td><td>Full Ecosystem</td></tr>
                        </tbody>
                    </table>
                    <div className="pb-code-block" style={{ marginTop: '20px' }}>
                        <div className="pb-comment"># FastAPI Quick Start</div>
                        <div><span className="pb-keyword">from</span> fastapi <span className="pb-keyword">import</span> FastAPI</div>
                        <div>app = FastAPI()</div>
                    </div>
                </section>
            )}

            {activeSection === 'database' && (
                <section className="pb-section">
                    <div className="pb-section-header">
                        <div className="pb-section-num">04</div>
                        <h2 className="pb-h2">Choosing Your Database</h2>
                    </div>
                    <p style={{ color: 'var(--pb-muted)', fontSize: '0.8rem', marginBottom: '15px' }}>Don't over-engineer. Start with SQLite for local, graduate to Cloud when needed.</p>
                    <table className="pb-compare-table">
                        <thead><tr><th>DB</th><th>Best When</th><th>Cost</th></tr></thead>
                        <tbody>
                            <tr><td>SQLite</td><td>Solo dev / local</td><td>Free</td></tr>
                            <tr><td>Supabase</td><td>Realtime + Auth</td><td>Free Tier</td></tr>
                            <tr><td>Turso</td><td>Edge SQLite</td><td>Free Tier</td></tr>
                        </tbody>
                    </table>
                </section>
            )}

            {activeSection === 'llm' && (
                <section className="pb-section">
                    <div className="pb-section-header">
                        <div className="pb-section-num">05</div>
                        <h2 className="pb-h2">Local LLM + Fine-Tuning</h2>
                    </div>
                    <div className="pb-code-block">
                        <div className="pb-comment"># Install Ollama</div>
                        <div><span className="pb-cmd">ollama pull llama3.2</span></div>
                        <div><span className="pb-cmd">ollama run llama3.2</span></div>
                    </div>
                    <div className="pb-callout">
                        <strong>Fine-tuning:</strong> Use <strong>Unsloth</strong> or <strong>MLX-LM</strong> to tune models on your own app data.
                    </div>
                </section>
            )}

            {activeSection === 'crossplatform' && (
                <section className="pb-section">
                    <div className="pb-section-header">
                        <div className="pb-section-num">06</div>
                        <h2 className="pb-h2">Desktop + Mobile</h2>
                    </div>
                    <div className="pb-cards">
                        <div className="pb-card" style={{ borderColor: 'var(--pb-accent1)' }}>
                            <span className="pb-card-icon">🦀</span>
                            <div className="pb-card-title">Tauri</div>
                            <div className="pb-card-desc">Desktop apps with Rust shell (&lt; 10MB).</div>
                            <span className="pb-badge pb-badge-free">Free</span>
                        </div>
                        <div className="pb-card" style={{ borderColor: 'var(--pb-accent3)' }}>
                            <span className="pb-card-icon">⚡</span>
                            <div className="pb-card-title">Capacitor</div>
                            <div className="pb-card-desc">Turn web app into Native iOS/Android.</div>
                            <span className="pb-badge pb-badge-free">Free</span>
                        </div>
                    </div>
                </section>
            )}

            {activeSection === 'deploy' && (
                <section className="pb-section">
                    <div className="pb-section-header">
                        <div className="pb-section-num">07</div>
                        <h2 className="pb-h2">Deployment</h2>
                    </div>
                    <div className="pb-cards">
                        <div className="pb-card">
                            <span className="pb-card-icon">▲</span>
                            <div className="pb-card-title">Vercel</div>
                            <div className="pb-card-desc">Push to deploy Frontend. Zero config.</div>
                            <span className="pb-badge pb-badge-free">Free</span>
                        </div>
                        <div className="pb-card" style={{ borderColor: 'var(--pb-accent2)' }}>
                            <span className="pb-card-icon">🚀</span>
                            <div className="pb-card-title">Fly.io</div>
                            <div className="pb-card-desc">Deploy Docker backends globally.</div>
                            <span className="pb-badge badge-free">Free Tier</span>
                        </div>
                    </div>
                </section>
            )}

            <footer style={{ padding: '30px 0', textAlign: 'center', fontSize: '10px', color: 'var(--pb-muted)', opacity: 0.6 }}>
                VIBE → ROBUST PLAYBOOK · 2026
            </footer>
        </div>
    );
};
