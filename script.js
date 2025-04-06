let allDownloads = [];
let hoverTimer = null;
let currentHoverElement = null;
let fuse;
let currentResults = [];
let loadedResults = [];
const limit = 12; // Limite de resultados
let currentPage = 1;
let totalPages = 1;
let searchTerm = "";
let data = loadDataFromLocalStorage() || { sources: [] }; // Carregar dados do localStorage

// Carregar dados do localStorage
function loadDataFromLocalStorage() {
    const storedData = localStorage.getItem('data');
    return storedData ? JSON.parse(storedData) : { sources: [] };
}

// Salvar dados no localStorage
function saveDataToLocalStorage(data) {
    localStorage.setItem('data', JSON.stringify(data));
}

// Atualizar a lista de URLs
function updateUrlList() {
    const urlListDiv = document.getElementById("urlList");
    urlListDiv.innerHTML = data.sources.flatMap((source, sourceIndex) => 
        source.urls.map((url, urlIndex) => `
            <div class="url-item">
                ${source.jsonName} 
                <input type="checkbox" id="source-${sourceIndex}-${urlIndex}" 
                    ${url.active ? 'checked' : ''} 
                    onclick="toggleSource(${sourceIndex}, ${urlIndex})">
                <label for="source-${sourceIndex}-${urlIndex}">Usar esta fonte</label>
                <span class="remove-link" onclick="removeUrl(${sourceIndex}, ${urlIndex})">X</span>
            </div>
        `)
    ).join('');
}

// Salvar nome do JSON e links no localStorage
function saveData() {
    const jsonNameInput = document.getElementById("jsonName").value;
    const urlInput = document.getElementById("urlInput").value;
    const inputUrls = urlInput.split(',').map(url => url.trim()).filter(url => url);

    if (jsonNameInput && inputUrls.length > 0) {
        // Adiciona nova fonte ao array existente
        data.sources.push({
            jsonName: jsonNameInput,
            urls: inputUrls.map(url => ({ url, active: true }))
        });

        saveDataToLocalStorage(data);
        updateUrlList();
        fetchDownloadsFromUrls(data.sources.flatMap(s => s.urls));
    }
}

// Remover link do localStorage e da lista
function removeUrl(sourceIndex, urlIndex) {
    data.sources[sourceIndex].urls.splice(urlIndex, 1);
    // Remove a fonte se não houver URLs restantes
    if (data.sources[sourceIndex].urls.length === 0) {
        data.sources.splice(sourceIndex, 1);
    }
    saveDataToLocalStorage(data);
    updateUrlList();
    fetchDownloadsFromUrls(getActiveUrls());
}

// Alternar a fonte
function toggleSource(sourceIndex, urlIndex) {
    data.sources[sourceIndex].urls[urlIndex].active = 
        !data.sources[sourceIndex].urls[urlIndex].active;
    saveDataToLocalStorage(data);
    fetchDownloadsFromUrls(getActiveUrls());
}



// Fetch dados dos links no localStorage
async function fetchDownloadsFromUrls(urls) {
    allDownloads = [];
    for (let url of urls) {
        if (!url.active) continue; // Ignorar fontes desativadas
        try {
            const response = await fetch(url.url);
            const data = await response.json();
            data.downloads.forEach(download => {
                const { gameName, brackets, parentheses } = extractDetails(download.title);
                allDownloads.push({
                    sourceName: data.name,
                    gameName,
                    brackets,
                    parentheses,
                    fileSize: download.fileSize,
                    uploadDate: new Date(download.uploadDate).toLocaleDateString(),
                    magnet: download.uris[0]
                });
            });
        } catch (error) {
            console.error(`Erro ao carregar JSON do link ${url.url}:`, error);
        }
    }

    fuse = new Fuse(allDownloads, {
        keys: ["gameName", "brackets", "parentheses"],
        includeScore: true,
        threshold: 0.2
    });

    filterGames(); // Refiltra os jogos quando novos dados são carregados
}

// Extrair detalhes do título
function extractDetails(title) {
    const brackets = [...title.matchAll(/\[([^\]]+)\]/g)].map(m => m[1]);
    const parentheses = [...title.matchAll(/\(([^\)]+)\)/g)].map(m => m[1]);

    let gameName = title.replace(/\[.*?\]|\(.*?\)/g, "").trim();
    return { gameName, brackets, parentheses };
}

// Dividir por separadores de "+" e "/"
function splitBySeparator(items) {
    return items.flatMap(item => item.split(/[+\/]/).map(i => i.trim()));
}

