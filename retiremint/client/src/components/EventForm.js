import React, { useState, useEffect } from 'react';

function EventForm({events, setEvents, scenarioType, setPage, investments}) {
    // Remove state related to initial investment strategy
    /*
    const [preTaxAllocations, setPreTaxAllocations] = useState({});
    const [afterTaxAllocations, setAfterTaxAllocations] = useState({});
    const [nonRetirementAllocations, setNonRetirementAllocations] = useState({});
    const [taxExemptAllocations, setTaxExemptAllocations] = useState({});
    const [taxStatusAllocations, setTaxStatusAllocations] = useState({});
    
    // Global investment strategy object to store across events
    const [investmentStrategy, setInvestmentStrategy] = useState({
        taxStatusAllocation: {},
        afterTaxAllocation: {},
        nonRetirementAllocation: {},
        taxExemptAllocation: {}
    });
    */
    
    // Store the date of birth from the first page (Keep this if needed elsewhere, otherwise remove)
    // const [dateOfBirth, setDateOfBirth] = useState('');
    
    // List of available investment tax statuses (Keep)
    const [availableTaxStatuses, setAvailableTaxStatuses] = useState([]);
    
    // Group investments by tax status (Keep)
    const preTaxInvestments = investments.filter(inv => inv.taxStatus === 'pre-tax');
    const afterTaxInvestments = investments.filter(inv => inv.taxStatus === 'after-tax');
    const nonRetirementInvestments = investments.filter(inv => inv.taxStatus === 'non-retirement');
    const taxExemptInvestments = investments.filter(inv => 
        inv.investmentType.taxability === 'tax-exempt');

    // Initialize available tax statuses (Simplified)
    useEffect(() => {
        const taxStatuses = [];
        if (afterTaxInvestments.length > 0) taxStatuses.push('after-tax');
        if (nonRetirementInvestments.length > 0) taxStatuses.push('non-retirement');
        if (taxExemptInvestments.length > 0) taxStatuses.push('tax-exempt');
        setAvailableTaxStatuses(taxStatuses);
    }, [investments]); // Depend only on investments

    // ADDED: useEffect to set modify flags based on loaded event data
    useEffect(() => {
        // Only run if events have been loaded (relevant for editing)
        if (events && events.length > 0) {
            let needsUpdate = false;
            const updatedEvents = events.map(event => {
                let modifiedEvent = { ...event }; // Clone to avoid direct mutation
                let eventChanged = false;

                if (modifiedEvent.eventType === 'invest' && modifiedEvent.invest) {
                    const strategy = modifiedEvent.invest.investmentStrategy || {};
                    const checkAndSetFlag = (allocationType, flagName) => {
                        if (strategy[allocationType] && Object.keys(strategy[allocationType]).length > 0 && !modifiedEvent.invest[flagName]) {
                            modifiedEvent.invest = { ...modifiedEvent.invest, [flagName]: true };
                            eventChanged = true;
                        }
                    };
                    checkAndSetFlag('taxStatusAllocation', 'modifyTaxStatusAllocation');
                    checkAndSetFlag('afterTaxAllocation', 'modifyAfterTaxAllocation');
                    checkAndSetFlag('nonRetirementAllocation', 'modifyNonRetirementAllocation');
                    checkAndSetFlag('taxExemptAllocation', 'modifyTaxExemptAllocation');
                    
                    // Also ensure modifyMaximumCash is true if newMaximumCash has a value
                    // This might be redundant now but kept for potential schema compatibility
                    if (modifiedEvent.invest.newMaximumCash && !modifiedEvent.invest.modifyMaximumCash) {
                         modifiedEvent.invest = { ...modifiedEvent.invest, modifyMaximumCash: true };
                         eventChanged = true;
                    }
                }
                 else if (modifiedEvent.eventType === 'rebalance' && modifiedEvent.rebalance) {
                    const strategy = modifiedEvent.rebalance.rebalanceStrategy || {};
                    const checkAndSetFlag = (allocationType, flagName) => {
                         if (strategy[allocationType] && Object.keys(strategy[allocationType]).length > 0 && !modifiedEvent.rebalance[flagName]) {
                            modifiedEvent.rebalance = { ...modifiedEvent.rebalance, [flagName]: true };
                            eventChanged = true;
                        }
                    };
                    checkAndSetFlag('taxStatusAllocation', 'modifyTaxStatusAllocation');
                    checkAndSetFlag('preTaxAllocation', 'modifyPreTaxAllocation'); // Add preTax for rebalance
                    checkAndSetFlag('afterTaxAllocation', 'modifyAfterTaxAllocation');
                    checkAndSetFlag('nonRetirementAllocation', 'modifyNonRetirementAllocation');
                    checkAndSetFlag('taxExemptAllocation', 'modifyTaxExemptAllocation');
                }

                if (eventChanged) {
                    needsUpdate = true;
                }
                return modifiedEvent;
            });

            if (needsUpdate) {
                console.log("Updating event modify flags based on loaded data.");
                setEvents(updatedEvents);
            }
        }
    // Run only once when events initially load or change significantly
    // Using JSON.stringify helps compare the actual content of events array
    // }, [JSON.stringify(events), setEvents]);
    // Update dependency array to be less sensitive
    }, [events.length, setEvents]);

    // Remove useEffect that loaded initial allocations (lines ~35-186)
    /*
    useEffect(() => {
        // ... code to load from INITIAL_INVEST_EVENT or localStorage ...
    }, [events, investments]);
    */

    // Remove useEffect logging allocation values (lines ~188-192)
    /*
    useEffect(() => {
        // ... console logs ...
    }, [taxStatusAllocations, afterTaxAllocations, nonRetirementAllocations, taxExemptAllocations]);
    */

    // Helper function to display values, even if they're 0 (Keep)
    const displayValue = (value) => {
        return value === 0 || value ? value : '';
    };

    // Remove updateAllocation and updateTaxStatusAllocation (lines ~195-261)
    /*
    const updateAllocation = (taxStatus, investmentType, value) => {
        // ... code ...
    };

    const updateTaxStatusAllocation = (taxStatus, value) => {
        // ... code ...
    };
    */

    // Remove validateAllocations (lines ~263-299)
    /*
    const validateAllocations = () => {
        // ... code ...
    };
    */

    const handleEventCountChange = (e) => {
        const count = parseInt(e.target.value, 10) || 0;

        setEvents((prev) => {
            // Remove INITIAL_INVEST_EVENT handling
            // const initialEvent = prev.find(event => event.name === 'INITIAL_INVEST_EVENT');
            const regularEvents = prev; // prev.filter(event => event.name !== 'INITIAL_INVEST_EVENT');
            const newEvents = [...regularEvents];

            while (newEvents.length < count) {
                // Remove logic finding lastInvestStrategy
                /*
                let lastInvestStrategy = null;
                console.log("newEvents:", newEvents);
                for (let i = newEvents.length - 1; i >= 0; i--) {
                    if (newEvents[i].eventType === 'invest' && newEvents[i].invest?.investmentStrategy) {
                        // Deep copy the strategy to avoid reference issues
                        lastInvestStrategy = JSON.parse(JSON.stringify(newEvents[i].invest.investmentStrategy));
                        break;
                    }
                }

                // If no preceding invest event found, use the initial strategy from state
                if (!lastInvestStrategy) {
                    lastInvestStrategy = {
                        taxStatusAllocation: { ...taxStatusAllocations },
                        afterTaxAllocation: { ...afterTaxAllocations },
                        nonRetirementAllocation: { ...nonRetirementAllocations },
                        taxExemptAllocation: { ...taxExemptAllocations }
                    };
                }
                */

                newEvents.push({
                    name: '',
                    description: '',
                    startYear: {
                        returnType: 'fixedValue',
                        fixedValue: '',
                        normalValue: { mean: '', sd: '' },
                        uniformValue: {lowerBound: '', upperBound: ''},
                        sameYearAsAnotherEvent: '',
                        yearAfterAnotherEventEnd:''
                    },
                    duration: {
                        returnType: '',
                        fixedValue: '',
                        normalValue: { mean: '', sd: '' },
                        uniformValue: {lowerBound: '', upperBound: ''},
                    },
                    eventType: '', // User will select this
                    income: {
                        initialAmount: '',
                        expectedAnnualChange: {
                            returnType: 'fixedValue',
                            fixedValue: '',
                            normalValue: { mean: '', sd: '' },
                            uniformValue: {lowerBound: '', upperBound: ''},
                            fixedPercentage: '',
                            normalPercentage: { mean: '', sd: '' },
                            uniformPercentage: {lowerBound: '', upperBound: ''},

                        },
                        isSocialSecurity: false,
                        inflationAdjustment: false,
                        marriedPercentage: ''

                    },
                    expense: {
                        initialAmount: '',
                        expectedAnnualChange: {
                            returnType: 'fixedValue',
                            fixedValue: '',
                            normalValue: { mean: '', sd: '' },
                            uniformValue: {lowerBound: '', upperBound: ''},
                            fixedPercentage: '',
                            normalPercentage: { mean: '', sd: '' },
                            uniformPercentage: {lowerBound: '', upperBound: ''},

                        },
                        isDiscretionary: false,
                        inflationAdjustment: false,
                        marriedPercentage: ''

                    },
                    invest: { // Initialize invest structure with empty strategy
                        returnType: 'fixedAllocation',
                        executionType: 'fixedAllocation',
                        modifyMaximumCash: false, // Keep flag for schema compatibility
                        newMaximumCash: '', // Start empty, will be set by user
                        modifyTaxStatusAllocation: false,
                        modifyAfterTaxAllocation: false,
                        modifyNonRetirementAllocation: false,
                        modifyTaxExemptAllocation: false,
                        investmentStrategy: {}, // Start with empty strategy
                        finalInvestmentStrategy: {
                            taxStatusAllocation: {},
                            afterTaxAllocation: {},
                            nonRetirementAllocation: {},
                            taxExemptAllocation: {}
                        }
                    },
                    rebalance:{ // Initialize rebalance structure with empty strategy
                        returnType: 'fixedAllocation',
                        executionType: 'fixedAllocation',
                        modifyTaxStatusAllocation: false,
                        modifyPreTaxAllocation: false,
                        modifyAfterTaxAllocation: false,
                        modifyNonRetirementAllocation: false,
                        modifyTaxExemptAllocation: false,
                        rebalanceStrategy: {}, // Start with empty strategy
                        finalRebalanceStrategy: {
                        taxStatusAllocation: {},
                        preTaxAllocation: {},
                        afterTaxAllocation: {},
                        nonRetirementAllocation: {},
                        taxExemptAllocation: {}
                        }
                    }
                });
            }

            // Slice to requested count
            const result = newEvents.slice(0, count);
            // Remove INITIAL_INVEST_EVENT combining logic
            // return initialEvent ? [...result, initialEvent] : result;
            return result;
        });
    };

    // Helper function to ensure investmentStrategy is properly initialized (Keep)
    const ensureInvestmentStrategy = (event) => {
        // ... (keep existing logic, it initializes if missing)
        if (!event.invest) {
            event.invest = {};
        }
        if (!event.invest.investmentStrategy) {
            event.invest.investmentStrategy = {
                taxStatusAllocation: {},
                afterTaxAllocation: {},
                nonRetirementAllocation: {},
                taxExemptAllocation: {}
            };
        }
        // Initialize finalInvestmentStrategy if this is a glidePath event
        if (event.invest.executionType === 'glidePath' && !event.invest.finalInvestmentStrategy) {
            event.invest.finalInvestmentStrategy = {
                taxStatusAllocation: {},
                afterTaxAllocation: {},
                nonRetirementAllocation: {},
                taxExemptAllocation: {}
            };
        }
        return event;
    };

    // Helper function to ensure rebalanceStrategy is always properly initialized (Keep)
    const ensureRebalanceStrategy = (event) => {
        // ... (keep existing logic, it initializes if missing)
        if (!event.rebalance) {
            event.rebalance = {};
        }
        if (!event.rebalance.rebalanceStrategy) {
            event.rebalance.rebalanceStrategy = {
                taxStatusAllocation: {},
                preTaxAllocation: {},
                afterTaxAllocation: {},
                nonRetirementAllocation: {},
                taxExemptAllocation: {}
            };
        }
        // Initialize finalRebalanceStrategy if this is a glidePath event
        if (event.rebalance.executionType === 'glidePath' && !event.rebalance.finalRebalanceStrategy) {
            event.rebalance.finalRebalanceStrategy = {
                taxStatusAllocation: {},
                preTaxAllocation: {},
                afterTaxAllocation: {},
                nonRetirementAllocation: {},
                taxExemptAllocation: {}
            };
        }
        return event;
    };

    const updateEvent = (index, fieldPath, newValue) => {
        setEvents((prev) => {
            // Remove filtering logic for INITIAL_INVEST_EVENT
            const regularEvents = prev; // prev.filter(event => event.name !== 'INITIAL_INVEST_EVENT');
            // const initialEvent = prev.find(event => event.name === 'INITIAL_INVEST_EVENT');
            
            // Update the correct event based on the visible index
            const updatedRegularEvents = regularEvents.map((event, i) => {
                // ... (rest of the update logic remains largely the same)
                if (i !== index) return event; // Skip other events
    
                // Use deep clone to prevent state mutation issues
                let updatedEvent = JSON.parse(JSON.stringify(event)); 
                
                // Make sure all required fields exist with empty values if not already present
                if (!updatedEvent.expense) {
                    updatedEvent.expense = {
                        initialAmount: '',
                        expectedAnnualChange: {
                            returnType: 'fixedValue',
                            fixedValue: '',
                            normalValue: { mean: '', sd: '' },
                            uniformValue: { lowerBound: '', upperBound: '' },
                            fixedPercentage: '',
                            normalPercentage: { mean: '', sd: '' },
                            uniformPercentage: { lowerBound: '', upperBound: '' }
                        },
                        isDiscretionary: false,
                        inflationAdjustment: false,
                        marriedPercentage: ''
                    };
                }
                
                if (!updatedEvent.income) {
                    updatedEvent.income = {
                        initialAmount: '',
                        expectedAnnualChange: {
                            returnType: 'fixedValue',
                            fixedValue: '',
                            normalValue: { mean: '', sd: '' },
                            uniformValue: { lowerBound: '', upperBound: '' },
                            fixedPercentage: '',
                            normalPercentage: { mean: '', sd: '' },
                            uniformPercentage: { lowerBound: '', upperBound: '' }
                        },
                        isSocialSecurity: false,
                        inflationAdjustment: false,
                        marriedPercentage: ''
                    };
                }
                
                if (!updatedEvent.rebalance) {
                    updatedEvent.rebalance = {
                        returnType: 'fixedAllocation',
                        executionType: 'fixedAllocation',
                        modifyTaxStatusAllocation: false,
                        modifyPreTaxAllocation: false,
                        modifyAfterTaxAllocation: false,
                        modifyNonRetirementAllocation: false,
                        modifyTaxExemptAllocation: false,
                        rebalanceStrategy: {
                            taxStatusAllocation: {},
                            preTaxAllocation: {},
                            afterTaxAllocation: {},
                            nonRetirementAllocation: {},
                            taxExemptAllocation: {}
                        }
                    };
                }
                
                // If this is an invest event, ensure investmentStrategy is initialized
                if (updatedEvent.eventType === 'invest') {
                    updatedEvent = ensureInvestmentStrategy(updatedEvent);
                }
                
                // If this is a rebalance event, ensure rebalanceStrategy is initialized
                if (updatedEvent.eventType === 'rebalance') {
                    updatedEvent = ensureRebalanceStrategy(updatedEvent);
                }
                
                if (!Array.isArray(fieldPath)) {
                    // Direct top-level update
                    updatedEvent[fieldPath] = newValue;
                } else {
                    // Special handling for allocation fields that should only exist in investmentStrategy
                    const isInvestAllocationField = 
                        fieldPath.length >= 2 && 
                        fieldPath[0] === 'invest' && 
                        ['investmentStrategy', 'afterTaxAllocation', 'nonRetirementAllocation', 'taxExemptAllocation', 'taxStatusAllocation'].includes(fieldPath[1]);
                    
                    // Special handling for allocation fields that should only exist in rebalanceStrategy  
                    const isRebalanceAllocationField =
                        fieldPath.length >= 2 &&
                        fieldPath[0] === 'rebalance' &&
                        ['taxStatusAllocation', 'preTaxAllocation', 'afterTaxAllocation', 'nonRetirementAllocation', 'taxExemptAllocation'].includes(fieldPath[1]);
                    
                    if (isInvestAllocationField) {
                        // If we're trying to update any allocation at the invest level, redirect it to investmentStrategy
                        if (fieldPath[1] !== 'investmentStrategy') {
                            const allocationField = fieldPath[1];
                            const value = fieldPath.length > 2 ? 
                                { ...updatedEvent.invest.investmentStrategy[allocationField], [fieldPath[2]]: newValue } :
                                newValue;
                            
                            updatedEvent.invest.investmentStrategy = {
                                ...updatedEvent.invest.investmentStrategy,
                                [allocationField]: value
                            };
                            
                            // Set the corresponding modify flag to true
                            if (allocationField === 'taxStatusAllocation') {
                                updatedEvent.invest.modifyTaxStatusAllocation = true;
                            } else if (allocationField === 'afterTaxAllocation') {
                                updatedEvent.invest.modifyAfterTaxAllocation = true;
                            } else if (allocationField === 'nonRetirementAllocation') {
                                updatedEvent.invest.modifyNonRetirementAllocation = true;
                            } else if (allocationField === 'taxExemptAllocation') {
                                updatedEvent.invest.modifyTaxExemptAllocation = true;
                            }
                            
                            // Return the modified event - skip the regular update path
                            return updatedEvent;
                        }
                    }
                    else if (isRebalanceAllocationField) {
                        // If we're trying to update any allocation at the rebalance level, redirect it to rebalanceStrategy
                        const allocationField = fieldPath[1];
                        const value = fieldPath.length > 2 ? 
                            { ...updatedEvent.rebalance.rebalanceStrategy?.[allocationField] || {}, [fieldPath[2]]: newValue } :
                            newValue;
                        
                        // Ensure rebalanceStrategy exists before updating
                        if (!updatedEvent.rebalance.rebalanceStrategy) {
                           updatedEvent.rebalance.rebalanceStrategy = {};
                        }

                        updatedEvent.rebalance.rebalanceStrategy = {
                            ...updatedEvent.rebalance.rebalanceStrategy,
                            [allocationField]: value
                        };
                        
                        // Set the corresponding modify flag to true
                        if (allocationField === 'taxStatusAllocation') {
                            updatedEvent.rebalance.modifyTaxStatusAllocation = true;
                        } else if (allocationField === 'preTaxAllocation') {
                            updatedEvent.rebalance.modifyPreTaxAllocation = true;
                        } else if (allocationField === 'afterTaxAllocation') {
                            updatedEvent.rebalance.modifyAfterTaxAllocation = true;
                        } else if (allocationField === 'nonRetirementAllocation') {
                            updatedEvent.rebalance.modifyNonRetirementAllocation = true;
                        } else if (allocationField === 'taxExemptAllocation') {
                            updatedEvent.rebalance.modifyTaxExemptAllocation = true;
                        }
                        
                        // Return the modified event - skip the regular update path
                        return updatedEvent;
                    }
                    
                    // Regular nested update for non-allocation fields
                    let target = updatedEvent;
                    for (let j = 0; j < fieldPath.length - 1; j++) {
                        const key = fieldPath[j];
                        // Ensure nested objects exist before cloning/accessing
                        if (!target[key]) {
                            target[key] = {};
                        }
                        target[key] = { ...target[key] }; // Clone the nested object
                        target = target[key]; // Move deeper
                    }
                    
                    // Apply the final update
                    target[fieldPath[fieldPath.length - 1]] = newValue;
                }
    
                return updatedEvent;
            });
            
            // Remove combining logic for INITIAL_INVEST_EVENT
            // return initialEvent 
            //    ? [...updatedRegularEvents, initialEvent] 
            //    : updatedRegularEvents;
            return updatedRegularEvents;
        });
    };
    
    // Remove saveAllocationData function (lines ~656-678)
    /*
    const saveAllocationData = () => {
        // ... code ...
    };
    */

    // Remove createInitialInvestEvent function (lines ~681-787)
    /*
    const createInitialInvestEvent = () => {        
        // ... code ...
    };
    */

    // Remove useEffect that loaded values from database/INITIAL_INVEST_EVENT (lines ~790-969)
    /*
    useEffect(() => {
        // ... code to update events based on loaded data ...
    }, [events.length]);
    */

    return (
        <div>
            {/* Remove Investment Strategy Form (lines ~972-1087) */}
            {/*
            <div className="investment-strategy-form" style={{ marginBottom: '30px', border: '1px solid #ccc', padding: '20px', borderRadius: '5px' }}>
                // ... form content ...
                                </div>
            */}

            <h2>Number of Events:</h2>

            <input
                type="number"
                value={events.length} // Use events.length directly
                onChange={handleEventCountChange}
            />

            {events.map((event, index) => (
                // Remove filtering logic for INITIAL_INVEST_EVENT here as well if it existed
                <div key={index} className='event-container'>
                    <h2>Event {index + 1}</h2>

                    {/* Name Input */}
                    <h3>Name:</h3>
                    <input 
                        type="text" 
                        placeholder="Event Name" 
                        value={event.name} 
                        onChange={(e) => updateEvent(index, ['name'], e.target.value)} 
                    />

                    {/* Description Input */}
                    <h3>Description:</h3>
                    <input 
                        type="text" 
                        placeholder="Event Description" 
                        value={event.description} 
                        onChange={(e) => updateEvent(index, ['description'], e.target.value)} 
                    />


                    {/* Start Year */}
                    <h3>Start Year:</h3>
                    <select
                        value={event.startYear.returnType}
                        onChange={(e) => updateEvent(index, ['startYear', 'returnType'], e.target.value)}
                    >
                        <option value="fixedValue">Fixed Value</option>
                        <option value="normalValue">Normal Distribution</option>
                        <option value="uniformValue">Uniform Distribution</option>
                        <option value="sameYearAsAnotherEvent">Same Year as Another Event</option>
                        <option value="yearAfterAnotherEventEnd">Year After Another Event Ends</option>
                    </select>

                    {/* Fixed value */}
                    {event.startYear.returnType === 'fixedValue' && (
                        <input
                            type="number"
                            placeholder="Fixed Start Year"
                            value={event.startYear.fixedValue}
                            onChange={(e) => updateEvent(index, ['startYear', 'fixedValue'], e.target.value)}
                        />
                    )}

                    {/* Normal distribution */}
                    {event.startYear.returnType === 'normalValue' && (
                        <div>
                            <input
                                type="number"
                                placeholder="Mean"
                                value={event.startYear.normalValue.mean}
                                onChange={(e) => updateEvent(index, ['startYear', 'normalValue', 'mean'], e.target.value)}
                            />
                            <input
                                type="number"
                                placeholder="Standard Deviation"
                                value={event.startYear.normalValue.sd}
                                onChange={(e) => updateEvent(index, ['startYear', 'normalValue', 'sd'], e.target.value)}
                            />
                        </div>
                    )}

                    {/* Uniform distribution */}
                    {event.startYear.returnType === 'uniformValue' && (
                        <div>
                            <input
                                type="number"
                                placeholder="Lower Bound"
                                value={event.startYear.uniformValue.lowerBound}
                                onChange={(e) => updateEvent(index, ['startYear', 'uniformValue', 'lowerBound'], e.target.value)}
                            />
                            <input
                                type="number"
                                placeholder="Upper Bound"
                                value={event.startYear.uniformValue.upperBound}
                                onChange={(e) => updateEvent(index, ['startYear', 'uniformValue', 'upperBound'], e.target.value)}
                            />
                        </div>
                    )}

                    {/* Same year as another event */}
                    {event.startYear.returnType === 'sameYearAsAnotherEvent' && (
                        <input
                            type="text"
                            placeholder="Event Name"
                            value={event.startYear.sameYearAsAnotherEvent}
                            onChange={(e) => updateEvent(index, ['startYear', 'sameYearAsAnotherEvent'], e.target.value)}
                        />
                    )}

                    {/* Year after another event ends */}
                    {event.startYear.returnType === 'yearAfterAnotherEventEnd' && (
                        <input
                            type="text"
                            placeholder="Event Name"
                            value={event.startYear.yearAfterAnotherEventEnd}
                            onChange={(e) => updateEvent(index, ['startYear', 'yearAfterAnotherEventEnd'], e.target.value)}
                        />
                    )}


                    {/* Duration */}
                    <h3>Duration:</h3>

                    {/* Buttons to select return type */}
                    <button onClick={() => updateEvent(index, ['duration', 'returnType'], 'fixedValue')}>
                        Fixed Value
                    </button>

                    <button onClick={() => updateEvent(index, ['duration', 'returnType'], 'normalValue')}>
                        Fixed Value (Normal Distribution)
                    </button>

                    <button onClick={() => updateEvent(index, ['duration', 'returnType'], 'uniformValue')}>
                        Fixed Value (Uniform Distribution)
                    </button>

                    {/* Fixed value */}
                    {event.duration.returnType === 'fixedValue' && (
                        <input
                            type="number"
                            placeholder="Fixed Duration"
                            value={event.duration.fixedValue}
                            onChange={(e) => updateEvent(index, ['duration', 'fixedValue'], e.target.value)}
                        />
                    )}

                    {/* Normal distribution */}
                    {event.duration.returnType === 'normalValue' && (
                        <>
                            <input
                                type="number"
                                placeholder="Mean"
                                value={event.duration.normalValue.mean}
                                onChange={(e) => updateEvent(index, ['duration', 'normalValue', 'mean'], e.target.value)}
                            />
                            <input
                                type="number"
                                placeholder="Standard Deviation"
                                value={event.duration.normalValue.sd}
                                onChange={(e) => updateEvent(index, ['duration', 'normalValue', 'sd'], e.target.value)}
                            />
                        </>
                    )}

                    {/* Uniform distribution */}
                    {event.duration.returnType === 'uniformValue' && (
                        <>
                            <input
                                type="number"
                                placeholder="Lower Bound"
                                value={event.duration.uniformValue.lowerBound}
                                onChange={(e) => updateEvent(index, ['duration', 'uniformValue', 'lowerBound'], e.target.value)}
                            />
                            <input
                                type="number"
                                placeholder="Upper Bound"
                                value={event.duration.uniformValue.upperBound}
                                onChange={(e) => updateEvent(index, ['duration', 'uniformValue', 'upperBound'], e.target.value)}
                            />
                        </>
                    )}


                    {/* Event Type */}
                    <div>
                        <h3>Event Type:</h3>
                        <select 
                            value={event.eventType} 
                            onChange={(e) => updateEvent(index, ['eventType'], e.target.value)}
                        >
                            <option value="">Select Event Type</option>
                            <option value="income">Income</option>
                            <option value="expense">Expense</option>
                            <option value="invest">Invest</option>
                            <option value="rebalance">Rebalance</option>
                        </select>
                    </div>
                    
                    {event.eventType === 'income' && (
                        <div>
                            {/* Initial Amount */}
                            <h3>Initial Amount:</h3>
                            <input 
                                type="number" 
                                placeholder="Initial Amount" 
                                value={event.income.initialAmount} 
                                onChange={(e) => updateEvent(index, ['income', 'initialAmount'], e.target.value)} 
                            />

                            {/* Expected Annual Change Type - Select Dropdown */}
                            <h3>Expected Annual Change Type:</h3>
                            <select
                                value={event.income.expectedAnnualChange.returnType}
                                onChange={(e) => updateEvent(index, ['income', 'expectedAnnualChange', 'returnType'], e.target.value)}
                            >
                                <option value="fixedValue">Fixed Value</option>
                                <option value="fixedPercentage">Fixed Percentage</option>
                                <option value="normalValue">Normal Distribution (Fixed Value)</option>
                                <option value="normalPercentage">Normal Distribution (Percentage)</option>
                                <option value="uniformValue">Uniform Distribution (Fixed)</option>
                                <option value="uniformPercentage">Uniform Distribution (Percentage)</option>
                            </select>

                            {/* Fixed Value */}
                            {event.income.expectedAnnualChange.returnType === 'fixedValue' && (
                                <input 
                                    type="number" 
                                    placeholder="Fixed Annual Change" 
                                    value={event.income.expectedAnnualChange.fixedValue} 
                                    onChange={(e) => updateEvent(index, ['income', 'expectedAnnualChange', 'fixedValue'], e.target.value)} 
                                />
                            )}

                            {/* Fixed Percentage */}
                            {event.income.expectedAnnualChange.returnType === 'fixedPercentage' && (
                                <input 
                                    type="number" 
                                    placeholder="Fixed Percentage (%)" 
                                    value={event.income.expectedAnnualChange.fixedPercentage} 
                                    onChange={(e) => updateEvent(index, ['income', 'expectedAnnualChange', 'fixedPercentage'], e.target.value)} 
                                />
                            )}

                            {/* Normal Distribution (Fixed Value) */}
                            {event.income.expectedAnnualChange.returnType === 'normalValue' && (
                                <>
                                    <input 
                                        type="number" 
                                        placeholder="Mean" 
                                        value={event.income.expectedAnnualChange.normalValue.mean} 
                                        onChange={(e) => updateEvent(index, ['income', 'expectedAnnualChange', 'normalValue', 'mean'], e.target.value)} 
                                    />
                                    <input 
                                        type="number" 
                                        placeholder="Standard Deviation" 
                                        value={event.income.expectedAnnualChange.normalValue.sd} 
                                        onChange={(e) => updateEvent(index, ['income', 'expectedAnnualChange', 'normalValue', 'sd'], e.target.value)} 
                                    />
                                </>
                            )}

                            {/* Normal Distribution (Percentage) */}
                            {event.income.expectedAnnualChange.returnType === 'normalPercentage' && (
                                <>
                                    <input 
                                        type="number" 
                                        placeholder="Mean (%)" 
                                        value={event.income.expectedAnnualChange.normalPercentage.mean} 
                                        onChange={(e) => updateEvent(index, ['income', 'expectedAnnualChange', 'normalPercentage', 'mean'], e.target.value)} 
                                    />
                                    <input 
                                        type="number" 
                                        placeholder="Standard Deviation (%)" 
                                        value={event.income.expectedAnnualChange.normalPercentage.sd} 
                                        onChange={(e) => updateEvent(index, ['income', 'expectedAnnualChange', 'normalPercentage', 'sd'], e.target.value)} 
                                    />
                                </>
                            )}

                            {/* Uniform Distribution (Fixed) */}
                            {event.income.expectedAnnualChange.returnType === 'uniformValue' && (
                                <>
                                    <input 
                                        type="number" 
                                        placeholder="Lower Bound" 
                                        value={event.income.expectedAnnualChange.uniformValue.lowerBound} 
                                        onChange={(e) => updateEvent(index, ['income', 'expectedAnnualChange', 'uniformValue', 'lowerBound'], e.target.value)} 
                                    />
                                    <input 
                                        type="number" 
                                        placeholder="Upper Bound" 
                                        value={event.income.expectedAnnualChange.uniformValue.upperBound} 
                                        onChange={(e) => updateEvent(index, ['income', 'expectedAnnualChange', 'uniformValue', 'upperBound'], e.target.value)} 
                                    />
                                </>
                            )}

                            {/* Uniform Distribution (Percentage) */}
                            {event.income.expectedAnnualChange.returnType === 'uniformPercentage' && (
                                <>
                                    <input 
                                        type="number" 
                                        placeholder="Lower Bound (%)" 
                                        value={event.income.expectedAnnualChange.uniformPercentage.lowerBound} 
                                        onChange={(e) => updateEvent(index, ['income', 'expectedAnnualChange', 'uniformPercentage', 'lowerBound'], e.target.value)} 
                                    />
                                    <input 
                                        type="number" 
                                        placeholder="Upper Bound (%)" 
                                        value={event.income.expectedAnnualChange.uniformPercentage.upperBound} 
                                        onChange={(e) => updateEvent(index, ['income', 'expectedAnnualChange', 'uniformPercentage', 'upperBound'], e.target.value)} 
                                    />
                                </>
                            )}

                            {/* Social Security */}
                            <label>
                                <input 
                                    type="checkbox" 
                                    checked={event.income.isSocialSecurity} 
                                    onChange={(e) => updateEvent(index, ['income', 'isSocialSecurity'], e.target.checked)} 
                                />
                                Is Social Security?
                            </label>

                            {/* Inflation Adjustment */}
                            <label>
                                <input 
                                    type="checkbox" 
                                    checked={event.income.inflationAdjustment} 
                                    onChange={(e) => updateEvent(index, ['income', 'inflationAdjustment'], e.target.checked)} 
                                />
                                Inflation Adjustment?
                            </label>

                            {/* Married Percentage (only if scenarioType is married) */}
                            {scenarioType === 'married' && (
                                <>
                                    <h3>Married Percentage</h3>
                                    <input 
                                        type="number" 
                                        placeholder="Married Percentage" 
                                        value={event.income.marriedPercentage} 
                                        onChange={(e) => updateEvent(index, ['income', 'marriedPercentage'], e.target.value)} 
                                    />
                                </>
                            )}
                        </div>
                    )}


                    {event.eventType === 'expense' && (
                        <div>
                            {/* Initial Amount */}
                            <h3>Initial Amount:</h3>
                            <input 
                                type="number" 
                                placeholder="Initial Amount" 
                                value={event.expense.initialAmount} 
                                onChange={(e) => updateEvent(index, ['expense', 'initialAmount'], e.target.value)} 
                            />

                            {/* Expected Annual Change Type - Select Dropdown */}
                            <h3>Expected Annual Change Type:</h3>
                            <select
                                value={event.expense.expectedAnnualChange.returnType}
                                onChange={(e) => updateEvent(index, ['expense', 'expectedAnnualChange', 'returnType'], e.target.value)}
                            >
                                <option value="fixedValue">Fixed Value</option>
                                <option value="fixedPercentage">Fixed Percentage</option>
                                <option value="normalValue">Normal Distribution (Fixed Value)</option>
                                <option value="normalPercentage">Normal Distribution (Percentage)</option>
                                <option value="uniformValue">Uniform Distribution (Fixed)</option>
                                <option value="uniformPercentage">Uniform Distribution (Percentage)</option>
                            </select>

                            {/* Fixed Value */}
                            {event.expense.expectedAnnualChange.returnType === 'fixedValue' && (
                                <input 
                                    type="number" 
                                    placeholder="Fixed Annual Change" 
                                    value={event.expense.expectedAnnualChange.fixedValue} 
                                    onChange={(e) => updateEvent(index, ['expense', 'expectedAnnualChange', 'fixedValue'], e.target.value)} 
                                />
                            )}

                            {/* Fixed Percentage */}
                            {event.expense.expectedAnnualChange.returnType === 'fixedPercentage' && (
                                <input 
                                    type="number" 
                                    placeholder="Fixed Percentage (%)" 
                                    value={event.expense.expectedAnnualChange.fixedPercentage} 
                                    onChange={(e) => updateEvent(index, ['expense', 'expectedAnnualChange', 'fixedPercentage'], e.target.value)} 
                                />
                            )}

                            {/* Normal Distribution (Fixed Value) */}
                            {event.expense.expectedAnnualChange.returnType === 'normalValue' && (
                                <>
                                    <input 
                                        type="number" 
                                        placeholder="Mean" 
                                        value={event.expense.expectedAnnualChange.normalValue.mean} 
                                        onChange={(e) => updateEvent(index, ['expense', 'expectedAnnualChange', 'normalValue', 'mean'], e.target.value)} 
                                    />
                                    <input 
                                        type="number" 
                                        placeholder="Standard Deviation" 
                                        value={event.expense.expectedAnnualChange.normalValue.sd} 
                                        onChange={(e) => updateEvent(index, ['expense', 'expectedAnnualChange', 'normalValue', 'sd'], e.target.value)} 
                                    />
                                </>
                            )}

                            {/* Normal Distribution (Percentage) */}
                            {event.expense.expectedAnnualChange.returnType === 'normalPercentage' && (
                                <>
                                    <input 
                                        type="number" 
                                        placeholder="Mean (%)" 
                                        value={event.expense.expectedAnnualChange.normalPercentage.mean} 
                                        onChange={(e) => updateEvent(index, ['expense', 'expectedAnnualChange', 'normalPercentage', 'mean'], e.target.value)} 
                                    />
                                    <input 
                                        type="number" 
                                        placeholder="Standard Deviation (%)" 
                                        value={event.expense.expectedAnnualChange.normalPercentage.sd} 
                                        onChange={(e) => updateEvent(index, ['expense', 'expectedAnnualChange', 'normalPercentage', 'sd'], e.target.value)} 
                                    />
                                </>
                            )}

                            {/* Uniform Distribution (Fixed) */}
                            {event.expense.expectedAnnualChange.returnType === 'uniformValue' && (
                                <>
                                    <input 
                                        type="number" 
                                        placeholder="Lower Bound" 
                                        value={event.expense.expectedAnnualChange.uniformValue.lowerBound} 
                                        onChange={(e) => updateEvent(index, ['expense', 'expectedAnnualChange', 'uniformValue', 'lowerBound'], e.target.value)} 
                                    />
                                    <input 
                                        type="number" 
                                        placeholder="Upper Bound" 
                                        value={event.expense.expectedAnnualChange.uniformValue.upperBound} 
                                        onChange={(e) => updateEvent(index, ['expense', 'expectedAnnualChange', 'uniformValue', 'upperBound'], e.target.value)} 
                                    />
                                </>
                            )}

                            {/* Uniform Distribution (Percentage) */}
                            {event.expense.expectedAnnualChange.returnType === 'uniformPercentage' && (
                                <>
                                    <input 
                                        type="number" 
                                        placeholder="Lower Bound (%)" 
                                        value={event.expense.expectedAnnualChange.uniformPercentage.lowerBound} 
                                        onChange={(e) => updateEvent(index, ['expense', 'expectedAnnualChange', 'uniformPercentage', 'lowerBound'], e.target.value)} 
                                    />
                                    <input 
                                        type="number" 
                                        placeholder="Upper Bound (%)" 
                                        value={event.expense.expectedAnnualChange.uniformPercentage.upperBound} 
                                        onChange={(e) => updateEvent(index, ['expense', 'expectedAnnualChange', 'uniformPercentage', 'upperBound'], e.target.value)} 
                                    />
                                </>
                            )}

                            {/* Discretionary Checkbox */}
                            <label>
                                <input 
                                    type="checkbox" 
                                    checked={event.expense.isDiscretionary} 
                                    onChange={(e) => updateEvent(index, ['expense', 'isDiscretionary'], e.target.checked)} 
                                />
                                Is Discretionary?
                            </label>

                            {/* Inflation Adjustment */}
                            <label>
                                <input 
                                    type="checkbox" 
                                    checked={event.expense.inflationAdjustment} 
                                    onChange={(e) => updateEvent(index, ['expense', 'inflationAdjustment'], e.target.checked)} 
                                />
                                Inflation Adjustment?
                            </label>

                            {/* Married Percentage (only if scenarioType is married) */}
                            {scenarioType === 'married' && (
                                <>
                                    <h3>Married Percentage</h3>
                                    <input 
                                        type="number" 
                                        placeholder="Married Percentage" 
                                        value={event.expense.marriedPercentage} 
                                        onChange={(e) => updateEvent(index, ['expense', 'marriedPercentage'], e.target.value)} 
                                    />
                                </>
                            )}
                        </div>
                    )}

                    {/* INVEST SECTION - Fixed the nesting issues */}
                    {event.eventType === 'invest' && (
                        <div>
                            {/* Return Type Selection Buttons */}
                            <h3>Execution Type:</h3>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                    <input 
                                        type="radio" 
                                        name={`executionType-${index}`}
                                        value="fixedAllocation"
                                        checked={event.invest.executionType === 'fixedAllocation'}
                                        onChange={() => {
                                            updateEvent(index, ['invest', 'executionType'], 'fixedAllocation')
                                            updateEvent(index, ['invest', 'returnType'], 'fixedAllocation')
                                        }}
                                        style={{ marginRight: '5px' }}
                                    />
                                    Fixed Allocation
                                </label>
                                
                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                    <input 
                                        type="radio" 
                                        name={`executionType-${index}`}
                                        value="glidePath"
                                        checked={event.invest.executionType === 'glidePath'}
                                        onChange={() => {
                                            updateEvent(index, ['invest', 'executionType'], 'glidePath')
                                            updateEvent(index, ['invest', 'returnType'], 'glidePath')
                                        }}
                                        style={{ marginRight: '5px' }}
                                    />
                                    Glide Path
                                </label>
                            </div>
                            
                            {event.invest.executionType === 'glidePath' && (
                                <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f0f9ff', borderRadius: '5px', fontSize: '0.9em' }}>
                                    <p style={{ margin: '0' }}>
                                        Assets will increase or decrease linearly from the rates they previously were at to the rates you are now specifying over the event duration.
                                    </p>
                                </div>
                            )}

                            {/* Remove Modify Maximum Cash checkbox and input - Replace with direct input */}
                            <div style={{ marginBottom: '15px' }}>
                                        <label style={{ display: 'block', marginBottom: '5px' }}>
                                    Maximum Cash:
                                        </label>
                                {
                                    // Calculate prefilled value outside of JSX return if needed for complex logic
                                    // This calculation is simple enough to be inline or determined before return
                                }
                                        <input
                                            type="number"
                                            min="0"
                                    placeholder="Enter maximum cash"
                                    // Determine the value to display based on current event or prefill
                                    value={(() => {
                                        let previousMaxCash = '';
                                        for (let j = index - 1; j >= 0; j--) {
                                            const prevEvent = events[j];
                                            if (prevEvent.eventType === 'invest' && prevEvent.invest?.newMaximumCash) {
                                                previousMaxCash = prevEvent.invest.newMaximumCash;
                                                break;
                                            }
                                        }
                                        return event.invest.newMaximumCash ?? previousMaxCash ?? ''; // Use current value, fallback to previous, then empty
                                    })()}
                                            onChange={(e) => updateEvent(index, ['invest', 'newMaximumCash'], e.target.value)}
                                            style={{ width: '100px' }}
                                        />
                                        <span>$</span>
                                <p className="helper-text" style={{ fontSize: '0.8em', color: '#666', marginTop: '3px' }}>
                                    (Prefilled from previous invest event if available)
                                </p>
                            </div>

                            {/* Initial Allocation Strategy Section */}
                            <div style={{ marginTop: '20px', marginBottom: '20px' }}>
                                <h3>{event.invest.executionType === 'glidePath' ? 'Initial Allocation Strategy' : 'Allocation Strategy'}</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {/* ALWAYS Render Tax Status Allocation Inputs if relevant statuses exist */} 
                                    {availableTaxStatuses.length > 0 && ( 
                                        <div style={{ marginLeft: '20px', padding: '10px', border: '1px solid #eee', borderRadius: '5px' }}>
                                            <h4>Tax Status Allocation</h4>
                                            <p>Specify what percentage of future income should be allocated to each tax status:</p>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                                {availableTaxStatuses.map(status => (
                                                    <div key={status} style={{ marginBottom: '10px', minWidth: '200px' }}>
                                                        <label style={{ display: 'block', marginBottom: '5px' }}>
                                                            {status === 'after-tax' ? 'After-Tax' : 
                                                             status === 'non-retirement' ? 'Non-Retirement' : 'Tax-Exempt'}:
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            value={displayValue(event.invest.investmentStrategy.taxStatusAllocation?.[status])}
                                                            onChange={(e) => {
                                                                const value = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                                                updateEvent(index, ['invest', 'investmentStrategy', 'taxStatusAllocation'], {
                                                                    ...event.invest.investmentStrategy.taxStatusAllocation || {},
                                                                    [status]: value
                                                                });
                                                            }}
                                                            style={{ width: '70px' }}
                                                        />
                                                        <span>%</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div style={{ fontSize: '0.9em', color: '#666', marginTop: '5px' }}>
                                                Total: {Object.values(event.invest.investmentStrategy.taxStatusAllocation || {}).filter(val => !isNaN(val) && val !== '').reduce((a, b) => a + b, 0)}% (must equal 100%)
                                            </div>
                                        </div>
                                    )} 

                                    {/* {afterTaxInvestments.length > 0 && (
                                        <label>
                                            <input 
                                                type="checkbox" 
                                                checked={event.invest.modifyAfterTaxAllocation || false} 
                                                onChange={(e) => updateEvent(index, ['invest', 'modifyAfterTaxAllocation'], e.target.checked)} 
                                            />
                                            After-Tax Allocation
                                        </label>
                                    )} */}
                                    
                                    {/* ALWAYS Render After-Tax Allocation Inputs if relevant investments exist */} 
                                    {afterTaxInvestments.length > 0 && ( 
                                        <div style={{ marginLeft: '20px', padding: '10px', border: '1px solid #eee', borderRadius: '5px' }}>
                                            <h4>After-Tax Investment Allocation</h4>
                                            <p>Specify what percentage of after-tax investments should be allocated to each investment:</p>
                                            {/* Keep conditional rendering based on length > 0 */} 
                                            {afterTaxInvestments.length > 0 && ( 
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                                    {afterTaxInvestments.map(inv => (
                                                        <div key={inv.name} style={{ marginBottom: '10px', minWidth: '200px' }}>
                                                            <label style={{ display: 'block', marginBottom: '5px' }}>
                                                                {inv.name}:
                                                            </label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                value={displayValue(event.invest.investmentStrategy.afterTaxAllocation?.[inv.name])}
                                                                onChange={(e) => {
                                                                    const value = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                                                    // Update the value in investmentStrategy ONLY
                                                                    updateEvent(index, ['invest', 'investmentStrategy', 'afterTaxAllocation'], {
                                                                        ...event.invest.investmentStrategy.afterTaxAllocation || {},
                                                                        [inv.name]: value
                                                                    });
                                                                }}
                                                                style={{ width: '70px' }} // Increased width
                                                            />
                                                            <span>%</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <div style={{ fontSize: '0.9em', color: '#666', marginTop: '5px' }}>
                                                Total: {Object.values(event.invest.investmentStrategy.afterTaxAllocation || {}).filter(val => !isNaN(val) && val !== '').reduce((a, b) => a + b, 0)}% (must equal 100%)
                                            </div>
                                        </div>
                                    )} 
                                    
                                    {/* {nonRetirementInvestments.length > 0 && (
                                        <label>
                                            <input 
                                                type="checkbox" 
                                                checked={event.invest.modifyNonRetirementAllocation || false} 
                                                onChange={(e) => updateEvent(index, ['invest', 'modifyNonRetirementAllocation'], e.target.checked)} 
                                            />
                                            Non-Retirement (Taxable) Allocation
                                        </label>
                                    )} */}
                                    
                                    {/* ALWAYS Render Non-Retirement Allocation Inputs if relevant investments exist */} 
                                    {nonRetirementInvestments.length > 0 && ( 
                                        <div style={{ marginLeft: '20px', padding: '10px', border: '1px solid #eee', borderRadius: '5px' }}>
                                            <h4>Non-Retirement (Taxable) Investment Allocation</h4>
                                            <p>Specify what percentage of non-retirement (taxable) investments should be allocated to each investment:</p>
                                            {/* Keep conditional rendering based on length > 0 */} 
                                            {nonRetirementInvestments.length > 0 && ( 
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                                    {nonRetirementInvestments.map(inv => (
                                                        <div key={inv.name} style={{ marginBottom: '10px', minWidth: '200px' }}>
                                                            <label style={{ display: 'block', marginBottom: '5px' }}>
                                                                {inv.name}:
                                                            </label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                value={displayValue(event.invest.investmentStrategy.nonRetirementAllocation?.[inv.name])}
                                                                onChange={(e) => {
                                                                    const value = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                                                    // Only update in investmentStrategy
                                                                    updateEvent(index, ['invest', 'investmentStrategy', 'nonRetirementAllocation'], {
                                                                        ...event.invest.investmentStrategy.nonRetirementAllocation || {},
                                                                        [inv.name]: value
                                                                    });
                                                                }}
                                                                style={{ width: '70px' }} // Increased width
                                                            />
                                                            <span>%</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <div style={{ fontSize: '0.9em', color: '#666', marginTop: '5px' }}>
                                                Total: {Object.values(event.invest.investmentStrategy.nonRetirementAllocation || {}).filter(val => !isNaN(val) && val !== '').reduce((a, b) => a + b, 0)}% (must equal 100%)
                                            </div>
                                        </div>
                                    )} 
                                    
                                    {/* {taxExemptInvestments.length > 0 && (
                                        <label>
                                            <input 
                                                type="checkbox" 
                                                checked={event.invest.modifyTaxExemptAllocation || false} 
                                                onChange={(e) => updateEvent(index, ['invest', 'modifyTaxExemptAllocation'], e.target.checked)} 
                                            />
                                            Tax-Exempt Allocation
                                        </label>
                                    )} */}
                                    
                                    {/* ALWAYS Render Tax-Exempt Allocation Inputs if relevant investments exist */} 
                                    {taxExemptInvestments.length > 0 && ( 
                                        <div style={{ marginLeft: '20px', padding: '10px', border: '1px solid #eee', borderRadius: '5px' }}>
                                            <h4>Tax-Exempt Investment Allocation</h4>
                                            <p>Specify what percentage of tax-exempt investments should be allocated to each investment:</p>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                                {taxExemptInvestments.map(inv => (
                                                    <div key={inv.name} style={{ marginBottom: '10px', minWidth: '200px' }}>
                                                        <label style={{ display: 'block', marginBottom: '5px' }}>
                                                            {inv.name}:
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            value={displayValue(event.invest.investmentStrategy.taxExemptAllocation?.[inv.name])}
                                                            onChange={(e) => {
                                                                const value = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                                                // Only update in investmentStrategy
                                                                updateEvent(index, ['invest', 'investmentStrategy', 'taxExemptAllocation'], {
                                                                    ...event.invest.investmentStrategy.taxExemptAllocation || {},
                                                                    [inv.name]: value
                                                                });
                                                            }}
                                                            style={{ width: '70px' }} // Increased width
                                                        />
                                                        <span>%</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div style={{ fontSize: '0.9em', color: '#666', marginTop: '5px' }}>
                                                Total: {Object.values(event.invest.investmentStrategy.taxExemptAllocation || {}).filter(val => !isNaN(val) && val !== '').reduce((a, b) => a + b, 0)}% (must equal 100%)
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Final Allocation Strategy Section (only for Glide Path) */} 
                            {event.invest.executionType === 'glidePath' && (
                                <div style={{ marginTop: '20px', marginBottom: '20px', borderTop: '2px dashed #ccc', paddingTop: '20px' }}>
                                    <h3>Final Allocation Strategy</h3>
                                    <p style={{ marginBottom: '15px', fontStyle: 'italic' }}>
                                        Specify the target allocation at the end of the glide path
                                    </p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {/* Final Tax Status Allocation */} 
                                        {/* ALWAYS Render if availableTaxStatuses exist */}
                                        {availableTaxStatuses.length > 0 && ( 
                                            <div style={{ marginLeft: '20px', padding: '10px', border: '1px solid #eee', borderRadius: '5px' }}>
                                                <h4>Final Tax Status Allocation</h4>
                                                <p>Specify what percentage of future income should be allocated to each tax status at the end of the glide path:</p>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                                    {availableTaxStatuses.map(status => (
                                                        <div key={status} style={{ marginBottom: '10px', minWidth: '200px' }}>
                                                            <label style={{ display: 'block', marginBottom: '5px' }}>
                                                                {status === 'after-tax' ? 'After-Tax' : 
                                                                 status === 'non-retirement' ? 'Non-Retirement' : 'Tax-Exempt'}:
                                                            </label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                value={displayValue(event.invest.finalInvestmentStrategy?.taxStatusAllocation?.[status])}
                                                                onChange={(e) => {
                                                                    const value = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                                                    updateEvent(index, ['invest', 'finalInvestmentStrategy', 'taxStatusAllocation'], {
                                                                        ...event.invest.finalInvestmentStrategy?.taxStatusAllocation || {},
                                                                        [status]: value
                                                                    });
                                                                }}
                                                                style={{ width: '70px' }}
                                                            />
                                                            <span>%</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div style={{ fontSize: '0.9em', color: '#666', marginTop: '5px' }}>
                                                    Total: {Object.values(event.invest.finalInvestmentStrategy?.taxStatusAllocation || {}).filter(val => !isNaN(val) && val !== '').reduce((a, b) => a + b, 0)}% (must equal 100%)
                                                </div>
                                            </div>
                                        )}

                                        {/* Final After-Tax Allocation */} 
                                        {/* ALWAYS Render if afterTaxInvestments exist */} 
                                        {afterTaxInvestments.length > 0 && ( 
                                            <div style={{ marginLeft: '20px', padding: '10px', border: '1px solid #eee', borderRadius: '5px' }}>
                                                <h4>Final After-Tax Investment Allocation</h4>
                                                <p>Specify what percentage of after-tax investments should be allocated to each investment at the end of the glide path:</p>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                                    {afterTaxInvestments.map(inv => (
                                                        <div key={inv.name} style={{ marginBottom: '10px', minWidth: '200px' }}>
                                                            <label style={{ display: 'block', marginBottom: '5px' }}>
                                                                {inv.name}:
                                                            </label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                value={displayValue(event.invest.finalInvestmentStrategy?.afterTaxAllocation?.[inv.name])}
                                                                onChange={(e) => {
                                                                    const value = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                                                    updateEvent(index, ['invest', 'finalInvestmentStrategy', 'afterTaxAllocation'], {
                                                                        ...event.invest.finalInvestmentStrategy?.afterTaxAllocation || {},
                                                                        [inv.name]: value
                                                                    });
                                                                }}
                                                                style={{ width: '70px' }} // Increased width
                                                            />
                                                            <span>%</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div style={{ fontSize: '0.9em', color: '#666', marginTop: '5px' }}>
                                                    Total: {Object.values(event.invest.finalInvestmentStrategy?.afterTaxAllocation || {}).filter(val => !isNaN(val) && val !== '').reduce((a, b) => a + b, 0)}% (must equal 100%)
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Final Non-Retirement Allocation */} 
                                        {/* ALWAYS Render if nonRetirementInvestments exist */} 
                                        {nonRetirementInvestments.length > 0 && ( 
                                            <div style={{ marginLeft: '20px', padding: '10px', border: '1px solid #eee', borderRadius: '5px' }}>
                                                <h4>Final Non-Retirement Investment Allocation</h4>
                                                <p>Specify what percentage of non-retirement (taxable) investments should be allocated to each investment at the end of the glide path:</p>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                                    {nonRetirementInvestments.map(inv => (
                                                        <div key={inv.name} style={{ marginBottom: '10px', minWidth: '200px' }}>
                                                            <label style={{ display: 'block', marginBottom: '5px' }}>
                                                                {inv.name}:
                                                            </label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                value={displayValue(event.invest.finalInvestmentStrategy?.nonRetirementAllocation?.[inv.name])}
                                                                onChange={(e) => {
                                                                    const value = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                                                    updateEvent(index, ['invest', 'finalInvestmentStrategy', 'nonRetirementAllocation'], {
                                                                        ...event.invest.finalInvestmentStrategy?.nonRetirementAllocation || {},
                                                                        [inv.name]: value
                                                                    });
                                                                }}
                                                                style={{ width: '70px' }} // Increased width
                                                            />
                                                            <span>%</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div style={{ fontSize: '0.9em', color: '#666', marginTop: '5px' }}>
                                                    Total: {Object.values(event.invest.finalInvestmentStrategy?.nonRetirementAllocation || {}).filter(val => !isNaN(val) && val !== '').reduce((a, b) => a + b, 0)}% (must equal 100%)
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Final Tax-Exempt Allocation */} 
                                        {/* ALWAYS Render if taxExemptInvestments exist */} 
                                        {taxExemptInvestments.length > 0 && ( 
                                            <div style={{ marginLeft: '20px', padding: '10px', border: '1px solid #eee', borderRadius: '5px' }}>
                                                <h4>Final Tax-Exempt Investment Allocation</h4>
                                                <p>Specify what percentage of tax-exempt investments should be allocated to each investment at the end of the glide path:</p>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                                    {taxExemptInvestments.map(inv => (
                                                        <div key={inv.name} style={{ marginBottom: '10px', minWidth: '200px' }}>
                                                            <label style={{ display: 'block', marginBottom: '5px' }}>
                                                                {inv.name}:
                                                            </label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                value={displayValue(event.invest.finalInvestmentStrategy?.taxExemptAllocation?.[inv.name])}
                                                                onChange={(e) => {
                                                                    const value = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                                                    updateEvent(index, ['invest', 'finalInvestmentStrategy', 'taxExemptAllocation'], {
                                                                        ...event.invest.finalInvestmentStrategy?.taxExemptAllocation || {},
                                                                        [inv.name]: value
                                                                    });
                                                                }}
                                                                style={{ width: '70px' }} // Increased width
                                                            />
                                                            <span>%</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div style={{ fontSize: '0.9em', color: '#666', marginTop: '5px' }}>
                                                    Total: {Object.values(event.invest.finalInvestmentStrategy?.taxExemptAllocation || {}).filter(val => !isNaN(val) && val !== '').reduce((a, b) => a + b, 0)}% (must equal 100%)
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* REBALANCE SECTION - Fixed the nesting issues */}
                    {event.eventType === 'rebalance' && (
                        <div>
                            {/* Return Type Selection Buttons */}
                            <h3>Execution Type:</h3>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                    <input 
                                        type="radio" 
                                        name={`executionType-rebalance-${index}`}
                                        value="fixedAllocation"
                                        checked={event.rebalance.executionType === 'fixedAllocation'}
                                        onChange={() => {
                                            updateEvent(index, ['rebalance', 'executionType'], 'fixedAllocation')
                                            updateEvent(index, ['rebalance', 'returnType'], 'fixedAllocation')
                                        }}
                                        style={{ marginRight: '5px' }}
                                    />
                                    Fixed Allocation
                                </label>
                                
                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                    <input 
                                        type="radio" 
                                        name={`executionType-rebalance-${index}`}
                                        value="glidePath"
                                        checked={event.rebalance.executionType === 'glidePath'}
                                        onChange={() => {
                                            updateEvent(index, ['rebalance', 'executionType'], 'glidePath')
                                            updateEvent(index, ['rebalance', 'returnType'], 'glidePath')
                                        }}
                                        style={{ marginRight: '5px' }}
                                    />
                                    Glide Path
                                </label>
                            </div>
                            
                            {event.rebalance.executionType === 'glidePath' && (
                                <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f0f9ff', borderRadius: '5px', fontSize: '0.9em' }}>
                                    <p style={{ margin: '0' }}>
                                        Assets will increase or decrease linearly from the rates they previously were at to the rates you are now specifying over the event duration.
                                    </p>
                                </div>
                            )}

                            {/* Allocation Strategy Selection */}
                            <div style={{ marginTop: '20px', marginBottom: '20px' }}>
                                <h3>{event.rebalance.executionType === 'glidePath' ? 'Initial Rebalance Strategy' : 'Rebalance Strategy'}</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <label>
                                        <input
                                            type="checkbox" 
                                            checked={event.rebalance.modifyTaxStatusAllocation || false} 
                                            onChange={(e) => updateEvent(index, ['rebalance', 'modifyTaxStatusAllocation'], e.target.checked)} 
                                        />
                                        Rebalance by Tax-Status
                                    </label>
                                    
                                    {event.rebalance.modifyTaxStatusAllocation && (
                                        <div style={{ marginLeft: '20px', padding: '10px', border: '1px solid #eee', borderRadius: '5px' }}>
                                            {availableTaxStatuses.length > 0 && (
                                                <div>
                                                    <h4>Tax Status Rebalance</h4>
                                                    <p>Specify what percentage of assets should be rebalanced to each tax status:</p>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                                        {availableTaxStatuses.map(status => (
                                                            <div key={status} style={{ marginBottom: '10px', minWidth: '200px' }}>
                                                                <label style={{ display: 'block', marginBottom: '5px' }}>
                                                                    {status === 'after-tax' ? 'After-Tax' : 
                                                                     status === 'non-retirement' ? 'Non-Retirement' : 'Tax-Exempt'}:
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max="100"
                                                                    value={displayValue(event.rebalance.rebalanceStrategy?.taxStatusAllocation?.[status])}
                                                                    onChange={(e) => {
                                                                        const value = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                                                        updateEvent(index, ['rebalance', 'rebalanceStrategy', 'taxStatusAllocation'], {
                                                                            ...event.rebalance.rebalanceStrategy?.taxStatusAllocation || {},
                                                                            [status]: value
                                                                        });
                                                                    }}
                                                                    style={{ width: '70px' }}
                                                                />
                                                                <span>%</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div style={{ fontSize: '0.9em', color: '#666', marginTop: '5px' }}>
                                                        Total: {Object.values(event.rebalance.rebalanceStrategy?.taxStatusAllocation || {}).filter(val => !isNaN(val) && val !== '').reduce((a, b) => a + b, 0)}% (must equal 100%)
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    
                                    {/* Conditionally render Rebalance After-Tax based on investments */}
                                    {afterTaxInvestments.length > 0 && (
                                        <label>
                                            <input
                                                type="checkbox" 
                                                checked={event.rebalance.modifyAfterTaxAllocation || false} 
                                                onChange={(e) => updateEvent(index, ['rebalance', 'modifyAfterTaxAllocation'], e.target.checked)} 
                                            />
                                            Rebalance After-Tax Assets
                                        </label>
                                    )}
                                    
                                    {event.rebalance.modifyAfterTaxAllocation && afterTaxInvestments.length > 0 && (
                                        <div style={{ marginLeft: '20px', padding: '10px', border: '1px solid #eee', borderRadius: '5px' }}>
                                            <h4>After-Tax Investment Rebalance</h4>
                                            <p>Specify how after-tax investments should be rebalanced:</p>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                                {afterTaxInvestments.map(inv => (
                                                    <div key={inv.name} style={{ marginBottom: '10px', minWidth: '200px' }}>
                                                        <label style={{ display: 'block', marginBottom: '5px' }}>
                                                            {inv.name}:
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            value={displayValue(event.rebalance.rebalanceStrategy?.afterTaxAllocation?.[inv.name])}
                                                            onChange={(e) => {
                                                                const value = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                                                updateEvent(index, ['rebalance', 'rebalanceStrategy', 'afterTaxAllocation'], {
                                                                    ...event.rebalance.rebalanceStrategy?.afterTaxAllocation || {},
                                                                    [inv.name]: value
                                                                });
                                                            }}
                                                            style={{ width: '70px' }} // Increased width
                                                        />
                                                        <span>%</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div style={{ fontSize: '0.9em', color: '#666', marginTop: '5px' }}>
                                                Total: {Object.values(event.rebalance.rebalanceStrategy?.afterTaxAllocation || {}).filter(val => !isNaN(val) && val !== '').reduce((a, b) => a + b, 0)}% (must equal 100%)
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Conditionally render Rebalance Non-Retirement based on investments */}
                                    {nonRetirementInvestments.length > 0 && (
                                        <label>
                                            <input 
                                                type="checkbox" 
                                                checked={event.rebalance.modifyNonRetirementAllocation || false} 
                                                onChange={(e) => updateEvent(index, ['rebalance', 'modifyNonRetirementAllocation'], e.target.checked)} 
                                            />
                                            Rebalance Non-Retirement (Taxable) Assets
                                        </label>
                                    )}
                                    
                                    {event.rebalance.modifyNonRetirementAllocation && nonRetirementInvestments.length > 0 && (
                                        <div style={{ marginLeft: '20px', padding: '10px', border: '1px solid #eee', borderRadius: '5px' }}>
                                            <h4>Non-Retirement (Taxable) Investment Rebalance</h4>
                                            <p>Specify how non-retirement (taxable) investments should be rebalanced:</p>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                                {nonRetirementInvestments.map(inv => (
                                                    <div key={inv.name} style={{ marginBottom: '10px', minWidth: '200px' }}>
                                                        <label style={{ display: 'block', marginBottom: '5px' }}>
                                                            {inv.name}:
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            value={displayValue(event.rebalance.rebalanceStrategy?.nonRetirementAllocation?.[inv.name])}
                                                            onChange={(e) => {
                                                                const value = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                                                updateEvent(index, ['rebalance', 'rebalanceStrategy', 'nonRetirementAllocation'], {
                                                                    ...event.rebalance.rebalanceStrategy?.nonRetirementAllocation || {},
                                                                    [inv.name]: value
                                                                });
                                                            }}
                                                            style={{ width: '70px' }} // Increased width
                                                        />
                                                        <span>%</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div style={{ fontSize: '0.9em', color: '#666', marginTop: '5px' }}>
                                                Total: {Object.values(event.rebalance.rebalanceStrategy?.nonRetirementAllocation || {}).filter(val => !isNaN(val) && val !== '').reduce((a, b) => a + b, 0)}% (must equal 100%)
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Conditionally render Rebalance Tax-Exempt based on investments */}
                                    {taxExemptInvestments.length > 0 && (
                                        <label>
                                            <input 
                                                type="checkbox" 
                                                checked={event.rebalance.modifyTaxExemptAllocation || false} 
                                                onChange={(e) => updateEvent(index, ['rebalance', 'modifyTaxExemptAllocation'], e.target.checked)} 
                                            />
                                            Rebalance Tax-Exempt Assets
                                        </label>
                                    )}
                                    
                                    {event.rebalance.modifyTaxExemptAllocation && taxExemptInvestments.length > 0 && (
                                        <div style={{ marginLeft: '20px', padding: '10px', border: '1px solid #eee', borderRadius: '5px' }}>
                                            <h4>Tax-Exempt Investment Rebalance</h4>
                                            <p>Specify how tax-exempt investments should be rebalanced:</p>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                                {taxExemptInvestments.map(inv => (
                                                    <div key={inv.name} style={{ marginBottom: '10px', minWidth: '200px' }}>
                                                        <label style={{ display: 'block', marginBottom: '5px' }}>
                                                            {inv.name}:
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            value={displayValue(event.rebalance.rebalanceStrategy?.taxExemptAllocation?.[inv.name])}
                                                            onChange={(e) => {
                                                                const value = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                                                updateEvent(index, ['rebalance', 'rebalanceStrategy', 'taxExemptAllocation'], {
                                                                    ...event.rebalance.rebalanceStrategy?.taxExemptAllocation || {},
                                                                    [inv.name]: value
                                                                });
                                                            }}
                                                            style={{ width: '70px' }} // Increased width
                                                        />
                                                        <span>%</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div style={{ fontSize: '0.9em', color: '#666', marginTop: '5px' }}>
                                                Total: {Object.values(event.rebalance.rebalanceStrategy?.taxExemptAllocation || {}).filter(val => !isNaN(val) && val !== '').reduce((a, b) => a + b, 0)}% (must equal 100%)
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Conditionally render Rebalance Pre-Tax based on investments */}
                                    {preTaxInvestments.length > 0 && (
                                        <label>
                                            <input 
                                                type="checkbox" 
                                                checked={event.rebalance.modifyPreTaxAllocation || false} 
                                                onChange={(e) => updateEvent(index, ['rebalance', 'modifyPreTaxAllocation'], e.target.checked)} 
                                            />
                                            Rebalance Pre-Tax Assets
                                        </label>
                                    )}
                                    
                                    {event.rebalance.modifyPreTaxAllocation && preTaxInvestments.length > 0 && (
                                        <div style={{ marginLeft: '20px', padding: '10px', border: '1px solid #eee', borderRadius: '5px' }}>
                                            <h4>Pre-Tax Investment Rebalance</h4>
                                            <p>Specify how pre-tax investments should be rebalanced:</p>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                                {preTaxInvestments.map(inv => (
                                                    <div key={inv.name} style={{ marginBottom: '10px', minWidth: '200px' }}>
                                                        <label style={{ display: 'block', marginBottom: '5px' }}>
                                                            {inv.name}:
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            value={displayValue(event.rebalance.rebalanceStrategy?.preTaxAllocation?.[inv.name])}
                                                            onChange={(e) => {
                                                                const value = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                                                updateEvent(index, ['rebalance', 'rebalanceStrategy', 'preTaxAllocation'], {
                                                                    ...event.rebalance.rebalanceStrategy?.preTaxAllocation || {},
                                                                    [inv.name]: value
                                                                });
                                                            }}
                                                            style={{ width: '70px' }} // Increased width
                                                        />
                                                        <span>%</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div style={{ fontSize: '0.9em', color: '#666', marginTop: '5px' }}>
                                                Total: {Object.values(event.rebalance.rebalanceStrategy?.preTaxAllocation || {}).filter(val => !isNaN(val) && val !== '').reduce((a, b) => a + b, 0)}% (must equal 100%)
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Final Rebalance Strategy Section (only for Glide Path) */}
                            {event.rebalance.executionType === 'glidePath' && (
                                <div style={{ marginTop: '20px', marginBottom: '20px', borderTop: '2px dashed #ccc', paddingTop: '20px' }}>
                                    <h3>Final Rebalance Strategy</h3>
                                    <p style={{ marginBottom: '15px', fontStyle: 'italic' }}>
                                        Specify the target allocation at the end of the glide path
                                    </p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {/* Final Tax Status Allocation */}
                                        {availableTaxStatuses.length > 0 && event.rebalance.modifyTaxStatusAllocation && (
                                            <div style={{ marginLeft: '20px', padding: '10px', border: '1px solid #eee', borderRadius: '5px' }}>
                                                <h4>Final Tax Status Rebalance</h4>
                                                <p>Specify what percentage of assets should be rebalanced to each tax status at the end of the glide path:</p>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                                    {availableTaxStatuses.map(status => (
                                                        <div key={status} style={{ marginBottom: '10px', minWidth: '200px' }}>
                                                            <label style={{ display: 'block', marginBottom: '5px' }}>
                                                                {status === 'after-tax' ? 'After-Tax' : 
                                                                 status === 'non-retirement' ? 'Non-Retirement' : 'Tax-Exempt'}:
                                                            </label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                value={displayValue(event.rebalance.finalRebalanceStrategy?.taxStatusAllocation?.[status])}
                                                                onChange={(e) => {
                                                                    const value = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                                                    updateEvent(index, ['rebalance', 'finalRebalanceStrategy', 'taxStatusAllocation'], {
                                                                        ...event.rebalance.finalRebalanceStrategy?.taxStatusAllocation || {},
                                                                        [status]: value
                                                                    });
                                                                }}
                                                                style={{ width: '70px' }}
                                                            />
                                                            <span>%</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div style={{ fontSize: '0.9em', color: '#666', marginTop: '5px' }}>
                                                    Total: {Object.values(event.rebalance.finalRebalanceStrategy?.taxStatusAllocation || {}).filter(val => !isNaN(val) && val !== '').reduce((a, b) => a + b, 0)}% (must equal 100%)
                            </div>
                        </div>
                    )}

                                        {/* Final After-Tax Allocation */}
                                        {afterTaxInvestments.length > 0 && event.rebalance.modifyAfterTaxAllocation && (
                                            <div style={{ marginLeft: '20px', padding: '10px', border: '1px solid #eee', borderRadius: '5px' }}>
                                                <h4>Final After-Tax Investment Rebalance</h4>
                                                <p>Specify how after-tax investments should be rebalanced at the end of the glide path:</p>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                                    {afterTaxInvestments.map(inv => (
                                                        <div key={inv.name} style={{ marginBottom: '10px', minWidth: '200px' }}>
                                                            <label style={{ display: 'block', marginBottom: '5px' }}>
                                                                {inv.name}:
                                                            </label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                value={displayValue(event.rebalance.finalRebalanceStrategy?.afterTaxAllocation?.[inv.name])}
                                                                onChange={(e) => {
                                                                    const value = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                                                    updateEvent(index, ['rebalance', 'finalRebalanceStrategy', 'afterTaxAllocation'], {
                                                                        ...event.rebalance.finalRebalanceStrategy?.afterTaxAllocation || {},
                                                                        [inv.name]: value
                                                                    });
                                                                }}
                                                                style={{ width: '70px' }} // Increased width
                                                            />
                                                            <span>%</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div style={{ fontSize: '0.9em', color: '#666', marginTop: '5px' }}>
                                                    Total: {Object.values(event.rebalance.finalRebalanceStrategy?.afterTaxAllocation || {}).filter(val => !isNaN(val) && val !== '').reduce((a, b) => a + b, 0)}% (must equal 100%)
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Final Non-Retirement Allocation */}
                                        {nonRetirementInvestments.length > 0 && event.rebalance.modifyNonRetirementAllocation && (
                                            <div style={{ marginLeft: '20px', padding: '10px', border: '1px solid #eee', borderRadius: '5px' }}>
                                                <h4>Final Non-Retirement (Taxable) Investment Rebalance</h4>
                                                <p>Specify how non-retirement (Taxable) investments should be rebalanced at the end of the glide path:</p>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                                    {nonRetirementInvestments.map(inv => (
                                                        <div key={inv.name} style={{ marginBottom: '10px', minWidth: '200px' }}>
                                                            <label style={{ display: 'block', marginBottom: '5px' }}>
                                                                {inv.name}:
                                                            </label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                value={displayValue(event.rebalance.finalRebalanceStrategy?.nonRetirementAllocation?.[inv.name])}
                                                                onChange={(e) => {
                                                                    const value = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                                                    updateEvent(index, ['rebalance', 'finalRebalanceStrategy', 'nonRetirementAllocation'], {
                                                                        ...event.rebalance.finalRebalanceStrategy?.nonRetirementAllocation || {},
                                                                        [inv.name]: value
                                                                    });
                                                                }}
                                                                style={{ width: '70px' }} // Increased width
                                                            />
                                                            <span>%</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div style={{ fontSize: '0.9em', color: '#666', marginTop: '5px' }}>
                                                    Total: {Object.values(event.rebalance.finalRebalanceStrategy?.nonRetirementAllocation || {}).filter(val => !isNaN(val) && val !== '').reduce((a, b) => a + b, 0)}% (must equal 100%)
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Final Tax-Exempt Allocation */}
                                        {taxExemptInvestments.length > 0 && event.rebalance.modifyTaxExemptAllocation && (
                                            <div style={{ marginLeft: '20px', padding: '10px', border: '1px solid #eee', borderRadius: '5px' }}>
                                                <h4>Final Tax-Exempt Investment Rebalance</h4>
                                                <p>Specify how tax-exempt investments should be rebalanced at the end of the glide path:</p>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                                    {taxExemptInvestments.map(inv => (
                                                        <div key={inv.name} style={{ marginBottom: '10px', minWidth: '200px' }}>
                                                            <label style={{ display: 'block', marginBottom: '5px' }}>
                                                                {inv.name}:
                                                            </label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                value={displayValue(event.rebalance.finalRebalanceStrategy?.taxExemptAllocation?.[inv.name])}
                                                                onChange={(e) => {
                                                                    const value = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                                                    updateEvent(index, ['rebalance', 'finalRebalanceStrategy', 'taxExemptAllocation'], {
                                                                        ...event.rebalance.finalRebalanceStrategy?.taxExemptAllocation || {},
                                                                        [inv.name]: value
                                                                    });
                                                                }}
                                                                style={{ width: '70px' }} // Increased width
                                                            />
                                                            <span>%</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div style={{ fontSize: '0.9em', color: '#666', marginTop: '5px' }}>
                                                    Total: {Object.values(event.rebalance.finalRebalanceStrategy?.taxExemptAllocation || {}).filter(val => !isNaN(val) && val !== '').reduce((a, b) => a + b, 0)}% (must equal 100%)
                                                </div>
                                            </div>
                                        )}

                                        {/* ADD Final Pre-Tax Allocation HERE */}
                                        {preTaxInvestments.length > 0 && event.rebalance.modifyPreTaxAllocation && (
                                            <div style={{ marginLeft: '20px', padding: '10px', border: '1px solid #eee', borderRadius: '5px' }}>
                                                <h4>Final Pre-Tax Investment Rebalance</h4>
                                                <p>Specify how pre-tax investments should be rebalanced at the end of the glide path:</p>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                                    {preTaxInvestments.map(inv => (
                                                        <div key={inv.name} style={{ marginBottom: '10px', minWidth: '200px' }}>
                                                            <label style={{ display: 'block', marginBottom: '5px' }}>
                                                                {inv.name}:
                                                            </label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                value={displayValue(event.rebalance.finalRebalanceStrategy?.preTaxAllocation?.[inv.name])}
                                                                onChange={(e) => {
                                                                    const value = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                                                    updateEvent(index, ['rebalance', 'finalRebalanceStrategy', 'preTaxAllocation'], {
                                                                        ...event.rebalance.finalRebalanceStrategy?.preTaxAllocation || {},
                                                                        [inv.name]: value
                                                                    });
                                                                }}
                                                                style={{ width: '70px' }} // Increased width
                                                            />
                                                            <span>%</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div style={{ fontSize: '0.9em', color: '#666', marginTop: '5px' }}>
                                                    Total: {Object.values(event.rebalance.finalRebalanceStrategy?.preTaxAllocation || {}).filter(val => !isNaN(val) && val !== '').reduce((a, b) => a + b, 0)}% (must equal 100%)
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))}

            {/* Navigation Buttons */}
            <div>
                <button onClick={() => setPage(3)}>Previous</button>
                
                <button onClick={() => {
                    console.log('Starting form validation...');
                    
                    // Remove initial allocation validation
                    /*
                    if (!validateAllocations()) {
                        console.log('Investment allocations validation failed');
                        return;
                    }
                    */
                    
                    // Remove saveAllocationData call
                    // saveAllocationData();
                    
                    if (events.length === 0) {
                        console.log('No events found');
                        alert("At least one event is required.");
                        return;
                    }

                    let validationPassed = true;

                    for (const event of events) {
                        console.log(`Validating event: ${event.name}`);
                        
                        // Ensure the event has a name
                        if (!event.name.trim()) {
                            console.log(`Event missing name: ${event.name}`);
                            alert("Each event must have a Name.");
                            validationPassed = false;
                            break;
                        }

                        // Validate startYear
                        if (!event.startYear.returnType) {
                            console.log(`Event missing startYear returnType: ${event.name}`);
                            alert(`Event "${event.name}" must have a Start Year Return Type.`);
                            validationPassed = false;
                            break;
                        }

                        switch (event.startYear.returnType) {
                            case 'fixedValue':
                                // Allow 0? (Unlikely for year, but check if null/empty)
                                if (event.startYear.fixedValue == null || String(event.startYear.fixedValue).trim() === '') {
                                    console.log(`Event missing fixedValue for startYear: ${event.name}`);
                                    alert(`Event "${event.name}" requires a Fixed Value for Start Year.`);
                                    validationPassed = false;
                                    break;
                                }
                                break;

                            case 'normalValue':
                                // Allow 0 for mean/sd
                                if ((event.startYear.normalValue.mean == null || String(event.startYear.normalValue.mean).trim() === '') || 
                                    (event.startYear.normalValue.sd == null || String(event.startYear.normalValue.sd).trim() === '')) {
                                    alert(`Event "${event.name}" requires Mean and Standard Deviation for Normal Start Year.`);
                                    validationPassed = false; // Set flag
                                    break; // Break switch
                                }
                                break;

                            case 'uniformValue':
                                // Allow 0 for bounds
                                if ((event.startYear.uniformValue.lowerBound == null || String(event.startYear.uniformValue.lowerBound).trim() === '') || 
                                    (event.startYear.uniformValue.upperBound == null || String(event.startYear.uniformValue.upperBound).trim() === '')) {
                                    alert(`Event "${event.name}" requires Lower and Upper Bound for Uniform Start Year.`);
                                    validationPassed = false; // Set flag
                                    break; // Break switch
                                }
                                break;

                            case 'sameYearAsAnotherEvent':
                                if (!event.startYear.sameYearAsAnotherEvent) {
                                    alert(`Event "${event.name}" must specify another event for Same Year Start.`);
                                    validationPassed = false; // Set flag
                                    break; // Break switch
                                }
                                break;

                            case 'yearAfterAnotherEventEnd':
                                if (!event.startYear.yearAfterAnotherEventEnd) {
                                    alert(`Event "${event.name}" must specify another event for Year After Another Event Ends.`);
                                    validationPassed = false; // Set flag
                                    break; // Break switch
                                }
                                break;

                            default:
                                // No action needed for unknown return type
                                break;
                        }

                        if (!validationPassed) break; // Break outer loop if validation failed

                        // --- NEW: Validate Duration --- 
                        if (!event.duration.returnType) {
                            alert(`Event "${event.name}" must have a Duration Type.`);
                            validationPassed = false; break;
                        }
                        switch (event.duration.returnType) {
                            case 'fixedValue':
                                const fixedDur = parseInt(event.duration.fixedValue, 10);
                                if (isNaN(fixedDur) || fixedDur < 1) {
                                    alert(`Event "${event.name}" Fixed Duration must be 1 or greater.`);
                                    validationPassed = false; break;
                                }
                                break;
                            case 'normalValue':
                                // Can't strictly validate >= 1, but ensure values are present
                                if ((event.duration.normalValue.mean == null || String(event.duration.normalValue.mean).trim() === '') ||
                                    (event.duration.normalValue.sd == null || String(event.duration.normalValue.sd).trim() === '')) {
                                        alert(`Event "${event.name}" requires Mean and Standard Deviation for Normal Duration.`);
                                        validationPassed = false; break;
                                }
                                break;
                            case 'uniformValue':
                                const lowerBound = parseInt(event.duration.uniformValue.lowerBound, 10);
                                const upperBound = parseInt(event.duration.uniformValue.upperBound, 10);
                                if (isNaN(lowerBound) || lowerBound < 1) {
                                     alert(`Event "${event.name}" Uniform Duration Lower Bound must be 1 or greater.`);
                                     validationPassed = false; break;
                                }
                                if (isNaN(upperBound) || upperBound < lowerBound) { // Also check upper bound is valid
                                     alert(`Event "${event.name}" Uniform Duration Upper Bound must be greater than or equal to the Lower Bound.`);
                                     validationPassed = false; break;
                                }
                                break;
                            default: break;
                        }
                        if (!validationPassed) break;
                        // --- END Duration Validation --- 

                        // Ensure the event has an event type
                        if (!event.eventType) {
                            console.log(`Event missing eventType: ${event.name}`);
                            alert(`Event "${event.name}" must have an Event Type.`);
                            validationPassed = false;
                            break;
                        }

                        switch (event.eventType) {
                            case 'income':
                            case 'expense':{
                                const isIncome = event.eventType === 'income';
                                const eventData = isIncome ? event.income : event.expense;
                        
                                // Allow 0 for initial amount
                                if (eventData.initialAmount == null || String(eventData.initialAmount).trim() === '') {
                                    console.log(`Event missing initialAmount: ${event.name}`);
                                    alert(`Event "${event.name}" requires an Initial Amount.`);
                                    validationPassed = false;
                                    break;
                                }
                        
                                if (!eventData.expectedAnnualChange.returnType) {
                                    console.log(`Event missing expectedAnnualChange returnType: ${event.name}`);
                                    alert(`Event "${event.name}" must have a Return Type for Expected Annual Change.`);
                                    validationPassed = false;
                                    break;
                                }
                        
                                switch (eventData.expectedAnnualChange.returnType) {
                                    case 'fixedValue':
                                        // Allow 0 as a valid value
                                        if (eventData.expectedAnnualChange.fixedValue == null || String(eventData.expectedAnnualChange.fixedValue).trim() === '') {
                                            alert(`Event "${event.name}" requires a Fixed Value for Expected Annual Change.`);
                                            validationPassed = false; break;
                                        }
                                        break;
                                    case 'normalValue':
                                        // Allow 0 for mean/sd
                                        if ((eventData.expectedAnnualChange.normalValue.mean == null || String(eventData.expectedAnnualChange.normalValue.mean).trim() === '') || 
                                            (eventData.expectedAnnualChange.normalValue.sd == null || String(eventData.expectedAnnualChange.normalValue.sd).trim() === '')) {
                                            alert(`Event "${event.name}" requires Mean and Standard Deviation for Normal Value.`);
                                            validationPassed = false; break;
                                        }
                                        break;
                                    case 'uniformValue':
                                        // Allow 0 for bounds
                                        if ((eventData.expectedAnnualChange.uniformValue.lowerBound == null || String(eventData.expectedAnnualChange.uniformValue.lowerBound).trim() === '') || 
                                            (eventData.expectedAnnualChange.uniformValue.upperBound == null || String(eventData.expectedAnnualChange.uniformValue.upperBound).trim() === '')) {
                                            alert(`Event "${event.name}" requires Lower and Upper Bound for Uniform Value.`);
                                            validationPassed = false; break;
                                        }
                                        break;
                                    case 'fixedPercentage':
                                        // Allow 0 as a valid value
                                        if (eventData.expectedAnnualChange.fixedPercentage == null || String(eventData.expectedAnnualChange.fixedPercentage).trim() === '') {
                                            alert(`Event "${event.name}" requires a Fixed Percentage for Expected Annual Change.`);
                                            validationPassed = false; break;
                                        }
                                        break;
                                    case 'normalPercentage':
                                        // Allow 0 for mean/sd
                                        if ((eventData.expectedAnnualChange.normalPercentage.mean == null || String(eventData.expectedAnnualChange.normalPercentage.mean).trim() === '') || 
                                            (eventData.expectedAnnualChange.normalPercentage.sd == null || String(eventData.expectedAnnualChange.normalPercentage.sd).trim() === '')) {
                                            alert(`Event "${event.name}" requires Mean and Standard Deviation for Normal Percentage.`);
                                            validationPassed = false; break;
                                        }
                                        break;
                                    case 'uniformPercentage':
                                        // Allow 0 for bounds
                                        if ((eventData.expectedAnnualChange.uniformPercentage.lowerBound == null || String(eventData.expectedAnnualChange.uniformPercentage.lowerBound).trim() === '') || 
                                            (eventData.expectedAnnualChange.uniformPercentage.upperBound == null || String(eventData.expectedAnnualChange.uniformPercentage.upperBound).trim() === '')) {
                                            alert(`Event "${event.name}" requires Lower and Upper Bound for Uniform Percentage.`);
                                            validationPassed = false; break;
                                        }
                                        break;
                                    default:
                                        break;
                                }
                        
                                if (!validationPassed) break;
                        
                                // Allow 0 for married percentage
                                if (scenarioType === 'married' && (eventData.marriedPercentage == null || String(eventData.marriedPercentage).trim() === '')) {
                                    alert(`Event "${event.name}" requires a Married Percentage because the scenario is Married.`);
                                    validationPassed = false;
                                }
                                break;
                            }
                            case 'invest':
                            case 'rebalance':{
                                const isInvest = event.eventType === 'invest';
                                const eventData = isInvest ? event.invest : event.rebalance;
                                const strategyData = isInvest ? eventData.investmentStrategy : eventData.rebalanceStrategy;
                                
                                if (isInvest) {
                                    // Validate Maximum Cash for invest events
                                    if (eventData.newMaximumCash == null || String(eventData.newMaximumCash).trim() === '') { // Allow 0
                                        console.log(`Invest event missing newMaximumCash: ${event.name}`);
                                        alert(`Event "${event.name}" requires a Maximum Cash value.`);
                                    validationPassed = false;
                                    break;
                                }
                                    if (isNaN(parseInt(eventData.newMaximumCash, 10))) {
                                        console.log(`Maximum cash value must be a number: ${event.name}`);
                                        alert(`Event "${event.name}" Maximum Cash value must be a valid number.`);
                                        validationPassed = false;
                                        break;
                                    }

                                    // Validate allocation modifications for invest events
                                    // Keep the sum validation, but don't need to check the modify flags anymore
                                    const taxStatusSum = Object.values(strategyData?.taxStatusAllocation || {}).reduce((a, b) => a + b, 0);
                                    if (availableTaxStatuses.length > 0 && taxStatusSum !== 100) { // Only validate if section was shown
                                        console.log(`Tax status allocations don't sum to 100%: ${event.name}`);
                                        alert(`Event "${event.name}" tax status allocations must sum to 100%.`);
                                        validationPassed = false;
                                        break;
                                    }
                                    
                                    const afterTaxSum = Object.values(strategyData?.afterTaxAllocation || {}).reduce((a, b) => a + b, 0);
                                    if (afterTaxInvestments.length > 0 && afterTaxSum !== 100) { // Only validate if section was shown
                                        alert(`Event "${event.name}" after-tax allocations must sum to 100%.`);
                                        validationPassed = false; break;
                                    }
                                    
                                    const nonRetirementSum = Object.values(strategyData?.nonRetirementAllocation || {}).reduce((a, b) => a + b, 0);
                                    if (nonRetirementInvestments.length > 0 && nonRetirementSum !== 100) { // Only validate if section was shown
                                        alert(`Event "${event.name}" non-retirement allocations must sum to 100%.`);
                                        validationPassed = false; break;
                                    }
                                    
                                    const taxExemptSum = Object.values(strategyData?.taxExemptAllocation || {}).reduce((a, b) => a + b, 0);
                                    if (taxExemptInvestments.length > 0 && taxExemptSum !== 100) { // Only validate if section was shown
                                        alert(`Event "${event.name}" tax-exempt allocations must sum to 100%.`);
                                        validationPassed = false; break;
                                    }
                                    
                                    // Validate Final Strategy for Glide Path
                                    if (eventData.executionType === 'glidePath') {
                                        const finalStrategyData = eventData.finalInvestmentStrategy;
                                        const finalTaxStatusSum = Object.values(finalStrategyData?.taxStatusAllocation || {}).reduce((a, b) => a + b, 0);
                                        if (availableTaxStatuses.length > 0 && finalTaxStatusSum !== 100) {
                                            alert(`Event "${event.name}" FINAL tax status allocations must sum to 100%.`);
                                            validationPassed = false; break;
                                        }
                                        const finalAfterTaxSum = Object.values(finalStrategyData?.afterTaxAllocation || {}).reduce((a, b) => a + b, 0);
                                        if (afterTaxInvestments.length > 0 && finalAfterTaxSum !== 100) {
                                            alert(`Event "${event.name}" FINAL after-tax allocations must sum to 100%.`);
                                            validationPassed = false; break;
                                        }
                                        const finalNonRetirementSum = Object.values(finalStrategyData?.nonRetirementAllocation || {}).reduce((a, b) => a + b, 0);
                                        if (nonRetirementInvestments.length > 0 && finalNonRetirementSum !== 100) {
                                            alert(`Event "${event.name}" FINAL non-retirement allocations must sum to 100%.`);
                                            validationPassed = false; break;
                                        }
                                        const finalTaxExemptSum = Object.values(finalStrategyData?.taxExemptAllocation || {}).reduce((a, b) => a + b, 0);
                                        if (taxExemptInvestments.length > 0 && finalTaxExemptSum !== 100) {
                                            alert(`Event "${event.name}" FINAL tax-exempt allocations must sum to 100%.`);
                                            validationPassed = false; break;
                                        }
                                    }
                                    
                                } else { // Rebalance
                                    // Validate rebalance event allocation selections
                                    if (eventData.modifyTaxStatusAllocation) {
                                        const sum = Object.values(strategyData?.taxStatusAllocation || {}).reduce((a, b) => a + b, 0);
                                        if (sum !== 100) {
                                            console.log(`Tax status allocations for rebalance don't sum to 100%: ${event.name}`);
                                            alert(`Event "${event.name}" tax status allocations for rebalance must sum to 100%.`);
                                            validationPassed = false;
                                            break;
                                        }
                                    }
                                    
                                    if (eventData.modifyAfterTaxAllocation) {
                                        const sum = Object.values(strategyData?.afterTaxAllocation || {}).reduce((a, b) => a + b, 0);
                                        if (sum !== 100) {
                                            console.log(`After-tax allocations for rebalance don't sum to 100%: ${event.name}`);
                                            alert(`Event "${event.name}" after-tax allocations for rebalance must sum to 100%.`);
                                            validationPassed = false;
                                            break;
                                        }
                                    }
                                    
                                    if (eventData.modifyNonRetirementAllocation) {
                                        const sum = Object.values(strategyData?.nonRetirementAllocation || {}).reduce((a, b) => a + b, 0);
                                        if (sum !== 100) {
                                            console.log(`Non-retirement (taxable) allocations for rebalance don't sum to 100%: ${event.name}`);
                                            alert(`Event "${event.name}" non-retirement (taxable) allocations for rebalance must sum to 100%.`);
                                            validationPassed = false;
                                            break;
                                        }
                                    }
                                    
                                    if (eventData.modifyTaxExemptAllocation) {
                                        const sum = Object.values(strategyData?.taxExemptAllocation || {}).reduce((a, b) => a + b, 0);
                                        if (sum !== 100) {
                                            console.log(`Tax-exempt allocations for rebalance don't sum to 100%: ${event.name}`);
                                            alert(`Event "${event.name}" tax-exempt allocations for rebalance must sum to 100%.`);
                                            validationPassed = false;
                                            break;
                                        }
                                    }
                                    
                                    if (eventData.modifyPreTaxAllocation) {
                                        const sum = Object.values(strategyData?.preTaxAllocation || {}).reduce((a, b) => a + b, 0);
                                        if (sum !== 100) {
                                            console.log(`Pre-tax allocations for rebalance don't sum to 100%: ${event.name}`);
                                            alert(`Event "${event.name}" pre-tax allocations for rebalance must sum to 100%.`);
                                            validationPassed = false;
                                            break;
                                        }
                                    }
                                    
                                    // Check if at least one rebalance domain is selected
                                    if (!eventData.modifyTaxStatusAllocation && 
                                        !eventData.modifyAfterTaxAllocation && 
                                        !eventData.modifyNonRetirementAllocation && 
                                        !eventData.modifyTaxExemptAllocation &&
                                        !eventData.modifyPreTaxAllocation) {
                                        console.log(`No rebalance domain selected: ${event.name}`);
                                        alert(`Event "${event.name}" must have at least one domain selected for rebalancing.`);
                                        validationPassed = false;
                                        break;
                                    }
                                }
                                break;
                            }
                            default:
                                // No action needed for unknown event type
                                break;
                        }
                        
                        if (!validationPassed) break;
                    }

                    // --- NEW: Check for Duplicate Event Names --- 
                    const eventNames = events.map(e => e.name.trim()).filter(name => name); // Get trimmed, non-empty names
                    const uniqueEventNames = new Set(eventNames);
                    if (eventNames.length !== uniqueEventNames.size) {
                        alert("Event names must be unique. Please check for duplicates.");
                        validationPassed = false;
                    }
                    // --- END Duplicate Check --- 

                    if (validationPassed) {
                        console.log('All validations passed, proceeding to next page');
                        
                        // Remove initial event creation logic
                        /*
                        // Save allocation data if validation passes
                        saveAllocationData();
                        
                        // Create the initial investment event
                        const initialInvestEvent = createInitialInvestEvent();
                        
                        // Validate the initial invest event
                        if (!initialInvestEvent.startYear.fixedValue) {
                            console.log('Initial invest event missing start year');
                            alert("Error: Birth year information is missing. Please return to the first page and enter your birth year.");
                            return;
                        }
                        
                        // Add the initial investment event to the events array
                        setEvents(prevEvents => {
                            // Make sure we don't add duplicates
                            const filteredEvents = prevEvents.filter(event => event.name !== 'INITIAL_INVEST_EVENT');
                            // Place initialInvestEvent as the first element in the array
                            const updatedEvents = [initialInvestEvent, ...filteredEvents];
                            
                            // Log the updated events array for debugging
                            console.log("Events array with INITIAL_INVEST_EVENT:", updatedEvents);
                            
                            // Store in localStorage to ensure persistence
                            localStorage.setItem('events', JSON.stringify(updatedEvents));
                            
                            return updatedEvents;
                        });
                        */
                        
                        // Navigate to the next page directly
                        console.log("Navigating to next page...");
                        setPage(5);
                        
                        /* Remove timeout logic
                        setTimeout(() => {
                            console.log("Navigating to next page...");
                            setPage(5);
                        }, 200); // Increased delay to ensure event is added before navigating
                        */
                    } else {
                        console.log('Validation failed, not proceeding to next page');
                    }
                }}>Next</button>
            </div>
        </div>
    );
}

export default EventForm;