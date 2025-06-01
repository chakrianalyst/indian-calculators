// --- Utility Functions ---

const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    // Use 'en-GB' locale for dd/mm/yyyy format
    return d.toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

const parseDate = (dateString) => {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day); // Month is 0-indexed
};

const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

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
};

const calculateXIRR = (cashFlows) => {
    if (cashFlows.length < 2) return NaN;

    cashFlows.sort((a, b) => a.date.getTime() - b.date.getTime());

    const dates = cashFlows.map(cf => cf.date);
    const amounts = cashFlows.map(cf => cf.amount);
    const firstDate = dates[0];

    const calculateNPV = (rate) => {
        let npv = 0;
        for (let i = 0; i < amounts.length; i++) {
            const days = (dates[i].getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
            npv += amounts[i] / Math.pow(1 + rate, days / 365);
        }
        return npv;
    };

    const calculateDerivativeNPV = (rate) => {
        let derivative = 0;
        for (let i = 0; i < amounts.length; i++) {
            const days = (dates[i].getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
            derivative -= (amounts[i] * days / 365) / Math.pow(1 + rate, (days / 365) + 1);
        }
        return derivative;
    };

    let guess = 0.1;
    const tolerance = 0.000001;
    const maxIterations = 1000;

    for (let i = 0; i < maxIterations; i++) {
        const npv = calculateNPV(guess);
        const derivative = calculateDerivativeNPV(guess);

        if (Math.abs(npv) < tolerance) {
            return guess;
        }

        if (derivative === 0) {
            guess += 0.01;
            continue;
        }

        guess = guess - npv / derivative;
    }
    return NaN; // Could not converge
};

const calculateEMI = (principal, annualRate, months) => {
    if (principal <= 0 || annualRate < 0 || months <= 0) return 0;
    const monthlyRate = annualRate / 12 / 100;
    if (monthlyRate === 0) return principal / months;
    return principal * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1);
};

const generateAmortizationSchedule = (principal, annualRate, months, loanStartDate) => {
    const schedule = [];
    let remainingPrincipal = principal;
    const monthlyRate = annualRate / 12 / 100;
    const emi = calculateEMI(principal, annualRate, months);
    let currentMonthDate = new Date(loanStartDate); // Make a copy

    for (let i = 1; i <= months && remainingPrincipal > 0; i++) {
        const interestPayment = remainingPrincipal * monthlyRate;
        let principalPayment = emi - interestPayment;

        if (principalPayment > remainingPrincipal) {
            principalPayment = remainingPrincipal;
        }

        const currentEmi = interestPayment + principalPayment;
        remainingPrincipal -= principalPayment;
        schedule.push({
            month: i,
            date: new Date(currentMonthDate),
            emi: currentEmi,
            principalPaid: principalPayment,
            interestPaid: interestPayment,
            remainingBalance: remainingPrincipal < 0 ? 0 : remainingPrincipal,
        });

        // Move to next month
        currentMonthDate.setMonth(currentMonthDate.getMonth() + 1);
        // Adjust day if it skips months (e.g., Jan 31 + 1 month might become Mar 2, so set to 1st then to last day of previous month then original day)
        if (currentMonthDate.getDate() !== loanStartDate.getDate()) {
            currentMonthDate.setDate(0);
            currentMonthDate.setDate(loanStartDate.getDate());
        }
    }
    return schedule;
};

const exportCashFlowsToCsv = (cashFlows) => {
    if (!cashFlows || cashFlows.length === 0) {
        // Using a custom message box instead of alert() for better UX
        const messageBox = document.createElement('div');
        messageBox.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50';
        messageBox.innerHTML = `
            <div class="bg-white p-6 rounded-lg shadow-xl text-center">
                <p class="text-lg font-semibold mb-4">No cash flows to export!</p>
                <button id="closeMessageBox" class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">OK</button>
            </div>
        `;
        document.body.appendChild(messageBox);
        document.getElementById('closeMessageBox').onclick = () => document.body.removeChild(messageBox);
        return;
    }

    let csvContent = "\uFEFF"; // Add BOM for proper UTF-8 encoding in Excel

    const headers = ['Date', 'Amount (INR)', 'Description'];
    csvContent += headers.join(',') + '\n';

    cashFlows.forEach(cf => {
        const row = [
            cf.date, // Already formatted as dd/mm/yyyy string from formatDate
            cf.amount.toFixed(2), // Use raw number, fixed to 2 decimal places for consistency
            `"${String(cf.description).replace(/"/g, '""')}"` // Escape double quotes within description
        ];
        csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) { // feature detection
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'cash_flows.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
};

// --- Global State Variables ---
let purchaseDate = '';
let purchasePrice = '';

let loanTaken = 'no';
let loanPrincipal = '';
let loanAnnualRate = '';
let loanStartDate = '';
let loanTermMonths = '';
let loanStatus = 'running'; // 'closed' or 'running'
let loanEndDate = '';
let isLoanEndDateToday = false;

let hasRentalIncome = 'no';
let rentalAmount = '';
let rentalStartDate = '';
let rentalEndDate = '';
let rentalType = 'received';
let isRentalEndDateToday = false;
let rentIncreaseType = 'none';
let rentIncreaseValue = '';

let hasRecurringExpenses = 'no';
let recurringExpenseAmount = '';
let recurringExpenseFrequency = 'monthly';
let recurringExpenseStartDate = '';
let recurringExpenseEndDate = '';

let saleDate = '';
let salePrice = '';

let estimatedCapitalGainsTax = '';
let inflationRate = '';

// Results State
let nominalProfitLoss = null;
let realProfitLoss = null;
let nominalXirrResult = null;
let realXirrResult = null;
let cashFlowsDisplay = [];
let amortizationSchedule = [];
let errorMessage = '';

// Summary details
let totalSpend = 0;
let totalEarned = 0;

let outflowPurchasePrice = 0;
let outflowTotalEMIPaid = 0;
let outflowLoanBalanceAtSale = 0;
let outflowTotalRecurringExpenses = 0;
let outflowCapitalGainsTax = 0;

let inflowSalePrice = 0;
let inflowTotalRentalIncome = 0;

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

// Define handleInput function -- THIS WAS MISSING!
function handleInput(event) {
    const { id, name, value, type, checked } = event.target;

    // Update global state based on input type
    if (type === 'radio') {
        if (name === 'loanTaken') {
            loanTaken = value;
        } else if (name === 'loanStatus') {
            loanStatus = value;
        } else if (name === 'hasRentalIncome') {
            hasRentalIncome = value;
        } else if (name === 'rentalType') {
            rentalType = value;
        } else if (name === 'rentIncreaseType') {
            rentIncreaseType = value;
        } else if (name === 'hasRecurringExpenses') {
            hasRecurringExpenses = value;
        }
    } else if (type === 'checkbox') {
        if (id === 'isLoanEndDateToday') {
            isLoanEndDateToday = checked;
            loanEndDate = checked ? getTodayDateString() : ''; // Set or clear loanEndDate
            D.loanEndDate.value = loanEndDate; // Update the DOM input directly
        } else if (id === 'isRentalEndDateToday') {
            isRentalEndDateToday = checked;
            rentalEndDate = checked ? getTodayDateString() : ''; // Set or clear rentalEndDate
            D.rentalEndDate.value = rentalEndDate; // Update the DOM input directly
        }
    } else {
        // For text, number, date, select inputs
        switch (id) {
            case 'purchaseDate': purchaseDate = value; break;
            case 'purchasePrice': purchasePrice = value; break;
            case 'loanPrincipal': loanPrincipal = value; break;
            case 'loanAnnualRate': loanAnnualRate = value; break;
            case 'loanStartDate': loanStartDate = value; break;
            case 'loanTermMonths': loanTermMonths = value; break;
            case 'loanEndDate': loanEndDate = value; break;
            case 'rentalAmount': rentalAmount = value; break;
            case 'rentalStartDate': rentalStartDate = value; break;
            case 'rentalEndDate': rentalEndDate = value; break;
            case 'rentIncreaseValue': rentIncreaseValue = value; break;
            case 'recurringExpenseAmount': recurringExpenseAmount = value; break;
            case 'recurringExpenseFrequency': recurringExpenseFrequency = value; break;
            case 'recurringExpenseStartDate': recurringExpenseStartDate = value; break;
            case 'recurringExpenseEndDate': recurringExpenseEndDate = value; break;
            case 'saleDate': saleDate = value; break;
            case 'salePrice': salePrice = value; break;
            case 'estimatedCapitalGainsTax': estimatedCapitalGainsTax = value; break;
            case 'inflationRate': inflationRate = value; break;
            default: break;
        }
    }

    saveState(); // Save updated state to localStorage
    updateConditionalSections(); // Update visibility of sections
    updateRentIncreaseInputDisplay(); // Update rent increase input label/placeholder
}


// Function to save all state to localStorage
function saveState() {
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
        // Ensure date objects are converted to YYYY-MM-DD strings for consistency if accidentally set as Date objects
        if (key.includes('Date') && valueToStore instanceof Date) {
            valueToStore = getTodayDateString(valueToStore);
        }
        localStorage.setItem(key, valueToStore);
    }
}

// Function to load all state from localStorage
function loadState() {
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

function clearErrorMessage() {
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

// --- Main Calculation Logic ---
function handleCalculate() {
    clearErrorMessage();
    // Reset all results states
    nominalProfitLoss = null;
    realProfitLoss = null;
    nominalXirrResult = null;
    realXirrResult = null;
    cashFlowsDisplay = [];
    amortizationSchedule = [];

    totalSpend = 0;
    totalEarned = 0;

    outflowPurchasePrice = 0;
    outflowTotalEMIPaid = 0;
    outflowLoanBalanceAtSale = 0;
    outflowTotalRecurringExpenses = 0;
    outflowCapitalGainsTax = 0;

    inflowSalePrice = 0;
    inflowTotalRentalIncome = 0;


    const pDate = parseDate(purchaseDate);
    const pPrice = parseFloat(purchasePrice);
    const sDate = parseDate(saleDate);
    const sPrice = parseFloat(salePrice);
    const inflRate = parseFloat(inflationRate) / 100;
    const directCapitalGainsTax = parseFloat(estimatedCapitalGainsTax) || 0;

    // Basic validation
    if (!pDate || isNaN(pPrice) || pPrice <= 0 || !sDate || isNaN(sPrice) || sPrice <= 0) {
        setAndShowError('Please enter valid Asset Purchase Date, Purchase Price, Sale Date, and Sale Price.');
        return;
    }
    if (sDate < pDate) {
        setAndShowError('Sale Date cannot be before Purchase Date.');
        return;
    }

    let currentCashFlows = []; // This array is for XIRR calculation
    let calculatedTotalSpend = 0;
    let calculatedTotalEarned = 0;
    let totalInterestPaid = 0;
    let totalEMIPaid = 0;
    let totalRentalIncome = 0;
    let totalRecurringExpenses = 0;
    let loanBalanceAtSale = 0;

    // 1. Asset Purchase Cash Flow (Outflow)
    currentCashFlows.push({ date: pDate, amount: -pPrice, description: 'Asset Purchase' });
    calculatedTotalSpend += pPrice;
    outflowPurchasePrice = pPrice;

    // 2. Loan Cash Flows (if loan taken)
    if (loanTaken === 'yes') {
        const loanP = parseFloat(loanPrincipal);
        const loanRate = parseFloat(loanAnnualRate);
        const loanSDate = parseDate(loanStartDate);
        const loanTM = parseInt(loanTermMonths, 10);
        const loanEDate = parseDate(loanEndDate);

        if (!loanSDate || isNaN(loanP) || loanP <= 0 || isNaN(loanRate) || loanRate < 0 || isNaN(loanTM) || loanTM <= 0) {
            setAndShowError('Please enter valid Loan Principal, Annual Interest Rate, Loan Start Date, and Loan Term (Months).');
            return;
        }
        if (loanStatus === 'closed' && (!loanEDate || loanEDate < loanSDate)) {
            setAndShowError('Please enter a valid Loan End Date if the loan is closed.');
            return;
        }
        if (loanSDate < pDate) {
            setAndShowError('Loan Start Date cannot be before Asset Purchase Date.');
            return;
        }

        // Add loan principal as an inflow for XIRR calculation
        currentCashFlows.push({ date: loanSDate, amount: loanP, description: 'Loan Disbursed (Inflow)' });
        const monthlyEMI = calculateEMI(loanP, loanRate, loanTM);
        let remainingPrincipal = loanP;
        let currentDateIterator = new Date(loanSDate);
        let loanEndEffectiveDate = loanStatus === 'closed' ? loanEDate : sDate;

        // Generate Amortization Schedule
        const amortSchedule = generateAmortizationSchedule(loanP, loanRate, loanTM, loanSDate);
        const filteredAmortSchedule = amortSchedule.filter(item => item.date <= loanEndEffectiveDate);
        amortizationSchedule = filteredAmortSchedule; // Set global state


        // Iterate through months to calculate EMIs and interest for cash flows
        while (currentDateIterator <= loanEndEffectiveDate && remainingPrincipal > 0) {
            const monthlyInterestRate = loanRate / 12 / 100;
            const interestForMonth = remainingPrincipal * monthlyInterestRate;
            const principalPaidThisMonth = monthlyEMI - interestForMonth;

            const paymentAmount = Math.min(monthlyEMI, remainingPrincipal + interestForMonth);

            if (paymentAmount > 0) {
                currentCashFlows.push({ date: new Date(currentDateIterator), amount: -paymentAmount, description: `EMI (${formatDate(currentDateIterator)})` });
                totalEMIPaid += paymentAmount;
                totalInterestPaid += interestForMonth; // Keep this for amortization display
                remainingPrincipal -= principalPaidThisMonth;
                calculatedTotalSpend += paymentAmount;
            }

            // Move to the next month
            currentDateIterator.setMonth(currentDateIterator.getMonth() + 1);
            // Handle month end issues
            if (currentDateIterator.getDate() !== loanSDate.getDate()) {
                currentDateIterator.setDate(0);
                currentDateIterator.setDate(loanSDate.getDate());
            }
        }
        outflowTotalEMIPaid = totalEMIPaid;

        // Handle remaining principal payment for both closed and running loans scenarios
        if (remainingPrincipal > 0) {
            const paymentDate = loanStatus === 'closed' ? loanEDate : sDate;
            loanBalanceAtSale = remainingPrincipal;
            currentCashFlows.push({ date: paymentDate, amount: -loanBalanceAtSale, description: `Loan Balance Paid (${loanStatus === 'closed' ? 'Closed Early' : 'at Sale'})` });
            calculatedTotalSpend += loanBalanceAtSale;
            outflowLoanBalanceAtSale = loanBalanceAtSale;
        }
    }

    // 3. Rental/Saved Rent Cash Flows (if applicable)
    if (hasRentalIncome === 'yes') {
        const rAmount = parseFloat(rentalAmount);
        const rSDate = parseDate(rentalStartDate);
        const rEDate = parseDate(rentalEndDate);
        const rIncreaseVal = parseFloat(rentIncreaseValue);

        if (!rSDate || isNaN(rAmount) || rAmount <= 0 || !rEDate) {
            setAndShowError('Please enter valid Rental Amount, Rental Start Date, and Rental End Date.');
            return;
        }
        if (rEDate < rSDate) {
            setAndShowError('Rental End Date cannot be before Rental Start Date.');
            return;
        }
        if (rSDate < pDate) {
            setAndShowError('Rental Start Date cannot be before Asset Purchase Date.');
            return;
        }
        if (rentIncreaseType !== 'none' && (isNaN(rIncreaseVal) || rIncreaseVal < 0)) {
            setAndShowError('Please enter a valid positive value for Rent Increase.');
            return;
        }

        let currentRentalDate = new Date(rSDate);
        let effectiveMonthlyRent = rAmount;
        let lastIncreaseYear = currentRentalDate.getFullYear();

        while (currentRentalDate <= rEDate) {
            if (rentIncreaseType !== 'none' && currentRentalDate.getFullYear() > lastIncreaseYear) {
                if (rentIncreaseType === 'amount') {
                    effectiveMonthlyRent += rIncreaseVal;
                } else if (rentIncreaseType === 'percent') {
                    effectiveMonthlyRent *= (1 + rIncreaseVal / 100);
                }
                lastIncreaseYear = currentRentalDate.getFullYear();
            }

            const amount = rentalType === 'received' ? effectiveMonthlyRent : effectiveMonthlyRent;
            currentCashFlows.push({ date: new Date(currentRentalDate), amount: amount, description: `${rentalType === 'received' ? 'Rent Received' : 'Rent Saved'} (${formatDate(currentRentalDate)})` });
            totalRentalIncome += amount;
            calculatedTotalEarned += amount;

            currentRentalDate.setMonth(currentRentalDate.getMonth() + 1);
            if (currentRentalDate.getDate() !== rSDate.getDate()) {
                currentRentalDate.setDate(0);
                currentRentalDate.setDate(rSDate.getDate());
            }
        }
        inflowTotalRentalIncome = totalRentalIncome;
    }

    // 4. Recurring Expenses (if applicable)
    if (hasRecurringExpenses === 'yes') {
        const rExpAmount = parseFloat(recurringExpenseAmount);
        const rExpSDate = parseDate(recurringExpenseStartDate);
        const rExpEDate = parseDate(recurringExpenseEndDate);

        if (!rExpSDate || isNaN(rExpAmount) || rExpAmount <= 0 || !rExpEDate) {
            setAndShowError('Please enter valid Recurring Expense Amount, Start Date, and End Date.');
            return;
        }
        if (rExpEDate < rExpSDate) {
            setAndShowError('Recurring Expense End Date cannot be before Start Date.');
            return;
        }
        if (rExpSDate < pDate) {
            setAndShowError('Recurring Expense Start Date cannot be before Asset Purchase Date.');
            return;
        }

        let currentExpDate = new Date(rExpSDate);
        let totalRecurringExpensesCalc = 0;
        while (currentExpDate <= rExpEDate) {
            let amountToAdd = rExpAmount;
            currentCashFlows.push({ date: new Date(currentExpDate), amount: -amountToAdd, description: `Recurring Expense (${formatDate(currentExpDate)})` });
            totalRecurringExpensesCalc += amountToAdd;
            calculatedTotalSpend += amountToAdd;

            if (recurringExpenseFrequency === 'monthly') {
                currentExpDate.setMonth(currentExpDate.getMonth() + 1);
            } else { // Annually
                currentExpDate.setFullYear(currentExpDate.getFullYear() + 1);
            }
            if (currentExpDate.getDate() !== rExpSDate.getDate()) {
                currentExpDate.setDate(0);
                currentExpDate.setDate(rExpSDate.getDate());
            }
        }
        outflowTotalRecurringExpenses = totalRecurringExpensesCalc;
    }

    // 5. Asset Sale Cash Flow (Inflow)
    currentCashFlows.push({ date: sDate, amount: sPrice, description: 'Asset Sale' });
    calculatedTotalEarned += sPrice;
    inflowSalePrice = sPrice;

    // 6. Direct Capital Gains Tax (from user input)
    if (directCapitalGainsTax > 0) {
        currentCashFlows.push({ date: sDate, amount: -directCapitalGainsTax, description: 'Estimated Capital Gains Tax' });
        calculatedTotalSpend += directCapitalGainsTax;
        outflowCapitalGainsTax = directCapitalGainsTax;
    }

    // Calculate Total Profit/Loss (Nominal)
    nominalProfitLoss = calculatedTotalEarned - calculatedTotalSpend;

    // Calculate XIRR (Nominal)
    nominalXirrResult = calculateXIRR(currentCashFlows);

    // Calculate Real Profit/Loss and Real XIRR
    if (!isNaN(inflRate) && inflRate >= 0) {
        const holdingPeriodYears = (sDate.getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
        realProfitLoss = nominalProfitLoss / Math.pow(1 + inflRate, holdingPeriodYears);

        if (!isNaN(nominalXirrResult) && nominalXirrResult !== -1) {
            realXirrResult = (1 + nominalXirrResult) / (1 + inflRate) - 1;
        } else {
            realXirrResult = NaN;
        }
    } else {
        realProfitLoss = NaN;
        realXirrResult = NaN;
    }

    // Set summary details
    totalSpend = calculatedTotalSpend;
    totalEarned = calculatedTotalEarned;

    // Format cash flows for display (after all calculations are done with Date objects)
    cashFlowsDisplay = currentCashFlows.map(cf => ({
        ...cf,
        date: formatDate(cf.date)
    }));

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

    D.nominalXirrResultDisplay.textContent = nominalXirrResult !== null && !isNaN(nominalXirrResult) ? `${(nominalXirrResult * 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : 'N/A';
    D.realXirrResultDisplay.textContent = realXirrResult !== null && !isNaN(realXirrResult) ? `${(realXirrResult * 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : 'N/A';

    // Amortization Schedule
    if (amortizationSchedule.length > 0) {
        D.amortizationScheduleSection.classList.remove('hidden');
        D.amortizationScheduleBody.innerHTML = '';
        amortizationSchedule.forEach((item, index) => {
            const row = document.createElement('tr');
            row.className = index % 2 === 0 ? 'bg-white' : 'bg-blue-50';
            row.innerHTML = `
                <td class="px-3 py-2 text-xs text-gray-800">${item.month}</td>
                <td class="px-3 py-2 text-xs text-gray-800">${formatDate(item.date)}</td>
                <td class="px-3 py-2 text-right text-xs text-gray-800">${item.emi.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="px-3 py-2 text-right text-xs text-gray-800">${item.principalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="px-3 py-2 text-right text-xs text-gray-800">${item.interestPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="px-3 py-2 text-right text-xs text-gray-800">${item.remainingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            `;
            D.amortizationScheduleBody.appendChild(row);
        });
    } else {
        D.amortizationScheduleSection.classList.add('hidden');
    }

    // Cash Flows Display
    if (cashFlowsDisplay.length > 0) {
        D.cashFlowsSection.classList.remove('hidden');
        D.cashFlowsTableBody.innerHTML = '';
        cashFlowsDisplay.forEach((cf, index) => {
            const row = document.createElement('tr');
            row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
            row.innerHTML = `
                <td class="px-4 py-2 text-sm text-gray-800">${cf.date}</td>
                <td class="px-4 py-2 text-sm text-gray-800">${formatIndianCurrency(cf.amount)}</td>
                <td class="px-4 py-2 text-sm text-gray-800">${cf.description}</td>
            `;
            D.cashFlowsTableBody.appendChild(row);
        });
    } else {
        D.cashFlowsSection.classList.add('hidden');
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
    D.exportCsvButton.addEventListener('click', () => exportCashFlowsToCsv(cashFlowsDisplay)); // Pass the global display array

    // Listeners for radio buttons to update sections immediately (they trigger handleInput anyway)
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