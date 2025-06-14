        // DOM Elements
        const assetPriceInput = document.getElementById('assetPrice');
        const loanAmountTakenInput = document.getElementById('loanAmountTaken');
        const purchaseDateInput = document.getElementById('purchaseDate');
        const hasLoanCheckbox = document.getElementById('hasLoan');
        const loanDetailsDiv = document.getElementById('loanDetails');
        const loanInterestRateInput = document.getElementById('loanInterestRate');
        const loanTenureInput = document.getElementById('loanTenure');
        const monthlyRentalInput = document.getElementById('monthlyRental');
        const otherMonthlyInflowInput = document.getElementById('otherMonthlyInflow');
        const annualExpenseInput = document.getElementById('annualExpense');
        const salePriceInput = document.getElementById('salePrice');
        const saleDateInput = document.getElementById('saleDate');
        const calculateBtn = document.getElementById('calculateBtn');
        const resetBtn = document.getElementById('resetBtn');
        const absoluteReturnDisplay = document.getElementById('absoluteReturn');
        const xirrReturnDisplay = document.getElementById('xirrReturn');
        const loader = document.getElementById('loader');
        const messageBoxContainer = document.getElementById('messageBoxContainer');
        const messageBoxText = document.getElementById('messageBoxText');
        const messageBoxClose = document.getElementById('messageBoxClose');
        const cashFlowTableContainer = document.getElementById('cashFlowTableContainer');
        const cashFlowTableBody = document.getElementById('cashFlowTableBody');

        // Set default dates
        const today = new Date();
        const purchaseDefaultDate = new Date();
        purchaseDefaultDate.setFullYear(today.getFullYear() - 3); // 3 years ago
        purchaseDateInput.value = purchaseDefaultDate.toISOString().split('T')[0];
        saleDateInput.value = today.toISOString().split('T')[0];

        // Toggle loan details visibility
        hasLoanCheckbox.addEventListener('change', () => {
            loanDetailsDiv.style.display = hasLoanCheckbox.checked ? 'block' : 'none';
            // If loan checkbox is unchecked, set loan amount to 0
            if (!hasLoanCheckbox.checked) {
                loanAmountTakenInput.value = '0';
            } else {
                // Restore default loan amount if asset price is set and it's a new calculation
                const assetPrice = parseFloat(assetPriceInput.value) || 0;
                if (assetPrice > 0) {
                    loanAmountTakenInput.value = (assetPrice * 0.8).toFixed(0); // Default to 80% loan
                }
            }
        });
        // Initial state
        hasLoanCheckbox.checked = true; // Default to having a loan
        loanDetailsDiv.style.display = 'block';

        // Show custom message box
        function showMessageBox(message) {
            messageBoxText.textContent = message;
            messageBoxContainer.classList.remove('hidden');
        }

        // Hide custom message box
        messageBoxClose.addEventListener('click', () => {
            messageBoxContainer.classList.add('hidden');
        });

        // EMI Calculation Function
        function calculateEMI(principal, annualInterestRate, tenureYears) {
            if (principal <= 0 || annualInterestRate < 0 || tenureYears <= 0) {
                return 0;
            }
            const monthlyInterestRate = annualInterestRate / 100 / 12;
            const numberOfMonths = tenureYears * 12;

            if (monthlyInterestRate === 0) {
                return principal / numberOfMonths;
            }

            const emi = principal * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfMonths) / (Math.pow(1 + monthlyInterestRate, numberOfMonths) - 1);
            return emi;
        }

        // Function to calculate loan balance at a specific date
        function calculateLoanBalance(principal, annualInterestRate, tenureMonths, paidMonths) {
            if (paidMonths <= 0) return principal;
            if (paidMonths >= tenureMonths) return 0;

            const monthlyInterestRate = annualInterestRate / 100 / 12;
            const emi = calculateEMI(principal, annualInterestRate, tenureMonths / 12);

            // Remaining balance formula: P(1+r)^n - E[((1+r)^n - 1)/r]
            // Where P = principal, r = monthly interest rate, n = number of months paid, E = EMI
            const remainingBalance = principal * Math.pow(1 + monthlyInterestRate, paidMonths) - emi * (Math.pow(1 + monthlyInterestRate, paidMonths) - 1) / monthlyInterestRate;
            return Math.max(0, remainingBalance); // Ensure balance is not negative
        }

        // XIRR Calculation (Newton-Raphson method)
        function XIRR(transactions, guess = 0.1) {
            if (transactions.length < 2) {
                return 0; // Need at least two transactions for XIRR
            }

            const dates = transactions.map(t => new Date(t.date));
            const amounts = transactions.map(t => t.amount);

            // Convert dates to number of days from the first date
            const firstDate = dates[0];
            const days = dates.map(date => (date - firstDate) / (1000 * 60 * 60 * 24));

            const NPV = (rate) => {
                let npv = 0;
                for (let i = 0; i < amounts.length; i++) {
                    npv += amounts[i] / Math.pow(1 + rate, days[i] / 365);
                }
                return npv;
            };

            const derivativeNPV = (rate) => {
                let derivative = 0;
                for (let i = 0; i < amounts.length; i++) {
                    derivative -= amounts[i] * days[i] / 365 * Math.pow(1 + rate, -days[i] / 365 - 1);
                }
                return derivative;
            };

            let x0 = guess;
            let x1 = 0;
            const maxIterations = 100;
            const tolerance = 0.0000001;

            for (let i = 0; i < maxIterations; i++) {
                const npvVal = NPV(x0);
                const derivativeVal = derivativeNPV(x0);

                if (derivativeVal === 0) {
                    return 0; // Avoid division by zero
                }

                x1 = x0 - npvVal / derivativeVal;
                if (Math.abs(x1 - x0) < tolerance) {
                    return x1;
                }
                x0 = x1;
            }
            return x1; // Return the best guess if not converged
        }

        // Function to render the cash flow table
        function renderCashFlowTable(cashFlowDetails) {
            cashFlowTableBody.innerHTML = ''; // Clear previous rows
            if (cashFlowDetails.length === 0) {
                cashFlowTableContainer.classList.add('hidden');
                return;
            }

            cashFlowDetails.forEach(cf => {
                const row = cashFlowTableBody.insertRow();
                const dateCell = row.insertCell();
                const inflowCell = row.insertCell();
                const outflowCell = row.insertCell();
                const netFlowCell = row.insertCell();
                const cumulativeCell = row.insertCell();

                dateCell.textContent = new Date(cf.date).toLocaleDateString('en-GB');
                inflowCell.textContent = cf.inflow.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
                outflowCell.textContent = cf.outflow.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
                netFlowCell.textContent = cf.netFlow.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
                cumulativeCell.textContent = cf.cumulativeAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

                // Add color based on net flow
                if (cf.netFlow > 0) {
                    netFlowCell.classList.add('text-green-600');
                } else if (cf.netFlow < 0) {
                    netFlowCell.classList.add('text-red-600');
                }
                if (cf.cumulativeAmount < 0) {
                    cumulativeCell.classList.add('text-red-600');
                }
                inflowCell.classList.add('text-right');
                outflowCell.classList.add('text-right');
                netFlowCell.classList.add('text-right');
                cumulativeCell.classList.add('text-right');
            });
            cashFlowTableContainer.classList.remove('hidden'); // Show table container
        }


        // Main calculation logic
        async function calculateReturns() {
            loader.style.display = 'block'; // Show loader
            cashFlowTableContainer.classList.add('hidden'); // Hide table until calculated

            await new Promise(resolve => setTimeout(resolve, 100)); // Simulate a small delay for loader to show

            try {
                const assetPrice = parseFloat(assetPriceInput.value);
                const loanAmountTaken = parseFloat(loanAmountTakenInput.value);
                const purchaseDate = new Date(purchaseDateInput.value);
                const salePrice = parseFloat(salePriceInput.value);
                const saleDate = new Date(saleDateInput.value);
                const monthlyRental = parseFloat(monthlyRentalInput.value);
                const otherMonthlyInflow = parseFloat(otherMonthlyInflowInput.value);
                const annualExpense = parseFloat(annualExpenseInput.value);

                // Input validation
                if (isNaN(assetPrice) || assetPrice <= 0) { showMessageBox("Please enter a valid Asset Price."); return; }
                if (isNaN(loanAmountTaken) || loanAmountTaken < 0) { showMessageBox("Please enter a valid Loan Amount Taken (cannot be negative)."); return; }
                if (loanAmountTaken > assetPrice) { showMessageBox("Loan Amount Taken cannot exceed Asset Price."); return; }
                if (isNaN(salePrice) || salePrice <= 0) { showMessageBox("Please enter a valid Sale Price."); return; }
                if (purchaseDate >= saleDate) { showMessageBox("Sale Date must be after Purchase Date."); return; }
                if (isNaN(monthlyRental) || monthlyRental < 0) { showMessageBox("Please enter a valid Monthly Rental Income."); return; }
                if (isNaN(otherMonthlyInflow) || otherMonthlyInflow < 0) { showMessageBox("Please enter a valid Other Monthly Inflow."); return; }
                if (isNaN(annualExpense) || annualExpense < 0) { showMessageBox("Please enter a valid Annual Expense."); return; }

                let monthlyEMI = 0;
                let loanInterestRate = 0;
                let loanTenureYears = 0;
                let initialEquity = assetPrice; // Default to full asset price if no loan

                if (hasLoanCheckbox.checked) {
                    loanInterestRate = parseFloat(loanInterestRateInput.value);
                    loanTenureYears = parseFloat(loanTenureInput.value);
                    initialEquity = assetPrice - loanAmountTaken; // User's actual cash out
                    
                    if (isNaN(loanInterestRate) || loanInterestRate < 0) { showMessageBox("Please enter a valid Loan Interest Rate."); return; }
                    if (isNaN(loanTenureYears) || loanTenureYears <= 0) { showMessageBox("Please enter a valid Loan Tenure (in years)."); return; }
                    if (initialEquity < 0) { showMessageBox("Initial equity cannot be negative. Loan amount taken exceeds asset price."); return; }

                    if (loanAmountTaken > 0) {
                         monthlyEMI = calculateEMI(loanAmountTaken, loanInterestRate, loanTenureYears);
                         if (isNaN(monthlyEMI) || monthlyEMI < 0) { showMessageBox("Could not calculate EMI. Please check loan details."); return; }
                    }
                } else {
                    loanAmountTakenInput.value = 0; // Ensure loan amount is zero if checkbox is unchecked
                    loanInterestRateInput.value = 0;
                    loanTenureInput.value = 0;
                }

                // Calculate total duration in months
                const durationMonths = (saleDate.getFullYear() - purchaseDate.getFullYear()) * 12 + (saleDate.getMonth() - purchaseDate.getMonth());


                // --- Absolute Return Calculation ---
                let totalInflows = salePrice;
                let totalOutflows = initialEquity; // Initial cash outflow is the equity contribution

                // Add rental and other inflows
                totalInflows += (monthlyRental + otherMonthlyInflow) * durationMonths;

                // Add monthly loan payments and annual expenses
                if (hasLoanCheckbox.checked && loanAmountTaken > 0) {
                    const monthsLoanPaid = Math.min(durationMonths, loanTenureYears * 12);
                    totalOutflows += monthlyEMI * monthsLoanPaid; // Total EMI paid during holding period

                    // If loan not fully paid by sale date, add outstanding principal as an outflow to determine full cost
                    const outstandingLoanBalance = calculateLoanBalance(loanAmountTaken, loanInterestRate, loanTenureYears * 12, monthsLoanPaid);
                    totalOutflows += outstandingLoanBalance;
                }

                // Add annual expenses (prorated for partial years)
                totalOutflows += (annualExpense / 12) * durationMonths;

                const netProfit = totalInflows - totalOutflows;
                
                let absoluteReturn = 0;
                if (initialEquity > 0) {
                    absoluteReturn = (netProfit / initialEquity) * 100;
                } else {
                    // Handle cases where initialEquity is 0 (e.g., asset purchased entirely with loan, though loanAmountTaken check handles this)
                    // If assetPrice - loanAmountTaken is 0 and loanAmountTaken is assetPrice, it implies 100% financing
                    // In such rare cases, absolute return calculation might be complex or indicate infinite return if no initial cash.
                    // For simplicity, if no equity, we might report 0% or require some equity.
                    if (assetPrice === loanAmountTaken && assetPrice > 0) { // 100% financed
                        absoluteReturn = (netProfit / assetPrice) * 100; // Relative to asset price
                    } else {
                        absoluteReturn = 0;
                    }
                }
                
                absoluteReturnDisplay.textContent = `${absoluteReturn.toFixed(2)}%`;


                // --- XIRR Calculation and Cash Flow Data for Table ---
                const cashFlowsForXIRR = []; // This array is strictly for XIRR calculation
                const cashFlowsForTable = []; // This array is for displaying in the table
                let cumulativeCashFlow = 0;

                // 1. Initial Transaction (Purchase: Equity Outflow, Loan Inflow)
                const purchaseOutflow = initialEquity;
                const loanInflow = loanAmountTaken; // Loan amount is an inflow for cash flow purposes, but treated as an outflow by EMIs

                // For XIRR, we typically consider the net cash flow at the point of purchase.
                // The loan amount is technically an inflow at purchase, which is then offset by the asset's purchase price.
                // The initial equity (asset price - loan amount) is the true initial cash outflow from the investor.
                cashFlowsForXIRR.push({ date: purchaseDateInput.value, amount: -purchaseOutflow });

                // For the table, we want to show the initial equity as an outflow.
                cashFlowsForTable.push({
                    date: purchaseDateInput.value,
                    inflow: loanInflow, // Loan amount is an inflow, technically
                    outflow: assetPrice, // Asset price is total outflow
                    netFlow: loanInflow - assetPrice, // Or -initialEquity
                    cumulativeAmount: cumulativeCashFlow - purchaseOutflow // Initial equity outflow
                });
                cumulativeCashFlow -= purchaseOutflow; // Update for cumulative tracking

                // 2. Monthly Cash Flows (Net Inflow/Outflow)
                let currentDate = new Date(purchaseDate);
                currentDate.setDate(1); // Set to 1st of month to avoid issues with different day of month
                currentDate.setMonth(currentDate.getMonth() + 1); // Start from the month after purchase

                while (currentDate <= saleDate) {
                    const monthDate = currentDate.toISOString().split('T')[0];
                    let monthlyIn = monthlyRental + otherMonthlyInflow;
                    let monthlyOut = annualExpense / 12;
                    let monthlyLoanPayment = 0;

                    // If loan exists and EMIs are being paid (only during loan tenure)
                    if (hasLoanCheckbox.checked && loanAmountTaken > 0) {
                        const monthsPassed = (currentDate.getFullYear() - purchaseDate.getFullYear()) * 12 + (currentDate.getMonth() - purchaseDate.getMonth());
                        if (monthsPassed <= loanTenureYears * 12) { // Only pay EMI if within loan tenure
                            monthlyLoanPayment = monthlyEMI;
                            monthlyOut += monthlyLoanPayment; // Add EMI to monthly outflow
                        }
                    }
                    const netCashFlowThisMonth = monthlyIn - monthlyOut;
                    
                    // Add monthly cash flow if non-zero for XIRR
                    if (netCashFlowThisMonth !== 0) {
                        cashFlowsForXIRR.push({ date: monthDate, amount: netCashFlowThisMonth });
                    }
                    
                    cumulativeCashFlow += netCashFlowThisMonth;
                    cashFlowsForTable.push({
                        date: monthDate,
                        inflow: monthlyIn,
                        outflow: monthlyOut,
                        netFlow: netCashFlowThisMonth,
                        cumulativeAmount: cumulativeCashFlow
                    });

                    currentDate.setMonth(currentDate.getMonth() + 1);
                }

                // 3. Final Cash Flow (Sale Price - Outstanding Loan Balance)
                let finalSaleInflow = salePrice;
                let finalLoanRepaymentOutflow = 0;

                if (hasLoanCheckbox.checked && loanAmountTaken > 0) {
                    const monthsLoanPaidAtSale = (saleDate.getFullYear() - purchaseDate.getFullYear()) * 12 + (saleDate.getMonth() - purchaseDate.getMonth());
                    const outstandingLoanBalanceAtSale = calculateLoanBalance(loanAmountTaken, loanInterestRate, loanTenureYears * 12, monthsLoanPaidAtSale);
                    finalLoanRepaymentOutflow = outstandingLoanBalanceAtSale;
                }
                
                const finalNetSaleProceeds = finalSaleInflow - finalLoanRepaymentOutflow;
                
                // Add final sale cash flow to XIRR transactions
                // Note: If the final net proceeds are zero due to loan payout equaling sale price, we still add it
                // as it represents the closing of the investment period.
                cashFlowsForXIRR.push({ date: saleDateInput.value, amount: finalNetSaleProceeds });
                
                cumulativeCashFlow += finalNetSaleProceeds; // Add to cumulative for table
                cashFlowsForTable.push({
                    date: saleDateInput.value,
                    inflow: finalSaleInflow,
                    outflow: finalLoanRepaymentOutflow,
                    netFlow: finalNetSaleProceeds,
                    cumulativeAmount: cumulativeCashFlow
                });


                // Filter out cash flows that are exactly zero for XIRR, and sort by date
                const validCashFlowsForXIRR = cashFlowsForXIRR.filter(cf => cf.amount !== 0).sort((a, b) => new Date(a.date) - new Date(b.date));
                
                // Sort cash flows for table display
                cashFlowsForTable.sort((a, b) => new Date(a.date) - new Date(b.date));

                let calculatedXIRR = 0;
                if (validCashFlowsForXIRR.length >= 2) {
                    calculatedXIRR = XIRR(validCashFlowsForXIRR);
                }

                xirrReturnDisplay.textContent = `${(calculatedXIRR * 100).toFixed(2)}%`;

                // Render the cash flow table
                renderCashFlowTable(cashFlowsForTable);

            } catch (error) {
                console.error("Calculation error:", error);
                showMessageBox("An error occurred during calculation. Please check your inputs. Error: " + error.message);
            } finally {
                loader.style.display = 'none'; // Hide loader
            }
        }

        // Event Listeners
        calculateBtn.addEventListener('click', calculateReturns);

        resetBtn.addEventListener('click', () => {
            assetPriceInput.value = '10000000';
            loanAmountTakenInput.value = '8000000'; // Default loan amount
            purchaseDateInput.value = (new Date(new Date().setFullYear(new Date().getFullYear() - 3))).toISOString().split('T')[0];
            hasLoanCheckbox.checked = true;
            loanDetailsDiv.style.display = 'block';
            loanInterestRateInput.value = '8.5';
            loanTenureInput.value = '20';
            monthlyRentalInput.value = '50000';
            otherMonthlyInflowInput.value = '0';
            annualExpenseInput.value = '100000';
            salePriceInput.value = '15000000';
            saleDateInput.value = (new Date()).toISOString().split('T')[0];
            absoluteReturnDisplay.textContent = '0.00%';
            xirrReturnDisplay.textContent = '0.00%';
            loader.style.display = 'none'; // Ensure loader is hidden on reset
            cashFlowTableContainer.classList.add('hidden'); // Hide table on reset
            cashFlowTableBody.innerHTML = ''; // Clear table body
        });

        // Initialize display for loan details based on checkbox state and set initial loan amount
        const initialAssetPrice = parseFloat(assetPriceInput.value) || 0;
        if (initialAssetPrice > 0) {
            loanAmountTakenInput.value = (initialAssetPrice * 0.8).toFixed(0); // Default to 80% loan
        }
        hasLoanCheckbox.dispatchEvent(new Event('change'));
