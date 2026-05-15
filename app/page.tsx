"use client";

import { useState, useEffect, useCallback } from "react";

interface Transaction {
  id: string;
  member_name: string;
  type: "earn" | "spend" | "message" | "penalty";
  task_name: string;
  points: number;
  message?: string;
  target_name?: string;
  created_at: string;
}

const EARN_TASKS = [
  { emoji: "🗑️", label: "ゴミ出し", points: 15 },
  { emoji: "👕", label: "洗濯", points: 50 },
  { emoji: "🍳", label: "料理", points: 80 },
  { emoji: "🧹", label: "掃除機", points: 40 },
  { emoji: "🛁", label: "風呂掃除", points: 40 },
  { emoji: "🛒", label: "買い物", points: 60 },
  { emoji: "🍽️", label: "食器洗い", points: 30 },
  { emoji: "👶", label: "子どもの世話", points: 100 },
  { emoji: "🌿", label: "植物の水やり", points: 10 },
  { emoji: "💊", label: "薬の管理", points: 20 },
];

const SPEND_TASKS = [
  { emoji: "🚀", label: "一日外出券", points: 5000 },
  { emoji: "🎮", label: "ゲーム2時間", points: 200 },
  { emoji: "🍺", label: "飲み会1回", points: 800 },
  { emoji: "🛌", label: "朝寝坊券", points: 300 },
  { emoji: "🍣", label: "好きなもの晩ごはん", points: 500 },
  { emoji: "📺", label: "テレビ独占2時間", points: 150 },
  { emoji: "💆", label: "マッサージしてもらう", points: 600 },
  { emoji: "🎁", label: "好きなもの買う1000円", points: 1000 },
];

