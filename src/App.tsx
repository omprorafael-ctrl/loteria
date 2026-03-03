/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Search, 
  CheckCircle2, 
  XCircle, 
  ChevronRight,
  Info,
  History,
  LayoutGrid,
  Plus,
  Filter,
  ArrowUpDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LotteryResult {
  name: string;
  drawNumber: string;
  date: string;
  numbers: number[];
}

const LOTTERY_TYPES = [
  { id: 'mega-sena', name: 'Mega-Sena', maxNumbers: 60, minPick: 6, maxPick: 15, color: 'bg-emerald-600', winRules: [4, 5, 6] },
  { id: 'lotofacil', name: 'Lotofácil', maxNumbers: 25, minPick: 15, maxPick: 20, color: 'bg-purple-600', winRules: [11, 12, 13, 14, 15] },
  { id: 'quina', name: 'Quina', maxNumbers: 80, minPick: 5, maxPick: 15, color: 'bg-blue-700', winRules: [2, 3, 4, 5] },
  { id: 'lotomania', name: 'Lotomania', maxNumbers: 99, minPick: 50, maxPick: 50, color: 'bg-orange-500', winRules: [0, 15, 16, 17, 18, 19, 20] },
];

interface SavedGame {
  id: number;
  lottery_type: string;
  numbers: number[];
  draw_number: string;
  teimosinha_draws: number;
  created_at: string;
}

