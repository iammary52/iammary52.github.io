// ============================================================
//  Report.js  –  현금흐름 리포트 페이지
// ============================================================

function Report({ projectName, amountUnit, setStatus }) {
    const [reportData,  setReportData]  = React.useState([]);
    const [reportStats, setReportStats] = React.useState(null);

    const chartCanvasRef  = React.useRef(null);
    const chartInstanceRef = React.useRef(null);

    const execute = async () => {
        if (!projectName) { setStatus({ type: 'error', message: '대상 사업을 선택하세요.' }); return; }
        setStatus({ type: 'loading', message: '재무 연산 중...' });
        setReportData([]);
        setReportStats(null);

        try {
            const parsed = window.parseProjectName(projectName);
            const filter = { year: parsed.year, half: parsed.half, scenario: parsed.scenario };

            const [dataLand, dataDev, dataSup, dataRec] = await Promise.all([
                window.db.getTableData('land_costs',        filter),
                window.db.getTableData('development_costs', filter),
                window.db.getTableData('supplies',          filter),
                window.db.getTableData('recoveries',        filter),
            ]);

            const allYears = new Set();
            const grouped  = {};

            const add = (rows, type) => rows.forEach(d => {
                if (!grouped[d.target_year]) grouped[d.target_year] = { investment: 0, supply: 0, recovery: 0 };
                grouped[d.target_year][type] += d.amount;
                allYears.add(d.target_year);
            });

            add(dataLand || [], 'investment');
            add(dataDev  || [], 'investment');
            add(dataSup  || [], 'supply');
            add(dataRec  || [], 'recovery');

            const sortedYears = Array.from(allYears).sort((a, b) => a - b);
            const rData = [];
            let cumulative = 0;
            let totalInv = 0, totalSup = 0, totalRec = 0;

            for (const y of sortedYears) {
                const row = grouped[y];
                const net = row.recovery - row.investment;
                cumulative += net;
                rData.push({ year: y, investment: row.investment, recovery: row.recovery, supply: row.supply, netFlow: net, cumulative });
                totalInv += row.investment;
                totalSup += row.supply;
                totalRec += row.recovery;
            }

            let npv = 0, irr = 0;
            if (rData.length > 0) {
                const firstYear = rData[0].year;
                const rate = 0.045;
                rData.forEach(r => { npv += r.netFlow / Math.pow(1 + rate, r.year - firstYear); });

                const lastYear = rData[rData.length - 1].year;
                const cfArray = [];
                for (let y = firstYear; y <= lastYear; y++) {
                    const found = rData.find(d => d.year === y);
                    cfArray.push(found ? found.netFlow : 0);
                }
                irr = window.calculateIRR(cfArray);
            }

            setStatus(rData.length > 0 ? null : { type: 'error', message: '분석 가능한 투자/회수 데이터가 없습니다.' });
            setReportData(rData);
            setReportStats({ totalInv, totalSup, totalRec, npv, irr });
        } catch (err) {
            setStatus({ type: 'error', message: `분석 실패: ${err.message}` });
        }
    };

    const reset = () => { setReportData([]); setReportStats(null); setStatus(null); };

    // 차트 렌더링
    React.useEffect(() => {
        if (!reportData.length || !chartCanvasRef.current) return;
        if (chartInstanceRef.current) chartInstanceRef.current.destroy();

        const scale = window.getScale(amountUnit);
        const ctx = chartCanvasRef.current.getContext('2d');

        chartInstanceRef.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: reportData.map(d => d.year + '년'),
                datasets: [
                    {
                        label: '투자 규모 (Outflow)',
                        data: reportData.map(d => Math.abs(d.investment) / scale),
                        backgroundColor: 'rgba(0,74,156,.12)',
                        borderColor: '#004a9c',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.35,
                        pointRadius: 2,
                        pointHoverRadius: 5,
                        pointBackgroundColor: '#004a9c',
                    },
                    {
                        label: '회수 규모 (Inflow)',
                        data: reportData.map(d => d.recovery / scale),
                        backgroundColor: 'rgba(22,163,74,.18)',
                        borderColor: '#16a34a',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.35,
                        pointRadius: 2,
                        pointHoverRadius: 5,
                        pointBackgroundColor: '#16a34a',
                    },
                    {
                        label: '공급 규모 (Supply)',
                        data: reportData.map(d => d.supply / scale),
                        backgroundColor: 'transparent',
                        borderColor: '#ea580c',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        fill: false,
                        tension: 0.35,
                        pointRadius: 2,
                        pointHoverRadius: 5,
                        pointBackgroundColor: '#ea580c',
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { position: 'top', labels: { font: { size: 11, weight: 'bold' }, usePointStyle: true, boxWidth: 8 } },
                    tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${Math.round(ctx.raw).toLocaleString()}${amountUnit}` } },
                },
                scales: {
                    x: { grid: { color: '#eaecf0' } },
                    y: { grid: { color: '#eaecf0' }, ticks: { callback: v => v + amountUnit }, beginAtZero: true },
                },
            },
        });
    }, [reportData, amountUnit]);

    const exportToExcel = () => {
        if (!reportData.length) return;
        const scale = window.getScale(amountUnit);
        const wb = XLSX.utils.book_new();
        const rows = reportData.map(r => ({
            '귀속연도': `${r.year}년`,
            [`투입액(${amountUnit})`]:      r.investment / scale,
            [`회수액(${amountUnit})`]:      r.recovery   / scale,
            [`순흐름_NCF(${amountUnit})`]:  r.netFlow    / scale,
            [`누적자금수지(${amountUnit})`]: r.cumulative / scale,
        }));
        window.appendStyledSheet(wb, rows, `${projectName}_현금흐름`);
        XLSX.writeFile(wb, `${window.sanitizeText(projectName)}_현금흐름리포트.xlsx`);
    };

    const fmt = v => window.formatAmount(v, amountUnit);

    return (
        <>
            {/* 도구 모음 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', background: '#fff', borderBottom: '1px solid var(--border)' }}>
                <button className="tbtn acc" onClick={execute} disabled={!projectName}>분석 실행</button>
                <button className="tbtn" onClick={reset}>초기화</button>
                {reportData.length > 0 && (
                    <button className="tbtn" onClick={exportToExcel} style={{ marginLeft: 'auto' }}>엑셀 내보내기</button>
                )}
            </div>

            {/* KPI 카드 */}
            {reportStats && (
                <div className="stat-row" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                    <div className="scard b">
                        <div className="sl">NPV (할인율 4.5%)</div>
                        <div><span className="sv">{fmt(reportStats.npv)}</span><span className="su">{amountUnit}</span></div>
                        <div className="ss">최초 투자연도 기준</div>
                    </div>
                    <div className="scard t">
                        <div className="sl">IRR (내부수익률)</div>
                        <div><span className="sv">{(reportStats.irr * 100).toFixed(2)}</span><span className="su">%</span></div>
                        <div className="ss">현금흐름 근사 추정치</div>
                    </div>
                    <div className="scard g">
                        <div className="sl">총 투자 (용지+조성)</div>
                        <div><span className="sv">{fmt(reportStats.totalInv)}</span><span className="su">{amountUnit}</span></div>
                        <div className="ss">집행 예상/실적 총계</div>
                    </div>
                    <div className="scard o">
                        <div className="sl">총 공급</div>
                        <div><span className="sv">{fmt(reportStats.totalSup)}</span><span className="su">{amountUnit}</span></div>
                        <div className="ss">분양/공급 계획 총계</div>
                    </div>
                    <div className="scard p">
                        <div className="sl">총 회수</div>
                        <div><span className="sv">{fmt(reportStats.totalRec)}</span><span className="su">{amountUnit}</span></div>
                        <div className="ss">실 회수 실적 총계</div>
                    </div>
                </div>
            )}

            {/* 차트 */}
            {reportData.length > 0 && (
                <div className="panel" style={{ height: '300px', display: 'flex', flexDirection: 'column' }}>
                    <div className="phd" style={{ flexShrink: 0 }}><div className="pt">투자 / 회수 추이 차트</div></div>
                    <div className="chart-contain" style={{ padding: '10px' }}>
                        <canvas ref={chartCanvasRef}></canvas>
                    </div>
                </div>
            )}

            {/* 테이블 */}
            {reportData.length > 0 && (
                <div className="panel">
                    <div className="phd"><div className="pt">집행/회수 테이블 요약</div></div>
                    <div className="pb0">
                        <div className="grid-wrap" style={{ maxHeight: '350px' }}>
                            <table className="dgrid">
                                <thead>
                                    <tr>
                                        <th>귀속 연도</th>
                                        <th>투입액 (용지/조성)</th>
                                        <th>회수액</th>
                                        <th>당해년 NCF</th>
                                        <th>누적 자금수지</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.map((r, i) => (
                                        <tr key={i}>
                                            <td style={{ textAlign: 'center' }}>{r.year}년</td>
                                            <td className="neg">{fmt(r.investment)}</td>
                                            <td className="pos">{fmt(r.recovery)}</td>
                                            <td className={r.netFlow >= 0 ? 'pos' : 'neg'} style={{ background: 'var(--panel-2)' }}>{fmt(r.netFlow)}</td>
                                            <td className={r.cumulative >= 0 ? 'pos' : 'neg'} style={{ background: 'var(--acc-lt)', fontWeight: 700 }}>{fmt(r.cumulative)}</td>
                                        </tr>
                                    ))}
                                    <tr className="tot">
                                        <td style={{ textAlign: 'center' }}>총계</td>
                                        <td className="neg">{fmt(reportData.reduce((s, x) => s + x.investment, 0))}</td>
                                        <td className="pos">{fmt(reportData.reduce((s, x) => s + x.recovery,   0))}</td>
                                        <td className={reportData.reduce((s, x) => s + x.netFlow, 0) >= 0 ? 'pos' : 'neg'}>
                                            {fmt(reportData.reduce((s, x) => s + x.netFlow, 0))}
                                        </td>
                                        <td>-</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
