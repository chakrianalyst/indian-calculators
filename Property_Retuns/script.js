document.addEventListener('DOMContentLoaded', () => {
    const assetNameInput = document.getElementById('assetName');
    const purchasePriceInput = document.getElementById('purchasePrice');
    const initialEquityInput = document.getElementById('initialEquity');
    const hasLoanSelect = document.getElementById('hasLoan');
    const loanDetailsDiv = document.getElementById('loanDetails');
    const loanAmountInput = document.getElementById('loanAmount');
    const interestRateInput = document.getElementById('interestRate');
    const loanTenureInput = document.getElementById('loanTenure');
    const assetTypeSelect = document.getElementById('assetType');
    const rentingDetailsDiv = document.getElementById('rentingDetails');
    const savingDetailsDiv = document.getElementById('savingDetails');
    const monthlyRentInput = document.getElementById('monthlyRent');
    const annualRentIncreaseInput = document.getElementById('annualRentIncrease');
    const annualExpensesInput = document.getElementById('annualExpenses');
    const annualExpensesIncreaseInput = document.getElementById('annualExpensesIncrease');
    const holdingPeriodInput = document.getElementById('holdingPeriod');
    const appreciationRateInput = document.getElementById('appreciationRate');
    const runSimulationBtn = document.getElementById('runSimulation');
    const resultsDiv = document.getElementById('results');

    // Summary output elements
    const summaryAssetNameSpan = document.getElementById('summaryAssetName');
    const totalInitialInvestmentSpan = document.getElementById('totalInitialInvestment');
    const estimatedSaleValueSpan = document.getElementById('estimatedSaleValue');
    const totalGrossIncomeSpan = document.getElementById('totalGrossIncome');
    const totalExpensesSpan = document.getElementById('totalExpenses');
    const overallNetProfitSpan = document.getElementById('overallNetProfit');
    const totalROISpan = document.getElementById('totalROI');
    const annualizedReturnSpan = document.getElementById('annualizedReturn');
    const annualBreakdownTableBody = document.querySelector('#annualBreakdownTable tbody');

    // --- Helper Functions ---

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    const formatPercentage = (value) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'percent',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value / 100);
    };

    // --- UI Logic ---

    const toggleLoanDetails = () => {
        if (hasLoanSelect.value === 'yes') {
            loanDetailsDiv.classList.remove('hidden');
        } else {
            loanDetailsDiv.classList.add('hidden');
        }
    };

    const toggleAssetTypeDetails = () => {
        if (assetTypeSelect.value === 'renting') {
            rentingDetailsDiv.classList.remove('hidden');
            savingDetailsDiv.classList.add('hidden');
        } else { // saving
            rentingDetailsDiv.classList.add('hidden');
            savingDetailsDiv.classList.remove('hidden');
        }
    };

    // --- Calculation Logic ---

    const calculateEMI = (principal, annualInterestRate, tenureYears) => {
        if (principal <= 0 || annualInterestRate < 0 || tenureYears <= 0) {
            return { emi: 0, totalInterest: 0 };
        }
        const monthlyInterestRate = (annualInterestRate / 100) / 12;
        const numberOfMonths = tenureYears * 12;

        if (monthlyInterestRate === 0) { // For 0% interest
            return { emi: principal / numberOfMonths, totalInterest: 0 };
        }

        const emi = principal * monthlyInterestRate * Math.pow((1 + monthlyInterestRate), numberOfMonths) /
            (Math.pow((1 + monthlyInterestRate), numberOfMonths) - 1);

        const totalAmountPaid = emi * numberOfMonths;
        const totalInterest = totalAmountPaid - principal;

        return { emi: emi, totalInterest: totalInterest };
    };

    const runSimulation = () => {
        const assetName = assetNameInput.value || "Investment Property";
        const purchasePrice = parseFloat(purchasePriceInput.value);
        const initialEquity = parseFloat(initialEquityInput.value);
        const hasLoan = hasLoanSelect.value === 'yes';
        let loanAmount = 0;
        let annualInterestRate = 0;
        let loanTenure = 0;
        let calculatedEmi = 0;
        let totalLoanInterest = 0;

        if (hasLoan) {
            loanAmount = parseFloat(loanAmountInput.value);
            annualInterestRate = parseFloat(interestRateInput.value);
            loanTenure = parseInt(loanTenureInput.value);
            const emiCalc = calculateEMI(loanAmount, annualInterestRate, loanTenure);
            calculatedEmi = emiCalc.emi;
            totalLoanInterest = emiCalc.totalInterest;
        }

        const assetType = assetTypeSelect.value;
        const monthlyRent = parseFloat(monthlyRentInput.value);
        const annualRentIncrease = parseFloat(annualRentIncreaseInput.value) / 100;
        const annualExpenses = parseFloat(annualExpensesInput.value);
        const annualExpensesIncrease = parseFloat(annualExpensesIncreaseInput.value) / 100;
        const holdingPeriod = parseInt(holdingPeriodInput.value);
        const appreciationRate = parseFloat(appreciationRateInput.value) / 100;

        // Validation
        if (isNaN(purchasePrice) || isNaN(initialEquity) || purchasePrice <= 0 || initialEquity < 0 ||
            (hasLoan && (isNaN(loanAmount) || isNaN(annualInterestRate) || isNaN(loanTenure) || loanAmount < 0 || annualInterestRate < 0 || loanTenure < 0)) ||
            (assetType === 'renting' && (isNaN(monthlyRent) || isNaN(annualRentIncrease) || monthlyRent < 0 || annualRentIncrease < 0)) ||
            isNaN(annualExpenses) || isNaN(annualExpensesIncrease) || isNaN(holdingPeriod) || isNaN(appreciationRate) ||
            annualExpenses < 0 || annualExpensesIncrease < 0 || holdingPeriod <= 0 || appreciationRate < 0) {
            alert('Please enter valid numerical values for all required fields.');
            return;
        }

        // --- Overall Metrics Calculations ---
        const totalInitialInvestment = initialEquity + (hasLoan ? 0 : purchasePrice); // If no loan, purchase price is initial investment
                                                                                     // If loan, initial investment is equity only
        let estimatedSaleValue = purchasePrice * Math.pow((1 + appreciationRate), holdingPeriod);

        let totalGrossIncome = 0;
        let totalHistoricalExpenses = 0; // Tracks annual expenses other than EMI

        let currentPropertyValue = purchasePrice;
        let currentLoanOutstanding = loanAmount;
        let currentAnnualRent = monthlyRent * 12;
        let currentAnnualExpenses = annualExpenses;

        const annualBreakdown = [];

        for (let year = 1; year <= holdingPeriod; year++) {
            currentPropertyValue *= (1 + appreciationRate);

            let yearRentalIncome = 0;
            if (assetType === 'renting') {
                yearRentalIncome = currentAnnualRent;
                totalGrossIncome += yearRentalIncome;
                currentAnnualRent *= (1 + annualRentIncrease); // Rent increases next year
            }

            let yearOtherExpenses = currentAnnualExpenses;
            totalHistoricalExpenses += yearOtherExpenses;
            currentAnnualExpenses *= (1 + annualExpensesIncrease); // Expenses increase next year

            let yearLoanInterest = 0;
            let yearPrincipalPaid = 0;
            let yearEMI = 0;

            if (hasLoan && year <= loanTenure) {
                yearEMI = calculatedEmi * 12;
                let loanBalance = currentLoanOutstanding;
                for (let month = 0; month < 12; month++) {
                    const monthlyInterest = loanBalance * ((annualInterestRate / 100) / 12);
                    const monthlyPrincipal = calculatedEmi - monthlyInterest;
                    yearLoanInterest += monthlyInterest;
                    yearPrincipalPaid += monthlyPrincipal;
                    loanBalance -= monthlyPrincipal;
                }
                currentLoanOutstanding = Math.max(0, loanBalance); // Loan can't go negative
            } else if (hasLoan && year > loanTenure) {
                // Loan is paid off, remaining outstanding is 0
                currentLoanOutstanding = 0;
            }


            const netCashFlow = (yearRentalIncome - yearEMI - yearOtherExpenses);

            annualBreakdown.push({
                year: year,
                propertyValue: currentPropertyValue,
                rentalIncome: yearRentalIncome,
                loanEMI: yearEMI,
                interestPaid: yearLoanInterest,
                principalPaid: yearPrincipalPaid,
                loanOutstanding: currentLoanOutstanding,
                otherExpenses: yearOtherExpenses,
                netCashFlow: netCashFlow
            });
        }

        // Final calculations for overall metrics
        const totalEMIPaid = hasLoan ? (calculatedEmi * 12 * Math.min(holdingPeriod, loanTenure)) : 0; // Only count EMI for periods within loan tenure
        const totalInterestPaid = hasLoan ? totalLoanInterest : 0; // This is the total interest over the full original loan tenure
                                                                     // If holding period < loan tenure, this might be too high
                                                                     // For true total interest paid *during holding period*, sum from annual breakdown
        let totalInterestPaidDuringHolding = annualBreakdown.reduce((sum, yearData) => sum + yearData.interestPaid, 0);


        const actualTotalExpenses = totalHistoricalExpenses + totalInterestPaidDuringHolding; // Sum of non-EMI expenses + interest paid on loan

        const netProfitFromSale = estimatedSaleValue - purchasePrice; // Simplified: just appreciation

        // Overall Net Profit calculation:
        // (Sale Value + Total Rent Income) - (Initial Equity + Total Loan Amount (if any) + Total Other Expenses + Total Interest Paid on Loan)
        // A simpler way: Final Value + Total Inflow - Total Outflow
        const totalOutflow = initialEquity + (hasLoan ? loanAmount : 0) + totalHistoricalExpenses + totalInterestPaidDuringHolding;
        const totalInflow = estimatedSaleValue + totalGrossIncome;
        const overallNetProfit = totalInflow - totalOutflow;

        const totalROI = (overallNetProfit / totalInitialInvestment) * 100;

        // CAGR (Compound Annual Growth Rate)
        // For simplicity, using (Final Value / Initial Value)^(1/years) - 1
        // Initial Value here is total capital deployed (equity + principal paid for loan, or full purchase price if no loan)
        const principalPaidDuringHolding = annualBreakdown.reduce((sum, yearData) => sum + yearData.principalPaid, 0);
        const totalCapitalDeployed = initialEquity + principalPaidDuringHolding;
        const finalValue = estimatedSaleValue + totalGrossIncome;
        let annualizedReturn = 0;
        if (totalCapitalDeployed > 0 && holdingPeriod > 0) {
             annualizedReturn = (Math.pow((finalValue / totalCapitalDeployed), (1 / holdingPeriod)) - 1) * 100;
        }


        // --- Display Results ---
        summaryAssetNameSpan.textContent = assetName;
        totalInitialInvestmentSpan.textContent = formatCurrency(totalInitialInvestment);
        estimatedSaleValueSpan.textContent = formatCurrency(estimatedSaleValue);
        totalGrossIncomeSpan.textContent = formatCurrency(totalGrossIncome);
        totalExpensesSpan.textContent = formatCurrency(actualTotalExpenses); // Display actual expenses incurred
        overallNetProfitSpan.textContent = formatCurrency(overallNetProfit);
        totalROISpan.textContent = formatPercentage(totalROI);
        annualizedReturnSpan.textContent = formatPercentage(annualizedReturn);

        // Populate Annual Breakdown Table
        annualBreakdownTableBody.innerHTML = ''; // Clear previous rows
        annualBreakdown.forEach(data => {
            const row = annualBreakdownTableBody.insertRow();
            row.insertCell().textContent = data.year;
            row.insertCell().textContent = formatCurrency(data.propertyValue);
            row.insertCell().textContent = formatCurrency(data.rentalIncome);
            row.insertCell().textContent = formatCurrency(data.loanEMI);
            row.insertCell().textContent = formatCurrency(data.interestPaid);
            row.insertCell().textContent = formatCurrency(data.principalPaid);
            row.insertCell().textContent = formatCurrency(data.loanOutstanding);
            row.insertCell().textContent = formatCurrency(data.otherExpenses);
            row.insertCell().textContent = formatCurrency(data.netCashFlow);
        });

        resultsDiv.classList.remove('hidden'); // Show results section
    };

    // --- Event Listeners & Initial Load ---

    hasLoanSelect.addEventListener('change', toggleLoanDetails);
    assetTypeSelect.addEventListener('change', toggleAssetTypeDetails);
    runSimulationBtn.addEventListener('click', runSimulation);

    // Initial state setup
    toggleLoanDetails();
    toggleAssetTypeDetails();
    runSimulation(); // Run simulation on page load with default values
});