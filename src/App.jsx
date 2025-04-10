import './App.css'

import { useState, useEffect } from "react";

function App() {
  const [newUrl, setNewUrl] = useState("");
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");

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


  // Remover link
  const handleRemoveUrl = (urlToRemove) => {
    setUrls(prev => prev.filter(url => url !== urlToRemove));
    setSelectedUrls(prev => prev.filter(url => url !== urlToRemove));
  };

  const filteredData = data.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-6">
      <h1 className="text-2xl font-bold mb-4">Buscador de Jogos (Multi JSON)</h1>

      {/* Adicionar novo link */}
      <div className="mb-4 flex gap-2">
        <input
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          placeholder="Cole o link do JSON"
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
        <h2 className="text-xl font-semibold mb-2">Links Salvos:</h2>
        {urls.length === 0 ? (
          <p>Nenhum link salvo.</p>
        ) : (
          <ul className="space-y-2">
            {urls.map((url, i) => (
              <li key={i} className="flex items-center justify-between bg-zinc-800 p-3 rounded">
                <label className="flex items-center gap-2 w-full cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedUrls.includes(url)}
                    onChange={() => {
                      toggleUrl(url)
                      }
                    }
                    className="green-600 accent-green-600 cursor-pointer"
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
          handleLoadSelected();
          }
        }
        className="p-2 mb-4 rounded bg-zinc-800 border border-zinc-700 w-full"
      />

      {/* Resultados */}
      <ul className="space-y-2">
        {filteredData.map((item, i) => (
          <li key={i} className="p-3 bg-zinc-800 rounded">
            <p className="text-lg font-bold">{item.title}</p>
            <p className="text-sm text-zinc-400">{item.fileSize}</p>
            <p className="text-sm text-zinc-400">
              Enviado em: {new Date(item.uploadDate).toLocaleString()}
            </p>
            <p>Fonte: {item.sourceName}</p>
            <a
              href={item.uris[0]}
              className="text-blue-400 hover:underline break-all"
              target="_blank"
              rel="noopener noreferrer"
            >
              Magnet link
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
