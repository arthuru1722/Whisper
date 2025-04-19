const STATE_KEY = 'whisper_sources';
let currentPage = 1;
let allResults = [];
let searchTerm = '';

let sortBy = 'name'; // 'name', 'source', 'date'
let sortOrder = 'asc'; // 'asc' or 'desc'

function sortResults(results) {
    return results.sort((a, b) => {
        let valueA, valueB;
        
        switch(sortBy) {
            case 'date':
                valueA = new Date(a.uploadDate);
                valueB = new Date(b.uploadDate);
                break;
            case 'source':
                valueA = a.name.toLowerCase();
                valueB = b.name.toLowerCase();
                break;
            default: // name
                valueA = a.title.toLowerCase();
                valueB = b.title.toLowerCase();
        }

        return sortOrder === 'asc' 
            ? valueA > valueB ? 1 : -1
            : valueA < valueB ? 1 : -1;
    });
}

document.getElementById('sortBySelect').addEventListener('change', () => {
    sortBy = document.getElementById('sortBySelect').value;
    filterResults();
});

document.getElementById('orderSelect').addEventListener('change', () => {
    sortOrder = document.getElementById('orderSelect').value;
    filterResults();
});

// Source management
function loadSources() {
    return JSON.parse(localStorage.getItem(STATE_KEY) || '[]');
}

function saveSources(sources) {
    localStorage.setItem(STATE_KEY, JSON.stringify(sources));
}

function renderSources() {
    const list = document.getElementById('sourcesList');
    const sources = loadSources();
    
    list.innerHTML = sources.map((source, index) => `
        <li class="flex items-center gap-2 p-2 bg-gray-700 rounded border border-gray-600 hover:bg-gray-600 cursor-pointer transition-colors" 
            onclick="toggleSource(${index})">
            <input type="checkbox" ${source.enabled ? 'checked' : ''} 
                   class="pointer-events-none accent-indigo-500">
            <span class="flex-1 text-sm truncate text-gray-300">${source.url}</span>
            <button onclick="removeSource(${index})" class="text-red-400 hover:text-red-300">
                ✕
            </button>
        </li>
    `).join('');
}

function addSource(url) {
    const sources = loadSources();
    if (!sources.some(s => s.url === url)) {
        sources.push({ url, enabled: true });
        saveSources(sources);
        renderSources();
    }
}

function removeSource(index) {
    const sources = loadSources();
    sources.splice(index, 1);
    saveSources(sources);
    renderSources();
}

function toggleSource(index) {
    const sources = loadSources();
    sources[index].enabled = !sources[index].enabled;
    saveSources(sources);
    renderSources();
}

// Search and results
async function search() {
    const sources = loadSources().filter(s => s.enabled);
    const responses = await Promise.allSettled(
        sources.map(s => fetch(s.url).then(r => r.json()))
    );
    
    allResults = responses
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => r.value.downloads.map(d => ({
            ...d,
            name: r.value.name
        })));

    filterResults();
}

function filterResults() {
    if (!searchTerm.trim()) {
        showResults([]); // Forçar array vazio
        return;
    }
    const normalizedSearch = searchTerm.toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .replace(/iv/g, '4')
        .replace(/v$/g, '5')
        .replace(/iii/g, '3')
        .replace(/ii/g, '2')
        .replace(/i/g, '1');

    const filtered = allResults.filter(item => {
        const title = item.title.toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .replace(/iv/g, '4')
            .replace(/v$/g, '5')
            .replace(/iii/g, '3')
            .replace(/ii/g, '2')
            .replace(/i/g, '1');
        
        return title.includes(normalizedSearch);
    });

    const sorted = sortResults(filtered);
    showResults(sorted);
}

