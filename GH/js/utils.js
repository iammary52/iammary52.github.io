// ============================================================
//  utils.js  –  공통 유틸리티
// ============================================================

// ── 단위 변환 ─────────────────────────────────────────────
window.getScale = (unit) => {
    if (unit === '백만원') return 1000;
    if (unit === '억원')   return 100000;
    return 1;
};

window.formatAmount = (v, unit) => {
    if (v == null || v === 0) return '0';
    return Math.round(v / window.getScale(unit)).toLocaleString();
};

// ── 프로젝트명 파싱 / 계층 빌드 ──────────────────────────
window.parseProjectName = (name) => {
    const m = String(name).match(/^(\d{4})년\s+(상반기|하반기)\s+(.+)$/);
    if (m) return { year: parseInt(m[1]), half: m[2], scenario: m[3] };
    return { year: null, half: null, scenario: name };
};

window.buildHierarchy = (list) => {
    const root = {};
    const unclassified = [];

    list.forEach(p => {
        const { year: y, half: h } = p;
        if (y && h) {
            const yKey = `${y}년`;
            if (!root[yKey])    root[yKey] = {};
            if (!root[yKey][h]) root[yKey][h] = [];
            root[yKey][h].push(p);
        } else {
            unclassified.push(p);
        }
    });

    return { classified: root, unclassified };
};

// ── 엑셀 셀 값 파싱 ──────────────────────────────────────
window.extractYear = (val) => {
    if (val == null || val === '') return null;
    if (typeof val === 'number') {
        if (val > 1900 && val < 2100) return Math.floor(val);
        if (val > 30000 && val < 90000) return new Date((val - 25569) * 86400 * 1000).getFullYear();
    }
    const m = String(val).match(/(19\d{2}|20\d{2})/);
    return m ? Number(m[1]) : null;
};

window.parseAmt = (val) => {
    if (val == null || val === '' || val === '-') return 0;
    if (typeof val === 'number') return val;
    const n = Number(String(val).replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
};

// ── 파일명 / 시트명 안전 처리 ─────────────────────────────
window.sanitizeText = (value, fallback = '미지정') => {
    const clean = String(value || fallback)
        .replace(/[\\/:*?"<>|[\]]/g, '_')
        .replace(/\s+/g, ' ')
        .trim();
    return clean || fallback;
};

window.sanitizeSheetName = (value) => window.sanitizeText(value).slice(0, 31);

// ── IRR 계산 (Newton-Raphson) ─────────────────────────────
window.calculateIRR = (cashFlows, guess = 0.1) => {
    const maxIter = 1000;
    const epsilon = 1e-6;
    let rate = guess;
    for (let i = 0; i < maxIter; i++) {
        let npv = 0, deriv = 0;
        for (let t = 0; t < cashFlows.length; t++) {
            npv   +=  cashFlows[t] / Math.pow(1 + rate, t);
            deriv -= t * cashFlows[t] / Math.pow(1 + rate, t + 1);
        }
        if (Math.abs(npv) < epsilon) break;
        if (Math.abs(deriv) < epsilon) break;
        const newRate = rate - npv / deriv;
        if (Math.abs(newRate - rate) < epsilon) return newRate;
        rate = newRate;
    }
    return 0;
};

// ── 엑셀 내보내기 공통 스타일 ─────────────────────────────
window.styleWorksheet = (ws, rows) => {
    if (!rows || rows.length === 0) return ws;
    const range = XLSX.utils.decode_range(ws['!ref']);
    const headerFill = { fgColor: { rgb: '1F2937' } };
    const totalFill  = { fgColor: { rgb: 'EEF2FF' } };
    const border = {
        top:    { style: 'thin', color: { rgb: 'D9E2EC' } },
        bottom: { style: 'thin', color: { rgb: 'D9E2EC' } },
        left:   { style: 'thin', color: { rgb: 'D9E2EC' } },
        right:  { style: 'thin', color: { rgb: 'D9E2EC' } },
    };
    const widths = [];

    for (let c = range.s.c; c <= range.e.c; c++) {
        const hAddr = XLSX.utils.encode_cell({ r: 0, c });
        const hCell = ws[hAddr];
        const hText = hCell?.v ? String(hCell.v) : '';
        let maxW = hText.length;

        if (hCell) {
            hCell.s = {
                font: { bold: true, color: { rgb: 'FFFFFF' } },
                fill: headerFill,
                alignment: { horizontal: 'center', vertical: 'center' },
                border,
            };
        }

        for (let r = range.s.r + 1; r <= range.e.r; r++) {
            const addr = XLSX.utils.encode_cell({ r, c });
            const cell = ws[addr];
            if (!cell) continue;
            const isNum  = typeof cell.v === 'number';
            const isTot  = /총계|총투입|총회수|수지|누적|NCF/.test(hText);
            maxW = Math.max(maxW, String(cell.v ?? '').length);
            cell.s = {
                font: { color: { rgb: isNum && cell.v < 0 ? 'DC2626' : '111827' } },
                fill: isTot ? totalFill : { fgColor: { rgb: 'FFFFFF' } },
                alignment: { horizontal: isNum ? 'right' : 'left', vertical: 'center', wrapText: true },
                border,
                numFmt: isNum ? '#,##0;[Red]-#,##0;0' : undefined,
            };
        }
        widths.push({ wch: Math.min(Math.max(maxW + 2, c === 0 ? 18 : 12), 28) });
    }

    ws['!cols']       = widths;
    ws['!rows']       = [{ hpt: 24 }];
    ws['!autofilter'] = { ref: ws['!ref'] };
    return ws;
};

window.appendStyledSheet = (wb, rows, sheetName) => {
    const ws = XLSX.utils.json_to_sheet(rows);
    window.styleWorksheet(ws, rows);
    XLSX.utils.book_append_sheet(wb, ws, window.sanitizeSheetName(sheetName));
};
