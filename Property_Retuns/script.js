// --- Utility Functions (Translated from React code) --- [cite: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    // Use 'en-GB' locale for dd/mm/yyyy format
    return d.toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' });
}; [cite: 1, 2]

const parseDate = (dateString) => {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day); // Month is 0-indexed
}; [cite: 3, 4]

const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}; [cite: 5, 6, 7]

const formatIndianCurrency = (amount) => {
    if (isNaN(amount)) return 'N/A';
    const absAmount = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';
    if (absAmount >= 10000000) { // 1 Crore = 10,000,000
        return `${sign}₹${(absAmount / 10000000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Crore`;
    } else if (absAmount >= 100000) { // 1 Lakh = 100,000
        return `${sign}₹${(absAmount / 100000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Lakh`;
    } else {
        return `${sign}₹${absAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
}; [cite: 8, 9, 10, 11, 12]

const calculateXIRR = (cashFlows) => {
    if (cashFlows.length < 2) return NaN; [cite: 13]

    cashFlows.sort((a, b) => a.date.getTime() - b.date.getTime()); [cite: 14]

    const dates = cashFlows.map(cf => cf.date); [cite: 15]
    const amounts = cashFlows.map(cf => cf.amount); [cite: 15]
    const firstDate = dates[0]; [cite: 16]

    const calculateNPV = (rate) => {
        let npv = 0; [cite: 16]
        for (let i = 0; i < amounts.length; i++) {
            const days = (dates[i].getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24); [cite: 17]
            npv += amounts[i] / Math.pow(1 + rate, days / 365); [cite: 18]
        }
        return npv; [cite: 19]
    }; [cite: 16]

    const calculateDerivativeNPV = (rate) => {
        let derivative = 0; [cite: 19]
        for (let i = 0; i < amounts.length; i++) {
            const days = (dates[i].getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24); [cite: 20]
            derivative -= (amounts[i] * days / 365) / Math.pow(1 + rate, (days / 365) + 1); [cite: 21]
        }
        return derivative; [cite: 22]
    }; [cite: 19]

    let guess = 0.1; [cite: 22]
    const tolerance = 0.000001; [cite: 23]
    const maxIterations = 1000; [cite: 23]

    for (let i = 0; i < maxIterations; i++) { [cite: 24]
        const npv = calculateNPV(guess); [cite: 24]
        const derivative = calculateDerivativeNPV(guess); [cite: 25]

        if (Math.abs(npv) < tolerance) { [cite: 25]
            return guess; [cite: 25]
        }

        if (derivative === 0) { [cite: 26]
            guess += 0.01; [cite: 26]
            continue; [cite: 27]
        }

        guess = guess - npv / derivative; [cite: 28]
    }
    return NaN; // Could not converge
}; [cite: 13]

const calculateEMI = (principal, annualRate, months) => {
    if (principal <= 0 || annualRate < 0 || months <= 0) return 0; [cite: 29]
    const monthlyRate = annualRate / 12 / 100; [cite: 30]
    if (monthlyRate === 0) return principal / months; [cite: 30]
    return principal * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1); [cite: 31]
}; [cite: 29]

const generateAmortizationSchedule = (principal, annualRate, months, loanStartDate) => {
    const schedule = []; [cite: 32]
    let remainingPrincipal = principal; [cite: 33]
    const monthlyRate = annualRate / 12 / 100; [cite: 33]
    const emi = calculateEMI(principal, annualRate, months); [cite: 33]
    let currentMonthDate = new Date(loanStartDate); // Make a copy [cite: 34]

    for (let i = 1; i <= months && remainingPrincipal > 0; i++) { [cite: 34]
        const interestPayment = remainingPrincipal * monthlyRate; [cite: 34]
        let principalPayment = emi - interestPayment; [cite: 35]

        if (principalPayment > remainingPrincipal) { [cite: 35]
            principalPayment = remainingPrincipal; [cite: 35]
        }

        const currentEmi = interestPayment + principalPayment; [cite: 36]
        remainingPrincipal -= principalPayment; [cite: 36]
        schedule.push({
            month: i,
            date: new Date(currentMonthDate),
            emi: currentEmi,
            principalPaid: principalPayment,
            interestPaid: interestPayment,
            remainingBalance: remainingPrincipal < 0 ? 0 : remainingPrincipal,
        }); [cite: 37]

        // Move to next month
        currentMonthDate.setMonth(currentMonthDate.getMonth() + 1); [cite: 38]
        // Adjust day if it skips months (e.g., Jan 31 + 1 month might become Mar 2, so set to 1st then to last day of previous month then original day)
        if (currentMonthDate.getDate() !== loanStartDate.getDate()) { [cite: 39]
            currentMonthDate.setDate(0); [cite: 39]
            currentMonthDate.setDate(loanStartDate.getDate()); [cite: 40]
        }
    }
    return schedule; [cite: 41]
}; [cite: 32]

const exportCashFlowsToCsv = (cashFlows) => {
    if (!cashFlows || cashFlows.length === 0) { [cite: 42]
        // Using a custom message box instead of alert() for better UX
        const messageBox = document.createElement('div'); [cite: 42]
        messageBox.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50'; [cite: 43]
        messageBox.innerHTML = `
            <div class="bg-white p-6 rounded-lg shadow-xl text-center">
                <p class="text-lg font-semibold mb-4">No cash flows to export!</p>
                <button id="closeMessageBox" class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">OK</button>
            </div>
        `; [cite: 44]
        document.body.appendChild(messageBox); [cite: 45]
        document.getElementById('closeMessageBox').onclick = () => document.body.removeChild(messageBox); [cite: 45]
        return; [cite: 45]
    }

    let csvContent = "\uFEFF"; // Add BOM for proper UTF-8 encoding in Excel [cite: 45, 46]

    const headers = ['Date', 'Amount (INR)', 'Description']; [cite: 46]
    csvContent += headers.join(',') + '\n'; [cite: 47]

    cashFlows.forEach(cf => { [cite: 47]
        const row = [
            cf.date, // Already formatted as dd/mm/yyyy string from formatDate
            cf.amount.toFixed(2), // Use raw number, fixed to 2 decimal places for consistency
            `"${String(cf.description).replace(/"/g, '""')}"` // Escape double quotes within description
        ];
        csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) { // feature detection [cite: 48]
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'cash_flows.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}; [cite: 42]

// --- Global State Variables (Replacing React's useState) --- [cite: 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70]
let purchaseDate = ''; [cite: 49]
let purchasePrice = ''; [cite: 49]

let loanTaken = 'no'; [cite: 49, 50]
let loanPrincipal = ''; [cite: 50]
let loanAnnualRate = ''; [cite: 50]
let loanStartDate = ''; [cite: 50]
let loanTermMonths = ''; [cite: 51]
let loanStatus = 'running'; // 'closed' or 'running' [cite: 51]
let loanEndDate = ''; [cite: 52]
let isLoanEndDateToday = false; [cite: 53]

let hasRentalIncome = 'no'; [cite: 54, 55]
let rentalAmount = ''; [cite: 55]
let rentalStartDate = ''; [cite: 55]
let rentalEndDate = ''; [cite: 55]
let rentalType = 'received'; [cite: 56]
let isRentalEndDateToday = false; [cite: 56]
let rentIncreaseType = 'none'; [cite: 56, 57]
let rentIncreaseValue = ''; [cite: 57]

let hasRecurringExpenses = 'no'; [cite: 58]
let recurringExpenseAmount = ''; [cite: 58]
let recurringExpenseFrequency = 'monthly'; [cite: 59]
let recurringExpenseStartDate = ''; [cite: 59]
let recurringExpenseEndDate = ''; [cite: 59]

let saleDate = ''; [cite: 60]
let salePrice = ''; [cite: 60]

let estimatedCapitalGainsTax = ''; [cite: 61, 70]
let inflationRate = ''; [cite: 62]

// Results State
let nominalProfitLoss = null; [cite: 63]
let realProfitLoss = null; [cite: 63]
let nominalXirrResult = null; [cite: 64]
let realXirrResult = null; [cite: 64]
let cashFlowsDisplay = []; [cite: 64]
let amortizationSchedule = []; [cite: 65]
let errorMessage = ''; [cite: 64]

// Summary details
let totalSpend = 0; [cite: 65]
let totalEarned = 0; [cite: 65]

let outflowPurchasePrice = 0; [cite: 66]
let outflowTotalEMIPaid = 0; [cite: 66]
let outflowLoanBalanceAtSale = 0; [cite: 67]
let outflowTotalRecurringExpenses = 0; [cite: 67]
let outflowCapitalGainsTax = 0; [cite: 67]

let inflowSalePrice = 0; [cite: 68]
let inflowTotalRentalIncome = 0; [cite: 69]

// --- DOM Element References ---
const D = {
    // Inputs
    purchaseDate: document.getElementById('purchaseDate'),
    purchasePrice: document.getElementById('purchasePrice'),
    loanTakenYes: document.querySelector('input[name="loanTaken"][value="yes"]'),
    loanTakenNo: document.querySelector('input[name="loanTaken"][value="no"]'),
    loanDetailsSection: document.getElementById('loanDetailsSection'),
    loanPrincipal: document.getElementById('loanPrincipal'),
    loanAnnualRate: document.getElementById('loanAnnualRate'),
    loanStartDate: document.getElementById('loanStartDate'),
    loanTermMonths: document.getElementById('loanTermMonths'),
    loanStatusClosed: document.querySelector('input[name="loanStatus"][value="closed"]'),
    loanStatusRunning: document.querySelector('input[name="loanStatus"][value="running"]'),
    loanEndDateContainer: document.getElementById('loanEndDateContainer'),
    loanEndDate: document.getElementById('loanEndDate'),
    isLoanEndDateToday: document.getElementById('isLoanEndDateToday'),
    hasRentalIncomeYes: document.querySelector('input[name="hasRentalIncome"][value="yes"]'),
    hasRentalIncomeNo: document.querySelector('input[name="hasRentalIncome"][value="no"]'),
    rentalDetailsSection: document.getElementById('rentalDetailsSection'),
    rentalTypeReceived: document.querySelector('input[name="rentalType"][value="received"]'),
    rentalTypeSaved: document.querySelector('input[name="rentalType"][value="saved"]'),
    rentalAmount: document.getElementById('rentalAmount'),
    rentalStartDate: document.getElementById('rentalStartDate'),
    rentalEndDate: document.getElementById('rentalEndDate'),
    isRentalEndDateToday: document.getElementById('isRentalEndDateToday'),
    rentIncreaseTypeNone: document.querySelector('input[name="rentIncreaseType"][value="none"]'),
    rentIncreaseTypeAmount: document.querySelector('input[name="rentIncreaseType"][value="amount"]'),
    rentIncreaseTypePercent: document.querySelector('input[name="rentIncreaseType"][value="percent"]'),
    rentIncreaseValueContainer: document.getElementById('rentIncreaseValueContainer'),
    rentIncreaseValueLabel: document.getElementById('rentIncreaseValueLabel'),
    rentIncreaseValue: document.getElementById('rentIncreaseValue'),
    hasRecurringExpensesYes: document.querySelector('input[name="hasRecurringExpenses"][value="yes"]'),
    hasRecurringExpensesNo: document.querySelector('input[name="hasRecurringExpenses"][value="no"]'),
    recurringExpensesDetailsSection: document.getElementById('recurringExpensesDetailsSection'),
    recurringExpenseAmount: document.getElementById('recurringExpenseAmount'),
    recurringExpenseFrequency: document.getElementById('recurringExpenseFrequency'),
    recurringExpenseStartDate: document.getElementById('recurringExpenseStartDate'),
    recurringExpenseEndDate: document.getElementById('recurringExpenseEndDate'),
    saleDate: document.getElementById('saleDate'),
    salePrice: document.getElementById('salePrice'),
    estimatedCapitalGainsTax: document.getElementById('estimatedCapitalGainsTax'),
    inflationRate: document.getElementById('inflationRate'),

    // Buttons
    calculateButton: document.getElementById('calculateButton'),
    exportCsvButton: document.getElementById('exportCsvButton'),

    // Outputs / Display Areas
    errorMessageDiv: document.getElementById('errorMessage'),
    errorMessageText: document.getElementById('errorMessageText'),
    resultsSection: document.getElementById('resultsSection'),
    inflowsBar: document.getElementById('inflowsBar'),
    inflowsText: document.getElementById('inflowsText'),
    outflowsBar: document.getElementById('outflowsBar'),
    outflowsText: document.getElementById('outflowsText'),
    totalSpendDisplay: document.getElementById('totalSpendDisplay'),
    outflowDetails: document.getElementById('outflowDetails'),
    totalEarnedDisplay: document.getElementById('totalEarnedDisplay'),
    inflowDetails: document.getElementById('inflowDetails'),
    nominalProfitLossDisplay: document.getElementById('nominalProfitLossDisplay'),
    realProfitLossDisplay: document.getElementById('realProfitLossDisplay'),
    nominalXirrResultDisplay: document.getElementById('nominalXirrResultDisplay'),
    realXirrResultDisplay: document.getElementById('realXirrResultDisplay'),
    amortizationScheduleSection: document.getElementById('amortizationScheduleSection'),
    amortizationScheduleBody: document.getElementById('amortizationScheduleBody'),
    cashFlowsSection: document.getElementById('cashFlowsSection'),
    cashFlowsTableBody: document.getElementById('cashFlowsTableBody')
};

// --- Helper Functions for DOM Updates and State Sync ---

// Function to save all state to localStorage
function saveState() { [cite: 76, 77, 78]
    const state = {
        purchaseDate, purchasePrice, loanTaken, loanPrincipal, loanAnnualRate, loanStartDate,
        loanTermMonths, loanStatus, loanEndDate, isLoanEndDateToday, hasRentalIncome, rentalAmount,
        rentalStartDate, rentalEndDate, rentalType, isRentalEndDateToday, rentIncreaseType,
        rentIncreaseValue, hasRecurringExpenses, recurringExpenseAmount, recurringExpenseFrequency,
        recurringExpenseStartDate, recurringExpenseEndDate, saleDate, salePrice,
        estimatedCapitalGainsTax, inflationRate
    };
    for (const key in state) {
        let valueToStore = state[key];
        if (key.includes('Date') && valueToStore instanceof Date) { // Ensure date objects are converted to YYYY-MM-DD
            valueToStore = getTodayDateString(valueToStore);
        }
        localStorage.setItem(key, valueToStore);
    }
}

// Function to load all state from localStorage
function loadState() { [cite: 71, 72, 73, 74, 75]
    purchaseDate = localStorage.getItem('purchaseDate') || '';
    purchasePrice = localStorage.getItem('purchasePrice') || '';
    loanTaken = localStorage.getItem('loanTaken') || 'no';
    loanPrincipal = localStorage.getItem('loanPrincipal') || '';
    loanAnnualRate = localStorage.getItem('loanAnnualRate') || '';
    loanStartDate = localStorage.getItem('loanStartDate') || '';
    loanTermMonths = localStorage.getItem('loanTermMonths') || '';
    loanStatus = localStorage.getItem('loanStatus') || 'running';
    loanEndDate = localStorage.getItem('loanEndDate') || '';
    isLoanEndDateToday = localStorage.getItem('isLoanEndDateToday') === 'true';
    hasRentalIncome = localStorage.getItem('hasRentalIncome') || 'no';
    rentalAmount = localStorage.getItem('rentalAmount') || '';
    rentalStartDate = localStorage.getItem('rentalStartDate') || '';
    rentalEndDate = localStorage.getItem('rentalEndDate') || '';
    rentalType = localStorage.getItem('rentalType') || 'received';
    isRentalEndDateToday = localStorage.getItem('isRentalEndDateToday') === 'true';
    rentIncreaseType = localStorage.getItem('rentIncreaseType') || 'none';
    rentIncreaseValue = localStorage.getItem('rentIncreaseValue') || '';
    hasRecurringExpenses = localStorage.getItem('hasRecurringExpenses') || 'no';
    recurringExpenseAmount = localStorage.getItem('recurringExpenseAmount') || '';
    recurringExpenseFrequency = localStorage.getItem('recurringExpenseFrequency') || 'monthly';
    recurringExpenseStartDate = localStorage.getItem('recurringExpenseStartDate') || '';
    recurringExpenseEndDate = localStorage.getItem('recurringExpenseEndDate') || '';
    saleDate = localStorage.getItem('saleDate') || '';
    salePrice = localStorage.getItem('salePrice') || '';
    estimatedCapitalGainsTax = localStorage.getItem('estimatedCapitalGainsTax') || '';
    inflationRate = localStorage.getItem('inflationRate') || '';

    // Update DOM inputs to reflect loaded state
    renderFormInputs();
}

// Function to update the DOM based on state variables
function renderFormInputs() {
    D.purchaseDate.value = purchaseDate;
    D.purchasePrice.value = purchasePrice;

    D.loanTakenYes.checked = (loanTaken === 'yes');
    D.loanTakenNo.checked = (loanTaken === 'no');
    D.loanPrincipal.value = loanPrincipal;
    D.loanAnnualRate.value = loanAnnualRate;
    D.loanStartDate.value = loanStartDate;
    D.loanTermMonths.value = loanTermMonths;
    D.loanStatusClosed.checked = (loanStatus === 'closed');
    D.loanStatusRunning.checked = (loanStatus === 'running');
    D.loanEndDate.value = loanEndDate;
    D.isLoanEndDateToday.checked = isLoanEndDateToday;

    D.hasRentalIncomeYes.checked = (hasRentalIncome === 'yes');
    D.hasRentalIncomeNo.checked = (hasRentalIncome === 'no');
    D.rentalTypeReceived.checked = (rentalType === 'received');
    D.rentalTypeSaved.checked = (rentalType === 'saved');
    D.rentalAmount.value = rentalAmount;
    D.rentalStartDate.value = rentalStartDate;
    D.rentalEndDate.value = rentalEndDate;
    D.isRentalEndDateToday.checked = isRentalEndDateToday;
    D.rentIncreaseTypeNone.checked = (rentIncreaseType === 'none');
    D.rentIncreaseTypeAmount.checked = (rentIncreaseType === 'amount');
    D.rentIncreaseTypePercent.checked = (rentIncreaseType === 'percent');
    D.rentIncreaseValue.value = rentIncreaseValue;

    D.hasRecurringExpensesYes.checked = (hasRecurringExpenses === 'yes');
    D.hasRecurringExpensesNo.checked = (hasRecurringExpenses === 'no');
    D.recurringExpenseAmount.value = recurringExpenseAmount;
    D.recurringExpenseFrequency.value = recurringExpenseFrequency;
    D.recurringExpenseStartDate.value = recurringExpenseStartDate;
    D.recurringExpenseEndDate.value = recurringExpenseEndDate;

    D.saleDate.value = saleDate;
    D.salePrice.value = salePrice;
    D.estimatedCapitalGainsTax.value = estimatedCapitalGainsTax;
    D.inflationRate.value = inflationRate;

    // Trigger conditional display updates
    updateConditionalSections();
    updateRentIncreaseInputDisplay();
}

function updateConditionalSections() {
    // Loan Details
    if (loanTaken === 'yes') {
        D.loanDetailsSection.classList.remove('hidden');
    } else {
        D.loanDetailsSection.classList.add('hidden');
    }
    if (loanStatus === 'closed') {
        D.loanEndDateContainer.classList.remove('hidden');
    } else {
        D.loanEndDateContainer.classList.add('hidden');
    }

    // Rental Details
    if (hasRentalIncome === 'yes') {
        D.rentalDetailsSection.classList.remove('hidden');
    } else {
        D.rentalDetailsSection.classList.add('hidden');
    }
    updateRentIncreaseInputDisplay(); // Also call when rental section visibility changes

    // Recurring Expenses
    if (hasRecurringExpenses === 'yes') {
        D.recurringExpensesDetailsSection.classList.remove('hidden');
    } else {
        D.recurringExpensesDetailsSection.classList.add('hidden');
    }
}

function updateRentIncreaseInputDisplay() {
    if (rentIncreaseType === 'none' || hasRentalIncome === 'no') {
        D.rentIncreaseValueContainer.classList.add('hidden');
    } else {
        D.rentIncreaseValueContainer.classList.remove('hidden');
        D.rentIncreaseValueLabel.textContent = `Increase Value (${rentIncreaseType === 'amount' ? '₹' : '%'}):`;
        D.rentIncreaseValue.placeholder = rentIncreaseType === 'amount' ? 'e.g., 1000' : 'e.g., 5 (for 5%)';
    }
}

function clearErrorMessage() { [cite: 79]
    errorMessage = '';
    D.errorMessageDiv.classList.add('hidden');
    D.errorMessageText.textContent = '';
}

function setAndShowError(message) {
    errorMessage = message;
    D.errorMessageText.textContent = message;
    D.errorMessageDiv.classList.remove('hidden');
    // Hide results if there's an error
    D.resultsSection.classList.add('hidden');
}

// --- Event Handlers ---

function handleInput(event) {
    const { id, name, value, type, checked } = event.target;

    // Clear error message on any input change
    clearErrorMessage(); [cite: 79]

    switch (name || id) {
        case 'purchaseDate': purchaseDate = value; break;
        case 'purchasePrice': purchasePrice = value; break;
        case 'loanTaken': loanTaken = value; break;
        case 'loanPrincipal': loanPrincipal = value; break;
        case 'loanAnnualRate': loanAnnualRate = value; break;
        case 'loanStartDate': loanStartDate = value; break;
        case 'loanTermMonths': loanTermMonths = value; break;
        case 'loanStatus': loanStatus = value; break;
        case 'loanEndDate': loanEndDate = value; isLoanEndDateToday = false; D.isLoanEndDateToday.checked = false; break; [cite: 82]
        case 'isLoanEndDateToday': isLoanEndDateToday = checked; [cite: 80]
            if (checked) { loanEndDate = getTodayDateString(); D.loanEndDate.value = loanEndDate; } [cite: 81]
            else { loanEndDate = ''; D.loanEndDate.value = loanEndDate; } [cite: 82]
            break;
        case 'hasRentalIncome': hasRentalIncome = value; break;
        case 'rentalType': rentalType = value; break;
        case 'rentalAmount': rentalAmount = value; break;
        case 'rentalStartDate': rentalStartDate = value; break;
        case 'rentalEndDate': rentalEndDate = value; isRentalEndDateToday = false; D.isRentalEndDateToday.checked = false; break;
        case 'isRentalEndDateToday': isRentalEndDateToday = checked; [cite: 82]
            if (checked) { rentalEndDate = getTodayDateString(); D.rentalEndDate.value = rentalEndDate; } [cite: 83]
            else { rentalEndDate = ''; D.rentalEndDate.value = rentalEndDate; } [cite: 84]
            break;
        case 'rentIncreaseType': rentIncreaseType = value; break;
        case 'rentIncreaseValue': rentIncreaseValue = value; break;
        case 'hasRecurringExpenses': hasRecurringExpenses = value; break;
        case 'recurringExpenseAmount': recurringExpenseAmount = value; break;
        case 'recurringExpenseFrequency': recurringExpenseFrequency = value; break;
        case 'recurringExpenseStartDate': recurringExpenseStartDate = value; break;
        case 'recurringExpenseEndDate': recurringExpenseEndDate = value; break;
        case 'saleDate': saleDate = value; break;
        case 'salePrice': salePrice = value; break;
        case 'estimatedCapitalGainsTax': estimatedCapitalGainsTax = value; break;
        case 'inflationRate': inflationRate = value; break;
    }
    saveState(); // Save state on every input change
    updateConditionalSections(); // Update visibility of sections
    updateRentIncreaseInputDisplay();
}

// --- Main Calculation Logic ---
function handleCalculate() { [cite: 84]
    clearErrorMessage(); [cite: 84, 85]
    // Reset all results states [cite: 85]
    nominalProfitLoss = null;
    realProfitLoss = null;
    nominalXirrResult = null;
    realXirrResult = null;
    cashFlowsDisplay = []; [cite: 85]
    amortizationSchedule = []; [cite: 86]

    totalSpend = 0; [cite: 86]
    totalEarned = 0; [cite: 86]

    outflowPurchasePrice = 0; [cite: 86]
    outflowTotalEMIPaid = 0; [cite: 87]
    outflowLoanBalanceAtSale = 0; [cite: 87]
    outflowTotalRecurringExpenses = 0; [cite: 87]
    outflowCapitalGainsTax = 0; [cite: 87]

    inflowSalePrice = 0; [cite: 87]
    inflowTotalRentalIncome = 0; [cite: 87]


    const pDate = parseDate(purchaseDate); [cite: 87]
    const pPrice = parseFloat(purchasePrice); [cite: 88]
    const sDate = parseDate(saleDate); [cite: 88]
    const sPrice = parseFloat(salePrice); [cite: 88]
    const inflRate = parseFloat(inflationRate) / 100; [cite: 88]
    const directCapitalGainsTax = parseFloat(estimatedCapitalGainsTax) || 0; [cite: 89]

    // Basic validation [cite: 89]
    if (!pDate || isNaN(pPrice) || pPrice <= 0 || !sDate || isNaN(sPrice) || sPrice <= 0) { [cite: 89]
        setAndShowError('Please enter valid Asset Purchase Date, Purchase Price, Sale Date, and Sale Price.'); [cite: 90]
        return; [cite: 90]
    }
    if (sDate < pDate) { [cite: 90]
        setAndShowError('Sale Date cannot be before Purchase Date.'); [cite: 91]
        return; [cite: 91]
    }

    let currentCashFlows = []; // This array is for XIRR calculation [cite: 91]
    let calculatedTotalSpend = 0; [cite: 91, 92]
    let calculatedTotalEarned = 0; [cite: 92, 93]
    let totalInterestPaid = 0; [cite: 93]
    let totalEMIPaid = 0; [cite: 94]
    let totalRentalIncome = 0; [cite: 95]
    let totalRecurringExpenses = 0; [cite: 95]
    let loanBalanceAtSale = 0; [cite: 95]

    // 1. Asset Purchase Cash Flow (Outflow)
    currentCashFlows.push({ date: pDate, amount: -pPrice, description: 'Asset Purchase' }); [cite: 96]
    calculatedTotalSpend += pPrice; [cite: 97]
    outflowPurchasePrice = pPrice; [cite: 97, 98]

    // 2. Loan Cash Flows (if loan taken) [cite: 98]
    if (loanTaken === 'yes') { [cite: 98]
        const loanP = parseFloat(loanPrincipal); [cite: 98, 99]
        const loanRate = parseFloat(loanAnnualRate); [cite: 99]
        const loanSDate = parseDate(loanStartDate); [cite: 99]
        const loanTM = parseInt(loanTermMonths, 10); [cite: 99]
        const loanEDate = parseDate(loanEndDate); [cite: 99]

        if (!loanSDate || isNaN(loanP) || loanP <= 0 || isNaN(loanRate) || loanRate < 0 || isNaN(loanTM) || loanTM <= 0) { [cite: 100]
            setAndShowError('Please enter valid Loan Principal, Annual Interest Rate, Loan Start Date, and Loan Term (Months).'); [cite: 101]
            return; [cite: 101]
        }
        if (loanStatus === 'closed' && (!loanEDate || loanEDate < loanSDate)) { [cite: 101]
            setAndShowError('Please enter a valid Loan End Date if the loan is closed.'); [cite: 102]
            return; [cite: 102]
        }
        if (loanSDate < pDate) { [cite: 102]
            setAndShowError('Loan Start Date cannot be before Asset Purchase Date.'); [cite: 103]
            return; [cite: 103]
        }

        // Add loan principal as an inflow for XIRR calculation
        currentCashFlows.push({ date: loanSDate, amount: loanP, description: 'Loan Disbursed (Inflow)' }); [cite: 103, 104]
        const monthlyEMI = calculateEMI(loanP, loanRate, loanTM); [cite: 104]
        let remainingPrincipal = loanP; [cite: 104]
        let currentDateIterator = new Date(loanSDate); [cite: 104, 105]
        let loanEndEffectiveDate = loanStatus === 'closed' ? loanEDate : sDate; [cite: 105]

        // Generate Amortization Schedule
        const amortSchedule = generateAmortizationSchedule(loanP, loanRate, loanTM, loanSDate); [cite: 106]
        const filteredAmortSchedule = amortSchedule.filter(item => item.date <= loanEndEffectiveDate); [cite: 107]
        amortizationSchedule = filteredAmortSchedule; // Set global state [cite: 108]


        // Iterate through months to calculate EMIs and interest for cash flows
        while (currentDateIterator <= loanEndEffectiveDate && remainingPrincipal > 0) { [cite: 108]
            const monthlyInterestRate = loanRate / 12 / 100; [cite: 108]
            const interestForMonth = remainingPrincipal * monthlyInterestRate; [cite: 109]
            const principalPaidThisMonth = monthlyEMI - interestForMonth; [cite: 109]

            const paymentAmount = Math.min(monthlyEMI, remainingPrincipal + interestForMonth); [cite: 109, 110]

            if (paymentAmount > 0) { [cite: 110]
                currentCashFlows.push({ date: new Date(currentDateIterator), amount: -paymentAmount, description: `EMI (${formatDate(currentDateIterator)})` }); [cite: 110]
                totalEMIPaid += paymentAmount; [cite: 111]
                totalInterestPaid += interestForMonth; // Keep this for amortization display [cite: 111]
                remainingPrincipal -= principalPaidThisMonth; [cite: 111]
                calculatedTotalSpend += paymentAmount; [cite: 112]
            }

            // Move to the next month
            currentDateIterator.setMonth(currentDateIterator.getMonth() + 1); [cite: 112]
            // Handle month end issues
            if (currentDateIterator.getDate() !== loanSDate.getDate()) { [cite: 113]
                currentDateIterator.setDate(0); [cite: 113]
                currentDateIterator.setDate(loanSDate.getDate()); [cite: 114]
            }
        }
        outflowTotalEMIPaid = totalEMIPaid; [cite: 115, 116]

        // Handle remaining principal payment for both closed and running loans scenarios
        if (remainingPrincipal > 0) { [cite: 116]
            const paymentDate = loanStatus === 'closed' ? loanEDate : sDate; [cite: 116, 117]
            loanBalanceAtSale = remainingPrincipal; [cite: 117]
            currentCashFlows.push({ date: paymentDate, amount: -loanBalanceAtSale, description: `Loan Balance Paid (${loanStatus === 'closed' ? 'Closed Early' : 'at Sale'})` }); [cite: 117, 118]
            calculatedTotalSpend += loanBalanceAtSale; [cite: 118]
            outflowLoanBalanceAtSale = loanBalanceAtSale; [cite: 118, 119]
        }
    }

    // 3. Rental/Saved Rent Cash Flows (if applicable) [cite: 119]
    if (hasRentalIncome === 'yes') { [cite: 119]
        const rAmount = parseFloat(rentalAmount); [cite: 119, 120]
        const rSDate = parseDate(rentalStartDate); [cite: 120]
        const rEDate = parseDate(rentalEndDate); [cite: 120]
        const rIncreaseVal = parseFloat(rentIncreaseValue); [cite: 120, 121]

        if (!rSDate || isNaN(rAmount) || rAmount <= 0 || !rEDate) { [cite: 121]
            setAndShowError('Please enter valid Rental Amount, Rental Start Date, and Rental End Date.'); [cite: 122]
            return; [cite: 122]
        }
        if (rEDate < rSDate) { [cite: 122]
            setAndShowError('Rental End Date cannot be before Rental Start Date.'); [cite: 123]
            return; [cite: 123]
        }
        if (rSDate < pDate) { [cite: 123]
            setAndShowError('Rental Start Date cannot be before Asset Purchase Date.'); [cite: 124]
            return; [cite: 124]
        }
        if (rentIncreaseType !== 'none' && (isNaN(rIncreaseVal) || rIncreaseVal < 0)) { [cite: 124]
            setAndShowError('Please enter a valid positive value for Rent Increase.'); [cite: 125]
            return; [cite: 125]
        }

        let currentRentalDate = new Date(rSDate); [cite: 125]
        let effectiveMonthlyRent = rAmount; [cite: 126]
        let lastIncreaseYear = currentRentalDate.getFullYear(); [cite: 126]

        while (currentRentalDate <= rEDate) { [cite: 126]
            if (rentIncreaseType !== 'none' && currentRentalDate.getFullYear() > lastIncreaseYear) { [cite: 126]
                if (rentIncreaseType === 'amount') { [cite: 127]
                    effectiveMonthlyRent += rIncreaseVal; [cite: 127]
                } else if (rentIncreaseType === 'percent') { [cite: 127]
                    effectiveMonthlyRent *= (1 + rIncreaseVal / 100); [cite: 128]
                }
                lastIncreaseYear = currentRentalDate.getFullYear(); [cite: 129]
            }

            const amount = rentalType === 'received' ? effectiveMonthlyRent : effectiveMonthlyRent; [cite: 129, 130]
            currentCashFlows.push({ date: new Date(currentRentalDate), amount: amount, description: `${rentalType === 'received' ? 'Rent Received' : 'Rent Saved'} (${formatDate(currentRentalDate)})` }); [cite: 130, 131]
            totalRentalIncome += amount; [cite: 131]
            calculatedTotalEarned += amount; [cite: 131]

            currentRentalDate.setMonth(currentRentalDate.getMonth() + 1); [cite: 131]
            if (currentRentalDate.getDate() !== rSDate.getDate()) { [cite: 132]
                currentRentalDate.setDate(0); [cite: 132]
                currentRentalDate.setDate(rSDate.getDate()); [cite: 132]
            }
        }
        inflowTotalRentalIncome = totalRentalIncome; [cite: 133]
    }

    // 4. Recurring Expenses (if applicable) [cite: 133]
    if (hasRecurringExpenses === 'yes') { [cite: 133]
        const rExpAmount = parseFloat(recurringExpenseAmount); [cite: 134]
        const rExpSDate = parseDate(recurringExpenseStartDate); [cite: 134]
        const rExpEDate = parseDate(recurringExpenseEndDate); [cite: 134]

        if (!rExpSDate || isNaN(rExpAmount) || rExpAmount <= 0 || !rExpEDate) { [cite: 134]
            setAndShowError('Please enter valid Recurring Expense Amount, Start Date, and End Date.'); [cite: 135]
            return; [cite: 135]
        }
        if (rExpEDate < rExpSDate) { [cite: 135]
            setAndShowError('Recurring Expense End Date cannot be before Start Date.'); [cite: 136]
            return; [cite: 136]
        }
        if (rExpSDate < pDate) { [cite: 136]
            setAndShowError('Recurring Expense Start Date cannot be before Asset Purchase Date.'); [cite: 137]
            return; [cite: 137]
        }

        let currentExpDate = new Date(rExpSDate); [cite: 137]
        let totalRecurringExpensesCalc = 0; [cite: 138]
        while (currentExpDate <= rExpEDate) { [cite: 138]
            let amountToAdd = rExpAmount; [cite: 138]
            currentCashFlows.push({ date: new Date(currentExpDate), amount: -amountToAdd, description: `Recurring Expense (${formatDate(currentExpDate)})` }); [cite: 139]
            totalRecurringExpensesCalc += amountToAdd; [cite: 139]
            calculatedTotalSpend += amountToAdd; [cite: 139]

            if (recurringExpenseFrequency === 'monthly') { [cite: 140]
                currentExpDate.setMonth(currentExpDate.getMonth() + 1); [cite: 141]
            } else { // Annually [cite: 141]
                currentExpDate.setFullYear(currentExpDate.getFullYear() + 1); [cite: 141, 142]
            }
            if (currentExpDate.getDate() !== rExpSDate.getDate()) { [cite: 142]
                currentExpDate.setDate(0); [cite: 143]
                currentExpDate.setDate(rExpSDate.getDate()); [cite: 143]
            }
        }
        outflowTotalRecurringExpenses = totalRecurringExpensesCalc; [cite: 144]
    }

    // 5. Asset Sale Cash Flow (Inflow) [cite: 144]
    currentCashFlows.push({ date: sDate, amount: sPrice, description: 'Asset Sale' }); [cite: 145]
    calculatedTotalEarned += sPrice; [cite: 145]
    inflowSalePrice = sPrice; [cite: 146]

    // 6. Direct Capital Gains Tax (from user input) [cite: 146]
    if (directCapitalGainsTax > 0) { [cite: 146]
        currentCashFlows.push({ date: sDate, amount: -directCapitalGainsTax, description: 'Estimated Capital Gains Tax' }); [cite: 147]
        calculatedTotalSpend += directCapitalGainsTax; [cite: 147]
        outflowCapitalGainsTax = directCapitalGainsTax; [cite: 147]
    }

    // Calculate Total Profit/Loss (Nominal)
    nominalProfitLoss = calculatedTotalEarned - calculatedTotalSpend; [cite: 147, 148]

    // Calculate XIRR (Nominal)
    nominalXirrResult = calculateXIRR(currentCashFlows); [cite: 148]

    // Calculate Real Profit/Loss and Real XIRR [cite: 149]
    if (!isNaN(inflRate) && inflRate >= 0) { [cite: 149]
        const holdingPeriodYears = (sDate.getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24 * 365); [cite: 152, 153]
        realProfitLoss = nominalProfitLoss / Math.pow(1 + inflRate, holdingPeriodYears); [cite: 153]

        if (!isNaN(nominalXirrResult) && nominalXirrResult !== -1) { [cite: 154]
            realXirrResult = (1 + nominalXirrResult) / (1 + inflRate) - 1; [cite: 154, 155]
        } else {
            realXirrResult = NaN; [cite: 156]
        }
    } else {
        realProfitLoss = NaN; [cite: 157]
        realXirrResult = NaN; [cite: 157]
    }

    // Set summary details
    totalSpend = calculatedTotalSpend; [cite: 157]
    totalEarned = calculatedTotalEarned; [cite: 158]

    // Format cash flows for display (after all calculations are done with Date objects) [cite: 158]
    cashFlowsDisplay = currentCashFlows.map(cf => ({
        ...cf,
        date: formatDate(cf.date)
    })); [cite: 158]

    renderResults(); // Update the results section in the DOM
}

// --- Render Results to DOM ---
function renderResults() {
    D.resultsSection.classList.remove('hidden');

    // Bar Chart
    const totalCombined = totalEarned + totalSpend;
    if (totalCombined > 0) {
        D.inflowsBar.style.width = `${(totalEarned / totalCombined) * 100 || 0}%`;
        D.outflowsBar.style.width = `${(totalSpend / totalCombined) * 100 || 0}%`;
    } else {
        D.inflowsBar.style.width = '0%';
        D.outflowsBar.style.width = '0%';
    }
    D.inflowsText.textContent = formatIndianCurrency(totalEarned);
    D.outflowsText.textContent = formatIndianCurrency(totalSpend);

    // Summary Totals
    D.totalSpendDisplay.textContent = formatIndianCurrency(totalSpend);
    D.totalEarnedDisplay.textContent = formatIndianCurrency(totalEarned);

    // Outflow Details
    D.outflowDetails.innerHTML = '';
    if (outflowPurchasePrice > 0) {
        const li = document.createElement('li');
        li.textContent = `Purchase Price: ${formatIndianCurrency(outflowPurchasePrice)}`;
        D.outflowDetails.appendChild(li);
    }
    if (outflowTotalEMIPaid > 0) {
        const li = document.createElement('li');
        li.textContent = `Total EMI Paid: ${formatIndianCurrency(outflowTotalEMIPaid)}`;
        D.outflowDetails.appendChild(li);
    }
    if (outflowLoanBalanceAtSale > 0) {
        const li = document.createElement('li');
        li.textContent = `Loan Balance Paid: ${formatIndianCurrency(outflowLoanBalanceAtSale)}`;
        D.outflowDetails.appendChild(li);
    }
    if (outflowTotalRecurringExpenses > 0) {
        const li = document.createElement('li');
        li.textContent = `Total Recurring Expenses: ${formatIndianCurrency(outflowTotalRecurringExpenses)}`;
        D.outflowDetails.appendChild(li);
    }
    if (outflowCapitalGainsTax > 0) {
        const li = document.createElement('li');
        li.textContent = `Capital Gains Tax: ${formatIndianCurrency(outflowCapitalGainsTax)}`;
        D.outflowDetails.appendChild(li);
    }

    // Inflow Details
    D.inflowDetails.innerHTML = '';
    if (inflowSalePrice > 0) {
        const li = document.createElement('li');
        li.textContent = `Sale Price: ${formatIndianCurrency(inflowSalePrice)}`;
        D.inflowDetails.appendChild(li);
    }
    if (inflowTotalRentalIncome > 0) {
        const li = document.createElement('li');
        li.textContent = `Total Rental/Saved Income: ${formatIndianCurrency(inflowTotalRentalIncome)}`;
        D.inflowDetails.appendChild(li);
    }

    // Profit/Loss & XIRR
    D.nominalProfitLossDisplay.textContent = formatIndianCurrency(nominalProfitLoss);
    if (nominalProfitLoss >= 0) { D.nominalProfitLossDisplay.classList.remove('text-red-600'); D.nominalProfitLossDisplay.classList.add('text-green-600'); }
    else { D.nominalProfitLossDisplay.classList.remove('text-green-600'); D.nominalProfitLossDisplay.classList.add('text-red-600'); }

    D.realProfitLossDisplay.textContent = isNaN(realProfitLoss) ? 'N/A' : formatIndianCurrency(realProfitLoss);
    if (realProfitLoss >= 0) { D.realProfitLossDisplay.classList.remove('text-red-600'); D.realProfitLossDisplay.classList.add('text-green-600'); }
    else { D.realProfitLossDisplay.classList.remove('text-green-600'); D.realProfitLossDisplay.classList.add('text-red-600'); }

    D.nominalXirrResultDisplay.textContent = nominalXirrResult !== null && !isNaN(nominalXirrResult) ? `${(nominalXirrResult * 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : 'N/A'; [cite: 291]
    D.realXirrResultDisplay.textContent = realXirrResult !== null && !isNaN(realXirrResult) ? `${(realXirrResult * 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : 'N/A'; [cite: 292, 293]

    // Amortization Schedule
    if (amortizationSchedule.length > 0) {
        D.amortizationScheduleSection.classList.remove('hidden');
        D.amortizationScheduleBody.innerHTML = '';
        amortizationSchedule.forEach((item, index) => { [cite: 297]
            const row = document.createElement('tr'); [cite: 298]
            row.className = index % 2 === 0 ? 'bg-white' : 'bg-blue-50'; [cite: 299]
            row.innerHTML = `
                <td class="px-3 py-2 text-xs text-gray-800">${item.month}</td> [cite: 299]
                <td class="px-3 py-2 text-xs text-gray-800">${formatDate(item.date)}</td> [cite: 299]
                <td class="px-3 py-2 text-right text-xs text-gray-800">${item.emi.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td> [cite: 299, 300]
                <td class="px-3 py-2 text-right text-xs text-gray-800">${item.principalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td> [cite: 300]
                <td class="px-3 py-2 text-right text-xs text-gray-800">${item.interestPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td> [cite: 300]
                <td class="px-3 py-2 text-right text-xs text-gray-800">${item.remainingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td> [cite: 301]
            `;
            D.amortizationScheduleBody.appendChild(row); [cite: 301]
        });
    } else {
        D.amortizationScheduleSection.classList.add('hidden'); [cite: 302]
    }

    // Cash Flows Display
    if (cashFlowsDisplay.length > 0) { [cite: 302]
        D.cashFlowsSection.classList.remove('hidden'); [cite: 302]
        D.cashFlowsTableBody.innerHTML = ''; [cite: 303]
        cashFlowsDisplay.forEach((cf, index) => { [cite: 307]
            const row = document.createElement('tr'); [cite: 307]
            row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50'; [cite: 308]
            row.innerHTML = `
                <td class="px-4 py-2 text-sm text-gray-800">${cf.date}</td> [cite: 308]
                <td class="px-4 py-2 text-sm text-gray-800">${formatIndianCurrency(cf.amount)}</td> [cite: 308, 309]
                <td class="px-4 py-2 text-sm text-gray-800">${cf.description}</td> [cite: 309]
            `;
            D.cashFlowsTableBody.appendChild(row); [cite: 310]
        });
    } else {
        D.cashFlowsSection.classList.add('hidden'); [cite: 310]
    }
}

// --- Event Listeners Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    loadState(); // Load state on page load
    renderFormInputs(); // Render inputs based on loaded state
    updateConditionalSections(); // Ensure sections are correctly displayed

    // Attach event listeners to all relevant input fields for state updates and saving
    const allInputs = document.querySelectorAll('input, select');
    allInputs.forEach(input => {
        if (input.type === 'radio') {
            input.addEventListener('change', handleInput);
        } else {
            input.addEventListener('input', handleInput);
        }
    });

    D.calculateButton.addEventListener('click', handleCalculate);
    D.exportCsvButton.addEventListener('click', () => exportCashFlowsToCsv(cashFlowsDisplay)); // Pass the global display array [cite: 303, 304]

    // Listeners for radio buttons to update sections immediately
    document.querySelectorAll('input[name="loanTaken"]').forEach(radio => {
        radio.addEventListener('change', handleInput);
    });
    document.querySelectorAll('input[name="loanStatus"]').forEach(radio => {
        radio.addEventListener('change', handleInput);
    });
    document.querySelectorAll('input[name="hasRentalIncome"]').forEach(radio => {
        radio.addEventListener('change', handleInput);
    });
    document.querySelectorAll('input[name="rentalType"]').forEach(radio => {
        radio.addEventListener('change', handleInput);
    });
    document.querySelectorAll('input[name="rentIncreaseType"]').forEach(radio => {
        radio.addEventListener('change', handleInput);
    });
    document.querySelectorAll('input[name="hasRecurringExpenses"]').forEach(radio => {
        radio.addEventListener('change', handleInput);
    });
});