function showResults(results) {
    const paginationDiv = document.getElementById('pagination');

    // Esconder resultados e paginação se não houver dados
    if (!results.length) {
        resultsDiv.innerHTML = '';
        paginationDiv.classList.add('hidden');
        return;
    }
    const start = (currentPage - 1) * 9;
    const paginated = results.slice(start, start + 9);
    
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = paginated.map(item => `
        <div class="bg-gray-800 rounded-lg shadow-lg p-4 h-100 hover:bg-gray-750 transition-colors">
            <div class="space-y-2 flex flex-col justify-between h-full">
                <h3 class="text-sm font-semibold text-white tooltip" data-tooltip="${item.title}">
                    ${item.title.slice(0, 100)}${item.title.length > 100 ? '...' : ''}
                </h3>
                <p class="text-xs text-gray-400">${item.name}</p>
                <div class="text-xs space-y-1 text-gray-300">
                    <div>Size: ${item.fileSize}</div>
                    <div>Uploaded: ${new Date(item.uploadDate).toLocaleDateString()}</div>
                </div>
                <div class="flex gap-2 mt-2">
                    <button onclick="window.open('${item.uris[0]}')" 
                        class="flex-1 px-2 py-1 text-xs bg-indigo-800 text-indigo-100 rounded hover:bg-indigo-700">
                        Open
                    </button>
                    <button onclick="navigator.clipboard.writeText('${item.uris[0]}')" 
                        class="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600">
                        Copy
                    </button>
                    <button onclick="openWebtor('${item.uris[0]}')"  
                        data-tooltip="Pode não funcionar"
                        class="tooltip px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600">
                        Webtor
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    renderPagination(results.length);
}

function openWebtor(magnet) {
    const hash = magnet.match(/btih:([^&]+)/i)[1];
    window.open(`https://webtor.io/${hash.toLCase()}`);
}

// Pagination
function renderPagination(total) {
    const pages = Math.ceil(total / 9);
    const paginationDiv = document.getElementById('pagination');
    
    if (pages <= 1) {
        paginationDiv.classList.add('hidden');
        return;
    }
    
    paginationDiv.classList.remove('hidden');
    
    let html = '';
    const maxVisible = 3;
    let startPage, endPage;

    if (pages <= maxVisible) {
        startPage = 1;
        endPage = pages;
    } else {
        const maxVisibleBefore = Math.floor(maxVisible / 2);
        startPage = Math.max(currentPage - maxVisibleBefore, 1);
        endPage = Math.min(startPage + maxVisible - 1, pages);
        
        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(endPage - maxVisible + 1, 1);
        }
    }

    // Botão Anterior
    html += `
        <button onclick="setPage(${currentPage - 1})" 
            ${currentPage === 1 ? 'disabled' : ''}
            class="p-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 ${
                currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}">
            &lt;
        </button>`;

    // Primeira Página
    if (startPage > 1) {
        html += `
            <button onclick="setPage(1)" 
                class="w-8 h-8 rounded ${
                    1 === currentPage 
                    ? 'bg-indigo-500 text-white' 
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}">
                1
            </button>`;
        if (startPage > 2) {
            html += `<span class="px-2 text-gray-400">...</span>`;
        }
    }

    // Números das Páginas
    for (let i = startPage; i <= endPage; i++) {
        html += `
            <button onclick="setPage(${i})" 
                class="w-8 h-8 rounded ${
                    i === currentPage 
                    ? 'bg-indigo-500 text-white' 
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}">
                ${i}
            </button>`;
    }

    // Última Página
    if (endPage < pages) {
        if (endPage < pages - 1) {
            html += `<span class="px-2 text-gray-400">...</span>`;
        }
        html += `
            <button onclick="setPage(${pages})" 
                class="w-8 h-8 rounded ${
                    pages === currentPage 
                    ? 'bg-indigo-500 text-white' 
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}">
                ${pages}
            </button>`;
    }

    // Botão Próximo
    html += `
        <button onclick="setPage(${currentPage + 1})" 
            ${currentPage === pages ? 'disabled' : ''}
            class="p-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 ${
                currentPage === pages ? 'opacity-50 cursor-not-allowed' : ''}">
            &gt;
        </button>`;

    paginationDiv.innerHTML = html;
}

function setPage(page) {
    currentPage = page;
    filterResults();
}

// UI Interactions
document.getElementById('settingsBtn').addEventListener('click', () => {
    document.getElementById('settingsPanel').classList.toggle('hidden');
});

document.getElementById('addSourceBtn').addEventListener('click', () => {
    const input = document.getElementById('sourceInput');
    if (input.checkValidity()) {
        addSource(input.value);
        input.value = '';
    }
});

document.getElementById('selectAll').addEventListener('click', () => {
    const sources = loadSources();
    sources.forEach(s => s.enabled = true);
    saveSources(sources);
    renderSources();
});

document.getElementById('deselectAll').addEventListener('click', () => {
    const sources = loadSources();
    sources.forEach(s => s.enabled = false);
    saveSources(sources);
    renderSources();
});

document.getElementById('applySources').addEventListener('click', () => {
    search();
});

// Search input handling
const searchInput = document.getElementById('searchInput');
const debounce = (fn, delay) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
};

searchInput.addEventListener('input', debounce(e => {
    searchTerm = e.target.value;
    currentPage = 1;
    filterResults();
}, 300));

document.addEventListener('DOMContentLoaded', () => {
    renderSources();
    // Remover a chamada search() inicial
});

// Initial load

search();