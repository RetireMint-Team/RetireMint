import React, { useState, useEffect } from 'react';

function InvestmentTypeForm({ investmentTypes, setInvestmentTypes, setPage}) {
    // Initialize investmentTypes with default values if empty
    useEffect(() => {
        if (investmentTypes.length === 0) {
            setInvestmentTypes([{
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
            }]);
        }
    }, [investmentTypes.length, setInvestmentTypes]);

    const handleInvestmentTypeCountChange = (e) => {
        const count = parseInt(e.target.value, 10) || 0;

        setInvestmentTypes((prev) => {
            const newInvestmentTypes = [...prev];

            while (newInvestmentTypes.length < count) {
                newInvestmentTypes.push({
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
                });
            }

            return newInvestmentTypes.slice(0, count);
        });
    };

    const updateInvestmentType = (index, fieldPath, newValue) => {
        setInvestmentTypes((prev) =>
            prev.map((investmentType, i) => {
                if (i !== index) return investmentType; // Skip other investments
    
                let updatedInvestmentType = { ...investmentType }; // Clone top-level object
    
                if (!Array.isArray(fieldPath)) {
                    // Direct top-level update
                    updatedInvestmentType[fieldPath] = newValue;
                } else {
                    // Handle nested updates
                    let target = updatedInvestmentType;
                    for (let j = 0; j < fieldPath.length - 1; j++) {
                        const key = fieldPath[j];
                        
                        target[key] = { ...target[key] }; // Clone the nested object
                        target = target[key]; // Move deeper
                    }
    
                    // Apply the final update
                    target[fieldPath[fieldPath.length - 1]] = newValue;
                }
    
                // console.log(`Updating investment type ${index}:`, updatedInvestmentType);
                return updatedInvestmentType;
            })
        );
    };
    
    
    
    

   

    return (
        <div>
            <h2>Number of Investment Types:</h2>
            <input 
                type="number" 
                value={investmentTypes.length} 
                onChange={handleInvestmentTypeCountChange} 
            />

            {investmentTypes.map((investmentType, index) => (
                <div key={index}  className='investment-type-container'>
                    <h2 className='investment-type-heading'>Investment Type {index + 1}</h2>
                    
                    <>
                    {/* name and description */}
                        <h3>Name: *</h3>
                        <input 
                            type="text" 
                            placeholder="Investment Type Name" 
                            value={investmentType.name || ''} 
                            onChange={(e) => updateInvestmentType(index, ['name'], e.target.value)} 
                        />
                         <h3>Description:</h3>
                        <input 
                            type="text" 
                            placeholder="Investment Type Description" 
                            value={investmentType.description || ''} 
                            onChange={(e) => updateInvestmentType(index, ['description'], e.target.value)}
                        />
                    </>

                    <> {/* expected annual return */}
                        <div>
                            <h3>Expected Annual Return: *</h3>
                            
                            <button onClick={() => updateInvestmentType(index, ['expectedReturn', 'returnType'], 'fixedValue')}>
                                Fixed Value
                            </button>
                            
                            <button onClick={() => updateInvestmentType(index, ['expectedReturn', 'returnType'], 'fixedPercentage')}>
                                Fixed Percentage
                            </button>
                            
                            <button onClick={() => updateInvestmentType(index, ['expectedReturn', 'returnType'], 'normalValue')}>
                                Fixed Value (Normal Distribution)
                            </button>
                            
                            <button onClick={() => updateInvestmentType(index, ['expectedReturn', 'returnType'], 'normalPercentage')}>
                                Percentage (Normal Distribution)
                            </button>
                        </div>

                        <>
                            {/* Fixed Value */}
                            {investmentType.expectedReturn.returnType === 'fixedValue' && (
                                <input
                                    type="number"
                                    placeholder="Fixed Return Value"
                                    value={investmentType.expectedReturn.fixedValue}
                                    onChange={(e) => updateInvestmentType(index, ['expectedReturn', 'fixedValue'], e.target.value)}
                                />
                            )}

                            {/* Fixed Percentage */}
                            {investmentType.expectedReturn.returnType === 'fixedPercentage' && (
                                <input
                                    type="number"
                                    placeholder="Fixed Return Percentage"
                                    value={investmentType.expectedReturn.fixedPercentage}
                                    onChange={(e) => updateInvestmentType(index, ['expectedReturn', 'fixedPercentage'], e.target.value)}
                                />
                            )}

                            {/* Normal Distribution (Value) */}
                            {investmentType.expectedReturn.returnType === 'normalValue' && (
                                <div>
                                    <input
                                        type="number"
                                        placeholder="Mean Value"
                                        value={investmentType.expectedReturn.normalValue.mean}
                                        onChange={(e) => updateInvestmentType(index, ['expectedReturn', 'normalValue', 'mean'], e.target.value)}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Standard Deviation"
                                        value={investmentType.expectedReturn.normalValue.sd}
                                        onChange={(e) => updateInvestmentType(index, ['expectedReturn', 'normalValue', 'sd'], e.target.value)}
                                    />
                                </div>
                            )}

                            {/* Normal Distribution (Percentage) */}
                            {investmentType.expectedReturn.returnType === 'normalPercentage' && (
                                <div>
                                    <input
                                        type="number"
                                        placeholder="Mean Percentage"
                                        value={investmentType.expectedReturn.normalPercentage.mean}
                                        onChange={(e) => updateInvestmentType(index, ['expectedReturn', 'normalPercentage', 'mean'], e.target.value)}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Standard Deviation"
                                        value={investmentType.expectedReturn.normalPercentage.sd}
                                        onChange={(e) => updateInvestmentType(index, ['expectedReturn', 'normalPercentage', 'sd'], e.target.value)}
                                    />
                                </div>
                            )}

                        
                        
                        </>


                    </>

                     {/* expense ratio */}
                     <div>
                        <h3>Expense Ratio (%) *:</h3>
                        <input
                            type="number"
                            placeholder="Expense Ratio"
                            value={investmentType.expenseRatio ?? ''}
                            onChange={(e) => updateInvestmentType(index, ['expenseRatio'], e.target.value)}
                        />
                    </div>


                    <> {/* expected annual income */}
                        <div>
                            <h3>Expected Annual Income from Interest or Dividends: *</h3>

                            <button onClick={() => updateInvestmentType(index, ['expectedIncome', 'returnType'], 'fixedValue')}>
                                Fixed Value
                            </button>

                            <button onClick={() => updateInvestmentType(index, ['expectedIncome', 'returnType'], 'fixedPercentage')}>
                                Fixed Percentage
                            </button>

                            <button onClick={() => updateInvestmentType(index, ['expectedIncome', 'returnType'], 'normalValue')}>
                                Fixed Value (Normal Distribution)
                            </button>

                            <button onClick={() => updateInvestmentType(index, ['expectedIncome', 'returnType'], 'normalPercentage')}>
                                Percentage (Normal Distribution)
                            </button>
                        </div>

                        <>  
                            {/* Fixed Value */}
                            {investmentType.expectedIncome.returnType === 'fixedValue' && (
                                <input
                                    type="number"
                                    placeholder="Fixed Income Value"
                                    value={investmentType.expectedIncome.fixedValue}
                                    onChange={(e) => updateInvestmentType(index, ['expectedIncome', 'fixedValue'], e.target.value)}
                                />
                            )}

                            {/* Fixed Percentage */}
                            {investmentType.expectedIncome.returnType === 'fixedPercentage' && (
                                <input
                                    type="number"
                                    placeholder="Fixed Income Percentage"
                                    value={investmentType.expectedIncome.fixedPercentage}
                                    onChange={(e) => updateInvestmentType(index, ['expectedIncome', 'fixedPercentage'], e.target.value)}
                                />
                            )}

                            {/* Normal Distribution (Value) */}
                            {investmentType.expectedIncome.returnType === 'normalValue' && (
                                <div>
                                    <input
                                        type="number"
                                        placeholder="Mean Value"
                                        value={investmentType.expectedIncome.normalValue.mean}
                                        onChange={(e) => updateInvestmentType(index, ['expectedIncome', 'normalValue', 'mean'], e.target.value)}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Standard Deviation"
                                        value={investmentType.expectedIncome.normalValue.sd}
                                        onChange={(e) => updateInvestmentType(index, ['expectedIncome', 'normalValue', 'sd'], e.target.value)}
                                    />
                                </div>
                            )}

                            {/* Normal Distribution (Percentage) */}
                            {investmentType.expectedIncome.returnType === 'normalPercentage' && (
                                <div>
                                    <input
                                        type="number"
                                        placeholder="Mean Percentage"
                                        value={investmentType.expectedIncome.normalPercentage.mean}
                                        onChange={(e) => updateInvestmentType(index, ['expectedIncome', 'normalPercentage', 'mean'], e.target.value)}
                                    />
                                    <input
                                        type="number"
                                        placeholder="Standard Deviation"
                                        value={investmentType.expectedIncome.normalPercentage.sd}
                                        onChange={(e) => updateInvestmentType(index, ['expectedIncome', 'normalPercentage', 'sd'], e.target.value)}
                                    />
                                </div>
                            )}
                        </>
                    </>

                   
                    

                    {/* taxability section */}
                    <div>
                        <h3>Taxability: *</h3>
                        <ul>
                            <li>
                                <label>
                                    <input
                                        type="radio"
                                        name={`taxability${index}`}
                                        value="taxable"
                                        checked={investmentType.taxability === "taxable"}
                                        onChange={(e) => updateInvestmentType(index, ["taxability"], e.target.value)}
                                    />
                                    Taxable
                                </label>
                            </li>
                            <li>
                                <label>
                                    <input
                                        type="radio"
                                        name={`taxability${index}`}
                                        value="tax-exempt"
                                        checked={investmentType.taxability === "tax-exempt"}
                                        onChange={(e) => updateInvestmentType(index, ["taxability"], e.target.value)}
                                    />
                                    Tax-Exempt
                                </label>
                            </li>
                        </ul>
                    </div>
                </div>
            ))}

            {/* navigation buttons */}
            <div>
                <button onClick={() => setPage(1)}>Previous</button>
                <button onClick={() => {
                    if (investmentTypes.length === 0) {
                        alert("At least one investment type is required.");
                        return;
                    }

                    for (const investmentType of investmentTypes) {
                        if (!investmentType.name) {
                            alert("Each investment type must have a Name.");
                            return;
                        }

                        // Validate Expected Annual Return
                        if (!investmentType.expectedReturn.returnType) {
                            alert(`Investment Type "${investmentType.name}" must have a Return Type for Expected Annual Return.`);
                            return;
                        }

                        switch (investmentType.expectedReturn.returnType) {
                            case 'fixedValue':
                                // Allow 0
                                if (investmentType.expectedReturn.fixedValue == null || String(investmentType.expectedReturn.fixedValue).trim() === '') {
                                    alert(`Investment Type "${investmentType.name}" requires a Fixed Value for Expected Annual Return.`);
                                    return;
                                }
                                break;
                            case 'fixedPercentage':
                                // Allow 0
                                if (investmentType.expectedReturn.fixedPercentage == null || String(investmentType.expectedReturn.fixedPercentage).trim() === '') {
                                    alert(`Investment Type "${investmentType.name}" requires a Fixed Percentage for Expected Annual Return.`);
                                    return;
                                }
                                break;
                            case 'normalValue':
                                // Allow 0 for mean/sd
                                if ((investmentType.expectedReturn.normalValue.mean == null || String(investmentType.expectedReturn.normalValue.mean).trim() === '') || 
                                    (investmentType.expectedReturn.normalValue.sd == null || String(investmentType.expectedReturn.normalValue.sd).trim() === '')) {
                                    alert(`Investment Type "${investmentType.name}" requires Mean and Standard Deviation for Normal Value.`);
                                    return;
                                }
                                break;
                            case 'normalPercentage':
                                // Allow 0 for mean/sd
                                if ((investmentType.expectedReturn.normalPercentage.mean == null || String(investmentType.expectedReturn.normalPercentage.mean).trim() === '') || 
                                    (investmentType.expectedReturn.normalPercentage.sd == null || String(investmentType.expectedReturn.normalPercentage.sd).trim() === '')) {
                                    alert(`Investment Type"${investmentType.name}" requires Mean and Standard Deviation for Normal Percentage.`);
                                    return;
                                }
                                break;
                            default:
                                // No action needed for unknown fields
                                break;
                        }

                        // Validate Expected Annual Income
                        if (!investmentType.expectedIncome.returnType) {
                            alert(`Investment Type "${investmentType.name}" must have a Return Type for Expected Annual Income.`);
                            return;
                        }

                        switch (investmentType.expectedIncome.returnType) {
                            case 'fixedValue':
                                // Allow 0
                                if (investmentType.expectedIncome.fixedValue == null || String(investmentType.expectedIncome.fixedValue).trim() === '') {
                                    alert(`Investment Type"${investmentType.name}" requires a Fixed Value for Expected Annual Income.`);
                                    return;
                                }
                                break;
                            case 'fixedPercentage':
                                // Allow 0
                                if (investmentType.expectedIncome.fixedPercentage == null || String(investmentType.expectedIncome.fixedPercentage).trim() === '') {
                                    alert(`Investment Type "${investmentType.name}" requires a Fixed Percentage for Expected Annual Income.`);
                                    return;
                                }
                                break;
                            case 'normalValue':
                                // Allow 0 for mean/sd
                                if ((investmentType.expectedIncome.normalValue.mean == null || String(investmentType.expectedIncome.normalValue.mean).trim() === '') || 
                                    (investmentType.expectedIncome.normalValue.sd == null || String(investmentType.expectedIncome.normalValue.sd).trim() === '')) {
                                    alert(`Investment Type "${investmentType.name}" requires Mean and Standard Deviation for Normal Value.`);
                                    return;
                                }
                                break;
                            case 'normalPercentage':
                                // Allow 0 for mean/sd
                                if ((investmentType.expectedIncome.normalPercentage.mean == null || String(investmentType.expectedIncome.normalPercentage.mean).trim() === '') || 
                                    (investmentType.expectedIncome.normalPercentage.sd == null || String(investmentType.expectedIncome.normalPercentage.sd).trim() === '')) {
                                    alert(`Investment Type "${investmentType.name}" requires Mean and Standard Deviation for Normal Percentage.`);
                                    return;
                                }
                                break;
                            default:
                                // Handle unknown investment type
                                break;
                        }

                        // Validate other required fields
                        // Allow 0 for expense ratio
                        if (investmentType.expenseRatio == null || String(investmentType.expenseRatio).trim() === '') {
                            alert(`Investment Type "${investmentType.name}" must have an Expense Ratio.`);
                            return;
                        }

                        if (!investmentType.taxability) {
                            alert(`Investment Type "${investmentType.name}" must have a Taxability status.`);
                            return;
                        }
                    }

                    // --- NEW: Check for Duplicate Investment Type Names --- 
                    const typeNames = investmentTypes.map(type => type.name.trim()).filter(name => name); // Get trimmed, non-empty names
                    const uniqueTypeNames = new Set(typeNames);
                    if (typeNames.length !== uniqueTypeNames.size) {
                        alert("Investment Type names must be unique. Please check for duplicates.");
                        return; // Stop validation
                    }
                    // --- END Duplicate Check --- 

                    // If all investment types are valid, proceed to the next page
                    setPage(3);
                }}>
                    Next
                </button>


            </div>

            
        </div>
    );
}

export default InvestmentTypeForm;
