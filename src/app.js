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

function App() {
    const [isDark, setIsDark] = useTheme();
    const [responses, setResponses] = useLocalStorage('survey:responses', []);
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [satisfaction, setSatisfaction] = useState('5');
    const [favorite, setFavorite] = useState('UI Design');
    const [notes, setNotes] = useState('');

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
        };
        setResponses([entry, ...responses]);
        showToast('¡Gracias por tu respuesta!');
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
                <div className="text-end">
                    <button
                        className="btn btn-outline-secondary me-2"
                        onClick={exportJSON}
                        title="Exportar respuestas"
                        disabled={responses.length === 0}
                    >
                        <i className="fas fa-download me-1"></i>
                        Exportar
                    </button>
                    <button
                        className="btn btn-danger"
                        onClick={clearAll}
                        disabled={responses.length === 0}
                    >
                        <i className="fas fa-trash-alt me-1"></i>
                        Limpiar
                    </button>
                </div>
            </header>

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
                                        {['UI Design', 'Performance', 'Accesibilidad', 'Contenido', 'Otra'].map(opt => (
                                            <button type="button" key={opt} className={`btn ${favorite === opt ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setFavorite(opt)}>{opt}</button>
                                        ))}
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
                                    <div key={r.id} className="list-group-item d-flex gap-3 align-items-start">
                                        <div className="flex-grow-1">
                                            <div className="fw-bold">{r.name} <small className="text-muted">• {r.age}</small></div>
                                            <div className="small text-muted">{new Date(r.createdAt).toLocaleString()}</div>
                                            <div className="mt-2">Satisfacción: <span className="fw-semibold">{r.satisfaction}/5</span> — <em>{r.favorite}</em></div>
                                            {r.notes && <div className="mt-2">{r.notes}</div>}
                                        </div>
                                        <div>
                                            <button className="btn btn-sm btn-outline-danger" onClick={() => remove(r.id)}>Borrar</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </aside>
            </main>

            <footer className="mt-5 text-center text-muted small">Proyecto demo — guarda localmente en <code>localStorage</code>. UI creada con Bootstrap y React.</footer>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
