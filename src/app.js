// Chart.js se carga por CDN, disponible como variable global Chart
const { useState, useEffect } = React;

// Tema oscuro/claro
function useTheme() {
    const [isDark, setIsDark] = useState(() => {
        const stored = localStorage.getItem('theme:dark');
        return stored ? JSON.parse(stored) : window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    useEffect(() => {
        localStorage.setItem('theme:dark', JSON.stringify(isDark));
        document.body.classList.toggle('dark', isDark);
    }, [isDark]);

    return [isDark, setIsDark];
}

// Toasts de Bootstrap
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'toast fade-in';
    toast.innerHTML = `
        <div class="toast-body d-flex align-items-center gap-2">
            <i class="fas fa-${type === 'success' ? 'check-circle text-success' : 'exclamation-circle text-danger'}"></i>
            ${message}
        </div>
    `;
    document.querySelector('.toast-container').appendChild(toast);
    const bsToast = new bootstrap.Toast(toast, { delay: 3000 });
    bsToast.show();
    toast.addEventListener('hidden.bs.toast', () => toast.remove());
}

// Hook para localStorage
function useLocalStorage(key, defaultValue) {
    const [state, setState] = useState(() => {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : defaultValue;
        } catch (e) {
            console.error('localStorage read error', e);
            return defaultValue;
        }
    });
    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(state));
        } catch (e) {
            console.error('localStorage write error', e);
        }
    }, [key, state]);
    return [state, setState];
}

// Validación form
function useFormValidation(name, age, notes) {
    const [errors, setErrors] = useState({});

    useEffect(() => {
        const newErrors = {};
        if (name.trim().length > 50) newErrors.name = 'Nombre demasiado largo (máx. 50 caracteres)';
        if (age && (isNaN(age) || age < 0 || age > 120)) newErrors.age = 'Edad inválida (0-120)';
        if (notes.length > 500) newErrors.notes = 'Comentario demasiado largo (máx. 500 caracteres)';
        setErrors(newErrors);
    }, [name, age, notes]);

    return errors;
}

