import React from 'react';

function InvestmentForm({ investments, setInvestments, investmentTypes, setInvestmentTypes, setPage, initialCash, setInitialCash }) {

    const handleInvestmentCountChange = (e) => {
        const count = parseInt(e.target.value, 10) || 0;

        setInvestments((prev) => {
            const newInvestments = [...prev];

            while (newInvestments.length < count) {
                newInvestments.push({
                    name: '',
                    investmentType: {
                        name: '',
                        description: '',
                        expectedReturn: { 
                            returnType: '',
                            fixedValue: '', 
                            fixedPercentage: '', 
                            normalValue: { mean: '', sd: '' }, 
                            normalPercentage: { mean: '', sd: '' }
                        },
                        expectedIncome: { 
                            returnType: '',
                            fixedValue: '', 
                            fixedPercentage: '', 
                            normalValue: { mean: '', sd: '' }, 
                            normalPercentage: { mean: '', sd: '' }
                        },
                        expenseRatio: '',
                        taxability: ''
                    },
                    value: '',
                    taxStatus: '',
                    maxAnnualContribution: '',
                });
            }

            return newInvestments.slice(0, count);
        });
    };

    const updateInvestment = (index, fieldPath, newValue) => {
        setInvestments((prev) =>
            prev.map((investment, i) => {
                if (i !== index) return investment; // Skip other investments
    
                let updatedInvestment = { ...investment }; // Clone top-level object
    
                if (!Array.isArray(fieldPath)) {
                    // Direct top-level update
                    updatedInvestment[fieldPath] = newValue;
                } else {
                    // Handle nested updates
                    let target = updatedInvestment;
                    for (let j = 0; j < fieldPath.length - 1; j++) {
                        const key = fieldPath[j];
                        
                        target[key] = { ...target[key] }; // Clone the nested object
                        target = target[key]; // Move deeper
                    }
    
                    // Apply the final update
                    target[fieldPath[fieldPath.length - 1]] = newValue;
                }
    
                // console.log(`Updating investment ${index}:`, updatedInvestment);
                return updatedInvestment;
            })
        );
    };
    
    

   

    return (
        <div>
            <div className='initial-cash-container'>
                <h2>Initial Cash On Hand</h2>
                <input 
                    type="number" 
                    placeholder="Enter initial cash amount" 
                    value={initialCash} 
                    onChange={(e) => setInitialCash(parseFloat(e.target.value) || 0)} 
                />
            </div>

            <h2>Number of Investments:</h2>
            <p className="helper-text">
                Please list every investment you currently have or plan to include in your portfolio.
                If you do not currently have an investment, but you would like to invest in the future, 
                simply add it with a value of 0.
            </p>
            <input 
                type="number" 
                value={investments.length} 
                onChange={handleInvestmentCountChange} 
            />

            <p className="helper-text">
                Please select from your previously created investment types, or go back to the Investment Type page to create new ones.
            </p>

            {investments.map((investment, index) => (
                <div key={index} className='investment-container'>
                    <h2 className='investment-heading'>Investment {index + 1}</h2>
                    
                    <>
                    {/* name */}
                        <h3>Name:</h3>
                        <input 
                            type="text" 
                            placeholder="Investment Name" 
                            value={investment.name} 
                            onChange={(e) => updateInvestment(index, ['name'], e.target.value)} 
                        />
                    </>

                        <div>
                    {/* picking a investment type */}
                        <h3>Investment Type:</h3>
                        <select
                            value={investment.investmentType.name}
                            onChange={(e) => {
                                const selectedType = investmentTypes.find(type => type.name === e.target.value);
                            
                                if (selectedType) {
                                    updateInvestment(index, ['investmentType', 'name'], selectedType.name);
                                    updateInvestment(index, ['investmentType', 'description'], selectedType.description);
                                    updateInvestment(index, ['investmentType', 'expenseRatio'], selectedType.expenseRatio);
                                    updateInvestment(index, ['investmentType', 'taxability'], selectedType.taxability);

                                    // Update expectedReturn 
                                    updateInvestment(index, ['investmentType', 'expectedReturn', 'returnType'], selectedType.expectedReturn.returnType);
                                    updateInvestment(index, ['investmentType', 'expectedReturn', 'fixedValue'], selectedType.expectedReturn.fixedValue);
                                    updateInvestment(index, ['investmentType', 'expectedReturn', 'fixedPercentage'], selectedType.expectedReturn.fixedPercentage);
                                    updateInvestment(index, ['investmentType', 'expectedReturn', 'normalValue'], selectedType.expectedReturn.normalValue);
                                    updateInvestment(index, ['investmentType', 'expectedReturn', 'normalPercentage'], selectedType.expectedReturn.normalPercentage);

                                    // Update expectedIncome 
                                    updateInvestment(index, ['investmentType', 'expectedIncome', 'returnType'], selectedType.expectedIncome.returnType);
                                    updateInvestment(index, ['investmentType', 'expectedIncome', 'fixedValue'], selectedType.expectedIncome.fixedValue);
                                    updateInvestment(index, ['investmentType', 'expectedIncome', 'fixedPercentage'], selectedType.expectedIncome.fixedPercentage);
                                    updateInvestment(index, ['investmentType', 'expectedIncome', 'normalValue'], selectedType.expectedIncome.normalValue);
                                    updateInvestment(index, ['investmentType', 'expectedIncome', 'normalPercentage'], selectedType.expectedIncome.normalPercentage);

                                    
                                    
                                    
                                }
                            }}
                            
                        >
                            <option value="">-- Select an Investment Type --</option>
                            {investmentTypes && investmentTypes.length > 0 ? (
                                investmentTypes.map((type, i) => (
                                    <option key={i} value={type.name}>
                                        {type.name}
                                    </option>
                                ))
                            ) : (
                                <option value="" disabled>No investment types available</option>
                            )}
                        </select>
                    </div>

                    {/* value in dollars */}
                    <h3>Value In Dollars:</h3>
                    <input 
                        type="number" 
                        placeholder="Value in dollars" 
                        value={investment.value}  
                        onChange={(e) => updateInvestment(index, ['value'], e.target.value)}
                    />

                    {/* Only show tax status section if investment type is taxable */}
                    {(!investment.investmentType.taxability || investment.investmentType.taxability === 'taxable') && (
                        <>
                    <h3>Tax Status:</h3>
                    {/* tax status */}
                    <div>
                        <div>
                            <label>
                                <input
                                    type="radio"
                                    name={`taxStatus${index}`}
                                    value="non-retirement"
                                    checked={investment.taxStatus === "non-retirement"}
                                    onChange={(e) => updateInvestment(index, ["taxStatus"], e.target.value)}
                                />
                                Non-Retirement (Taxable)
                            </label>
                        </div>
                        <div>
                            <label>
                                <input
                                    type="radio"
                                    name={`taxStatus${index}`}
                                    value="pre-tax"
                                    checked={investment.taxStatus === "pre-tax"}
                                    onChange={(e) => updateInvestment(index, ["taxStatus"], e.target.value)}
                                />
                                Pre-Tax
                            </label>
                        </div>
                        <div>
                            <label>
                                <input
                                    type="radio"
                                    name={`taxStatus${index}`}
                                    value="after-tax"
                                    checked={investment.taxStatus === "after-tax"}
                                    onChange={(e) => updateInvestment(index, ["taxStatus"], e.target.value)}
                                />
                                After-Tax
                            </label>
                        </div>
                    </div>
                    
                    {/* Show Maximum Annual Contribution only for after-tax investments */}
                    {(investment.taxStatus === "after-tax") && (
                        <div>
                            <h3>Maximum Annual Contribution ($):</h3>
                            <input 
                                type="number" 
                                placeholder="Maximum annual contribution in dollars" 
                                value={investment.maxAnnualContribution}  
                                onChange={(e) => updateInvestment(index, ['maxAnnualContribution'], e.target.value)}
                            />
                        </div>
                    )}
                        </>
                    )}
                </div>
            ))}

            {/* navigation buttons */}
            <div>
                <button onClick={() => setPage(2)}>Previous</button>
                <button onClick={() => {
                    if (initialCash === null || initialCash === '' || isNaN(initialCash) || initialCash < 0) {
                        alert("Initial Cash must be a non-negative number.");
                        return;
                    }

                    if (investments.length === 0) {
                        alert("At least one investment is required.");
                        return;
                    }

                    for (const investment of investments) {
                        if (!investment.name) {
                            alert("Each investment must have a Name.");
                            return;
                        }

                        // Validate investment type
                        if (!investment.investmentType.name) {
                            const index = investments.indexOf(investment);
                            alert(`Investment "${investment.name || `#${index + 1}`}" must have an Investment Type selected.`);
                            return;
                        }

                        // Updated validation for value: allow 0, check for null/undefined/empty string
                        if (investment.value == null || String(investment.value).trim() === '') {
                            alert(`Investment "${investment.name}" must have a Value in Dollars.`);
                            return;
                        }
                        
                        // Validate maximum annual contribution only for after-tax investments
                        // Allow 0
                        if ((investment.taxStatus === "after-tax") && (investment.maxAnnualContribution == null || String(investment.maxAnnualContribution).trim() === '')) {
                            alert(`Investment "${investment.name}" must have a Maximum Annual Contribution.`);
                            return;
                        }

                        // Only require tax status for taxable investment types
                        if (investment.investmentType.taxability === 'taxable' && !investment.taxStatus) {
                            alert(`Investment "${investment.name}" must have a Tax Status.`);
                            return;
                        }
                    }

                    // --- NEW: Check for Duplicate Investment Names --- 
                    const investmentNames = investments.map(inv => inv.name.trim()).filter(name => name); // Get trimmed, non-empty names
                    const uniqueInvestmentNames = new Set(investmentNames);
                    if (investmentNames.length !== uniqueInvestmentNames.size) {
                        alert("Investment names must be unique. Please check for duplicates.");
                        return; // Stop validation
                    }
                    // --- END Duplicate Check --- 

                    // If all investments are valid, proceed to the next page
                    setPage(4);
                }}>
                    Next
                </button>
            </div>
        </div>
    );
}

export default InvestmentForm;
