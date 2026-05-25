import React, { useState } from 'react';
import { createCandidate } from "../../services/api";

// --- 定義資料型別 ---
interface TestCase {
  input: string;
  expected_output: string;
}

interface Problem {
  id: number;
  title: string;
  difficulty: string;
  description: string;
  testCases?: TestCase[]; 
  test_cases?: TestCase[]; // 兼容後端底線命名
}

const InterviewerDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
  const [problems, setProblems] = useState<Problem[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 表單狀態
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [description, setDescription] = useState('');
  const [testCases, setTestCases] = useState<{input: string, output: string}[]>([{ input: '', output: '' }]);
  const [candidateCreds, setCandidateCreds] = useState<{acc: string, pw: string} | null>(null);

  // 1. 生成面試者帳密
  const generateCredentials = async () => {
    const newAcc = "USER-" + Math.floor(Math.random() * 9000 + 1000);
    const newPw = Math.random().toString(36).substring(2, 8).toUpperCase();
    setIsLoading(true);
    try {
      await createCandidate({ username: newAcc, password: newPw });
      setCandidateCreds({ acc: newAcc, pw: newPw });
      alert("🎉 帳號已成功寫入資料庫！");
    } catch (error) {
      alert("❌ 創建失敗，請檢查伺服器狀態。");
    } finally {
      setIsLoading(false);
    }
  };

  // 2. 獲取題庫清單
  const fetchProblems = async () => {
    try {
      const response = await fetch('http://localhost:8081/api/problems');
      if (response.ok) {
        const data = await response.json();
        setProblems(data || []);
        setActiveTab('list');
      }
    } catch (error) {
      alert('❌ 無法獲取題庫，請確認後端 8081 是否啟動');
    }
  };

  // 3. 儲存新題目
  const handleSubmitProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    const problemData = { 
      title, 
      difficulty, 
      description, 
      testCases: testCases.map(tc => ({
          input: tc.input,
          expected_output: tc.output 
      }))
    };

    try {
      const response = await fetch('http://localhost:8081/api/problems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(problemData),
      });

      if (response.ok) {
        alert(`🎉 題目儲存成功！`);
        setTitle('');
        setDescription('');
        setTestCases([{ input: '', output: '' }]);
        fetchProblems(); // 儲存完自動刷新並切換到列表
      } else {
        alert('❌ 儲存失敗，請檢查後端報錯');
      }
    } catch (error) {
      alert('❌ 連線後端失敗');
    }
  };

  const addTestCase = () => setTestCases([...testCases, { input: '', output: '' }]);
  const handleTestCaseChange = (index: number, field: 'input' | 'output', value: string) => {
    const newTestCases = [...testCases];
    newTestCases[index][field] = value;
    setTestCases(newTestCases);
  };

  return (
    <div className="min-h-screen bg-[#111] text-gray-200 p-8 font-sans">
      <div className="max-w-[90rem] mx-auto">
        <h1 className="text-4xl font-extrabold text-indigo-400 mb-10 tracking-tight italic">SMC <span className="text-white not-italic">Dashboard</span></h1>
        
        <div className="flex gap-8">
          {/* 左側選單 */}
          <div className="w-1/4 space-y-6">
            <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-gray-800 shadow-xl">
              <h2 className="text-xl font-bold mb-4 text-gray-100 flex items-center gap-2">👤 面試者管理</h2>
              <button 
                onClick={generateCredentials} 
                disabled={isLoading}
                className={`w-full font-bold py-3 px-5 rounded-xl transition ${isLoading ? 'bg-gray-700' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
              >
                {isLoading ? "⏳ 處理中..." : "生成面試者隨機帳密"}
              </button>
              {candidateCreds && (
                <div className="mt-4 p-3 bg-[#222] rounded-lg border border-indigo-900 text-sm text-indigo-300 font-mono">
                  帳號: {candidateCreds.acc} <br/> 密碼: {candidateCreds.pw}
                </div>
              )}
            </div>

            <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-gray-800 shadow-xl space-y-2">
              <div 
                onClick={() => setActiveTab('create')} 
                className={`p-3 rounded-lg cursor-pointer transition ${activeTab === 'create' ? 'bg-indigo-950/30 text-indigo-300 font-medium' : 'text-gray-500 hover:bg-[#222]'}`}
              >
                ✨ 建立新題目
              </div>
              <div 
                onClick={fetchProblems} 
                className={`p-3 rounded-lg cursor-pointer transition ${activeTab === 'list' ? 'bg-indigo-950/30 text-indigo-300 font-medium' : 'text-gray-500 hover:bg-[#222]'}`}
              >
                📚 題庫清單
              </div>
            </div>
          </div>

          {/* 右側內容區 */}
          <div className="w-3/4">
            {activeTab === 'create' ? (
              <form onSubmit={handleSubmitProblem} className="bg-[#1a1a1a] p-8 rounded-2xl border border-gray-800 shadow-2xl space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-bold text-gray-100">✨ 建立新題目</h2>
                  <button type="submit" className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-indigo-700 transition">
                    儲存題目
                  </button>
                </div>
                
                <div className="grid grid-cols-3 gap-6">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">題目名稱</label>
                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full bg-[#222] border border-gray-800 rounded-lg p-3.5 text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">難度</label>
                    <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-full bg-[#222] border border-gray-800 rounded-lg p-3.5 text-gray-100">
                      <option>Easy</option><option>Medium</option><option>Hard</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">描述 (Markdown)</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} required className="w-full bg-[#222] border border-gray-800 rounded-lg p-4 h-56 text-gray-100 font-mono text-sm resize-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                <div className="border-t border-gray-800 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-lg font-semibold text-gray-300">⚙️ 評測測資</label>
                    <button type="button" onClick={addTestCase} className="text-sm text-indigo-400">+ 新增測資</button>
                  </div>
                  <div className="space-y-3">
                    {testCases.map((tc, index) => (
                      <div key={`input-row-${index}`} className="grid grid-cols-2 gap-3 bg-[#222] p-3 rounded-lg border border-gray-800">
                        <input placeholder="Input" value={tc.input} onChange={(e) => handleTestCaseChange(index, 'input', e.target.value)} className="bg-[#1a1a1a] border border-gray-800 rounded p-2.5 text-xs text-gray-300" />
                        <input placeholder="Output" value={tc.output} onChange={(e) => handleTestCaseChange(index, 'output', e.target.value)} className="bg-[#1a1a1a] border border-gray-800 rounded p-2.5 text-xs text-gray-300" />
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            ) : (
              <div className="bg-[#1a1a1a] p-8 rounded-2xl border border-gray-800 shadow-2xl">
                <h2 className="text-3xl font-bold text-gray-100 mb-6">📚 題庫清單</h2>
                <div className="space-y-4">
                  {problems.map((p) => (
                    <div key={`p-list-${p.id}`} className="p-5 bg-[#222] border border-gray-800 rounded-xl flex items-center justify-between group hover:border-indigo-500 transition cursor-default">
                      <div>
                        <div className="text-lg font-bold text-gray-100 mb-1">{p.title}</div>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${p.difficulty === 'Easy' ? 'bg-green-900/40 text-green-400' : p.difficulty === 'Medium' ? 'bg-yellow-900/40 text-yellow-400' : 'bg-red-900/40 text-red-400'}`}>{p.difficulty}</span>
                      </div>
                      <button onClick={() => setSelectedProblem(p)} className="opacity-0 group-hover:opacity-100 bg-indigo-600 text-xs px-4 py-2 rounded-lg transition hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-900/20">檢視細節</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 彈窗細節 */}
      {selectedProblem && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 backdrop-blur-md">
          <div className="bg-[#1a1a1a] border border-gray-700 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-gray-800 flex justify-between items-center bg-[#1d1d1d]">
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-bold text-white">{selectedProblem.title}</h2>
                <span className={`text-xs px-2 py-1 rounded font-bold ${selectedProblem.difficulty === 'Easy' ? 'bg-green-900/40 text-green-400' : selectedProblem.difficulty === 'Medium' ? 'bg-yellow-900/40 text-yellow-400' : 'bg-red-900/40 text-red-400'}`}>{selectedProblem.difficulty}</span>
              </div>
              <button onClick={() => setSelectedProblem(null)} className="text-gray-400 hover:text-white text-3xl">✕</button>
            </div>
            
            <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
              <section>
                <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-4">題目描述</h3>
                <div className="bg-[#111] p-6 rounded-2xl border border-gray-800 text-sm whitespace-pre-wrap text-gray-300 font-sans leading-relaxed">
                  {selectedProblem.description}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                   系統評測測資
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {(() => {
                    const data = selectedProblem as any;
                    const tcs = data.testCases || data.test_cases || [];
                    
                    if (tcs.length > 0) {
                      return tcs.map((tc: any, idx: number) => (
                        <div key={`modal-tc-${idx}`} className="grid grid-cols-2 gap-4 bg-[#222] p-4 rounded-xl border border-gray-800">
                          <div>
                            <p className="text-[10px] text-gray-500 font-bold mb-1 uppercase">Input</p>
                            <code className="text-indigo-300 font-mono text-sm block bg-[#1a1a1a] p-2 rounded">{tc.input || "N/A"}</code>
                          </div>
                          <div className="border-l border-gray-700 pl-4">
                            <p className="text-[10px] text-gray-500 font-bold mb-1 uppercase">Expected Output</p>
                            <code className="text-emerald-300 font-mono text-sm block bg-[#1a1a1a] p-2 rounded">{tc.expected_output || tc.output || "N/A"}</code>
                          </div>
                        </div>
                      ));
                    }
                    return <div className="p-4 bg-[#111] rounded-xl border border-gray-800 text-gray-600 text-sm italic">尚無測資或解析失敗。</div>;
                  })()}
                </div>
              </section>
            </div>
            
            <div className="p-6 border-t border-gray-800 bg-[#1d1d1d] flex justify-end">
              <button onClick={() => setSelectedProblem(null)} className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 px-10 rounded-xl transition">
                關閉
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default InterviewerDashboard;