// Exibir os downloads
function displayDownloads(downloads) {
    const downloadsDiv = document.getElementById("downloads");
    downloadsDiv.innerHTML = downloads.map(download => `
        <div class="download"> 
            <div class="top">
                
                
                <div class="details">${download.sourceName}</div>
            </div>

            <div class="title">${download.gameName}</div> 

            ${download.brackets.concat(download.parentheses).length > 0 ? `
                <div class="combined-details"
                    data-fulltext="${download.brackets.concat(download.parentheses).join(', ')}"
                    onmouseenter="startHoverTimer(event, this)"
                    onmouseleave="clearHoverTimer()">
                    ${(() => {
                        const combined = download.brackets.concat(download.parentheses).join(", ");
                        return combined.length > 80 
                            ? combined.substring(0, 80) + '...' 
                            : combined;
                    })()}
                </div>
            ` : ''}

            <div class="mb">
                    <hr>
                    <div class="mbContainer">
                        <div class="mbdetails">${download.uploadDate}</div>
                        <div class="mbdetails">${download.fileSize}</div>
                    </div>

                    

            </div>
            <div class="bottom">
                <button class="openTorrentButton" onclick="openMagnetLink('${download.magnet}')">
                    <i class="fas fa-download"></i> instalar
                </button>
                <button class="copyButton" onclick="copyToClipboard('${download.magnet}')">
                    <i class="fas fa-copy"></i> Copiar
                </button>
                <button class="m2t" onclick="m2t(')${download.magnet}')">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i> M2T
                </button>
            </div>
        </div>
    `).join("");

    // Adicione a paginação abaixo dos resultados
    document.getElementById("pagination").style.display = 
        currentResults.length > limit ? 'flex' : 'none';
}

const tooltip = document.createElement('div');
tooltip.id = 'fulltext-tooltip';
document.body.appendChild(tooltip);

// Funções de controle
function startHoverTimer(event, element) {
    clearHoverTimer();
    
    hoverTimer = setTimeout(() => {
        showFullText(event, element);
    }, 1000);
}

function clearHoverTimer() {
    clearTimeout(hoverTimer);
    tooltip.style.visibility = 'hidden';
}

function showFullText(event, element) {
    const fullText = element.dataset.fulltext;
    const rect = element.getBoundingClientRect();
    
    tooltip.textContent = fullText;
    tooltip.style.position = 'fixed';
    tooltip.style.left = `${event.clientX + 15}px`;
    tooltip.style.top = `${event.clientY + 15}px`;
    tooltip.style.visibility = 'visible';
    
    // Atualizar posição enquanto o mouse se move
    element.addEventListener('mousemove', (e) => {
        tooltip.style.left = `${e.clientX + 15}px`;
        tooltip.style.top = `${e.clientY + 15}px`;
    });
}



// Filtrar os jogos com base na pesquisa
function filterGames() {
    searchTerm = document.getElementById("search").value.trim();
    currentPage = 1; // Resetar para primeira página
    
    if (!searchTerm || !fuse) {
        document.getElementById("downloads").innerHTML = "";
        currentResults = [];
        updatePagination();
        return;
    }

    try {
        const fuseResults = fuse.search(searchTerm);
        currentResults = fuseResults.map(r => r.item);
        totalPages = Math.ceil(currentResults.length / limit);
        updatePagination();
        displayCurrentPage();
    } catch (error) {
        console.error("Erro na pesquisa:", error);
        document.getElementById("downloads").innerHTML = "<p>Erro ao carregar resultados</p>";
    }
}

function displayCurrentPage() {
    const start = (currentPage - 1) * limit;
    const end = start + limit;
    loadedResults = currentResults.slice(start, end);
    displayDownloads(loadedResults);
}

function updatePagination() {
    const pageNumbers = document.getElementById("pageNumbers");
    pageNumbers.innerHTML = '';
    const pages = new Set();

    // Sempre adiciona primeira página
    pages.add(1);
    
    // Adiciona páginas próximas (current -1, current, current +1)
    for (let i = currentPage - 1; i <= currentPage + 1; i++) {
        if (i > 1 && i < totalPages) pages.add(i);
    }
    
    // Sempre adiciona última página
    pages.add(totalPages);

    // Converte para array ordenado
    const sortedPages = Array.from(pages).sort((a, b) => a - b);

    let lastPage = 0;
    sortedPages.forEach(page => {
        // Adiciona ellipsis se houver gap
        if (page - lastPage > 1) {
            pageNumbers.innerHTML += `<span class="ellipsis">...</span>`;
        }
        
        // Botão da página
        pageNumbers.innerHTML += `
            <button class="page-btn ${page === currentPage ? 'active' : ''}" 
                onclick="goToPage(${page})">${page}</button>
        `;
        
        lastPage = page;
    });

    // Atualizar botões de navegação
    document.getElementById("prevPage").disabled = currentPage === 1;
    document.getElementById("nextPage").disabled = currentPage === totalPages;
}

function changePage(direction) {
    currentPage = Math.max(1, Math.min(totalPages, currentPage + direction));
    displayCurrentPage();
    updatePagination();
}

function goToPage(page) {
    currentPage = page;
    displayCurrentPage();
    updatePagination();
}

