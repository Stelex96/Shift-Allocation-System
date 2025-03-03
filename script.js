let fclmData = [];
const ROWS = 50;
const START_HOUR = 6;
const END_HOUR = 23.5;
const COLS = (END_HOUR - START_HOUR) * 4;

function initGrid() {
    const headers = ['Nome', 'Cancella'];
    for (let i = 0; i < COLS; i++) {
        const hour = START_HOUR + Math.floor(i / 4);
        const minute = (i % 4) * 15;
        headers.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
    }

    fclmData = Array.from({ length: ROWS }, (_, row) =>
        Array.from({ length: headers.length }, (_, col) =>
            col === 0 ? '' : ''
        )
    );

    fclmData.unshift(headers);
    renderGrid();
}

function renderGrid() {
    const grid = document.getElementById('grid');
    grid.style.gridTemplateColumns = `150px 80px repeat(${COLS}, 80px)`;
    
    grid.innerHTML = fclmData.flatMap((row, ri) =>
        row.map((cell, ci) =>
            `<div class="${ri === 0 ? 'header-cell' : 'cell'} ${getRoleClass(cell)}"
                  data-row="${ri}"
                  data-col="${ci}"
                  ${ri > 0 && ci > 1 ? 'contenteditable="true" oninput="updateCell('+ri+','+ci+',this.innerText)"' : ''}>
                ${ri === 0 ? cell : cell}
                ${ri > 0 && ci === 1 ? `<button class="delete-row" onclick="deleteRow(${ri})">X</button>` : ''}
            </div>`
        ).join('')
    ).join('');
}

function getRoleClass(value) {
    const roleColors = {
        Supervisor: 'role-supervisor',
        Mentor: 'role-mentor',
        Admin: 'role-admin',
        QC: 'role-qc',
        Cleaning: 'role-cleaning',
        Training: 'role-training',
        Wrap: 'role-wrap',
        RCB: 'role-rcb',
        Pick: 'role-pick',
        Abs: 'role-abs',
        Pausa: 'role-pausa'
    };
    return roleColors[value] || '';
}

function allocateShifts() {
    showLoading();
    setTimeout(() => {
        const startTimeInput = document.getElementById('startTime').value;
        const endTimeInput = document.getElementById('endTime').value;
        const [startHours, startMinutes] = startTimeInput.split(':').map(Number);
        const [endHours, endMinutes] = endTimeInput.split(':').map(Number);
        const startTime = startHours + startMinutes / 60;
        const endTime = endHours + endMinutes / 60;
        const targetRole = document.getElementById('targetRole').value;
        const names = document.getElementById('names').value.split(',').map(n => n.trim());

        if (!validateTime(startTime) || !validateTime(endTime) || !targetRole || names.length === 0) {
            alert('Dati mancanti o non validi!');
            hideLoading();
            return;
        }

        const startCol = timeToColumn(startTime);
        const endCol = timeToColumn(endTime);

        names.forEach(name => {
            let rowIndex = fclmData.findIndex(row => row[0].toLowerCase() === name.toLowerCase());
            
            if (rowIndex === -1) {
                rowIndex = fclmData.findIndex(row => row[0] === '');
                if (rowIndex === -1) return;
                fclmData[rowIndex][0] = name;
            }

            for (let col = startCol; col < endCol; col++) {
                fclmData[rowIndex][col + 2] = targetRole;
            }
        });

        renderGrid();
        hideLoading();
    }, 500);
}

function deleteRow(row) {
    fclmData[row] = Array.from({ length: fclmData[row].length }, () => '');
    renderGrid();
}

function clearAll() {
    fclmData = fclmData.map((row, index) => 
        index === 0 ? row : row.map(() => '')
    );
    renderGrid();
}

function timeToColumn(time) {
    return Math.round((time - START_HOUR) * 4);
}

function validateTime(time) {
    return time >= START_HOUR && time <= END_HOUR;
}

function updateCell(row, col, value) {
    fclmData[row][col] = value;
}

function exportData() {
    const csv = fclmData.map(row => row.join(';')).join('\n');
    downloadCSV(csv, 'shift_allocations.csv');
}

function downloadCSV(data, filename) {
    const blob = new Blob([data], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

function showHelp() {
    alert(`Guida rapida:
1. Inserisci l'orario di inizio e fine (es. 09:00 - 17:00)
2. Seleziona il ruolo
3. Inserisci i nomi separati da virgola
4. Clicca "Alloca Turni" per assegnare i turni
5. Usa i pulsanti per esportare o cancellare`);
}

function updateSummary() {
    const roleHours = {};

    fclmData.slice(1).forEach(row => {
        row.slice(2).forEach(cell => {
            if (cell && roleHours[cell]) {
                roleHours[cell] += 0.25;
            } else if (cell) {
                roleHours[cell] = 0.25;
            }
        });
    });

    const summaryTable = document.getElementById('summaryTable');
    summaryTable.innerHTML = Object.entries(roleHours)
        .map(([role, hours]) => `<div>${role}: ${hours.toFixed(2)}h</div>`)
        .join('');
}

// Inizializza
initGrid();