"use client";

import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "budget-app-v2";

const CATEGORIES = [
  "월세",
  "식비",
  "전기세",
  "수도세",
  "가스비",
  "생필품",
  "교통비",
  "개인소비",
  "구독",
  "기타",
];

const DEFAULT_BUDGET = {
  월세: 55,
  식비: 45,
  전기세: 3,
  수도세: 2,
  가스비: 4,
  생필품비: 15,
  교통비: 7,
  개인소비: 20,
  구독: 2,
  기타: 5,
};

const DEFAULT_ENTRIES = [
  { id: 1, date: "2026-04-01", category: "월세", amount: 55, memo: "관리비 포함" },
  { id: 2, date: "2026-04-03", category: "구독", amount: 1.7, memo: "넷플릭스 + 배민" },
  { id: 3, date: "2026-04-04", category: "교통비", amount: 0.32, memo: "지하철" },
];

function getMonthValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function toDateInputValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatWonManwon(value) {
  const numeric = Number(value) || 0;
  return `${Math.round(numeric * 10000).toLocaleString("ko-KR")}원`;
}

function monthOf(dateStr) {
  return String(dateStr).slice(0, 7);
}

function makeCalendarDays(monthValue) {
  const [year, month] = monthValue.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const lastDate = new Date(year, month, 0).getDate();
  const startWeekday = firstDay.getDay();
  const cells = [];

  for (let i = 0; i < startWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= lastDate; day += 1) cells.push(new Date(year, month - 1, day));
  return cells;
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [selectedTab, setSelectedTab] = useState("home");
  const [selectedMonth, setSelectedMonth] = useState(getMonthValue());
  const [salary, setSalary] = useState(280);
  const [budget, setBudget] = useState(DEFAULT_BUDGET);
  const [entries, setEntries] = useState(DEFAULT_ENTRIES);
  const [selectedDate, setSelectedDate] = useState(toDateInputValue(new Date()));
  const [saveMessage, setSaveMessage] = useState("자동 저장 대기 중");
  const [form, setForm] = useState({
    date: toDateInputValue(new Date()),
    category: "식비",
    amount: "",
    memo: "",
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.selectedMonth) setSelectedMonth(parsed.selectedMonth);
        if (parsed.salary) setSalary(Number(parsed.salary) || 280);
        if (parsed.budget) setBudget(parsed.budget);
        if (Array.isArray(parsed.entries)) setEntries(parsed.entries);
      }
    } catch (error) {
      console.error("저장 데이터 불러오기 실패", error);
    } finally {
      setMounted(true);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          selectedMonth,
          salary,
          budget,
          entries,
        })
      );
      setSaveMessage("자동 저장됨");
      const timer = setTimeout(() => setSaveMessage("자동 저장 대기 중"), 1200);
      return () => clearTimeout(timer);
    } catch (error) {
      console.error("저장 실패", error);
      setSaveMessage("저장 실패");
    }
  }, [mounted, selectedMonth, salary, budget, entries]);

  const monthEntries = useMemo(() => {
    return entries
      .filter((item) => monthOf(item.date) === selectedMonth)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [entries, selectedMonth]);

  const totalBudget = useMemo(() => {
    return Object.values(budget).reduce((sum, value) => sum + (Number(value) || 0), 0);
  }, [budget]);

  const totalSpent = useMemo(() => {
    return monthEntries.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [monthEntries]);

  const remainBudget = totalBudget - totalSpent;
  const remainSalary = salary - totalSpent;
  const usageRate = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;

  const categorySummary = useMemo(() => {
    return CATEGORIES.map((category) => {
      const spent = monthEntries
        .filter((item) => item.category === category)
        .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      const monthBudget = Number(budget[category]) || 0;
      return {
        category,
        spent,
        budget: monthBudget,
        remain: monthBudget - spent,
        percent: monthBudget > 0 ? Math.min(100, Math.round((spent / monthBudget) * 100)) : 0,
      };
    });
  }, [monthEntries, budget]);

  const dailyTotalMap = useMemo(() => {
    const result = {};
    monthEntries.forEach((item) => {
      result[item.date] = (result[item.date] || 0) + (Number(item.amount) || 0);
    });
    return result;
  }, [monthEntries]);

  const selectedDateEntries = useMemo(() => {
    return monthEntries.filter((item) => item.date === selectedDate);
  }, [monthEntries, selectedDate]);

  const monthlyChart = useMemo(() => {
    const year = Number(selectedMonth.slice(0, 4));
    return Array.from({ length: 12 }, (_, index) => {
      const monthText = `${year}-${String(index + 1).padStart(2, "0")}`;
      const spent = entries
        .filter((item) => monthOf(item.date) === monthText)
        .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      return { label: `${index + 1}월`, spent };
    });
  }, [entries, selectedMonth]);

  const maxChart = useMemo(() => Math.max(1, ...monthlyChart.map((item) => item.spent)), [monthlyChart]);
  const calendarCells = useMemo(() => makeCalendarDays(selectedMonth), [selectedMonth]);

  const handleAddEntry = () => {
    const amount = Number(form.amount);
    if (!form.date || !form.category || Number.isNaN(amount) || amount <= 0) return;

    const newEntry = {
      id: Date.now(),
      date: form.date,
      category: form.category,
      amount,
      memo: form.memo.trim(),
    };

    setEntries((prev) => [newEntry, ...prev]);
    setForm({
      date: `${selectedMonth}-01`,
      category: "식비",
      amount: "",
      memo: "",
    });
    setSelectedTab("list");
  };

  const handleDeleteEntry = (id) => {
    setEntries((prev) => prev.filter((item) => item.id !== id));
  };

  const handleBackup = () => {
    downloadJson(`가계부백업-${selectedMonth}.json`, {
      selectedMonth,
      salary,
      budget,
      entries,
      exportedAt: new Date().toISOString(),
    });
  };

  const handleImport = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(String(e.target?.result || "{}"));
        if (parsed.selectedMonth) setSelectedMonth(parsed.selectedMonth);
        if (parsed.salary) setSalary(Number(parsed.salary) || 280);
        if (parsed.budget) setBudget(parsed.budget);
        if (Array.isArray(parsed.entries)) setEntries(parsed.entries);
        setSaveMessage("불러오기 완료");
      } catch (error) {
        console.error(error);
        setSaveMessage("불러오기 실패");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const handleReset = () => {
    setSalary(280);
    setBudget(DEFAULT_BUDGET);
    setEntries([]);
    setSelectedMonth(getMonthValue());
    setSelectedDate(toDateInputValue(new Date()));
    setForm({
      date: toDateInputValue(new Date()),
      category: "식비",
      amount: "",
      memo: "",
    });
    localStorage.removeItem(STORAGE_KEY);
    setSaveMessage("초기화 완료");
  };

  if (!mounted) {
    return <div style={{ padding: 24, fontFamily: "sans-serif" }}>불러오는 중...</div>;
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: #f3f6fb; color: #0f172a; font-family: Arial, sans-serif; }
        button, input, select { font: inherit; }
        .app { min-height: 100vh; padding: 16px 16px 88px; }
        .shell { max-width: 860px; margin: 0 auto; display: grid; gap: 14px; }
        .title { font-size: 30px; font-weight: 800; margin: 0; }
        .sub { color: #64748b; font-size: 14px; margin-top: 6px; }
        .card { background: white; border-radius: 24px; padding: 18px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); }
        .summaryGrid { display: grid; gap: 14px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .label { font-size: 13px; color: #64748b; margin-bottom: 8px; }
        .big { font-size: 24px; font-weight: 800; }
        .danger { color: #dc2626; }
        .toolbar { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
        .input, .select { width: 100%; border: 1px solid #dbe3ef; border-radius: 14px; background: white; padding: 12px 14px; }
        .btn { border: 0; border-radius: 16px; padding: 12px 16px; background: #111827; color: white; font-weight: 700; cursor: pointer; }
        .btn.secondary { background: white; color: #0f172a; border: 1px solid #dbe3ef; }
        .btn.full { width: 100%; }
        .sectionTitle { margin: 0 0 12px; font-size: 19px; font-weight: 800; }
        .progressWrap { height: 10px; background: #e5edf7; border-radius: 999px; overflow: hidden; }
        .progressBar { height: 100%; background: #111827; border-radius: 999px; }
        .entry { display: flex; justify-content: space-between; gap: 12px; padding: 14px; border: 1px solid #e5edf7; border-radius: 18px; margin-top: 10px; }
        .badge { display: inline-block; background: #eef2ff; color: #3730a3; border-radius: 999px; padding: 5px 10px; font-size: 12px; font-weight: 700; }
        .muted { color: #64748b; font-size: 13px; }
        .calendar { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; }
        .dayHead { text-align: center; color: #64748b; font-size: 12px; font-weight: 700; padding: 6px 0; }
        .dayCell { min-height: 78px; background: white; border: 1px solid #e5edf7; border-radius: 18px; padding: 8px; cursor: pointer; }
        .dayCell.selected { outline: 2px solid #111827; }
        .dayNum { font-weight: 700; font-size: 14px; }
        .dayAmt { margin-top: 8px; font-size: 12px; color: #2563eb; font-weight: 700; }
        .bottomNav { position: fixed; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.96); border-top: 1px solid #e5edf7; display: grid; grid-template-columns: repeat(4, 1fr); padding: 10px 8px calc(10px + env(safe-area-inset-bottom)); backdrop-filter: blur(12px); }
        .navBtn { border: 0; background: transparent; padding: 8px 4px; font-weight: 700; color: #64748b; cursor: pointer; border-radius: 14px; }
        .navBtn.active { background: #eef2ff; color: #111827; }
        .chartRow { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 8px; align-items: end; height: 220px; margin-top: 18px; }
        .barWrap { display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .bar { width: 100%; max-width: 28px; border-radius: 10px 10px 0 0; background: #111827; min-height: 6px; }
        .barLabel { font-size: 11px; color: #64748b; }
        .twoCol { display: grid; gap: 14px; grid-template-columns: 1fr; }
        @media (min-width: 720px) {
          .summaryGrid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
          .twoCol { grid-template-columns: 1.1fr 0.9fr; }
        }
      `}</style>

      <div className="app">
        <div className="shell">
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div>
                <h1 className="title">가계부 앱</h1>
                <div className="sub">앱형 UI · 자동 저장 · 백업/복원 · 월별 분석</div>
              </div>
              <div className="muted">{saveMessage}</div>
            </div>

            <div className="toolbar">
              <input className="input" style={{ maxWidth: 170 }} type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
              <button className="btn secondary" onClick={handleBackup}>백업</button>
              <label className="btn secondary" style={{ display: "inline-flex", alignItems: "center" }}>
                불러오기
                <input hidden type="file" accept="application/json" onChange={handleImport} />
              </label>
              <button className="btn secondary" onClick={handleReset}>초기화</button>
            </div>
          </div>

          <div className="summaryGrid">
            <div className="card">
              <div className="label">이번 달 예산</div>
              <div className="big">{formatWonManwon(totalBudget)}</div>
            </div>
            <div className="card">
              <div className="label">이번 달 지출</div>
              <div className="big">{formatWonManwon(totalSpent)}</div>
            </div>
            <div className="card">
              <div className="label">남은 예산</div>
              <div className={`big ${remainBudget < 0 ? "danger" : ""}`}>{formatWonManwon(remainBudget)}</div>
            </div>
            <div className="card">
              <div className="label">월급 기준 남는 돈</div>
              <div className={`big ${remainSalary < 0 ? "danger" : ""}`}>{formatWonManwon(remainSalary)}</div>
            </div>
          </div>

          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <div className="label" style={{ marginBottom: 0 }}>예산 사용률</div>
              <div className="muted">{usageRate}%</div>
            </div>
            <div className="progressWrap">
              <div className="progressBar" style={{ width: `${usageRate}%` }} />
            </div>
          </div>

          {selectedTab === "home" && (
            <div className="twoCol">
              <div className="card">
                <h2 className="sectionTitle">빠른 지출 입력</h2>
                <div style={{ display: "grid", gap: 12 }}>
                  <div>
                    <div className="label">날짜</div>
                    <input className="input" type="date" value={form.date} onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))} />
                  </div>
                  <div>
                    <div className="label">항목</div>
                    <select className="select" value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}>
                      {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="label">금액 (만원)</div>
                    <input className="input" type="number" min="0" step="0.01" placeholder="예: 1.5" value={form.amount} onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))} />
                  </div>
                  <div>
                    <div className="label">메모</div>
                    <input className="input" placeholder="예: 장보기, 카페, 교통" value={form.memo} onChange={(e) => setForm((prev) => ({ ...prev, memo: e.target.value }))} />
                  </div>
                  <button className="btn full" onClick={handleAddEntry}>저장하기</button>
                </div>
              </div>

              <div className="card">
                <h2 className="sectionTitle">항목별 예산 비교</h2>
                {categorySummary.map((item) => (
                  <div key={item.category} style={{ marginTop: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{item.category}</div>
                      <div className="muted">{formatWonManwon(item.spent)} / {formatWonManwon(item.budget)}</div>
                    </div>
                    <div className="progressWrap">
                      <div className="progressBar" style={{ width: `${item.percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedTab === "list" && (
            <div className="card">
              <h2 className="sectionTitle">최근 지출 내역</h2>
              {monthEntries.length === 0 ? (
                <div className="muted">아직 지출 내역이 없습니다.</div>
              ) : (
                monthEntries.map((item) => (
                  <div className="entry" key={item.id}>
                    <div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span className="badge">{item.category}</span>
                        <span className="muted">{item.date}</span>
                      </div>
                      <div style={{ marginTop: 8 }}>{item.memo || "메모 없음"}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 800 }}>{formatWonManwon(item.amount)}</div>
                      <button className="btn secondary" style={{ marginTop: 10, padding: "8px 12px" }} onClick={() => handleDeleteEntry(item.id)}>삭제</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {selectedTab === "calendar" && (
            <div className="twoCol">
              <div className="card">
                <h2 className="sectionTitle">달력 보기</h2>
                <div className="calendar">
                  {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
                    <div key={day} className="dayHead">{day}</div>
                  ))}
                  {calendarCells.map((date, index) => {
                    if (!date) return <div key={`blank-${index}`} />;
                    const key = toDateInputValue(date);
                    const amount = dailyTotalMap[key] || 0;
                    const isSelected = key === selectedDate;
                    return (
                      <div key={key} className={`dayCell ${isSelected ? "selected" : ""}`} onClick={() => setSelectedDate(key)}>
                        <div className="dayNum">{date.getDate()}</div>
                        {amount > 0 && <div className="dayAmt">{formatWonManwon(amount)}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="card">
                <h2 className="sectionTitle">선택한 날짜 지출</h2>
                <div className="muted">선택 날짜: {selectedDate}</div>
                {selectedDateEntries.length === 0 ? (
                  <div style={{ marginTop: 14 }} className="muted">해당 날짜의 지출 내역이 없습니다.</div>
                ) : (
                  selectedDateEntries.map((item) => (
                    <div key={item.id} className="entry">
                      <div>
                        <div className="badge">{item.category}</div>
                        <div style={{ marginTop: 8 }}>{item.memo || "메모 없음"}</div>
                      </div>
                      <div style={{ fontWeight: 800 }}>{formatWonManwon(item.amount)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {selectedTab === "stats" && (
            <div className="twoCol">
              <div className="card">
                <h2 className="sectionTitle">월별 지출 추이</h2>
                <div className="chartRow">
                  {monthlyChart.map((item) => (
                    <div className="barWrap" key={item.label}>
                      <div className="bar" style={{ height: `${Math.max(8, (item.spent / maxChart) * 180)}px` }} />
                      <div className="barLabel">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h2 className="sectionTitle">기본 설정</h2>
                <div style={{ display: "grid", gap: 12 }}>
                  <div>
                    <div className="label">월급 (만원)</div>
                    <input className="input" type="number" min="0" step="0.01" value={salary} onChange={(e) => setSalary(Number(e.target.value || 0))} />
                  </div>
                  {CATEGORIES.map((category) => (
                    <div key={category}>
                      <div className="label">{category} 예산 (만원)</div>
                      <input className="input" type="number" min="0" step="0.01" value={budget[category] ?? 0} onChange={(e) => setBudget((prev) => ({ ...prev, [category]: Number(e.target.value || 0) }))} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bottomNav">
          <button className={`navBtn ${selectedTab === "home" ? "active" : ""}`} onClick={() => setSelectedTab("home")}>홈</button>
          <button className={`navBtn ${selectedTab === "list" ? "active" : ""}`} onClick={() => setSelectedTab("list")}>기록</button>
          <button className={`navBtn ${selectedTab === "calendar" ? "active" : ""}`} onClick={() => setSelectedTab("calendar")}>달력</button>
          <button className={`navBtn ${selectedTab === "stats" ? "active" : ""}`} onClick={() => setSelectedTab("stats")}>분석</button>
        </div>
      </div>
    </>
  );
}