export default function App() {
  const [selectedLottery, setSelectedLottery] = useState(LOTTERY_TYPES[0]);
  const [userNumbers, setUserNumbers] = useState<number[]>([]);
  const [officialResult, setOfficialResult] = useState<LotteryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedGames, setSavedGames] = useState<SavedGame[]>([]);
  const [activeTab, setActiveTab] = useState<'play' | 'saved'>('play');
  const [notifications, setNotifications] = useState<{id: string, message: string, type: 'win' | 'info'}[]>([]);
  const [teimosinhaDraws, setTeimosinhaDraws] = useState<number>(1);
  const [manualMode, setManualMode] = useState(false);
  const [manualNumbers, setManualNumbers] = useState<number[]>([]);
  const [filterLottery, setFilterLottery] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'lottery' | 'hits'>('date');

  const fetchSavedGames = async () => {
    try {
      const res = await fetch('/api/games');
      if (res.ok) {
        const data = await res.json();
        setSavedGames(data);
      }
    } catch (err) {
      console.error("Error fetching saved games", err);
    }
  };

  const saveGame = async () => {
    if (userNumbers.length < selectedLottery.minPick) return;
    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lottery_type: selectedLottery.id,
          numbers: userNumbers,
          draw_number: officialResult?.drawNumber || 'Próximo',
          teimosinha_draws: teimosinhaDraws
        })
      });
      if (res.ok) {
        fetchSavedGames();
        addNotification("Jogo salvo com sucesso!", 'info');
      }
    } catch (err) {
      addNotification("Erro ao salvar jogo", 'info');
    }
  };

  const deleteGame = async (id: number) => {
    try {
      const res = await fetch(`/api/games/${id}`, { method: 'DELETE' });
      if (res.ok) fetchSavedGames();
    } catch (err) {
      console.error("Error deleting game", err);
    }
  };

  const addNotification = (message: string, type: 'win' | 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const handleManualResultSubmit = () => {
    if (manualNumbers.length === 0) return;
    const result: LotteryResult = {
      name: selectedLottery.name,
      drawNumber: "Manual",
      date: new Date().toLocaleDateString(),
      numbers: manualNumbers.sort((a, b) => a - b)
    };
    setOfficialResult(result);
    checkSavedGamesForWins(result);
    setManualMode(false);
    addNotification("Resultado manual aplicado!", 'info');
  };

  const checkSavedGamesForWins = (result: LotteryResult) => {
    savedGames.forEach(game => {
      if (game.lottery_type === selectedLottery.id) {
        const hits = game.numbers.filter(n => result.numbers.includes(n)).length;
        const lotteryInfo = LOTTERY_TYPES.find(l => l.id === game.lottery_type);
        if (lotteryInfo?.winRules.includes(hits)) {
          addNotification(`PARABÉNS! Seu jogo salvo de ${lotteryInfo.name} teve ${hits} acertos no concurso #${result.drawNumber}!`, 'win');
        }
      }
    });
  };

  useEffect(() => {
    fetchSavedGames();
  }, []);

  useEffect(() => {
    setOfficialResult(null);
    setManualNumbers([]);
    setUserNumbers([]);
  }, [selectedLottery]);

  const toggleNumber = (num: number) => {
    if (userNumbers.includes(num)) {
      setUserNumbers(userNumbers.filter(n => n !== num));
    } else {
      if (userNumbers.length < selectedLottery.maxPick) {
        setUserNumbers([...userNumbers, num].sort((a, b) => a - b));
      }
    }
  };

  const filteredAndSortedGames = savedGames
    .filter(game => filterLottery === 'all' || game.lottery_type === filterLottery)
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'lottery') {
        return a.lottery_type.localeCompare(b.lottery_type);
      }
      if (sortBy === 'hits') {
        const getHits = (game: SavedGame) => {
          if (officialResult && game.lottery_type === selectedLottery.id) {
            return game.numbers.filter(n => officialResult.numbers.includes(n)).length;
          }
          return 0;
        };
        return getHits(b) - getHits(a);
      }
      return 0;
    });

  const hits = userNumbers.filter(num => officialResult?.numbers.includes(num));
  const misses = userNumbers.filter(num => !officialResult?.numbers.includes(num));

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-slate-900 font-sans selection:bg-emerald-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
              <Trophy size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">LotoCheck <span className="text-emerald-600">Brasil</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setActiveTab(activeTab === 'play' ? 'saved' : 'play')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                activeTab === 'saved' ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              <History size={18} />
              {activeTab === 'play' ? 'Meus Jogos' : 'Voltar'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Sidebar - Lottery Selection */}
        <div className="lg:col-span-3 space-y-4">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <LayoutGrid size={16} />
            Loterias
          </h2>
          <div className="space-y-2">
            {LOTTERY_TYPES.map((lottery) => (
              <button
                key={lottery.id}
                onClick={() => setSelectedLottery(lottery)}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-xl transition-all border",
                  selectedLottery.id === lottery.id 
                    ? "bg-white border-emerald-200 shadow-md ring-1 ring-emerald-500/10" 
                    : "bg-transparent border-transparent hover:bg-white/50 text-slate-600"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("w-3 h-3 rounded-full", lottery.color)} />
                  <span className="font-medium">{lottery.name}</span>
                </div>
                {selectedLottery.id === lottery.id && <ChevronRight size={16} className="text-emerald-500" />}
              </button>
            ))}
          </div>

          <div className="pt-4">
            <button 
              onClick={() => setManualMode(!manualMode)}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-slate-300 text-slate-500 hover:border-emerald-500 hover:text-emerald-600 transition-all text-sm font-bold"
            >
              <Plus size={18} />
              {manualMode ? 'Cancelar Entrada' : 'Inserir Resultado'}
            </button>
          </div>

          {manualMode && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-lg space-y-4"
            >
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Números do Sorteio</p>
              <div className="grid grid-cols-5 gap-1.5">
                {Array.from({ length: selectedLottery.maxNumbers }, (_, i) => i + (selectedLottery.id === 'lotomania' ? 0 : 1)).map(num => (
                  <button
                    key={num}
                    onClick={() => {
                      if (manualNumbers.includes(num)) {
                        setManualNumbers(manualNumbers.filter(n => n !== num));
                      } else {
                        setManualNumbers([...manualNumbers, num]);
                      }
                    }}
                    className={cn(
                      "w-full aspect-square flex items-center justify-center rounded-md text-[10px] font-bold border transition-all",
                      manualNumbers.includes(num)
                        ? "bg-emerald-600 border-emerald-700 text-white"
                        : "bg-slate-50 border-slate-200 text-slate-400"
                    )}
                  >
                    {num.toString().padStart(2, '0')}
                  </button>
                ))}
              </div>
              <button 
                onClick={handleManualResultSubmit}
                className="w-full py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors"
              >
                Confirmar Resultado
              </button>
            </motion.div>
          )}

          {officialResult && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-slate-500">
                <History size={16} />
                <span className="text-xs font-bold uppercase tracking-tighter">Resultado Aplicado</span>
              </div>
              <div>
                <p className="text-lg font-bold text-slate-800">{officialResult.drawNumber === 'Manual' ? 'Conferência Manual' : `#${officialResult.drawNumber}`}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-slate-500">{officialResult.date}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {officialResult.numbers.map(n => (
                  <span key={n} className="w-7 h-7 flex items-center justify-center bg-slate-100 rounded-full text-[10px] font-bold">
                    {n.toString().padStart(2, '0')}
                  </span>
                ))}
              </div>
              <button 
                onClick={() => setOfficialResult(null)}
                className="w-full py-1.5 text-[10px] font-bold text-slate-400 uppercase hover:text-red-500 transition-colors"
              >
                Limpar Resultado
              </button>
            </div>
          )}
        </div>

        {/* Main Content - Game Board or Saved Games */}
        <div className="lg:col-span-6 space-y-6">
          <AnimatePresence mode="wait">
            {activeTab === 'play' ? (
              <motion.div
                key="play-tab"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Seu Jogo</h3>
                    <p className="text-sm text-slate-500">Selecione de {selectedLottery.minPick} a {selectedLottery.maxPick} números</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-emerald-600">{userNumbers.length}</span>
                    <span className="text-slate-400 text-sm">/{selectedLottery.maxPick}</span>
                  </div>
                </div>

                <div className={cn(
                  "grid gap-2",
                  selectedLottery.maxNumbers > 60 ? "grid-cols-10" : "grid-cols-6 sm:grid-cols-10"
                )}>
                  {Array.from({ length: selectedLottery.maxNumbers }, (_, i) => i + (selectedLottery.id === 'lotomania' ? 0 : 1)).map((num) => {
                    const isSelected = userNumbers.includes(num);
                    return (
                      <button
                        key={num}
                        onClick={() => toggleNumber(num)}
                        className={cn(
                          "aspect-square flex items-center justify-center rounded-lg text-sm font-bold transition-all border",
                          isSelected 
                            ? "bg-emerald-600 border-emerald-700 text-white shadow-inner scale-95" 
                            : "bg-slate-50 border-slate-200 text-slate-400 hover:border-emerald-300 hover:bg-emerald-50"
                        )}
                      >
                        {num.toString().padStart(2, '0')}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-8 grid grid-cols-3 gap-3">
                  <button 
                    onClick={() => setUserNumbers([])}
                    className="py-3 px-4 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Limpar
                  </button>
                  <button 
                    onClick={() => {
                      const randoms: number[] = [];
                      while(randoms.length < selectedLottery.minPick) {
                        const r = Math.floor(Math.random() * selectedLottery.maxNumbers) + (selectedLottery.id === 'lotomania' ? 0 : 1);
                        if(!randoms.includes(r)) randoms.push(r);
                      }
                      setUserNumbers(randoms.sort((a, b) => a - b));
                    }}
                    className="py-3 px-4 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-900 transition-colors"
                  >
                    Surpresinha
                  </button>
                  <button 
                    onClick={saveGame}
                    disabled={userNumbers.length < selectedLottery.minPick}
                    className="py-3 px-4 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    Salvar
                  </button>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Teimosinha (Repetir jogo)</p>
                  <div className="flex gap-2">
                    {[1, 2, 4, 8, 12].map((draws) => (
                      <button
                        key={draws}
                        onClick={() => setTeimosinhaDraws(draws)}
                        className={cn(
                          "flex-1 py-2 rounded-lg text-xs font-bold border transition-all",
                          teimosinhaDraws === draws 
                            ? "bg-slate-800 border-slate-800 text-white shadow-md" 
                            : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                        )}
                      >
                        {draws === 1 ? 'Não' : `${draws}x`}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="saved-tab"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
                  <h3 className="text-lg font-bold text-slate-800">Meus Jogos Salvos</h3>
                  
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 sm:flex-none">
                      <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select 
                        value={filterLottery}
                        onChange={(e) => setFilterLottery(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all w-full"
                      >
                        <option value="all">Todas Loterias</option>
                        {LOTTERY_TYPES.map(l => (
                          <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="relative flex-1 sm:flex-none">
                      <ArrowUpDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all w-full"
                      >
                        <option value="date">Data</option>
                        <option value="lottery">Loteria</option>
                        <option value="hits">Acertos</option>
                      </select>
                    </div>
                  </div>
                </div>

                {filteredAndSortedGames.length === 0 ? (
                  <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-4">
                    <History size={48} className="mx-auto text-slate-200" />
                    <p className="text-slate-500">
                      {savedGames.length === 0 
                        ? "Você ainda não salvou nenhum jogo." 
                        : "Nenhum jogo encontrado com os filtros atuais."}
                    </p>
                    {savedGames.length === 0 ? (
                      <button onClick={() => setActiveTab('play')} className="text-emerald-600 font-bold hover:underline">Começar a jogar</button>
                    ) : (
                      <button onClick={() => {setFilterLottery('all'); setSortBy('date');}} className="text-emerald-600 font-bold hover:underline">Limpar Filtros</button>
                    )}
                  </div>
                ) : (
                  filteredAndSortedGames.map((game) => {
                    const lottery = LOTTERY_TYPES.find(l => l.id === game.lottery_type);
                    const isCurrentLottery = game.lottery_type === selectedLottery.id;
                    const hits = isCurrentLottery && officialResult ? game.numbers.filter(n => officialResult.numbers.includes(n)) : [];
                    
                    return (
                      <div key={game.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm group hover:border-emerald-200 transition-all">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={cn("w-2 h-2 rounded-full", lottery?.color)} />
                              <span className="font-bold text-slate-800">{lottery?.name}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                              Salvo em {new Date(game.created_at).toLocaleDateString()} • Concurso: {game.draw_number}
                              {game.teimosinha_draws > 1 && ` • Teimosinha: ${game.teimosinha_draws}x`}
                            </p>
                          </div>
                          <button 
                            onClick={() => deleteGame(game.id)}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <XCircle size={18} />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {game.numbers.map(n => {
                            const isHit = isCurrentLottery && officialResult?.numbers.includes(n);
                            return (
                              <span 
                                key={n} 
                                className={cn(
                                  "w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold border",
                                  isHit ? "bg-emerald-600 border-emerald-700 text-white" : "bg-slate-50 border-slate-200 text-slate-600"
                                )}
                              >
                                {n.toString().padStart(2, '0')}
                              </span>
                            );
                          })}
                        </div>
                        {isCurrentLottery && officialResult && (
                          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Resultado Atual</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-slate-800">{hits.length} Acertos</span>
                              {lottery?.winRules.includes(hits.length) && (
                                <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">Premiado!</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Sidebar - Results Analysis */}
        <div className="lg:col-span-3 space-y-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Search size={16} />
            Conferência
          </h2>

          <AnimatePresence mode="wait">
            {userNumbers.length >= selectedLottery.minPick ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
                  <p className="text-sm text-slate-500 font-medium mb-1">Total de Acertos</p>
                  <p className="text-6xl font-black text-emerald-600">{hits.length}</p>
                  <div className="mt-4 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                    {hits.length >= (selectedLottery.id === 'mega-sena' ? 4 : selectedLottery.id === 'lotofacil' ? 11 : 5) ? (
                      <span className="text-emerald-500 flex items-center gap-1">
                        <CheckCircle2 size={14} /> Você Ganhou!
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <XCircle size={14} /> Não foi dessa vez
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Números Sorteados</p>
                    <div className="flex flex-wrap gap-2">
                      {hits.map(n => (
                        <span key={n} className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-bold border border-emerald-200">
                          {n.toString().padStart(2, '0')}
                        </span>
                      ))}
                      {officialResult?.numbers.filter(n => !userNumbers.includes(n)).map(n => (
                        <span key={n} className="px-2 py-1 bg-slate-100 text-slate-400 rounded-md text-xs font-bold border border-slate-200">
                          {n.toString().padStart(2, '0')}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Prizes Section Removed since we don't have API data */}
              </motion.div>
            ) : (
              <div className="bg-slate-100 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
                <Info className="mx-auto text-slate-300 mb-3" size={32} />
                <p className="text-sm text-slate-500">Selecione pelo menos {selectedLottery.minPick} números para conferir seu jogo.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-4 py-12 text-center text-slate-400 text-xs">
        <p>© 2024 LotoCheck Brasil - Dados meramente informativos.</p>
        <p className="mt-1">Consulte sempre os canais oficiais da Caixa Econômica Federal.</p>
      </footer>

      {/* Notifications */}
      <div className="fixed bottom-6 right-6 z-50 space-y-2 max-w-sm">
        <AnimatePresence>
          {notifications.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className={cn(
                "p-4 rounded-2xl shadow-2xl border flex items-start gap-3",
                notif.type === 'win' 
                  ? "bg-emerald-600 border-emerald-500 text-white" 
                  : "bg-white border-slate-200 text-slate-800"
              )}
            >
              {notif.type === 'win' ? <Trophy className="shrink-0 mt-1" size={20} /> : <Info className="shrink-0 mt-1 text-emerald-600" size={20} />}
              <p className="text-sm font-bold leading-tight">{notif.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