// Função para carregar mais resultados ao rolar para baixo
function loadMoreResults() {
    const remaining = currentResults.length - loadedResults.length;
    if (remaining > 0) {
        const nextBatch = currentResults.slice(loadedResults.length, loadedResults.length + limit);
        loadedResults = loadedResults.concat(nextBatch);
        displayDownloads(loadedResults);
    }
}

// Atualizar a lista de URLs ao carregar a página
updateUrlList();
if (data.sources.length > 0) fetchDownloadsFromUrls(getActiveUrls());

// Função para atualizar o parâmetro 'search' na URL
function updateSearchParam(term) {
    const url = new URL(window.location);
    if (term) {
        url.searchParams.set("search", term);
    } else {
        url.searchParams.delete("search");
    }
    window.history.replaceState(null, "", url);
}

// Função para recuperar o 'search' da URL ao carregar a página
function getSearchFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("search") || "";
}

// Atualiza o campo de pesquisa e filtra automaticamente ao carregar
document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("search");
    const searchTerm = getSearchFromURL();
    
    if (searchTerm) {
        searchInput.value = searchTerm;
        filterGames();
    }

    searchInput.addEventListener("input", (e) => {
        updateSearchParam(e.target.value);
        filterGames();
    });

    // Mostrar/ocultar botão Home conforme estado inicial
    document.getElementById("homeButton").style.display = searchTerm ? "inline-block" : "none";
});

particlesJS("particles-js", {
    particles: {
        number: { value: 50 },
        shape: { type: "circle" },
        size: { value: 1 },
        move: { speed: 0.2 },
        line_linked: { enable: true, opacity: 0.5, color: "#5f0d5f" },
        color: { value: "#5f0d5f", opacity: 0.01 }
    },
    interactivity: {
        events: { 
            onhover: { enable: false}, 
            onclick: { enable: false}
    }
    }
});

// Obter todas URLs ativas de todas fontes
function getActiveUrls() {
    return data.sources.flatMap(source => 
        source.urls.filter(url => url.active)
    );
}
  
// Abrir magnet link
function openMagnetLink(magnetLink) {
    window.location.href = magnetLink;
}

// Copiar para área de transferência
function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    
    showCopyNotification();
}

function m2t(magnet) {
    const match = magnet.match(/xt=urn:btih:([A-Fa-f0-9]+)/);
    const hash = match ? match[1].toLowerCase() : "Inválido";
    console.log(hash);
    openm2t(hash)
}

function openm2t(hash) {
    if (hash && hash !== "Inválido") {
        window.open(`https://webtor.io/${hash}`, "_blank");
    } else {
        alert("Extraia um hash válido primeiro!");
    }

}


// Mostrar notificação de cópia
function showCopyNotification() {
    const notification = document.createElement('div');
    notification.classList.add('copy-notification');
    notification.textContent = 'Link copiado!';

    const container = document.getElementById('notificationContainer');
    if (!container) {
        const newContainer = document.createElement('div');
        newContainer.id = 'notificationContainer';
        document.body.appendChild(newContainer);
        newContainer.appendChild(notification);
    } else {
        container.appendChild(notification);
    }

    setTimeout(() => {
        notification.remove();
    }, 2000);
}

function toggleScreens(showSearch) {
    const mainScreen = document.getElementById("mainScreen");
    const searchScreen = document.getElementById("searchScreen");
    
    if (showSearch) {
        mainScreen.classList.add("hidden");
        searchScreen.classList.remove("hidden");
    } else {
        mainScreen.classList.remove("hidden");
        searchScreen.classList.add("hidden");
        // Limpar parâmetros da URL
        window.history.replaceState(null, "", window.location.pathname);
    }
}

function goToHome() {
    // Limpar pesquisa e resultados
    document.getElementById("search").value = "";
    searchTerm = "";
    currentResults = [];
    
    // Atualizar a URL
    updateSearchParam("");
    
    // Resetar para a primeira página
    currentPage = 1;
    
    // Mostrar tela inicial e esconder resultados
    toggleScreens(false);
    
    // Limpar exibição de downloads
    document.getElementById("downloads").innerHTML = "";
    document.getElementById("pagination").style.display = "none";
}

// Modifique a função toggleScreens para incluir o controle do botão Home
function toggleScreens(showSearch) {
    const mainScreen = document.getElementById("mainScreen");
    const searchScreen = document.getElementById("searchScreen");
    const homeButton = document.getElementById("homeButton");
    
    if (showSearch) {
        mainScreen.classList.add("hidden");
        searchScreen.classList.remove("hidden");
        homeButton.style.display = "inline-block";
    } else {
        mainScreen.classList.remove("hidden");
        searchScreen.classList.add("hidden");
        homeButton.style.display = "none";
        window.history.replaceState(null, "", window.location.pathname);
    }
}