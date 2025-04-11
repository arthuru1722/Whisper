import './App.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faAnglesLeft } from '@fortawesome/free-solid-svg-icons'
import { faAnglesRight } from '@fortawesome/free-solid-svg-icons'

import { useState, useEffect } from "react";

function Search() {
  const [newUrl, setNewUrl] = useState("");
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9; // Definindo o limite fixo
  const [copiedMagnet, setCopiedMagnet] = useState(null);
    
  const [urls, setUrls] = useState(() => {
    try {
      const stored = localStorage.getItem("jsonURLs");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  
  const [selectedUrls, setSelectedUrls] = useState(() => {
    const stored = localStorage.getItem("selectedURLs");
    try {
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  

  // Atualizar localStorage quando mudar a lista

  useEffect(() => {
    localStorage.setItem("jsonURLs", JSON.stringify(urls));
    localStorage.setItem("selectedURLs", JSON.stringify(selectedUrls));
  }, [urls, selectedUrls]);

  // Adicione este efeito
  useEffect(() => {
    if (selectedUrls.length > 0) {
      handleLoadSelected();
    } else {
      setData([]); // Limpa os dados quando não há seleção
    }
  }, [selectedUrls]); // Executa sempre que selectedUrls mudar

  useEffect(() => {
    const fetchSelectedData = async () => {
      if (selectedUrls.length === 0) {
        setData([]);
        return;
      }
  
      const newData = [];
      for (const url of selectedUrls) {
        try {
          const res = await fetch(url);
          const json = await res.json();
          newData.push(...json.downloads.map(item => ({
            ...item,
            sourceName: json.name
          })));
        } catch (err) {
          console.error(`Erro ao carregar ${url}:`, err);
        }
      }
      setData(newData);
    };
  
    fetchSelectedData();
  }, [selectedUrls]); // Executa SOMENTE quando selectedUrls muda
  

  // Adicionar novo link
  const handleAddUrl = () => {
    if (!newUrl.trim()) return;
    if (!urls.includes(newUrl)) {
      setUrls([...urls, newUrl]);
      setSelectedUrls([...selectedUrls, newUrl]); // Auto-seleciona nova URL
    }
    setNewUrl("");
  };
  

  // Marcar/desmarcar checkboxes
  const toggleUrl = (url) => {
    setSelectedUrls(prev => {
      const newSelection = prev.includes(url)
        ? prev.filter(u => u !== url)
        : [...prev, url];
      return newSelection;
    });
  };


  // Carregar múltiplos JSONs e juntar os dados
  const handleLoadSelected = async () => {
    let combinedData = [];

    for (const url of selectedUrls) {
      try {
        const res = await fetch(url);
        const json = await res.json();

        if (Array.isArray(json.downloads)) {
          const downloadsComFonte = json.downloads.map(item => ({
            ...item,
            sourceName: json.name, // adiciona a origem
          }));
          combinedData = [...combinedData, ...downloadsComFonte];
        }
      } catch (err) {
        console.error(`Erro ao carregar ${url}:`, err);
      }
    }

    setData(combinedData);
  };

  const handleCopyMagnet = async (magnetLink) => {
    try {
      await navigator.clipboard.writeText(magnetLink);
      setCopiedMagnet(magnetLink);
      setTimeout(() => setCopiedMagnet(null), 2000); // Reset após 2 segundos
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };


  // Remover link
  const handleRemoveUrl = (urlToRemove) => {
    setUrls(prev => prev.filter(url => url !== urlToRemove));
    setSelectedUrls(prev => prev.filter(url => url !== urlToRemove));
  };

  const filteredData = data.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase())
  );

  // Cálculos da paginação
  // Cálculos da paginação (ADICIONE ESTE BLOCO)
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  // Função para gerar números das páginas (ATUALIZADA)
  const getPageNumbers = () => {
    const pages = new Set();
    const firstPage = 1;
    const lastPage = totalPages;

    // Sempre mostra a primeira página
    pages.add(firstPage);

    // Mostra 3 páginas antes e depois da atual
    for (let i = currentPage - 1; i <= currentPage + 1; i++) {
      if (i > firstPage && i < lastPage) {
        pages.add(i);
      }
    }

    // Sempre mostra a última página
    if (lastPage > firstPage) {
      pages.add(lastPage);
    }

    return Array.from(pages).sort((a, b) => a - b);
  };

  // Efeito para resetar para a primeira página quando os dados mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [data, search]); // Resetar página quando dados ou busca mudarem

  const m2t = (magnet) => {
    const match = magnet.match(/xt=urn:btih:([A-Fa-f0-9]+)/);
    const hash = match ? match[1].toLowerCase() : "Inválido";
    openm2t(hash);
  };

  const openm2t = (hash) => {
    if (hash && hash !== "Inválido") {
      window.open(`https://webtor.io/${hash}`, "_blank");
    } else {
      alert("Extraia um hash válido primeiro!");
    }
  };

  const openLink = (link) => {
    console.log('a')
    if (link) {
      window.open(link, "_blank");
    } else {
      alert("Link inválido!");
    }
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-6">
        <div className="max-w-5xl h-full mx-auto bg-zinc-800 p-6 rounded-lg shadow-lg">
            <h1 className="text-2xl font-bold mb-4">Whisper</h1>

            {/* Adicionar novo link */}
            <div className="mb-4 flex gap-2">
                <input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="Insira o link do JSON"
                className="p-2 rounded bg-zinc-800 border border-zinc-700 w-full"
                />
                <button
                onClick={handleAddUrl}
                className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded"
                >
                Adicionar
                </button>
            </div>

            {/* Lista de checkboxes dos links */}
            <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">Sources:</h2>
                {urls.length === 0 ? (
                <p>Nenhum link salvo.</p>
                ) : (
                <ul className="space-y-2">
                    {urls.map((url, i) => (
                    <li key={i} className="flex items-center justify-between cursor-pointer bg-zinc-800 p-3 shadow-xl rounded hover:scale-101 transition-transform duration-200">
                        <label className="flex items-center gap-2 w-full cursor-pointer">
                        <input
                            type="checkbox"
                            checked={selectedUrls.includes(url)}
                            onChange={() => {
                            toggleUrl(url)
                            }
                            }
                            className="green-600 scale-150 accent-green-600 mr-1 cursor-pointer"
                        />
                        <span className="break-all">{url}</span>
                        </label>
                        <button
                        onClick={() => handleRemoveUrl(url)}
                        className="bg-red-600 hover:bg-red-500 px-2 py-1 rounded text-sm"
                        >
                        Remover
                        </button>
                    </li>
                    ))}
                </ul>
                )}
            </div>  

            {/* Campo de busca */}
            <input
                type="text"
                placeholder="Buscar por título..."
                value={search}
                onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
                }
                }
                className="p-2 mb-4 rounded bg-zinc-800 border border-zinc-700 w-full"
            />

            {/* Resultados */}
            {search.trim () && (
                <ul className="space-y-2 bg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentData.map((item, i) => (
                    
                    <li key={i} className="p-3 flex flex-col justify-between bg-zinc-800 shadow-xl rounded w-full h-60 hover:scale-105 hover:2xl transition-transform duration-200">
                        <div>
                            <p className="text-lg font-bold text-ellipsis" title={item.title}>
                                {item.title.length > 80 
                                    ? `${item.title.substring(0, 80)}...` 
                                    : item.title}
                                </p>
                            <p className="text-sm text-zinc-400">{item.fileSize}</p>
                            <p className="text-sm text-zinc-400">
                                Enviado em: {new Date(item.uploadDate).toLocaleString()}
                            </p>
                            <p className='text-sm text-zinc-400'>Fonte: {item.sourceName}</p>
                        </div>
                        <div className='grid grid-cols-[3fr_2fr_1fr] gap-2 mt-2'>
                            <button
                                onClick={() => openLink(item.uris[0])}z
                                className="bg-green-400 hover:bg-green-500 px-2 py-2.5 rounded text-sm break-all"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Download
                            </button>
                            <button
                                onClick={() => handleCopyMagnet(item.uris[0])}
                                className="bg-gray-400 hover:bg-gray-500 px-2 py-1 rounded text-sm"
                            >
                                {copiedMagnet === item.uris[0] ? 'Copiado!' : 'Copiar'}
                            </button>
                            <button
                                onClick={() => m2t(item.uris[0])}
                                className="bg-pink-400 hover:bg-pink-500 px-2 py-1 rounded text-sm"
                                title="Abrir no Webtor.io"
                            >
                                Webtor
                            </button>
                        </div>
                        </li>
                    ))}
                </ul>
            )}
            {/* Campo de busca - Adicione setCurrentPage(1) */}

            {/* Controles de paginação (ATUALIZADO) */}
                {search.trim() && (
                <>
                    {totalItems > itemsPerPage && (
                    <div className="flex gap-1 mb-4 flex-wrap items-center justify-center">
                        <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 bg-zinc-700 rounded disabled:opacity-50 hover:bg-zinc-600 transition-colors"
                        >
                        <FontAwesomeIcon icon={faAnglesLeft} />
                        </button>

                        {getPageNumbers().map((page, index, array) => (
                        <div key={page} className="flex items-center gap-1">
                            <button
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-1 rounded ${
                                currentPage === page
                                ? 'bg-green-600 cursor-default'
                                : 'bg-zinc-700 hover:bg-zinc-600'
                            } transition-colors`}
                            >
                            {page}
                            </button>
                            {/* Adiciona ellipsis entre páginas não consecutivas */}
                            {index < array.length - 1 && array[index + 1] - page > 1 && (
                            <button className="px-2 flex align-center justify-center">...</button>
                            )}
                        </div>
                        ))}

                        <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 bg-zinc-700 rounded disabled:opacity-50 hover:bg-zinc-600 transition-colors"
                        >
                        <FontAwesomeIcon icon={faAnglesRight} />
                        </button>
                    </div>
                    )}
                    {/* Exibição de resultados (ATUALIZADO) */}
                    <div className="mb-4 text-zinc-400 text-sm">
                    Mostrando {startIndex + 1} - {Math.min(endIndex, totalItems)} de {totalItems} resultados
                    </div>
                </>
                )}
            </div>
    </div>
  );
}

export default Search;
