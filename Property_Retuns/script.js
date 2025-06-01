document.addEventListener('DOMContentLoaded', () => {
    const calculateBtn = document.getElementById('calculateBtn');

    // Input elements
    const purchasePriceInput = document.getElementById('purchasePrice');
    const initialExpensesInput = document.getElementById('initialExpenses');
    const monthlyRentInput = document.getElementById('monthlyRent');
    const annualRentIncreaseInput = document.getElementById('annualRentIncrease');
    const monthlyExpensesInput = document.getElementById('monthlyExpenses');
    const annualExpensesIncreaseInput = document.getElementById('annualExpensesIncrease');
    const holdingPeriodInput = document.getElementById('holdingPeriod');
    const propertyAppreciationInput = document.getElementById('propertyAppreciation');
    const salePriceInput = document.getElementById('salePrice');

    // Output elements
    const totalInitialInvestmentSpan = document.getElementById('totalInitialInvestment');
    const calculatedSalePriceSpan = document.getElementById('calculatedSalePrice');
    const totalRentIncomeSpan = document.getElementById('totalRentIncome');
    const totalExpensesSpan = document.getElementById('totalExpenses');
    const netProfitFromSaleSpan = document.getElementById('netProfitFromSale');
    const overallNetProfitSpan = document.getElementById('overallNetProfit');
    const capRateSpan = document.getElementById('capRate');
    const totalROISpan = document.getElementById('totalROI');
    const annualizedReturnSpan = document.getElementById('annualizedReturn');

    // Helper function to format currency
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    // Helper function to format percentage
    const formatPercentage = (value) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'percent',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value / 100);
    };

    const calculateReturns = () => {
        const purchasePrice = parseFloat(purchasePriceInput.value);
        const initialExpenses = parseFloat(initialExpensesInput.value);
        const monthlyRent = parseFloat(monthlyRentInput.value);
        const annualRentIncrease = parseFloat(annualRentIncreaseInput.value) / 100;
        const monthlyExpenses = parseFloat(monthlyExpensesInput.value);
        const annualExpensesIncrease = parseFloat(annualExpensesIncreaseInput.value) / 100;
        const holdingPeriod = parseInt(holdingPeriodInput.value);
        const propertyAppreciation = parseFloat(propertyAppreciationInput.value) / 100;
        let expectedSalePrice = parseFloat(salePriceInput.value);

        // --- Calculations ---

        // Total Initial Investment
        const totalInitialInvestment = purchasePrice + initialExpenses;

        // Calculated Sale Price if not provided
        if (isNaN(expectedSalePrice) || expectedSalePrice === 0) {
            expectedSalePrice = purchasePrice * Math.pow((1 + propertyAppreciation), holdingPeriod);
        }

        // Total Rent Income over holding period
        let totalRentIncome = 0;
        let currentAnnualRent = monthlyRent * 12;
        for (let i = 0; i < holdingPeriod; i++) {
            totalRentIncome += currentAnnualRent;
            currentAnnualRent *= (1 + annualRentIncrease);
        }

        // Total Expenses over holding period
        let totalExpenses = 0;
        let currentAnnualExpenses = monthlyExpenses * 12;
        for (let i = 0; i < holdingPeriod; i++) {
            totalExpenses += currentAnnualExpenses;
            currentAnnualExpenses *= (1 + annualExpensesIncrease);
        }

        // Net Profit from Sale
        const netProfitFromSale = expectedSalePrice - purchasePrice; // Simplified: ignores initial expenses for this specific profit metric

        // Overall Net Profit (considering all cash flows)
        const overallNetProfit = (expectedSalePrice + totalRentIncome) - (purchasePrice + initialExpenses + totalExpenses);

        // Capitalization Rate (Cap Rate) - Year 1
        const year1NetOperatingIncome = (monthlyRent * 12) - (monthlyExpenses * 12);
        const capRate = (year1NetOperatingIncome / purchasePrice) * 100;

        // Return on Investment (ROI) - Total
        const totalROI = (overallNetProfit / totalInitialInvestment) * 100;

        // Annualized Return (CAGR - Compound Annual Growth Rate)
        // This is a simplified CAGR for profit relative to initial investment.
        // A more complex CAGR would consider all cash flows and time value of money (IRR).
        const cagrFactor = Math.pow((1 + (totalROI / 100)), (1 / holdingPeriod)) - 1;
        const annualizedReturn = cagrFactor * 100;


        // --- Display Results ---
        totalInitialInvestmentSpan.textContent = formatCurrency(totalInitialInvestment);
        calculatedSalePriceSpan.textContent = formatCurrency(expectedSalePrice);
        totalRentIncomeSpan.textContent = formatCurrency(totalRentIncome);
        totalExpensesSpan.textContent = formatCurrency(totalExpenses);
        netProfitFromSaleSpan.textContent = formatCurrency(netProfitFromSale);
        overallNetProfitSpan.textContent = formatCurrency(overallNetProfit);
        capRateSpan.textContent = formatPercentage(capRate);
        totalROISpan.textContent = formatPercentage(totalROI);
        annualizedReturnSpan.textContent = formatPercentage(annualizedReturn);
    };

    // Initial calculation on page load with default values
    calculateReturns();

    // Event listener for button click
    calculateBtn.addEventListener('click', calculateReturns);

    // Add event listeners to input fields for real-time updates (optional)
    [
        purchasePriceInput, initialExpensesInput, monthlyRentInput, annualRentIncreaseInput,
        monthlyExpensesInput, annualExpensesIncreaseInput, holdingPeriodInput,
        propertyAppreciationInput, salePriceInput
    ].forEach(input => {
        input.addEventListener('input', calculateReturns);
    });

});