// Componente de gráficos
function SurveyStats({ responses }) {
    const satisfactionChartRef = React.useRef(null);
    const favoriteChartRef = React.useRef(null);
    const reactionChartRef = React.useRef(null);
    const [charts, setCharts] = useState({});

    // Estadísticas calculadas
    const dashboardStats = React.useMemo(() => {
        if (!responses.length) return null;

        // Satisfacción promedio y edad
        const avgSatisfaction = responses.reduce((acc, r) => acc + r.satisfaction, 0) / responses.length;
        const ageResponses = responses.filter(r => r.age !== '—');
        const avgAge = ageResponses.length ?
            ageResponses.reduce((acc, r) => acc + Number(r.age), 0) / ageResponses.length : null;

        // Estadísticas de tiempo
        const today = new Date();
        const last7Days = responses.filter(r => {
            const date = new Date(r.createdAt);
            return (today - date) / (1000 * 60 * 60 * 24) <= 7;
        }).length;

        // Conteo de reacciones
        const reactionCounts = responses.reduce((acc, r) => {
            r.reactions.forEach(reaction => {
                acc[reaction] = (acc[reaction] || 0) + 1;
            });
            return acc;
        }, {});

        return {
            totalResponses: responses.length,
            avgSatisfaction: avgSatisfaction.toFixed(1),
            avgAge: avgAge ? avgAge.toFixed(1) : '—',
            last7Days,
            reactionCounts,
            latestResponse: new Date(responses[0]?.createdAt).toLocaleString()
        };
    }, [responses]);

    useEffect(() => {
        if (!responses.length) return;

        // Limpiar gráficos existentes
        Object.values(charts).forEach(chart => chart?.destroy());

        // Datos para los gráficos
        const satisfactionData = Array(5).fill(0);
        const favoriteData = {};
        const reactionData = {}; responses.forEach(r => {
            satisfactionData[r.satisfaction - 1]++;
            favoriteData[r.favorite] = (favoriteData[r.favorite] || 0) + 1;
            r.reactions?.forEach(reaction => {
                reactionData[reaction] = (reactionData[reaction] || 0) + 1;
            });
        });

        // Configuración común de Chart.js
        Chart.defaults.color = getComputedStyle(document.body).getPropertyValue('--text');
        Chart.defaults.borderColor = getComputedStyle(document.body).getPropertyValue('--card-border');

        // 1. Gráfico de Satisfacción
        const satisfactionChart = new Chart(satisfactionChartRef.current.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['1 ⭐', '2 ⭐', '3 ⭐', '4 ⭐', '5 ⭐'],
                datasets: [{
                    label: 'Respuestas',
                    data: satisfactionData,
                    backgroundColor: '#6f42c180',
                    borderColor: '#6f42c1',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Distribución de Satisfacción'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    }
                }
            }
        });

        // 2. Gráfico de Favoritos
        const favoriteChart = new Chart(favoriteChartRef.current.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: Object.keys(favoriteData),
                datasets: [{
                    data: Object.values(favoriteData),
                    backgroundColor: [
                        '#6f42c1', '#dc3545', '#fd7e14', '#20c997', '#0dcaf0'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Aspectos Favoritos'
                    },
                    legend: {
                        position: 'right'
                    }
                }
            }
        });

        // 3. Gráfico de Reacciones
        const reactionChart = new Chart(reactionChartRef.current.getContext('2d'), {
            type: 'polarArea',
            data: {
                labels: Object.keys(reactionData),
                datasets: [{
                    data: Object.values(reactionData),
                    backgroundColor: [
                        '#20c997', '#fd7e14', '#dc3545', '#6f42c1'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: false
                    },
                    legend: {
                        position: 'bottom'
                    },
                    datalabels: {
                        display: false
                    }
                },
                scales: {
                    r: {
                        ticks: {
                            display: false // Oculta los números en el radio
                        }
                    }
                }
            }
        });

        setCharts({
            satisfaction: satisfactionChart,
            favorite: favoriteChart,
            reaction: reactionChart
        });
        // Limpieza: destruir los gráficos al desmontar o actualizar
        return () => {
            Object.values(charts).forEach(chart => chart?.destroy());
        };
    }, [responses]);

    return (
        <div className="stats-dashboard">
            {/* Stats cards */}
            <div className="row g-3 mb-4">
                {/* Stats cards */}
                <div className="col-md-3">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-body">
                            <h6 className="text-muted mb-2">Total Respuestas</h6>
                            <h3 className="mb-0">{responses.length}</h3>
                            <small className="text-success">
                                <i className="fas fa-arrow-up me-1"></i>
                                Últimos 7 días: {dashboardStats?.last7Days ?? 0}
                            </small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-body">
                            <h6 className="text-muted mb-2">Satisfacción</h6>
                            <h3 className="mb-0">{dashboardStats?.avgSatisfaction ?? '—'}/5</h3>
                            <div className="stars small">
                                {dashboardStats ? ('★'.repeat(Math.round(dashboardStats.avgSatisfaction)) + '☆'.repeat(5 - Math.round(dashboardStats.avgSatisfaction))) : '—'}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-body">
                            <h6 className="text-muted mb-2">Edad Media</h6>
                            <h3 className="mb-0">{dashboardStats?.avgAge ?? '—'}</h3>
                            <small className="text-muted">años</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-body">
                            <h6 className="text-muted mb-2">Última Respuesta</h6>
                            <div className="small">{dashboardStats?.latestResponse ?? '—'}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts o mensaje vacío */}
            {responses.length > 0 ? (
                <div className="row g-3">
                    <div className="col-md-6">
                        <div className="card border-0 shadow-sm dashboard-graph-container">
                            <div className="card-body">
                                <canvas ref={satisfactionChartRef} height="350" width="350" className="dashboard-chart"></canvas>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="card border-0 shadow-sm dashboard-graph-container">
                            <div className="card-body">
                                <canvas ref={favoriteChartRef} height="350" width="350" className="dashboard-chart"></canvas>
                            </div>
                        </div>
                    </div>
                    <div className="col-12">
                        <div className="card border-0 shadow-sm dashboard-graph-container mb-4">
                            <div className="card-body d-flex flex-column align-items-center">
                                <canvas ref={reactionChartRef} height="250" className="dashboard-chart"></canvas>
                                <div className="mt-3" style={{ minHeight: '32px', textAlign: 'center', position: 'relative', zIndex: 2 }}>
                                    {/* Leyenda y número de reacciones */}
                                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#20c997', marginRight: '8px' }}>Reacciones</span>
                                    {Object.values(dashboardStats?.reactionCounts || {}).map((count, idx) => (
                                        <span key={idx} className="dashboard-reaction-count" style={{ margin: '0 8px', fontWeight: 500 }}>{count}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-5">
                    <i className="fas fa-chart-bar fa-3x text-muted mb-3"></i>
                    <h4 className="text-muted">No hay datos para mostrar</h4>
                    <p className="text-muted">Completa la encuesta para ver estadísticas y gráficos aquí.</p>
                </div>
            )}
        </div>
    );
}

function App() {
    const [isDark, setIsDark] = useTheme();
    const [responses, setResponses] = useLocalStorage('survey:responses', []);
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [satisfaction, setSatisfaction] = useState('5');
    const [favorite, setFavorite] = useState('UI Design');
    const [notes, setNotes] = useState('');
    const [showStats, setShowStats] = useState(false);

    // Validación
    const errors = useFormValidation(name, age, notes);
    const isValid = Object.keys(errors).length === 0;

    function submit(e) {
        e.preventDefault();
        if (!isValid) {
            showToast('Por favor corrige los errores antes de enviar', 'error');
            return;
        }
        const entry = {
            id: Date.now(),
            name: name.trim() || 'Anónimo',
            age: age || '—',
            satisfaction: Number(satisfaction),
            favorite,
            notes: notes.trim(),
            createdAt: new Date().toISOString(),
            reactions: []
        };
        setResponses([entry, ...responses]);
        showToast('¡Gracias por tu respuesta!');
        launchConfetti(); // Lanzar confeti al enviar
        // reset
        setName(''); setAge(''); setSatisfaction('5'); setFavorite('UI Design'); setNotes('');
    }

    function remove(id) {
        if (!confirm('¿Borrar esta respuesta?')) return;
        setResponses(responses.filter(r => r.id !== id));
        showToast('Respuesta eliminada');
    }

    function clearAll() {
        if (!confirm('Limpiar todas las respuestas? Esta acción no se puede deshacer.')) return;
        setResponses([]);
        showToast('Se eliminaron todas las respuestas');
    }

    function exportJSON() {
        const blob = new Blob([JSON.stringify(responses, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'survey-responses.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    // Lanzar confeti al enviar
    function launchConfetti() {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
    }

    return (
        <div className="container py-5">
            {/* Theme toggle */}
            <button
                onClick={() => setIsDark(!isDark)}
                className="theme-toggle"
                title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            >
                <i className={`fas fa-${isDark ? 'sun' : 'moon'}`}></i>
            </button>

            <header className="d-flex align-items-center justify-content-between mb-4">
                <div>
                    <h1 className="display-6 mb-0">
                        Encuesta: Experiencia Digital 2025
                        <i className="fas fa-sparkles ms-2 text-warning"></i>
                    </h1>
                    <p className="text-muted small mb-0">
                        Dinos cómo fue tu experiencia — diseño, velocidad y usabilidad.
                    </p>
                </div>
                <div className="d-flex gap-2">
                    {responses.length > 0 && (
                        <div className="btn-group">
                            <button
                                className="btn btn-outline-primary"
                                onClick={() => setShowStats(!showStats)}
                                title={showStats ? "Ocultar estadísticas" : "Ver estadísticas"}
                            >
                                <i className="fas fa-chart-bar me-1"></i>
                                {showStats ? 'Ocultar' : 'Ver'} Dashboard
                            </button>
                            <button
                                className="btn btn-outline-secondary"
                                onClick={exportJSON}
                                title="Exportar respuestas"
                            >
                                <i className="fas fa-download me-1"></i>
                                Exportar
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={clearAll}
                            >
                                <i className="fas fa-trash-alt me-1"></i>
                                Limpiar
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* Mostrar solo el dashboard o el formulario según showStats */}
            {showStats && responses.length > 0 ? (
                <SurveyStats responses={responses} />
            ) : (
                <>
                    <main className="row gy-4">
                        <section className="col-lg-6">
                            <div className="card shadow-lg border-0">
                                <div className="card-body p-4">
                                    <h2 className="h5">Completa la encuesta</h2>
                                    <form onSubmit={submit} className="mt-3">
                                        <div className="mb-3">
                                            <label className="form-label">
                                                <i className="fas fa-user me-1"></i>
                                                Nombre
                                            </label>
                                            <input
                                                className={`form-control form-control-lg ${errors.name ? 'is-invalid' : ''}`}
                                                value={name}
                                                onChange={e => setName(e.target.value)}
                                                placeholder="Tu nombre o alias"
                                                aria-label="Nombre"
                                            />
                                            {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                                        </div>
                                        <div className="mb-3 d-flex gap-2">
                                            <div className="flex-fill">
                                                <label className="form-label">
                                                    <i className="fas fa-calendar me-1"></i>
                                                    Edad
                                                </label>
                                                <input
                                                    className={`form-control ${errors.age ? 'is-invalid' : ''}`}
                                                    value={age}
                                                    onChange={e => setAge(e.target.value)}
                                                    type="number"
                                                    min="0"
                                                    placeholder="Opcional"
                                                    aria-label="Edad"
                                                />
                                                {errors.age && <div className="invalid-feedback">{errors.age}</div>}
                                            </div>
                                            <div style={{ width: 120 }}>
                                                <label className="form-label">Satisfacción</label>
                                                <select className="form-select" value={satisfaction} onChange={e => setSatisfaction(e.target.value)}>
                                                    <option value="1">1 — Muy mala</option>
                                                    <option value="2">2 — Mala</option>
                                                    <option value="3">3 — Neutral</option>
                                                    <option value="4">4 — Buena</option>
                                                    <option value="5">5 — Excelente</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="mb-3">
                                            <label className="form-label">Qué te gustó más</label>
                                            <div className="d-flex gap-2 flex-wrap">
                                                {['UI Design', 'Performance', 'Accesibilidad', 'Contenido'].map(opt => (
                                                    <button type="button" key={opt} className={`btn ${favorite === opt ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setFavorite(opt)}>{opt}</button>
                                                ))}
                                                <div style={{ display: 'inline-block', position: 'relative', verticalAlign: 'middle' }}>
                                                    <button
                                                        type="button"
                                                        className={`btn ${favorite.startsWith('Otra:') ? 'btn-primary' : 'btn-outline-primary'}`}
                                                        onClick={() => setFavorite('Otra:')}
                                                    >
                                                        Otra
                                                    </button>
                                                    {favorite.startsWith('Otra:') && (
                                                        <input
                                                            type="text"
                                                            className="form-control ms-2"
                                                            style={{ display: 'inline-block', width: 140, verticalAlign: 'middle' }}
                                                            value={favorite.replace('Otra:', '')}
                                                            onChange={e => setFavorite('Otra:' + e.target.value)}
                                                            placeholder="Especifica..."
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mb-3">
                                            <label className="form-label">
                                                <i className="fas fa-comment me-1"></i>
                                                Comentarios
                                            </label>
                                            <textarea
                                                className={`form-control ${errors.notes ? 'is-invalid' : ''}`}
                                                value={notes}
                                                onChange={e => setNotes(e.target.value)}
                                                rows="4"
                                                placeholder="¿Algo que quieras compartir?"
                                                aria-label="Comentarios"
                                            ></textarea>
                                            {errors.notes && <div className="invalid-feedback">{errors.notes}</div>}
                                            <small className="form-text text-muted mt-1">
                                                {notes.length}/500 caracteres
                                            </small>
                                        </div>

                                        <div className="d-flex justify-content-end">
                                            <button
                                                className="btn btn-lg btn-success"
                                                type="submit"
                                                disabled={!isValid}
                                            >
                                                <i className="fas fa-paper-plane me-1"></i>
                                                Enviar respuesta
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </section>

                        <aside className="col-lg-6">
                            <div className="card border-0 shadow-sm h-100">
                                <div className="card-body p-3">
                                    <h3 className="h6">Respuestas recientes <span className="badge bg-secondary ms-2">{responses.length}</span></h3>
                                    <div className="list-group list-group-flush mt-3">
                                        {responses.length === 0 && <div className="text-muted small p-3">Aún no hay respuestas. Sé el primero.</div>}
                                        {responses.map(r => (
                                            <div key={r.id} className="list-group-item d-flex gap-3 align-items-start fade-in">
                                                <div className="flex-grow-1">
                                                    <div className="d-flex align-items-center gap-2">
                                                        <div className="fw-bold recent-response-name">{r.name}</div>
                                                        <small className="text-muted">• {r.age}</small>
                                                        <div className="stars">
                                                            {'★'.repeat(r.satisfaction)}
                                                            {'☆'.repeat(5 - r.satisfaction)}
                                                        </div>
                                                    </div>
                                                    <div className="small text-muted d-flex align-items-center gap-2">
                                                        <i className="fas fa-clock"></i>
                                                        {new Date(r.createdAt).toLocaleString()}
                                                    </div>
                                                    <div className="mt-2 d-flex align-items-center gap-2">
                                                        <span
                                                            className="badge bg-primary-subtle text-primary"
                                                            title={r.favorite}
                                                        >
                                                            {r.favorite}
                                                        </span>
                                                    </div>
                                                    {r.notes && (
                                                        <div
                                                            className="mt-2 p-2 bg-light rounded recent-response-comment"
                                                            style={{ maxWidth: '350px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}
                                                            title={r.notes}
                                                        >
                                                            <i className="fas fa-quote-left text-muted me-2"></i>
                                                            {r.notes}
                                                        </div>
                                                    )}

                                                    {/* Emoji reactions */}
                                                    <div className="mt-3 d-flex gap-2">
                                                        {['👍', '❤️', '👏', '🎉'].map(emoji => (
                                                            <button
                                                                key={emoji}
                                                                className="btn btn-sm btn-light border-0 rounded-circle p-1"
                                                                onClick={() => {
                                                                    const newResponses = responses.map(resp =>
                                                                        resp.id === r.id
                                                                            ? {
                                                                                ...resp,
                                                                                reactions: resp.reactions.includes(emoji)
                                                                                    ? resp.reactions.filter(e => e !== emoji)
                                                                                    : [...resp.reactions, emoji]
                                                                            }
                                                                            : resp
                                                                    );
                                                                    setResponses(newResponses);
                                                                }}
                                                            >
                                                                <span style={{ fontSize: '1.1rem' }}>{emoji}</span>
                                                                {r.reactions?.includes(emoji) && (
                                                                    <span className="badge bg-primary position-absolute top-0 start-100 translate-middle rounded-pill" style={{ fontSize: '.65rem' }}>
                                                                        1
                                                                    </span>
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="d-flex flex-column gap-2">
                                                    <button
                                                        className="btn btn-sm btn-outline-danger"
                                                        onClick={() => remove(r.id)}
                                                    >
                                                        <i className="fas fa-trash-alt"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </aside>
                    </main>

                    <footer className="mt-5 text-center text-muted small">Proyecto demo — guarda localmente en <code>localStorage</code>. UI creada con Bootstrap y React.</footer>
                </>
            )}
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
