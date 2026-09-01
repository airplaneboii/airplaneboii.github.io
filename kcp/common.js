/* =========================================================================
   common.js — souporabljene pomožne funkcije za iskalnik in urejevalnik.
   Brez odvisnosti, čisti vanilla JS (deluje kot statična stran na GH Pages).
   ========================================================================= */

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

/** Generičen kombiniran vnos "tipkaj in izberi" (combobox z več izbirami in oznakami/chips).
 *  Uporabnik začne tipkati, pod poljem se prikažejo ujemajoče se možnosti; klik/Enter doda
 *  izbiro kot odstranljiv "chip" znotraj okvirja, tipkanje se nato počisti za naslednji vnos. */
function createComboFilter({ boxId, inputId, suggestionsId, options, selectedSet, onChange, placeholder, maxSuggestions = 40 }) {
    const box = document.getElementById(boxId);
    const input = document.getElementById(inputId);
    const sugg = document.getElementById(suggestionsId);
    if (placeholder) input.placeholder = placeholder;

    function labelFor(value) {
        const opt = options.find(o => String(o.value) === String(value));
        return opt ? opt.label : String(value);
    }

    function renderChips() {
        box.querySelectorAll('.combo-chip').forEach(c => c.remove());
        [...selectedSet].forEach(val => {
            const chip = document.createElement('span');
            chip.className = 'combo-chip';
            chip.innerHTML = `<span>${escapeHtml(labelFor(val))}</span><button type="button" aria-label="Odstrani ${escapeHtml(labelFor(val))}">&times;</button>`;
            chip.querySelector('button').addEventListener('click', (e) => {
                e.stopPropagation();
                selectedSet.delete(val);
                renderChips();
                onChange();
            });
            box.insertBefore(chip, input);
        });
    }

    function closeSuggestions() {
        sugg.hidden = true;
        sugg.innerHTML = '';
    }

    function renderSuggestions(filterText) {
        const ft = filterText.trim().toLowerCase();
        const available = options.filter(o => !selectedSet.has(o.value));
        const matches = ft ? available.filter(o => o.label.toLowerCase().includes(ft)) : available;
        const shown = matches.slice(0, maxSuggestions);

        if (shown.length === 0) {
            sugg.innerHTML = `<div class="combo-empty">Ni zadetkov.</div>`;
        } else {
            sugg.innerHTML = shown.map((o, i) => `
                <div class="combo-suggestion-item${i === 0 ? ' is-active' : ''}" data-val="${escapeHtml(String(o.value))}">${escapeHtml(o.label)}</div>
            `).join('') + (matches.length > shown.length
                ? `<div class="combo-empty">… in še ${matches.length - shown.length} — nadaljuj s tipkanjem za zožitev</div>` : '');
        }
        sugg.hidden = false;

        sugg.querySelectorAll('.combo-suggestion-item').forEach(item => {
            // mousedown (ne click), da se sproži PRED "blur" dogodkom na polju
            item.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const raw = item.dataset.val;
                const opt = options.find(o => String(o.value) === raw);
                selectedSet.add(opt ? opt.value : raw);
                input.value = '';
                renderChips();
                renderSuggestions('');
                onChange();
            });
        });
    }

    input.addEventListener('input', () => renderSuggestions(input.value));
    input.addEventListener('focus', () => renderSuggestions(input.value));
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const active = sugg.querySelector('.combo-suggestion-item');
            if (active) active.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        } else if (e.key === 'Backspace' && input.value === '' && selectedSet.size) {
            const last = [...selectedSet][selectedSet.size - 1];
            selectedSet.delete(last);
            renderChips();
            onChange();
        } else if (e.key === 'Escape') {
            closeSuggestions();
            input.blur();
        }
    });

    document.addEventListener('click', (e) => {
        if (!box.contains(e.target) && !sugg.contains(e.target)) closeSuggestions();
    });

    renderChips();

    return {
        refreshOptions(newOptions) { options = newOptions; },
        rerenderChips() { renderChips(); },
        clearInput() { input.value = ''; closeSuggestions(); },
    };
}
