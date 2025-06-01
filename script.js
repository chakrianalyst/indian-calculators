// Helper function to parse date strings into Date objects
function parseDate(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day); // Month is 0-indexed in Date constructor
}

// Helper function to format Date objects to YYYY-MM-DD
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function calculateEmi(principal, annualRate, months) {
    const monthlyRate = annualRate / 12;
    if (monthlyRate === 0) {
        return principal / months;
    }
    const emi = principal * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1);
    return emi;
}

// XIRR Implementation (Newton-Raphson method)
function calculateXIRR(dates, cashFlows, guess = 0.1) {
    if (dates.length !== cashFlows.length || dates.length < 2) {
        return NaN; // Invalid input for XIRR
    }

    // Ensure dates are Date objects
    const parsedDates = dates.map(d => d instanceof Date ? d : new Date(d));
    
    // Sort cash flows and dates together by date
    const combined = cashFlows.map((cf, i) => ({ cf, date: parsedDates[i] }));
    combined.sort((a, b) => a.date.getTime() - b.date.getTime());

    const sortedDates = combined.map(item => item.date);
    const sortedCashFlows = combined.map(item => item.cf);

    const firstDate = sortedDates[0];

    // NPV function
    const npv = (rate) => {
        let sum = 0;
        for (let i = 0; i < sortedCashFlows.length; i++) {
            const days = (sortedDates[i].getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
            sum += sortedCashFlows[i] / Math.pow(1 + rate, days / 365);
        }
        return sum;
    };

    // Derivative of NPV function
    const derivativeNpv = (rate) => {
        let sum = 0;
        for (let i = 0; i < sortedCashFlows.length; i++) {
            const days = (sortedDates[i].getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
            const exponent = days / 365;
            
            // Handle cases where rate is -1
            if (rate === -1 && exponent === 0) {
                continue; // Derivative of C_0 * (1+r)^0 is 0
            }
            sum += sortedCashFlows[i] * (-exponent) * Math.pow(1 + rate, -exponent - 1);
        }
        return sum;
    };

    let irr = guess;
    const maxIterations = 100;
    const tolerance = 0.0000001; // 0.00001%

    for (let i = 0; i < maxIterations; i++) {
        const npvValue = npv(irr);
        const derivativeValue = derivativeNpv(irr);

        if (Math.abs(npvValue) < tolerance) {
            return irr;
        }

        if (derivativeValue === 0) {
            return NaN; // Derivative is zero, cannot converge
        }

        irr = irr - npvValue / derivativeValue;
    }
    return NaN; // Did not converge
}

// Function to adjust nominal cash flows for inflation
function getRealCashFlows(nominalCashFlows, dates, startDate, inflationRate) {
    const realCashFlows = [];
    const firstDate = startDate; // The base date for inflation adjustment

    for (let i = 0; i < nominalCashFlows.length; i++) {
        const currentDate = dates[i];
        const daysFromStart = (currentDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
        const yearsFromStart = daysFromStart / 365;
        
        // Adjust cash flow for inflation
        const realCf = nominalCashFlows[i] / Math.pow(1 + inflationRate, yearsFromStart);
        realCashFlows.push(realCf);
    }
    return realCashFlows;
}

// NEW FUNCTION for Market Comparison: Calculates FV treating ALL net cash flows as positive injections
function calculateFvOfMarketInjections(cashFlows, dates, annualRate, finalDate) {
    let fv = 0;
    const finalTime = finalDate.getTime();

    for (let i = 0; i < cashFlows.length; i++) {
        const cf = cashFlows[i];
        const cfDate = dates[i];

        if (cfDate.getTime() > finalTime) {
            continue;
        }

        const amountToCompound = Math.abs(cf); // Always take absolute value for compounding
        const daysToCompound = (finalTime - cfDate.getTime()) / (1000 * 60 * 60 * 24);
        const yearsToCompound = daysToCompound / 365;

        fv += amountToCompound * Math.pow(1 + annualRate, yearsToCompound);
    }
    return fv;
}


// Function to calculate running future values for market comparison
// This function reflects the "SIP" where all net cash flows (positive or absolute negative) are added.
function getRunningFutureValuesOfMarketInjections(cashFlows, dates, annualRate) {
    const runningFVs = [];
    let currentRunningFv = 0;

    for (let i = 0; i < cashFlows.length; i++) {
        const cf = cashFlows[i];
        const cfDate = dates[i];

        if (i === 0) {
            currentRunningFv = Math.abs(cf); // Initial investment is also abs
        } else {
            const prevDate = dates[i-1];
            const daysBetween = (cfDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
            const yearsBetween = daysBetween / 365;
            currentRunningFv = currentRunningFv * Math.pow(1 + annualRate, yearsBetween) + Math.abs(cf); // Always add abs
        }
        runningFVs.push(currentRunningFv);
    }
    return runningFVs;
}


function showMessage(message, type = 'warning') {
    const messageBox = document.getElementById('messageBox');
    const messageText = document.getElementById('messageText');
    messageText.textContent = message;
    messageBox.className = `bg-${type}-100 border-l-4 border-${type}-500 text-${type}-700 p-4 rounded-md`;
    messageBox.classList.remove('hidden');
}

function hideMessage() {
    document.getElementById('messageBox').classList.add('hidden');
}

// Global variables to store simulation results for export and table rendering
let currentSimulationData = {
    inputs: {},
    outputs: {},
    cashFlows: [] // This will store full cash flow data for all types
};

// Function to render the cash flow table based on the selected type
function renderCashFlowTable(type) {
    const tableHeader = document.getElementById('cashFlowTableHeader');
    const tableBody = document.getElementById('cashFlowTableBody');
    
    tableHeader.innerHTML = ''; // Clear previous headers
    tableBody.innerHTML = ''; // Clear previous rows

    let headers = [];
    let rowRenderer = null; // Function to render a single row

    if (type === 'post-tds') {
        headers = [
            "Date",
            "Bond Interest Credited (INR)",
            "TDS on Bond Interest (INR)",
            "Post-TDS Bond Interest (INR)",
            "EMI Paid (INR)",
            "Loan Interest Paid (INR)",
            "Loan Principal Paid (INR)",
            "Loan Outstanding (INR)",
            "Net Cash Flow (Post-TDS) (INR)"
        ];
        rowRenderer = (row) => `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${row['Date']}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-800">${row['Bond Interest Credited'].toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-800">${row['TDS on Bond Interest'].toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-800">${row['Post-TDS Bond Interest'].toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-800">${row['EMI Paid'].toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-800">${row['Loan Interest Paid'].toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-800">${row['Loan Principal Paid'].toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-800">${row['Loan Outstanding'].toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-800">${row['Net Cash Flow (Post-TDS)'].toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        `;
    } else if (type === 'pre-tds') {
        headers = [
            "Date",
            "Bond Interest Credited (INR)",
            "TDS on Bond Interest (INR)",
            "Post-TDS Bond Interest (INR)", // Still show this for context, but net cash flow will be pre-TDS
            "EMI Paid (INR)",
            "Loan Interest Paid (INR)",
            "Loan Principal Paid (INR)",
            "Loan Outstanding (INR)",
            "Net Cash Flow (Pre-TDS) (INR)"
        ];
        rowRenderer = (row) => `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${row['Date']}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-800">${row['Bond Interest Credited'].toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-800">${row['TDS on Bond Interest'].toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-800">${row['Post-TDS Bond Interest'].toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-800">${row['EMI Paid'].toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-800">${row['Loan Interest Paid'].toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-800">${row['Loan Principal Paid'].toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-800">${row['Loan Outstanding'].toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-800">${row['Net Cash Flow (Pre-TDS)'].toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        `;
    } else if (type === 'market-comp') {
        headers = [
            "Date",
            "Net Cash Flow (Post-TDS) (INR)", // Show actual for context
            "Amount Injected into Market SIP (INR)", // NEW COLUMN for clarification
            "Cumulative Future Value (at Market Rate) (INR)"
        ];
        rowRenderer = (row) => `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${row['Date']}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-800">${row['Net Cash Flow (Post-TDS)'].toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-800">${Math.abs(row['Net Cash Flow (Post-TDS)']).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-800">${row['Cumulative Future Value (at Market Rate)'].toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        `;
    }

    // Populate table headers
    const headerRow = document.createElement('tr');
    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.scope = "col";
        th.className = "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider";
        th.textContent = headerText;
        headerRow.appendChild(th);
    });
    tableHeader.appendChild(headerRow);

    // Populate table body
    currentSimulationData.cashFlows.forEach(row => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50';
        tr.innerHTML = rowRenderer(row);
        tableBody.appendChild(tr);
    });
}

// Function to set active tab styling
function setActiveTab(activeTabId) {
    document.querySelectorAll('.tab-button').forEach(button => {
        if (button.id === activeTabId) {
            button.classList.add('active');
            // Ensure other styles are removed for active state
            button.classList.remove('bg-gray-200', 'text-gray-700', 'hover:bg-gray-300');
        } else {
            button.classList.remove('active');
            // Ensure active styles are removed for inactive state
            button.classList.remove('bg-blue-600', 'text-white', 'shadow-md');
            button.classList.add('bg-gray-200', 'text-gray-700', 'hover:bg-gray-300');
        }
    });
}


document.getElementById('runSimulationBtn').addEventListener('click', () => {
    hideMessage(); // Clear previous messages
    
    // --- 1. Read Parameters from UI ---
    const loanAmount = parseFloat(document.getElementById('loanAmount').value);
    const loanAnnualInterestRate = parseFloat(document.getElementById('loanInterestRate').value) / 100;
    const loanTenureYears = parseInt(document.getElementById('loanTenureYears').value);
    const loanTenureMonths = loanTenureYears * 12;

    const bondFaceValuePerBond = parseFloat(document.getElementById('bondFaceValue').value);
    const bondAnnualCouponRate = parseFloat(document.getElementById('bondCouponRate').value) / 100;
    const bondMarketPricePerBond = parseFloat(document.getElementById('bondMarketPrice').value);
    const bondAccruedInterestAdjustment = parseFloat(document.getElementById('bondAccruedInterest').value);
    const bondMaturityDate = parseDate(document.getElementById('bondMaturityDate').value);
    const tdsRate = parseFloat(document.getElementById('tdsRate').value) / 100;

    const loanStartDate = parseDate(document.getElementById('loanStartDate').value);
    const firstPaymentDate = parseDate(document.getElementById('firstPaymentDate').value);
    let previousBondPaymentDate = parseDate(document.getElementById('previousBondPaymentDate').value);
    const inflationRate = parseFloat(document.getElementById('inflationRate').value) / 100;
    const marketAnnualReturn = parseFloat(document.getElementById('marketSipAnnualReturn').value) / 100;

    // Store inputs for export
    currentSimulationData.inputs = {
        'Loan Amount (INR)': loanAmount,
        'Loan Annual Interest Rate (%)': loanAnnualInterestRate * 100,
        'Loan Tenure (Years)': loanTenureYears,
        'Loan Start Date': formatDate(loanStartDate),
        'Bond Face Value per Bond (INR)': bondFaceValuePerBond,
        'Bond Annual Coupon Rate (%)': bondAnnualCouponRate * 100,
        'Bond Market Price per Bond (INR)': bondMarketPricePerBond,
        'Bond Accrued Interest Adjustment (INR)': bondAccruedInterestAdjustment,
        'Bond Maturity Date': formatDate(bondMaturityDate),
        'TDS Rate on Bond Interest (%)': tdsRate * 100,
        'First Payment Date': formatDate(firstPaymentDate),
        'Previous Bond Payment Date (for first coupon calc)': formatDate(previousBondPaymentDate),
        'Annual Inflation Rate (%)': inflationRate * 100,
        'Market Annual Return (%)': marketAnnualReturn * 100
    };


    // Basic input validation
    if (isNaN(loanAmount) || isNaN(loanAnnualInterestRate) || isNaN(loanTenureYears) ||
        isNaN(bondFaceValuePerBond) || isNaN(bondAnnualCouponRate) || isNaN(bondMarketPricePerBond) ||
        isNaN(bondAccruedInterestAdjustment) || !bondMaturityDate || !loanStartDate || !firstPaymentDate || !previousBondPaymentDate || isNaN(inflationRate) || isNaN(tdsRate) || isNaN(marketAnnualReturn)) {
        showMessage("Please enter valid numerical values and dates for all fields.", "red");
        return;
    }
    if (loanAmount <= 0 || loanTenureYears <= 0 || bondFaceValuePerBond <= 0) {
        showMessage("Loan amount, tenure, and bond face value must be positive.", "red");
        return;
    }
    if (bondMaturityDate <= firstPaymentDate) {
        showMessage("Bond Maturity Date must be after the First Payment Date.", "red");
        return;
    }
    if (firstPaymentDate <= loanStartDate) {
        showMessage("First Payment Date must be after the Loan Start Date.", "red");
        return;
    }
    if (previousBondPaymentDate >= firstPaymentDate) {
         showMessage("Previous Bond Payment Date must be before the First Payment Date.", "red");
         return;
    }
    if (inflationRate < 0) {
        showMessage("Inflation rate cannot be negative.", "red");
        return;
    }
    if (tdsRate < 0 || tdsRate > 1) {
        showMessage("TDS rate must be between 0% and 100%.", "red");
        return;
    }


    // --- 2. Calculate Initial Values ---
    const bondNetInvestmentPerBond = bondMarketPricePerBond + bondAccruedInterestAdjustment;
    const numBonds = Math.floor(loanAmount / bondNetInvestmentPerBond);
    const totalBondInvestment = numBonds * bondNetInvestmentPerBond;
    const remainingLoanAfterBondPurchase = loanAmount - totalBondInvestment;

    if (numBonds <= 0) {
        showMessage("Cannot purchase any bonds with the given loan amount and bond price. Adjust parameters.", "red");
        return;
    }

    const loanEmi = calculateEmi(loanAmount, loanAnnualInterestRate, loanTenureMonths);
    const totalAnnualBondCoupon = numBonds * bondFaceValuePerBond * bondAnnualCouponRate;
    const dailyBondInterest = totalAnnualBondCoupon / 365;

    // --- 3. Generate Cash Flows ---
    const cashFlowsForPostTdsIrr = []; // For Post-TDS IRR calculations
    const datesForPostTdsIrr = [];
    const cashFlowsForPreTdsIrr = [];  // For Pre-TDS IRR calculations
    const datesForPreTdsIrr = [];
    currentSimulationData.cashFlows = []; // Clear previous cash flow data

    // Initial Cash Flow (Loan received - Bonds purchased)
    const initialNetCf = remainingLoanAfterBondPurchase;
    cashFlowsForPostTdsIrr.push(initialNetCf);
    datesForPostTdsIrr.push(loanStartDate);
    cashFlowsForPreTdsIrr.push(initialNetCf); // Initial cash flow is the same for both
    datesForPreTdsIrr.push(loanStartDate);

    currentSimulationData.cashFlows.push({
        'Date': formatDate(loanStartDate),
        'Bond Interest Credited': 0.0,
        'TDS on Bond Interest': 0.0,
        'Post-TDS Bond Interest': 0.0,
        'EMI Paid': 0.0,
        'Loan Interest Paid': 0.0,
        'Loan Principal Paid': 0.0,
        'Loan Outstanding': loanAmount,
        'Net Cash Flow (Post-TDS)': initialNetCf, // Store both types
        'Net Cash Flow (Pre-TDS)': initialNetCf // Store both types
    });

    // Monthly Cash Flows (Bond Interest - Loan EMI)
    let currentDate = new Date(firstPaymentDate); // Use Date object for iteration
    let currentLoanPrincipal = loanAmount;
    let paymentsMadeCount = 0;
    
    // Loop until current_date exceeds bond_maturity_date
    while (currentDate.getTime() <= bondMaturityDate.getTime()) {
        // If it's the maturity date, handle it in the final section
        if (currentDate.getTime() === bondMaturityDate.getTime()) {
            break; 
        }

        const daysForBondInterest = (currentDate.getTime() - previousBondPaymentDate.getTime()) / (1000 * 60 * 60 * 24);
        const monthlyBondInterestIncome = dailyBondInterest * daysForBondInterest;
        
        // Calculate TDS
        const tdsAmount = monthlyBondInterestIncome * tdsRate;
        const postTdsBondInterest = monthlyBondInterestIncome - tdsAmount;

        previousBondPaymentDate = new Date(currentDate); // Update for next iteration

        // Calculate loan interest and principal payment for the month
        const loanInterestPayment = currentLoanPrincipal * (loanAnnualInterestRate / 12);
        const loanPrincipalPaid = loanEmi - loanInterestPayment;

        // Update current loan principal *after* this month's payment
        currentLoanPrincipal -= loanPrincipalPaid;
        paymentsMadeCount += 1;

        // Cash flows for IRR calculations
        const netMonthlyCashFlowPostTDS = postTdsBondInterest - loanEmi;
        const netMonthlyCashFlowPreTDS = monthlyBondInterestIncome - loanEmi;

        cashFlowsForPostTdsIrr.push(netMonthlyCashFlowPostTDS);
        datesForPostTdsIrr.push(new Date(currentDate));
        cashFlowsForPreTdsIrr.push(netMonthlyCashFlowPreTDS);
        datesForPreTdsIrr.push(new Date(currentDate));

        currentSimulationData.cashFlows.push({
            'Date': formatDate(currentDate),
            'Bond Interest Credited': monthlyBondInterestIncome,
            'TDS on Bond Interest': tdsAmount,
            'Post-TDS Bond Interest': postTdsBondInterest,
            'EMI Paid': loanEmi,
            'Loan Interest Paid': loanInterestPayment,
            'Loan Principal Paid': loanPrincipalPaid,
            'Loan Outstanding': Math.max(0, currentLoanPrincipal),
            'Net Cash Flow (Post-TDS)': netMonthlyCashFlowPostTDS,
            'Net Cash Flow (Pre-TDS)': netMonthlyCashFlowPreTDS
        });

        // Move to the next payment date (e.g., 4th of next month)
        // This logic ensures the next date is the same day of the subsequent month.
        let nextMonth = currentDate.getMonth() + 1; // 0-indexed month
        let nextYear = currentDate.getFullYear();
        let nextDay = currentDate.getDate(); // Keep the same day

        if (nextMonth > 11) { // If current month is December (11)
            nextMonth = 0; // January
            nextYear += 1;
        }
        currentDate = new Date(nextYear, nextMonth, nextDay);

        // Handle cases where the day might not exist in the next month (e.g., Feb 30th)
        // If the day rolls over due to short month, it will be corrected by Date constructor
        // Example: new Date(2025, 1, 30) -> March 1, 2025. We want Feb 28/29.
        // Re-adjust to the last day of the month if the original day is too high for next month
        const lastDayOfNextMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
        if (nextDay > lastDayOfNextMonth) {
            currentDate = new Date(nextYear, nextMonth, lastDayOfNextMonth);
        }
    }

    // --- 4. Cash Flow at Bond Maturity & Loan Closure ---
    let outstandingLoanPrincipalAtMaturity;
    let finalLoanInterestPaid = 0;
    let finalLoanPrincipalPaid = 0;

    const remainingPayments = loanTenureMonths - paymentsMadeCount;
    if (remainingPayments > 0) {
        outstandingLoanPrincipalAtMaturity = currentLoanPrincipal; 
        finalLoanPrincipalPaid = outstandingLoanPrincipalAtMaturity;
    } else {
        outstandingLoanPrincipalAtMaturity = 0;
    }

    const bondPrincipalReceived = numBonds * bondFaceValuePerBond;
    const daysForFinalCoupon = (bondMaturityDate.getTime() - previousBondPaymentDate.getTime()) / (1000 * 60 * 60 * 24);
    const finalBondInterestIncome = dailyBondInterest * daysForFinalCoupon;
    
    // Calculate TDS for final coupon
    const finalTdsAmount = finalBondInterestIncome * tdsRate;
    const finalPostTdsBondInterest = finalBondInterestIncome - finalTdsAmount;

    // Net cash flow at maturity for Post-TDS
    const netCashFlowAtMaturityPostTDS = bondPrincipalReceived + finalPostTdsBondInterest - outstandingLoanPrincipalAtMaturity;
    cashFlowsForPostTdsIrr.push(netCashFlowAtMaturityPostTDS);
    datesForPostTdsIrr.push(bondMaturityDate);

    // Net cash flow at maturity for Pre-TDS
    const netCashFlowAtMaturityPreTDS = bondPrincipalReceived + finalBondInterestIncome - outstandingLoanPrincipalAtMaturity;
    cashFlowsForPreTdsIrr.push(netCashFlowAtMaturityPreTDS);
    datesForPreTdsIrr.push(bondMaturityDate);

    currentSimulationData.cashFlows.push({
        'Date': formatDate(bondMaturityDate),
        'Bond Interest Credited': finalBondInterestIncome,
        'TDS on Bond Interest': finalTdsAmount,
        'Post-TDS Bond Interest': finalPostTdsBondInterest,
        'EMI Paid': outstandingLoanPrincipalAtMaturity, // This is the lump-sum repayment
        'Loan Interest Paid': finalLoanInterestPaid,
        'Loan Principal Paid': finalLoanPrincipalPaid,
        'Loan Outstanding': 0.0,
        'Net Cash Flow (Post-TDS)': netCashFlowAtMaturityPostTDS,
        'Net Cash Flow (Pre-TDS)': netCashFlowAtMaturityPreTDS
    });

    // Calculate Running Future Values for Market Comparison (using ABSOLUTE values)
    const datesForMarketComp = currentSimulationData.cashFlows.map(row => parseDate(row['Date']));
    const cashFlowsForMarketComp = currentSimulationData.cashFlows.map(row => row['Net Cash Flow (Post-TDS)']);
    
    const runningFvMarketRateArray = getRunningFutureValuesOfMarketInjections(cashFlowsForMarketComp, datesForMarketComp, marketAnnualReturn);
    
    // Store running FV in currentSimulationData.cashFlows
    for (let i = 0; i < currentSimulationData.cashFlows.length; i++) {
        currentSimulationData.cashFlows[i]['Cumulative Future Value (at Market Rate)'] = runningFvMarketRateArray[i];
    }


    // --- 5. Display Results ---
    document.getElementById('results').classList.remove('hidden');

    // Calculate and display Nominal IRR (Post-TDS)
    let nominalIrrValuePostTDS = NaN;
    try {
        nominalIrrValuePostTDS = calculateXIRR(datesForPostTdsIrr, cashFlowsForPostTdsIrr);
    } catch (e) {
        console.error("Error calculating Nominal XIRR (Post-TDS):", e);
        showMessage("Error calculating Nominal IRR (Post-TDS). Please check your cash flow data.", "red");
    }

    if (!isNaN(nominalIrrValuePostTDS)) {
        document.getElementById('nominalIrrResult').textContent = `${(nominalIrrValuePostTDS * 100).toFixed(2)}% (Annualized)`;
    } else {
        document.getElementById('nominalIrrResult').textContent = "N/A (Could not calculate)";
    }

    // Calculate and display Real IRR (Post-TDS)
    let realIrrValuePostTDS = NaN;
    if (!isNaN(inflationRate) && inflationRate >= 0) {
        const realCashFlowsPostTDS = getRealCashFlows(cashFlowsForPostTdsIrr, datesForPostTdsIrr, loanStartDate, inflationRate);
        try {
            realIrrValuePostTDS = calculateXIRR(datesForPostTdsIrr, realCashFlowsPostTDS);
        } catch (e) {
            console.error("Error calculating Real XIRR (Post-TDS):", e);
            showMessage("Error calculating Real IRR (Post-TDS). Please check your cash flow data or inflation rate.", "red");
        }
    } else {
        showMessage("Invalid inflation rate for Real IRR calculation.", "red");
    }

    if (!isNaN(realIrrValuePostTDS)) {
        document.getElementById('realIrrResult').textContent = `${(realIrrValuePostTDS * 100).toFixed(2)}% (Annualized)`;
    } else {
        document.getElementById('realIrrResult').textContent = "N/A (Could not calculate)";
    }

    // Calculate and display Nominal IRR (Pre-TDS)
    let nominalIrrValuePreTDS = NaN;
    try {
        nominalIrrValuePreTDS = calculateXIRR(datesForPreTdsIrr, cashFlowsForPreTdsIrr);
    } catch (e) {
        console.error("Error calculating Nominal XIRR (Pre-TDS):", e);
        showMessage("Error calculating Nominal IRR (Pre-TDS). Please check your cash flow data.", "red");
    }

    if (!isNaN(nominalIrrValuePreTDS)) {
        document.getElementById('preTdsNominalIrrResult').textContent = `${(nominalIrrValuePreTDS * 100).toFixed(2)}% (Annualized)`;
    } else {
        document.getElementById('preTdsNominalIrrResult').textContent = "N/A (Could not calculate)";
    }

    // Calculate and display Real IRR (Pre-TDS)
    let realIrrValuePreTDS = NaN;
    if (!isNaN(inflationRate) && inflationRate >= 0) {
        const realCashFlowsPreTDS = getRealCashFlows(cashFlowsForPreTdsIrr, datesForPreTdsIrr, loanStartDate, inflationRate);
        try {
            realIrrValuePreTDS = calculateXIRR(datesForPreTdsIrr, realCashFlowsPreTDS);
        } catch (e) {
            console.error("Error calculating Real XIRR (Pre-TDS):", e);
            showMessage("Error calculating Real IRR (Pre-TDS). Please check your cash flow data or inflation rate.", "red");
        }
    } else {
        showMessage("Invalid inflation rate for Real IRR calculation.", "red");
    }

    if (!isNaN(realIrrValuePreTDS)) {
        document.getElementById('preTdsRealIrrResult').textContent = `${(realIrrValuePreTDS * 100).toFixed(2)}% (Annualized)`;
    } else {
        document.getElementById('preTdsRealIrrResult').textContent = "N/A (Could not calculate)";
    }
    
    const totalNetCashFlowPostTDS = cashFlowsForPostTdsIrr.reduce((sum, cf) => sum + cf, 0);
    const totalNetCashFlowPreTDS = cashFlowsForPreTdsIrr.reduce((sum, cf) => sum + cf, 0);

    document.getElementById('netCashFlowPostTDSResult').textContent = `INR ${totalNetCashFlowPostTDS.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('netCashFlowPreTDSResult').textContent = `INR ${totalNetCashFlowPreTDS.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // --- Market Comparison Calculations (Revised) ---
    // Post-TDS Market Appreciation
    let totalCashInjectedGeneratedPostTDS = cashFlowsForPostTdsIrr.reduce((sum, cf) => sum + Math.abs(cf), 0);
    let finalValueOfMarketInvestmentPostTDS = NaN; 
    if (!isNaN(marketAnnualReturn)) {
        finalValueOfMarketInvestmentPostTDS = calculateFvOfMarketInjections(cashFlowsForPostTdsIrr, datesForPostTdsIrr, marketAnnualReturn, bondMaturityDate);
    } else {
        console.warn("Market Annual Return is invalid, Final Value of Market Investment (Post-TDS) cannot be calculated.");
    }

    let marketAppreciationPostTDS = NaN;
    if (!isNaN(finalValueOfMarketInvestmentPostTDS) && !isNaN(totalCashInjectedGeneratedPostTDS)) {
        marketAppreciationPostTDS = finalValueOfMarketInvestmentPostTDS - totalCashInjectedGeneratedPostTDS;
    }

    if (!isNaN(marketAppreciationPostTDS)) {
        document.getElementById('marketCompAppreciatedValuePostTDS').textContent = `INR ${marketAppreciationPostTDS.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
        document.getElementById('marketCompAppreciatedValuePostTDS').textContent = "N/A";
    }

    // Pre-TDS Market Appreciation (NEW)
    let totalCashInjectedGeneratedPreTDS = cashFlowsForPreTdsIrr.reduce((sum, cf) => sum + Math.abs(cf), 0);
    let finalValueOfMarketInvestmentPreTDS = NaN;
    if (!isNaN(marketAnnualReturn)) {
        finalValueOfMarketInvestmentPreTDS = calculateFvOfMarketInjections(cashFlowsForPreTdsIrr, datesForPreTdsIrr, marketAnnualReturn, bondMaturityDate);
    } else {
        console.warn("Market Annual Return is invalid, Final Value of Market Investment (Pre-TDS) cannot be calculated.");
    }

    let marketAppreciationPreTDS = NaN;
    if (!isNaN(finalValueOfMarketInvestmentPreTDS) && !isNaN(totalCashInjectedGeneratedPreTDS)) {
        marketAppreciationPreTDS = finalValueOfMarketInvestmentPreTDS - totalCashInjectedGeneratedPreTDS;
    }

    if (!isNaN(marketAppreciationPreTDS)) {
        document.getElementById('marketCompAppreciatedValuePreTDS').textContent = `INR ${marketAppreciationPreTDS.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
        document.getElementById('marketCompAppreciatedValuePreTDS').textContent = "N/A";
    }
    // --- End Market Comparison Calculations (Revised) ---


    // Store outputs for export
    currentSimulationData.outputs = {
        'Nominal IRR (Post-TDS)': !isNaN(nominalIrrValuePostTDS) ? `${(nominalIrrValuePostTDS * 100).toFixed(2)}%` : 'N/A',
        'Real IRR (Post-TDS)': !isNaN(realIrrValuePostTDS) ? `${(realIrrValuePostTDS * 100).toFixed(2)}%` : 'N/A',
        'Nominal IRR (Pre-TDS)': !isNaN(nominalIrrValuePreTDS) ? `${(nominalIrrValuePreTDS * 100).toFixed(2)}%` : 'N/A',
        'Real IRR (Pre-TDS)': !isNaN(realIrrValuePreTDS) ? `${(realIrrValuePreTDS * 100).toFixed(2)}%` : 'N/A',
        'Net Cash Flow (Post-TDS) (INR)': totalNetCashFlowPostTDS,
        'Net Cash Flow (Pre-TDS) (INR)': totalNetCashFlowPreTDS,
        'Market Appreciation (Post-TDS Cash Flows) (INR)': !isNaN(marketAppreciationPostTDS) ? marketAppreciationPostTDS : 'N/A',
        'Market Appreciation (Pre-TDS Cash Flows) (INR)': !isNaN(marketAppreciationPreTDS) ? marketAppreciationPreTDS : 'N/A' // New output for export
    };

    // Render the default (Post-TDS) cash flow table and set active tab
    renderCashFlowTable('post-tds');
    setActiveTab('tabPostTDS');
});

// Event Listeners for Tab Buttons
document.getElementById('tabPostTDS').addEventListener('click', () => {
    renderCashFlowTable('post-tds');
    setActiveTab('tabPostTDS');
});

document.getElementById('tabPreTDS').addEventListener('click', () => {
    renderCashFlowTable('pre-tds');
    setActiveTab('tabPreTDS');
});

document.getElementById('tabMarketComp').addEventListener('click', () => {
    renderCashFlowTable('market-comp');
    setActiveTab('tabMarketComp');
});


document.getElementById('exportToExcelBtn').addEventListener('click', () => {
    let csvContent = "";

    // Add Input Parameters
    csvContent += "--- Input Parameters ---\n";
    for (const key in currentSimulationData.inputs) {
        csvContent += `"${key}","${currentSimulationData.inputs[key]}"\n`;
    }
    csvContent += "\n"; // Add a blank line for separation

    // Add Simulation Outputs
    csvContent += "--- Simulation Outputs ---\n";
    for (const key in currentSimulationData.outputs) {
        csvContent += `"${key}","${currentSimulationData.outputs[key]}"\n`;
    }
    csvContent += "\n"; // Add a blank line for separation

    // Add Cash Flow Details (Exporting all relevant columns)
    csvContent += "--- Cash Flow Details ---\n";
    const headers = [
        "Date",
        "Bond Interest Credited (INR)",
        "TDS on Bond Interest (INR)",
        "Post-TDS Bond Interest (INR)",
        "EMI Paid (INR)",
        "Loan Interest Paid (INR)",
        "Loan Principal Paid (INR)",
        "Loan Outstanding (INR)",
        "Net Cash Flow (Post-TDS) (INR)",
        "Net Cash Flow (Pre-TDS) (INR)",
        "Cumulative Future Value (at Market Rate) (INR)" // For Market Comp (using ABS logic)
    ];
    csvContent += headers.map(header => `"${header}"`).join(",") + "\n";

    currentSimulationData.cashFlows.forEach(row => {
        const rowValues = [
            row['Date'],
            row['Bond Interest Credited'].toFixed(2),
            row['TDS on Bond Interest'].toFixed(2),
            row['Post-TDS Bond Interest'].toFixed(2),
            row['EMI Paid'].toFixed(2),
            row['Loan Interest Paid'].toFixed(2),
            row['Loan Principal Paid'].toFixed(2),
            row['Loan Outstanding'].toFixed(2),
            row['Net Cash Flow (Post-TDS)'].toFixed(2),
            row['Net Cash Flow (Pre-TDS)'].toFixed(2),
            row['Cumulative Future Value (at Market Rate)'].toFixed(2) 
        ];
        csvContent += rowValues.map(value => `"${value}"`).join(",") + "\n";
    });

    // Create a Blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) { // Feature detection for download attribute
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'financial_simulation_data.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else {
        showMessage("Your browser does not support downloading files directly. Please copy the data manually.", "warning");
    }
});
