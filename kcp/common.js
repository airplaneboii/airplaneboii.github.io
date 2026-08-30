/** Iz seznama objektov naredi Map po polju "id" — O(1) iskanje namesto find(). */
function indexById(list) {
    const m = new Map();
    (list || []).forEach(item => m.set(item.id, item));
    return m;
}

/** Varno pobegne HTML posebne znake (preprečuje XSS pri vrivanju v innerHTML). */
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

/** Prikazno ime avtorja iz njegovega objekta (fullName ali sestavljeno ime/priimek). */
function authorDisplayName(author) {
    if (!author) return 'Neznan avtor';
    return author.fullName || `${author.firstName || ''} ${author.lastName || ''}`.trim() || 'Neznan avtor';
}

/** Preprost debounce — omeji pogostost klicev (npr. ob tipkanju v iskalno polje). */
function debounce(fn, wait) {
    let t;
    return function (...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
    };
}

/** Sproži prenos ene datoteke z vsebino (uporablja admin.html pri izvozu). */
function downloadTextFile(filename, content, mime = 'text/javascript;charset=utf-8;') {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/** Serializira array/objekt v obliko `window.X = [...]` z lepim odmikom, za izvoz .js datotek. */
function serializeAsJsModule(varName, data) {
    return `window.${varName} = ${JSON.stringify(data, null, 4)};\n`;
}

/** Skupna barva/oznaka za "Zasedbo" (voicing) glede na grobo skupino — uporabno za majhno vizualno kodiranje. */
function voicingGroup(voicing) {
    if (!voicing) return 'other';
    const v = voicing.toLowerCase();
    if (v.includes('orgelska') || v.includes('harmonij')) return 'instrumental';
    if (v.includes('enoglasno') || v.includes('recitativ')) return 'solo';
    if (v.includes('dvoglasni')) return 'duo';
    if (v.includes('moški')) return 'moski';
    if (v.includes('ženski')) return 'zenski';
    if (v.includes('mešani')) return 'mesani';
    return 'other';
}

/** Vrne razred jezika (za morebitno slogovno ločevanje latinskih/slovenskih naslovov). */
function isLatinLanguage(language) {
    return (language || '').toLowerCase().startsWith('latin');
}

/** Generična funkcija za "multiselect" spustni seznam s checkboxi in iskanjem. */
function createMultiSelect({ panelId, btnId, labelId, defaultLabel, options, selectedSet, onChange }) {
    const panel = document.getElementById(panelId);
    const btn = document.getElementById(btnId);
    const label = document.getElementById(labelId);

    function renderLabel() {
        if (selectedSet.size === 0) label.textContent = defaultLabel;
        else if (selectedSet.size === 1) label.textContent = options.find(o => String(o.value) === String([...selectedSet][0]))?.label || defaultLabel;
        else label.textContent = `Izbranih: ${selectedSet.size}`;
    }

    function renderPanel(filterText = '') {
        const ft = filterText.trim().toLowerCase();
        const visible = ft ? options.filter(o => o.label.toLowerCase().includes(ft)) : options;
        const searchHtml = options.length > 8
            ? `<input type="text" class="ms-search" placeholder="Filtriraj..." data-role="ms-filter">`
            : '';
        if (visible.length === 0) {
            panel.innerHTML = searchHtml + `<div class="ms-empty">Ni zadetkov.</div>`;
        } else {
            panel.innerHTML = searchHtml + visible.map(o => `
                <label class="ms-option">
                    <input type="checkbox" value="${escapeHtml(String(o.value))}" ${selectedSet.has(o.value) ? 'checked' : ''}>
                    <span>${escapeHtml(o.label)}</span>
                </label>
            `).join('');
        }
        const filterInput = panel.querySelector('[data-role="ms-filter"]');
        if (filterInput) {
            filterInput.value = filterText;
            filterInput.addEventListener('input', () => renderPanel(filterInput.value));
            filterInput.addEventListener('click', e => e.stopPropagation());
        }
        panel.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', () => {
                // vrednosti so lahko številske (id-ji) ali besedilne
                const raw = cb.value;
                const match = options.find(o => String(o.value) === raw);
                const val = match ? match.value : raw;
                if (cb.checked) selectedSet.add(val); else selectedSet.delete(val);
                renderLabel();
                onChange();
            });
        });
    }

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = panel.hasAttribute('hidden');
        document.querySelectorAll('.multiselect-panel').forEach(p => p.setAttribute('hidden', ''));
        if (isHidden) { renderPanel(); panel.removeAttribute('hidden'); }
    });

    document.addEventListener('click', (e) => {
        if (!panel.contains(e.target) && !btn.contains(e.target)) panel.setAttribute('hidden', '');
    });

    renderLabel();
    return { refresh: (newOptions) => { if (newOptions) options = newOptions; renderLabel(); renderPanel(); } };
}
