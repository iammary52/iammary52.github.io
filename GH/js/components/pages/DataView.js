// ============================================================
//  DataView.js  –  데이터 조회 (피벗 테이블) 페이지
// ============================================================

function DataView({ projectName, amountUnit, setStatus, onExport }) {
    const { TABLES } = window.APP_CONFIG;

    const [viewTable, setViewTable] = React.useState('land_costs');
    const [viewData,  setViewData]  = React.useState([]);
    const [viewYears, setViewYears] = React.useState([]);

    // viewTable 변경 시 결과 초기화
    React.useEffect(() => {
        setViewData([]);
        setViewYears([]);
    }, [viewTable]);

    const execute = async () => {
        if (!projectName) { setStatus({ type: 'error', message: '대상 사업을 선택하세요.' }); return; }
        setStatus({ type: 'loading', message: 'DB 조회 중...' });
        setViewData([]);

        try {
            const parsed = window.parseProjectName(projectName);
            const data = await window.db.getTableData(viewTable, { year: parsed.year, half: parsed.half, scenario: parsed.scenario });
            if (!data || data.length === 0) {
                setStatus({ type: 'error', message: '해당 조건으로 등록된 데이터가 없습니다.' });
                return;
            }

            const yearSet  = new Set();
            const itemMap  = new Map();

            data.forEach(d => {
                yearSet.add(d.target_year);
                if (!itemMap.has(d.detail_item)) itemMap.set(d.detail_item, {});
                itemMap.get(d.detail_item)[d.target_year] = (itemMap.get(d.detail_item)[d.target_year] || 0) + d.amount;
            });

            const sortedYears = Array.from(yearSet).sort((a, b) => a - b);
            const pivotArray  = [];

            for (const [itemName, amounts] of itemMap.entries()) {
                let total = 0;
                const yData = {};
                sortedYears.forEach(y => { const amt = amounts[y] || 0; yData[y] = amt; total += amt; });
                pivotArray.push({ detailItem: itemName, yearData: yData, total });
            }

            setViewYears(sortedYears);
            setViewData(pivotArray);
            setStatus(null);

            // 부모에 export 함수 전달
            onExport(() => exportToExcel(pivotArray, sortedYears));
        } catch (err) {
            setStatus({ type: 'error', message: `DB 오류: ${err.message}` });
        }
    };

    const reset = () => { setViewData([]); setViewYears([]); setStatus(null); };

    const exportToExcel = (data, years) => {
        if (!data || data.length === 0) return;
        const unit = amountUnit;
        const scale = window.getScale(unit);
        const wb = XLSX.utils.book_new();
        const rows = data.map(row => {
            const r = { '세부 항목명': row.detailItem };
            years.forEach(y => r[`${y}년(${unit})`] = (row.yearData[y] || 0) / scale);
            r[`총계(${unit})`] = row.total / scale;
            return r;
        });
        window.appendStyledSheet(wb, rows, `${projectName}_${TABLES.find(t => t.id === viewTable)?.label}`);
        XLSX.writeFile(wb, `${window.sanitizeText(projectName)}_데이터조회.xlsx`);
    };

    return (
        <>
            {/* 탭 바 */}
            <div className="tabbar">
                {TABLES.map(t => (
                    <div key={t.id} className={`tab ${viewTable === t.id ? 'active' : ''}`}
                        onClick={() => setViewTable(t.id)}>
                        {t.label} 뷰
                    </div>
                ))}
            </div>

            {/* 도구 모음 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', background: '#fff', borderBottom: '1px solid var(--border)' }}>
                <button className="tbtn acc" onClick={execute} disabled={!projectName}>조회 실행</button>
                <button className="tbtn" onClick={reset}>초기화</button>
                {viewData.length > 0 && (
                    <button className="tbtn" onClick={() => exportToExcel(viewData, viewYears)} style={{ marginLeft: 'auto' }}>
                        엑셀 내보내기
                    </button>
                )}
            </div>

            {viewData.length > 0 && (
                <div className="panel">
                    <div className="phd">
                        <div className="pt">DB 조회결과 · {TABLES.find(t => t.id === viewTable)?.label}</div>
                        <span style={{ fontSize: '11.5px', color: 'var(--text3)' }}>단위: {amountUnit}</span>
                    </div>
                    <div className="pb0">
                        <div className="grid-wrap" style={{ maxHeight: '500px' }}>
                            <table className="dgrid">
                                <thead>
                                    <tr>
                                        <th>세부 항목명</th>
                                        {viewYears.map(y => <th key={y}>{y}년</th>)}
                                        <th>총계</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {viewData.map((row, i) => (
                                        <tr key={i}>
                                            <td>{row.detailItem}</td>
                                            {viewYears.map(y => (
                                                <td key={y} className={row.yearData[y] < 0 ? 'neg' : ''}>
                                                    {window.formatAmount(row.yearData[y], amountUnit)}
                                                </td>
                                            ))}
                                            <td className={row.total < 0 ? 'neg' : ''}>
                                                {window.formatAmount(row.total, amountUnit)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