type Screen = "login" | "dashboard" | "earn" | "spend" | "message" | "penalty";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("login");
  const [isNewRoom, setIsNewRoom] = useState(true);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [roomId, setRoomId] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [myName, setMyName] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [customTask, setCustomTask] = useState("");
  const [customPoints, setCustomPoints] = useState("");
  const [messageText, setMessageText] = useState("");
  const [penaltyReason, setPenaltyReason] = useState("");
  const [penaltyPoints, setPenaltyPoints] = useState("");
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const fetchTransactions = useCallback(async (rid: string) => {
    const res = await fetch(`/api/transactions?roomId=${rid}`);
    const data = await res.json();
    if (data.transactions) setTransactions(data.transactions);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("fam_session");
    if (saved) {
      const { roomId, roomCode, myName } = JSON.parse(saved);
      setRoomId(roomId);
      setRoomCode(roomCode);
      setMyName(myName);
      setScreen("dashboard");
      fetchTransactions(roomId);
    }
  }, [fetchTransactions]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    const data = await res.json();
    if (data.error) { setError(data.error); setLoading(false); return; }
    const session = { roomId: data.roomId, roomCode: data.code, myName: name.trim() };
    localStorage.setItem("fam_session", JSON.stringify(session));
    setRoomId(data.roomId); setRoomCode(data.code); setMyName(name.trim());
    setScreen("dashboard"); setLoading(false);
  };

  const handleJoin = async () => {
    if (!name.trim() || !code.trim()) return;
    setLoading(true); setError("");
    const res = await fetch(`/api/room?code=${code.trim().toUpperCase()}&name=${name.trim()}`);
    const data = await res.json();
    if (data.error) { setError("コードが間違っています"); setLoading(false); return; }
    const session = { roomId: data.roomId, roomCode: data.code, myName: name.trim() };
    localStorage.setItem("fam_session", JSON.stringify(session));
    setRoomId(data.roomId); setRoomCode(data.code); setMyName(name.trim());
    await fetchTransactions(data.roomId);
    setScreen("dashboard"); setLoading(false);
  };

  const addTransaction = async (
    type: "earn" | "spend" | "message" | "penalty",
    taskName: string,
    points: number,
    message?: string,
    targetName?: string
  ) => {
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, memberName: myName, type, taskName, points, message, targetName }),
    });
    const data = await res.json();
    if (data.transaction) {
      setTransactions((prev) => [data.transaction, ...prev]);
      if (type === "earn") showToast(`+${points}pt 獲得！💪`);
      if (type === "spend") showToast(`-${points}pt 使用しました`);
      if (type === "message") showToast("メッセージを送りました 💌");
      if (type === "penalty") showToast(`${targetName}から ${points}pt 没収！⚡`);
      setScreen("dashboard");
    }
  };

  const calcPoints = (name: string) =>
    transactions.reduce((sum, t) => {
      if (t.type === "earn" && t.member_name === name) return sum + t.points;
      if (t.type === "spend" && t.member_name === name) return sum - t.points;
      if (t.type === "penalty" && t.target_name === name) return sum - t.points;
      return sum;
    }, 0);

  const members = [...new Set(transactions.map((t) => t.member_name))];
  if (myName && !members.includes(myName)) members.unshift(myName);
  const partner = members.find((m) => m !== myName);
  const myPoints = calcPoints(myName);
  const partnerPoints = partner ? calcPoints(partner) : 0;
  const totalPoints = myPoints + partnerPoints;

  // ログイン画面
  if (screen === "login") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex flex-col items-center justify-center px-6 font-sans">
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-black text-green-600 tracking-tighter">Fam</h1>
          <p className="text-stone-400 text-sm mt-2">家族の頑張りを、一緒に積み上げよう。</p>
        </div>
        <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl shadow-green-100 border border-green-50">
          <div className="flex gap-2 mb-5">
            <button onClick={() => setIsNewRoom(true)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${isNewRoom ? "bg-green-500 text-white" : "bg-stone-100 text-stone-500"}`}>
              新規作成
            </button>
            <button onClick={() => setIsNewRoom(false)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${!isNewRoom ? "bg-green-500 text-white" : "bg-stone-100 text-stone-500"}`}>
              コードで入る
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-stone-400 mb-1.5">あなたの名前</p>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="例：たいゆう"
                className="w-full border border-stone-200 rounded-xl px-4 py-3 text-stone-800 text-sm focus:outline-none focus:border-green-400 transition-colors" />
            </div>
            {!isNewRoom && (
              <div>
                <p className="text-xs text-stone-400 mb-1.5">ルームコード（6桁）</p>
                <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="例：AB1C2D" maxLength={6}
                  className="w-full border border-stone-200 rounded-xl px-4 py-3 text-stone-800 text-sm font-mono tracking-widest focus:outline-none focus:border-green-400 transition-colors" />
              </div>
            )}
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button onClick={isNewRoom ? handleCreate : handleJoin}
              disabled={loading || !name.trim() || (!isNewRoom && !code.trim())}
              className="w-full bg-green-500 text-white py-3.5 rounded-xl font-black text-sm hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              {loading ? "接続中..." : isNewRoom ? "はじめる" : "ルームに入る"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // メッセージ画面
  if (screen === "message") {
    return (
      <div className="min-h-screen bg-stone-50 font-sans">
        <header className="bg-white border-b border-stone-100 px-4 py-4 flex items-center gap-3 shadow-sm">
          <button onClick={() => setScreen("dashboard")} className="text-stone-400 hover:text-stone-600 font-medium text-sm">← 戻る</button>
          <h2 className="font-black text-stone-800">メッセージを送る 💌</h2>
        </header>
        <div className="max-w-xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
            <p className="text-sm text-stone-500 mb-4">
              {partner ? `${partner}へメッセージを送ろう` : "パートナーへメッセージを送ろう"}
            </p>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="例：洗い物ありがとう！助かった☺️"
              rows={4}
              className="w-full border border-stone-200 rounded-xl px-4 py-3 text-stone-800 text-sm resize-none focus:outline-none focus:border-green-400 transition-colors mb-4"
            />
            <button
              onClick={() => {
                if (messageText.trim()) {
                  addTransaction("message", "💌 メッセージ", 0, messageText.trim());
                  setMessageText("");
                }
              }}
              disabled={!messageText.trim()}
              className="w-full bg-green-500 text-white py-3.5 rounded-xl font-black text-sm hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              送る
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 没収画面
  if (screen === "penalty") {
    return (
      <div className="min-h-screen bg-stone-50 font-sans">
        <header className="bg-white border-b border-stone-100 px-4 py-4 flex items-center gap-3 shadow-sm">
          <button onClick={() => setScreen("dashboard")} className="text-stone-400 hover:text-stone-600 font-medium text-sm">← 戻る</button>
          <h2 className="font-black text-stone-800">ポイントを没収する ⚡</h2>
          {partner && <span className="ml-auto text-xs text-stone-400">{partner}の残高: <span className="text-red-500 font-black">{partnerPoints}pt</span></span>}
        </header>
        <div className="max-w-xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl p-6 border border-red-100 shadow-sm">
            <div className="bg-red-50 rounded-xl p-3 mb-5 border border-red-100">
              <p className="text-xs text-red-500 font-bold">⚠️ {partner || "パートナー"}のポイントを没収します</p>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-stone-400 mb-1.5">理由（必須）</p>
                <textarea
                  value={penaltyReason}
                  onChange={(e) => setPenaltyReason(e.target.value)}
                  placeholder="例：洗い終わった洗濯物を3日間放置してたから"
                  rows={3}
                  className="w-full border border-stone-200 rounded-xl px-4 py-3 text-stone-800 text-sm resize-none focus:outline-none focus:border-red-300 transition-colors"
                />
              </div>
              <div>
                <p className="text-xs text-stone-400 mb-1.5">没収ポイント</p>
                <input
                  type="number"
                  value={penaltyPoints}
                  onChange={(e) => setPenaltyPoints(e.target.value)}
                  placeholder="例：100"
                  className="w-full border border-stone-200 rounded-xl px-4 py-3 text-stone-800 text-sm focus:outline-none focus:border-red-300 transition-colors"
                />
              </div>
              <button
                onClick={() => {
                  if (penaltyReason.trim() && penaltyPoints && partner) {
                    addTransaction("penalty", `⚡ 没収：${penaltyReason.trim()}`, parseInt(penaltyPoints), penaltyReason.trim(), partner);
                    setPenaltyReason(""); setPenaltyPoints("");
                  }
                }}
                disabled={!penaltyReason.trim() || !penaltyPoints || !partner}
                className="w-full bg-red-500 text-white py-3.5 rounded-xl font-black text-sm hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                没収する
              </button>
              {!partner && <p className="text-xs text-stone-400 text-center">パートナーが参加してから使えます</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 稼ぐ画面
  if (screen === "earn") {
    return (
      <div className="min-h-screen bg-stone-50 font-sans">
        <header className="bg-white border-b border-stone-100 px-4 py-4 flex items-center gap-3 shadow-sm">
          <button onClick={() => setScreen("dashboard")} className="text-stone-400 hover:text-stone-600 font-medium text-sm">← 戻る</button>
          <h2 className="font-black text-stone-800">ポイントを稼ぐ 💪</h2>
          <span className="ml-auto text-green-600 font-black text-sm bg-green-50 px-3 py-1 rounded-full">{myPoints.toLocaleString()}pt</span>
        </header>
        <div className="max-w-xl mx-auto px-4 py-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {EARN_TASKS.map((task) => (
              <button key={task.label} onClick={() => addTransaction("earn", task.label, task.points)}
                className="bg-white border border-stone-100 rounded-2xl p-4 text-left hover:border-green-300 hover:shadow-md transition-all shadow-sm">
                <span className="text-2xl block mb-2">{task.emoji}</span>
                <p className="text-stone-800 text-sm font-bold">{task.label}</p>
                <p className="text-green-500 text-xs font-black mt-0.5">+{task.points}pt</p>
              </button>
            ))}
          </div>
          <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
            <p className="text-xs text-stone-400 mb-3">カスタムタスク</p>
            <div className="flex gap-2 mb-2">
              <input type="text" value={customTask} onChange={(e) => setCustomTask(e.target.value)} placeholder="タスク名"
                className="flex-1 border border-stone-200 rounded-xl px-3 py-2 text-stone-800 text-sm focus:outline-none focus:border-green-400" />
              <input type="number" value={customPoints} onChange={(e) => setCustomPoints(e.target.value)} placeholder="pt"
                className="w-20 border border-stone-200 rounded-xl px-3 py-2 text-stone-800 text-sm focus:outline-none focus:border-green-400" />
            </div>
            <button onClick={() => { if (customTask && customPoints) { addTransaction("earn", customTask, parseInt(customPoints)); setCustomTask(""); setCustomPoints(""); } }}
              disabled={!customTask || !customPoints}
              className="w-full bg-green-500 text-white py-2.5 rounded-xl text-sm font-black disabled:opacity-30 hover:bg-green-600 transition-colors">
              追加する
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 使う画面
  if (screen === "spend") {
    return (
      <div className="min-h-screen bg-stone-50 font-sans">
        <header className="bg-white border-b border-stone-100 px-4 py-4 flex items-center gap-3 shadow-sm">
          <button onClick={() => setScreen("dashboard")} className="text-stone-400 hover:text-stone-600 font-medium text-sm">← 戻る</button>
          <h2 className="font-black text-stone-800">ポイントを使う 🎁</h2>
          <span className="ml-auto text-green-600 font-black text-sm bg-green-50 px-3 py-1 rounded-full">{myPoints.toLocaleString()}pt</span>
        </header>
        <div className="max-w-xl mx-auto px-4 py-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {SPEND_TASKS.map((task) => (
              <button key={task.label}
                onClick={() => { if (myPoints < task.points) { showToast("ポイントが足りません💦"); return; } addTransaction("spend", task.label, task.points); }}
                className={`bg-white border rounded-2xl p-4 text-left transition-all shadow-sm ${myPoints >= task.points ? "border-stone-100 hover:border-red-200 hover:shadow-md" : "border-stone-100 opacity-40 cursor-not-allowed"}`}>
                <span className="text-2xl block mb-2">{task.emoji}</span>
                <p className="text-stone-800 text-sm font-bold">{task.label}</p>
                <p className="text-red-400 text-xs font-black mt-0.5">-{task.points.toLocaleString()}pt</p>
              </button>
            ))}
          </div>
          <div className="bg-white rounded-2xl p-4 border border-stone-100 shadow-sm">
            <p className="text-xs text-stone-400 mb-3">カスタムご褒美</p>
            <div className="flex gap-2 mb-2">
              <input type="text" value={customTask} onChange={(e) => setCustomTask(e.target.value)} placeholder="ご褒美名"
                className="flex-1 border border-stone-200 rounded-xl px-3 py-2 text-stone-800 text-sm focus:outline-none focus:border-green-400" />
              <input type="number" value={customPoints} onChange={(e) => setCustomPoints(e.target.value)} placeholder="pt"
                className="w-20 border border-stone-200 rounded-xl px-3 py-2 text-stone-800 text-sm focus:outline-none focus:border-green-400" />
            </div>
            <button onClick={() => { if (customTask && customPoints) { const pts = parseInt(customPoints); if (myPoints < pts) { showToast("ポイントが足りません💦"); return; } addTransaction("spend", customTask, pts); setCustomTask(""); setCustomPoints(""); } }}
              disabled={!customTask || !customPoints}
              className="w-full bg-red-400 text-white py-2.5 rounded-xl text-sm font-black disabled:opacity-30 hover:bg-red-500 transition-colors">
              使う
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ダッシュボード
  return (
    <div className="min-h-screen bg-stone-50 font-sans">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-stone-800 text-white px-5 py-3 rounded-2xl text-sm font-bold shadow-xl">
          {toast}
        </div>
      )}

      <header className="bg-white border-b border-stone-100 px-4 py-4 flex items-center justify-between shadow-sm">
        <h1 className="text-2xl font-black text-green-600 tracking-tighter">Fam</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400">CODE</span>
          <span className="text-xs text-green-600 font-black font-mono tracking-widest bg-green-50 px-2.5 py-1 rounded-lg border border-green-100">{roomCode}</span>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-5 space-y-4">

        {partner && (
          <div className="bg-green-500 rounded-2xl p-5 text-white shadow-lg shadow-green-200">
            <p className="text-xs text-green-100 uppercase tracking-widest mb-1">家族の合計ポイント</p>
            <p className="text-4xl font-black">{totalPoints.toLocaleString()}<span className="text-lg font-normal ml-1">pt</span></p>
          </div>
        )}

        <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
          <p className="text-xs text-stone-400 uppercase tracking-widest mb-4">現在の残高</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 border border-green-100 rounded-xl p-4">
              <p className="text-xs text-stone-500 mb-1">{myName} <span className="text-green-400 text-xs">（あなた）</span></p>
              <p className={`text-2xl font-black ${myPoints >= 0 ? "text-green-600" : "text-red-500"}`}>{myPoints.toLocaleString()}</p>
              <p className="text-xs text-stone-400">pt</p>
            </div>
            <div className="bg-stone-50 border border-stone-100 rounded-xl p-4">
              <p className="text-xs text-stone-500 mb-1">{partner || "パートナー"}</p>
              <p className={`text-2xl font-black ${partner ? (partnerPoints >= 0 ? "text-stone-700" : "text-red-500") : "text-stone-300"}`}>
                {partner ? partnerPoints.toLocaleString() : "---"}
              </p>
              <p className="text-xs text-stone-400">pt</p>
            </div>
          </div>
          {!partner && (
            <div className="mt-3 bg-green-50 rounded-xl p-3 text-center border border-green-100">
              <p className="text-xs text-stone-500">パートナーにコードを共有しよう 🎉</p>
              <p className="text-green-600 font-black font-mono tracking-widest text-xl mt-1">{roomCode}</p>
            </div>
          )}
        </div>

        {/* アクションボタン 4つ */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setScreen("earn")}
            className="bg-green-500 text-white py-4 rounded-2xl font-black text-sm hover:bg-green-600 transition-colors shadow-sm shadow-green-200">
            💪 稼ぐ
          </button>
          <button onClick={() => setScreen("spend")}
            className="bg-white text-stone-700 py-4 rounded-2xl font-black text-sm hover:bg-stone-50 transition-colors shadow-sm border border-stone-100">
            🎁 使う
          </button>
          <button onClick={() => setScreen("message")}
            className="bg-white text-stone-700 py-4 rounded-2xl font-black text-sm hover:bg-stone-50 transition-colors shadow-sm border border-stone-100">
            💌 メッセージ
          </button>
          <button onClick={() => setScreen("penalty")}
            className="bg-white text-red-400 py-4 rounded-2xl font-black text-sm hover:bg-red-50 transition-colors shadow-sm border border-red-100">
            ⚡ 没収する
          </button>
        </div>

        {/* 履歴 */}
        {transactions.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
            <p className="text-xs text-stone-400 uppercase tracking-widest mb-4">最近の活動</p>
            <div className="space-y-1">
              {transactions.slice(0, 20).map((t) => (
                <div key={t.id} className={`py-3 border-b border-stone-50 last:border-0 ${t.type === "message" ? "bg-green-50/50 rounded-xl px-3 -mx-3" : ""}`}>
                  {t.type === "message" ? (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">{t.member_name}</span>
                        <span className="text-xs text-stone-400">💌 メッセージ</span>
                      </div>
                      <p className="text-sm text-stone-700">{t.message}</p>
                      <p className="text-xs text-stone-300 mt-1">
                        {new Date(t.created_at).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  ) : t.type === "penalty" ? (
                    <div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">{t.member_name} → {t.target_name}</span>
                          </div>
                          <p className="text-sm text-stone-700 mt-0.5">⚡ {t.message}</p>
                          <p className="text-xs text-stone-300 mt-0.5">
                            {new Date(t.created_at).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <span className="text-sm font-black text-red-500">-{t.points}pt</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${t.member_name === myName ? "bg-green-50 text-green-600" : "bg-stone-100 text-stone-500"}`}>
                            {t.member_name}
                          </span>
                          <span className="text-sm text-stone-700">{t.task_name}</span>
                        </div>
                        <p className="text-xs text-stone-300 mt-0.5">
                          {new Date(t.created_at).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <span className={`text-sm font-black ${t.type === "earn" ? "text-green-500" : "text-red-400"}`}>
                        {t.type === "earn" ? "+" : "-"}{t.points.toLocaleString()}pt
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={() => { localStorage.removeItem("fam_session"); setScreen("login"); setRoomId(""); setRoomCode(""); setMyName(""); setTransactions([]); }}
          className="w-full text-stone-300 text-xs py-3 hover:text-stone-400 transition-colors">
          ログアウト
        </button>
      </div>
    </div>
  );
}
