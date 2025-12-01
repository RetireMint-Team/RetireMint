/**
 * Runs a single simulation trial.
 * Calculates its own numYears based on life expectancy data.
 * Pre-calculates yearly data arrays (inflation, events, strategies).
 * Calls an external simulateYear function for each year.
 * 
 * @param {Object} modelData - The fetched model data (scenario, tax info, etc.).
 * @param {Number} simulationIndex - The index of this specific simulation run.
 * @returns {Array<Object>} - An array where each element is { netWorth: Number, meetingFinancialGoal: Boolean } for a year.
 */

const { simulateYear } = require('./SimulationEngine/SimulateYear'); // Import the external function
const { sampleNormal, sampleUniform, calculateCurrentBaseAmount, mulberry32 } = require('./SimulationEngine/Utils/CalculationUtils'); // Import sampling utilities and mulberry32

// --- Event Timing Calculation Helper ---
function getOrCalculateEventTiming(eventName, events, currentYear, eventTimingsCache, prng, processing = new Set()) {
    //console.log(`[Timing Calc] Enter: Calculating timing for "${eventName}"...`); // LOG: Function entry

    if (eventTimingsCache.has(eventName)) {
        const cachedTiming = eventTimingsCache.get(eventName);
        //console.log(`[Timing Calc] Cache Hit: Found timing for "${eventName}":`, cachedTiming); // LOG: Cache hit
        return cachedTiming;
    }
    //console.log(`[Timing Calc] Cache Miss: No cached timing for "${eventName}".`); // LOG: Cache miss

    if (processing.has(eventName)) {
        console.error(`[Timing Calc] Error: Circular dependency detected involving event: ${eventName}`); // Use console.error for actual errors
        throw new Error(`Circular dependency detected involving event: ${eventName}`);
    }

    const event = events.find(e => e.name === eventName);
    if (!event) {
        console.error(`[Timing Calc] Error: Referenced event not found: ${eventName}`); // Use console.error
        throw new Error(`Referenced event not found: ${eventName}`);
    }

    //console.log(`[Timing Calc] Processing: Adding "${eventName}" to processing set.`); // LOG: Add to processing
    processing.add(eventName);

    let startYear = currentYear; // Default
    let duration = 1; // Default
    // --- Calculate Start Year --- 
    if (event.startYear && event.startYear.method) { // Check if startYear and method exist
        const method = event.startYear.method;
        //console.log(`[Timing Calc] Start Year Method for "${eventName}": ${method}`); // LOG: Start year method

        switch (method) {
            case 'fixedValue':
                if (event.startYear.fixedValue != null) {
            startYear = event.startYear.fixedValue;
                } else {
                    //console.warn(`[Timing Calc] Warn: Method is fixedValue but fixedValue is null/undefined for "${eventName}". Using default.`);
                }
                break;
            case 'normalValue':
                if (event.startYear.normalValue) {
                    const mean = event.startYear.normalValue.mean ?? currentYear + 1;
                    const sd = event.startYear.normalValue.sd ?? 1;
                    startYear = Math.max(currentYear, Math.round(sampleNormal(mean, sd, prng)));
                } else {
                     //console.warn(`[Timing Calc] Warn: Method is normalValue but normalValue details are missing for "${eventName}". Using default.`);
                }
                break;
            case 'uniformValue':
                 if (event.startYear.uniformValue) {
                    const min = event.startYear.uniformValue.lowerBound ?? currentYear + 1;
                    const max = event.startYear.uniformValue.upperBound ?? currentYear + 5;
                    startYear = Math.max(currentYear, Math.round(sampleUniform(min, max, prng)));
                 } else {
                     //console.warn(`[Timing Calc] Warn: Method is uniformValue but uniformValue details are missing for "${eventName}". Using default.`);
                 }
                break;
            case 'sameYearAsAnotherEvent':
                const refEventNameSame = event.startYear.sameYearAsAnotherEvent;
                if (refEventNameSame) {
                    try {
                        //console.log(`[Timing Calc] Dependency: "${eventName}" start depends on SAME YEAR as "${refEventNameSame}". Making recursive call...`); // LOG: Before recursive call (same year)
                        const refTiming = getOrCalculateEventTiming(refEventNameSame, events, currentYear, eventTimingsCache, prng, processing);
                        //console.log(`[Timing Calc] Dependency Result: Received timing for "${refEventNameSame}":`, refTiming); // LOG: After recursive call (same year)
                startYear = refTiming.startYear;
            } catch (error) {
                        console.error(`[Timing Calc] Error: Failed calculating start for "${eventName}" based on "${refEventNameSame}": ${error.message}`);
                        processing.delete(eventName); // Clean up processing set on error before throwing
                        throw error;
                    }
                } else {
                     //console.warn(`[Timing Calc] Warn: Method is sameYearAsAnotherEvent but reference event name is missing for "${eventName}". Using default.`);
                }
                break;
            case 'yearAfterAnotherEventEnd':
                const refEventNameAfter = event.startYear.yearAfterAnotherEventEnd;
                 if (refEventNameAfter) {
                    try {
                        //console.log(`[Timing Calc] Dependency: "${eventName}" start depends on YEAR AFTER end of "${refEventNameAfter}". Making recursive call...`); // LOG: Before recursive call (year after)
                        const refTiming = getOrCalculateEventTiming(refEventNameAfter, events, currentYear, eventTimingsCache, prng, processing);
                        //console.log(`[Timing Calc] Dependency Result: Received timing for "${refEventNameAfter}":`, refTiming); // LOG: After recursive call (year after)
                startYear = refTiming.startYear + refTiming.duration;
            } catch (error) {
                        console.error(`[Timing Calc] Error: Failed calculating start for "${eventName}" based on end of "${refEventNameAfter}": ${error.message}`);
                        processing.delete(eventName); // Clean up processing set on error before throwing
                        throw error;
                    }
                 } else {
                     //console.warn(`[Timing Calc] Warn: Method is yearAfterAnotherEventEnd but reference event name is missing for "${eventName}". Using default.`);
                 }
                break;
            default:
                 //console.warn(`[Timing Calc] Warn: Unknown startYear method "${method}" for "${eventName}". Using default.`);
        }
    } else {
         //console.log(`[Timing Calc] Start Year Method for "${eventName}": No startYear or method defined, using default ${currentYear}.`); // LOG: No start year/method
    }
    // Ensure startYear is at least the current year
    startYear = Math.max(currentYear, startYear);
    //console.log(`[Timing Calc] Calculated Raw Start Year for "${eventName}": ${startYear} (clamped to >= ${currentYear})`); // LOG: Calculated start year

    // --- Calculate Duration --- (Should be independent of start year calculation)
    if (event.duration && event.duration.method) { // Check if duration and method exist
        const method = event.duration.method;
        //console.log(`[Timing Calc] Duration Method for "${eventName}": ${method}`); // LOG: Duration method
        if (event.duration.fixedValue != null) {
            duration = event.duration.fixedValue;
        } else if (event.duration.normalValue) {
            const mean = event.duration.normalValue.mean ?? 1;
            const sd = event.duration.normalValue.sd ?? 0.5;
            duration = Math.max(1, Math.round(sampleNormal(mean, sd, prng)));
        } else if (event.duration.uniformValue) {
            const min = event.duration.uniformValue.lowerBound ?? 1;
            const max = event.duration.uniformValue.upperBound ?? 5;
            duration = Math.max(1, Math.round(sampleUniform(min, max, prng)));
        } else {
             //console.warn(`[Timing Calc] Warn: Unknown duration method "${method}" or missing details for "${eventName}". Using default.`);
        }
    } else {
        //console.log(`[Timing Calc] Duration Method for "${eventName}": No duration or method defined, using default 1.`); // LOG: No duration/method
    }
    duration = Math.max(1, duration); // Ensure duration is at least 1
    //console.log(`[Timing Calc] Calculated Raw Duration for "${eventName}": ${duration} (clamped to >= 1)`); // LOG: Calculated duration

    const timing = { startYear, duration };
    //console.log(`[Timing Calc] Caching: Storing timing for "${eventName}":`, timing); // LOG: Caching result
    eventTimingsCache.set(eventName, timing);

    //console.log(`[Timing Calc] Processing: Removing "${eventName}" from processing set.`); // LOG: Remove from processing
    processing.delete(eventName); // Remove from processing set after successful calculation

    //console.log(`[Timing Calc] Exit: Returning timing for "${eventName}":`, timing); // LOG: Function exit
    return timing;
}
// --- End Event Timing Helper ---

function runOneSimulation(modelData, simulationIndex) {
    console.log(`---> [Sim #${simulationIndex + 1}] Starting. Initial Cash: ${modelData?.scenario?.initialCash ?? 'N/A'}`); // <-- ADD Log for initialCash
    const currentYear = new Date().getFullYear();
    let numYears = 30; // Default
    let initialMaritalStatus = 'single';
    let userTargetAge = 0; 
    let spouseTargetAge = Infinity; // Default to infinite if single or missing data
    let seededRNG = null; // Initialize seeded RNG to null
    let prng = Math.random; // Initialize prng early with default (before try block)

    let previousYearState = null; 
    const financialEventsLog = []; // <-- Initialize aggregated log array

    try {
        const scenario = modelData.scenario;
        if (!scenario || !scenario.birthYear || !scenario.lifeExpectancy) {
            throw new Error("Scenario, birthYear, or lifeExpectancy missing");
        }
        if (!scenario.simulationSettings || !scenario.simulationSettings.inflationAssumption) {
            throw new Error("inflationAssumption missing");
        }

        // --- Create Seeded RNG if seed exists --- 
        if (scenario.seed !== undefined && scenario.seed !== null && Number.isInteger(scenario.seed)) {
            console.log(`---> [Sim #${simulationIndex + 1}] Using provided seed: ${scenario.seed}`);
            seededRNG = mulberry32(scenario.seed); // Create the RNG function
            prng = seededRNG; // Update prng with seeded version
        }
        // If no seed, prng remains Math.random (already set above)

        // Log if Roth Optimizer is disabled - MOVED TO HERE
        if (!scenario.simulationSettings.rothOptimizerEnable) {
            financialEventsLog.push({
                year: currentYear, // Use the starting year
                type: 'setting', 
                details: 'Roth Optimizer is DISABLED in scenario settings.'
            });
        }

        initialMaritalStatus = scenario.scenarioType === 'married' ? 'married' : 'single';
        const currentUserAge = currentYear - scenario.birthYear;

        // --- Calculate User Target Age ---
        if (scenario.lifeExpectancy.lifeExpectancyMethod === 'fixedValue') {
            userTargetAge = scenario.lifeExpectancy.fixedValue;
        } else if (scenario.lifeExpectancy.lifeExpectancyMethod === 'normalDistribution') {
            const mean = scenario.lifeExpectancy.normalDistribution?.mean;
            const stdDev = scenario.lifeExpectancy.normalDistribution?.standardDeviation;
            if (mean != null && stdDev != null) {
                userTargetAge = Math.round(sampleNormal(mean, stdDev, prng));
            } else {
                console.warn(`Sim ${simulationIndex+1}: Missing mean/stdDev for user LE, using default age.`);
                userTargetAge = currentUserAge + 30; // Fallback
            }
        } else {
             userTargetAge = currentUserAge + 30; // Fallback for unknown method
        }
        userTargetAge = Math.max(currentUserAge + 1, userTargetAge); // Clamp: ensure at least 1 year sim
        numYears = Math.ceil(userTargetAge - currentUserAge); // Calculate simulation years

        // --- Calculate Spouse Target Age (only if married & data exists) ---
        if (initialMaritalStatus === 'married' && scenario.spouseBirthYear && scenario.spouseLifeExpectancy) {
            const currentSpouseAge = currentYear - scenario.spouseBirthYear;
            if (scenario.spouseLifeExpectancy.lifeExpectancyMethod === 'fixedValue') {
                spouseTargetAge = scenario.spouseLifeExpectancy.fixedValue;
            } else if (scenario.spouseLifeExpectancy.lifeExpectancyMethod === 'normalDistribution') {
                 const mean = scenario.spouseLifeExpectancy.normalDistribution?.mean;
                 const stdDev = scenario.spouseLifeExpectancy.normalDistribution?.standardDeviation;
                 if (mean != null && stdDev != null) {
                    spouseTargetAge = Math.round(sampleNormal(mean, stdDev, prng));
                    //console.log(`Simulation ${simulationIndex+1}: Spouse sampled target age: ${spouseTargetAge}`);
                 } else {
                    console.warn(`Sim ${simulationIndex+1}: Missing mean/stdDev for spouse LE, using default age.`);
                    spouseTargetAge = currentSpouseAge + 30; // Fallback
                 }
            } else {
                spouseTargetAge = currentSpouseAge + 30; // Fallback
            }
            spouseTargetAge = Math.max(currentSpouseAge + 1, spouseTargetAge); // Clamp: ensure at least 1 year sim
        } 
        // If single, or married but missing data, spouseTargetAge remains Infinity

    } catch (error) {
        console.error(`Simulation ${simulationIndex+1}: Error calculating ages/numYears:`, error);
        console.warn(`Simulation ${simulationIndex+1}: Defaulting simulation duration to 30 years.`);
        numYears = 30; // Fallback
        initialMaritalStatus = modelData.scenario?.scenarioType === 'married' ? 'married' : 'single';
        // Cannot reliably determine spouse age on error, assume they outlive primary user for this sim
        spouseTargetAge = Infinity; 
    }

    numYears = Math.max(1, numYears); // Final check: ensure at least 1 year

    // --- Determine Marital Status Array --- 
    let maritalStatusArray = Array(numYears).fill(initialMaritalStatus);

    if (initialMaritalStatus === 'married' && spouseTargetAge !== Infinity) {
        const currentSpouseAge = currentYear - modelData.scenario.spouseBirthYear; // Recalculate here safely
        // Index of the last year the spouse is alive in the simulation's timeframe
        const spouseLastYearIndex = Math.ceil(spouseTargetAge - currentSpouseAge) - 1; 
        
        // If spouse dies before the user within the simulation period
        if (spouseLastYearIndex < numYears - 1) { 
            // Start changing status from the year *after* the spouse's last year
            for (let i = spouseLastYearIndex + 1; i < numYears; i++) {
                if (i >= 0) { // Just in case index calculation is negative (shouldn't happen)
                    maritalStatusArray[i] = 'single';
                }
            }
            //console.log(`Sim ${simulationIndex + 1}: Marital status changes to single in year ${currentYear + spouseLastYearIndex + 1} (index ${spouseLastYearIndex + 1}) due to spouse LE.`);
        }
    }

    //console.log(`Simulation ${simulationIndex + 1} - Marital Status Array:`, maritalStatusArray);
    console.log(`Running simulation #${simulationIndex + 1} for calculated ${numYears} years.`);

    //------------------------------------------------------------------------------------------------------
    // --- Calculate Inflation Array ---
    const inflationArray = [];
    const inflationSettings = modelData.scenario.simulationSettings.inflationAssumption;
    try {
        let cumulativeFactor = 1.0; // Track cumulative inflation FACTOR, start at 1

        for (let i = 0; i < numYears; i++) {
            let sampledRate = 0.02; // Default rate if method is unknown or fails
        
        switch (inflationSettings.method) {
            case 'fixedPercentage':
                    sampledRate = (inflationSettings.fixedPercentage ?? 2) / 100;
                break;
            case 'normalPercentage':
                    const mean = (inflationSettings.normalPercentage?.mean ?? 4) / 100;
                    const sd = (inflationSettings.normalPercentage?.sd ?? 3) / 100;
                 if (sd < 0) throw new Error("Standard deviation for normal inflation cannot be negative.");
                    sampledRate = sampleNormal(mean, sd, prng);
                break;
            case 'uniformPercentage':
                    const lower = (inflationSettings.uniformPercentage?.lowerBound ?? 1) / 100;
                    const upper = (inflationSettings.uniformPercentage?.upperBound ?? 5) / 100;
                if (lower > upper) throw new Error("Lower bound for uniform inflation cannot exceed upper bound.");
                    sampledRate = sampleUniform(lower, upper, prng);
                break;
            default:
                    if (i === 0) { // Log warning only once per simulation
                         console.warn(`Sim ${simulationIndex + 1}: Unknown inflation method '${inflationSettings.method}'. Defaulting to 2% fixed for simulation.`);
                    }
                    sampledRate = 0.02;
            }

            // Compound the factor
            cumulativeFactor *= (1 + sampledRate);
            inflationArray.push(cumulativeFactor);
        }
    } catch (error) {
        console.error(`Sim ${simulationIndex + 1}: Error calculating inflation: ${error.message}. Defaulting to 2% fixed compound factor.`);
        const defaultRate = 0.02;
        inflationArray.length = 0; // Clear potentially partial array
        let cumulativeFactor = 1.0; // Reset factor for fallback
         for (let i = 0; i < numYears; i++) {
            cumulativeFactor *= (1 + defaultRate);
            inflationArray.push(cumulativeFactor);
        }
    }
    // --- End Inflation Calculation ---
    //console.log("inflationArray", inflationArray);

    //------------------------------------------------------------------------------------------------------

    // --- Calculate Event Timings ---
    const eventsByYear = Array(numYears).fill().map(() => []);
    const events = modelData.scenario.events;
    const eventTimingsCache = new Map(); // Cache for memoization

    try {
        // Process each event to determine when it occurs using the helper function
        events.forEach(event => {
            const timing = getOrCalculateEventTiming(event.name, events, currentYear, eventTimingsCache, prng);
            
            // --- DEBUG: Log calculated timing for each event ---
            //console.log(`Sim ${simulationIndex + 1} - Event: "${event.name}", Calculated Start: ${timing.startYear}, Calculated Duration: ${timing.duration}`);
            // --- END DEBUG ---
            
            const startYear = timing.startYear;
            const duration = timing.duration;
            
            // Map event to simulation years based on calculated timing
            const startIndex = startYear - currentYear;
            const endIndex = startIndex + duration;
            
            // Add event to eventsByYear for each year it occurs, if within simulation boundaries
            for (let i = startIndex; i < endIndex && i < numYears; i++) {
                if (i >= 0) { // Ensure index is non-negative 
                    eventsByYear[i].push(event.name);
                }
            }
        });
    } catch (error) {
        console.error(`Simulation ${simulationIndex + 1}: Failed to calculate event timings: ${error.message}`);
        // Return early with an error result - cannot proceed without valid event timings
        // This prevents cascading errors from corrupted state
        return {
            yearlyResults: [{ netWorth: 0, meetingFinancialGoal: false }],
            cashArray: [0],
            investmentsValueArray: [{ error: `Event timing calculation failed: ${error.message}` }],
            expensesArray: [{}],
            earlyWithdrawalArray: [0],
            incomeArrays: [{}],
            discretionaryRatioArray: [0],
            financialEventsLog: [{ 
                year: currentYear, 
                type: 'error', 
                details: `Simulation failed: ${error.message}. Check that all referenced events exist.` 
            }]
        };
    }
    
    // Print events by year
    //console.log(`\n--- Simulation ${simulationIndex + 1} - Calculated eventsByYear ---`);
    //eventsByYear.forEach((eventsInYear, index) => {
    //    const year = currentYear + index;
    //    console.log(`Year ${year} (Index ${index}): ${eventsInYear.length > 0 ? eventsInYear.join(', ') : 'No Events'}`);
    //});
    //console.log(`--- End eventsByYear ---\n`);

    //------------------------------------------------------------------------------------------------------
    // --- Helper Function for Glide Path Interpolation (Nested Strategy Objects - For Invest Array) ---
    function interpolateNestedStrategy(initialStrategyObj, finalStrategyObj, fraction) {
        const interpolated = {};
        const initial = initialStrategyObj || {}; // Default to empty object if null/undefined
        const final = finalStrategyObj || {};   // Default to empty object if null/undefined

        // Get all top-level keys (taxStatusAllocation, preTaxAllocation, etc.)
        const allTopLevelKeys = new Set([...Object.keys(initial), ...Object.keys(final)]);

        allTopLevelKeys.forEach(key => {
            // Ensure the values being interpolated are objects themselves (like taxStatusAllocation)
             const initialSubObj = initial[key] || {};
             const finalSubObj = final[key] || {};
             const interpolatedSubObj = {};

             // Get all keys within the sub-object (e.g., non-retirement, pre-tax for taxStatusAllocation)
             const subKeys = new Set([...Object.keys(initialSubObj), ...Object.keys(finalSubObj)]);
             subKeys.forEach(subKey => {
                 const initialValue = Number(initialSubObj[subKey]) || 0; // Default to 0
                 const finalValue = Number(finalSubObj[subKey]) || 0;     // Default to 0
                 interpolatedSubObj[subKey] = initialValue + (finalValue - initialValue) * fraction;
             });
             // Only add the sub-object if it contains keys
             if (Object.keys(interpolatedSubObj).length > 0) {
                interpolated[key] = interpolatedSubObj; // Store the interpolated sub-object
             }
        });
        return interpolated;
    }
    
    // --- Helper Function for Glide Path Interpolation (Simple Allocation Objects - For Rebalance Array) ---
    function interpolateSimpleAllocation(initialAllocObj, finalAllocObj, fraction) {
        const interpolated = {};
        const initial = initialAllocObj || {}; // Default to empty object
        const final = finalAllocObj || {};   // Default to empty object
        
        // Get all unique keys from both simple allocation objects
        const allKeys = new Set([...Object.keys(initial), ...Object.keys(final)]);

        allKeys.forEach(key => {
            const initialValue = Number(initial[key]) || 0; // Default to 0 if missing or not a number
            const finalValue = Number(final[key]) || 0;     // Default to 0 if missing or not a number
            
            // Linear interpolation for direct key-value pairs
            interpolated[key] = initialValue + (finalValue - initialValue) * fraction;
        });
        return interpolated;
    }
    // --- End Helper Functions ---

    //------------------------------------------------------------------------------------------------------
    // --- Create Rebalance Array ---
    const rebalanceArray = Array(numYears).fill(null); // Initialize with nulls

    try {
        for (let yearIndex = 0; yearIndex < numYears; yearIndex++) {
            const eventsInYear = eventsByYear[yearIndex];
            let applicableRebalance = null;

            // Find the last rebalance event specified for this year
            for (let i = eventsInYear.length - 1; i >= 0; i--) {
                const eventName = eventsInYear[i];
                const eventObject = events.find(e => e.name === eventName);

                if (eventObject && eventObject.type === 'rebalance' && eventObject.rebalance && eventObject.rebalance.allocations) {
                     const rebalanceData = eventObject.rebalance;
                     const allocationMethod = rebalanceData.allocations.method;
                     const initialStrategy = rebalanceData.rebalanceStrategy;
                     const finalStrategy = rebalanceData.finalRebalanceStrategy;

                    if (allocationMethod === 'glidePath') {
                        const timing = eventTimingsCache.get(eventName); // Assumes timing is cached
                        if (!timing) {
                             console.error(`Sim ${simulationIndex + 1}: Error - Timing info missing for glide path rebalance event "${eventName}". Skipping rebalance calculation for year ${currentYear + yearIndex}.`);
                             applicableRebalance = null; // Cannot calculate
                             break; // Move to next logic block
                        }

                        if (!initialStrategy || !finalStrategy) {
                            console.warn(`Sim ${simulationIndex + 1}: Warn - Glide path rebalance for "${eventName}" missing initial or final strategy. Using initial strategy only for year ${currentYear + yearIndex}.`);
                            // Fallback to using only the initial strategy (treat as fixed)
                             applicableRebalance = {
                                method: 'fixedAllocation', // Fallback method
                                strategy: cleanStrategyObject(initialStrategy)
                             };
                             break;
                        }

                        const eventStartIndex = timing.startYear - currentYear;
                        const totalDuration = timing.duration;
                        const yearsElapsed = yearIndex - eventStartIndex; // How many full years into the event are we?

                         // Calculate glide fraction (0 for first year, 1 for last year)
                         const glideSpan = totalDuration - 1;
                         let glideFraction = 0;
                         if (glideSpan > 0) {
                              glideFraction = Math.max(0, Math.min(1, yearsElapsed / glideSpan));
                         } // If glideSpan is 0 (duration 1), fraction remains 0

                        // Interpolate each part of the strategy using the SIMPLE helper
                        const interpolatedStrategy = {
                             taxStatusAllocation: interpolateSimpleAllocation(initialStrategy.taxStatusAllocation, finalStrategy.taxStatusAllocation, glideFraction),
                             preTaxAllocation: interpolateSimpleAllocation(initialStrategy.preTaxAllocation, finalStrategy.preTaxAllocation, glideFraction),
                             afterTaxAllocation: interpolateSimpleAllocation(initialStrategy.afterTaxAllocation, finalStrategy.afterTaxAllocation, glideFraction),
                             nonRetirementAllocation: interpolateSimpleAllocation(initialStrategy.nonRetirementAllocation, finalStrategy.nonRetirementAllocation, glideFraction),
                             taxExemptAllocation: interpolateSimpleAllocation(initialStrategy.taxExemptAllocation, finalStrategy.taxExemptAllocation, glideFraction),
                         };

                         applicableRebalance = {
                            method: 'glidePath', // Keep original method type
                            strategy: interpolatedStrategy
                         };

                    } else { // Fixed allocation or other methods handled similarly
                         applicableRebalance = {
                            method: allocationMethod, // e.g., 'fixedAllocation'
                            strategy: cleanStrategyObject(initialStrategy)
                         };
                    }
                    break; // Use the last rebalance event found for the year
                }
            }
            rebalanceArray[yearIndex] = applicableRebalance; // Store the found strategy (or null)
        }
    } catch (error) {
         console.error(`Simulation ${simulationIndex + 1}: Error creating rebalanceArray: ${error.message}`);
         rebalanceArray.fill(null); // Clear potentially partial array on error
    }

    // Print the rebalance array for verification
    /*
    console.log(`\n--- Simulation ${simulationIndex + 1} - Calculated rebalanceArray ---`);
    rebalanceArray.forEach((rebalanceInfo, index) => {
         const year = currentYear + index;
         if (rebalanceInfo) {
             console.log(`Year ${year} (Index ${index}): Method=${rebalanceInfo.method}, Strategy=`, rebalanceInfo.strategy);
         } else {
             console.log(`Year ${year} (Index ${index}): No Rebalance`);
         }
    });
    console.log(`--- End rebalanceArray ---\n`);
    */
    // --- End Rebalance Array Creation ---

    //------------------------------------------------------------------------------------------------------
    // --- Calculate Investment Strategies Array ---
    const investArray = Array(numYears).fill(null); // Initialize with nulls
    const allEventObjects = modelData.scenario.events; // Keep a reference to full event objects

    // Helper function to create a clean, plain JS object copy of a strategy
    function cleanStrategyObject(strategy) {
      if (!strategy) return null;
      try {
          // Deep clone assuming strategy and its nested properties are simple objects/values
          return JSON.parse(JSON.stringify({
              taxStatusAllocation: strategy.taxStatusAllocation,
              preTaxAllocation: strategy.preTaxAllocation,
              afterTaxAllocation: strategy.afterTaxAllocation,
              nonRetirementAllocation: strategy.nonRetirementAllocation,
              taxExemptAllocation: strategy.taxExemptAllocation,
          }));
      } catch (e) {
          console.error("Error cloning strategy object:", e, strategy);
          return null; // Return null if cloning fails
      }
    }

    try {
        for (let yearIndex = 0; yearIndex < numYears; yearIndex++) {
            const eventsThisYear = eventsByYear[yearIndex];
            let investEventName = null;
            let investEventObject = null;
            let isActiveInvestEventFound = false;

            // Find the last active invest event for this specific year
            for (let j = eventsThisYear.length - 1; j >= 0; j--) {
                const eventName = eventsThisYear[j];
                const eventData = allEventObjects.find(e => e.name === eventName);

                if (eventData && eventData.type === 'invest') {
                    const timing = eventTimingsCache.get(eventName);
                    if (timing) {
                         const eventStartIndex = timing.startYear - currentYear;
                         const eventEndIndex = eventStartIndex + timing.duration;
                         // Check if the CURRENT yearIndex falls within the event's duration
                         if (yearIndex >= eventStartIndex && yearIndex < eventEndIndex) {
                             investEventName = eventName;
                             investEventObject = eventData;
                             isActiveInvestEventFound = true;
                             break; // Found the relevant active invest event for this year
                         }
                    }
                }
            }

            if (isActiveInvestEventFound && investEventObject) {
                // --- Found an active invest event for this year ---
                if (!investEventObject.invest || !investEventObject.invest.allocations) {
                     console.error(`Simulation ${simulationIndex + 1}: Invest event '${investEventName}' data is incomplete (missing invest or allocations). Carrying forward previous state for year ${currentYear + yearIndex}.`);
                     investArray[yearIndex] = (yearIndex > 0) ? investArray[yearIndex - 1] : null; // Carry forward previous or null
                     continue;
                }

                const investData = investEventObject.invest; // Easier access
                const allocationMethod = investData.allocations.method;
                const targetStrategy = investData.investmentStrategy; 
                const finalGlideTarget = investData.finalInvestmentStrategy; 
                const shouldModifyCash = investData.modifyMaximumCash;
                const newCashAmount = investData.newMaximumCash;

                const timing = eventTimingsCache.get(investEventName); // Get timing again (safe)
                 if (!timing) { 
                     console.error(`Sim ${simulationIndex + 1}: Error - Timing info missing for invest event "${investEventName}". Carrying forward previous state for year ${currentYear + yearIndex}.`);
                     investArray[yearIndex] = (yearIndex > 0) ? investArray[yearIndex - 1] : null;
                     continue;
                 }
                 const eventStartIndex = timing.startYear - currentYear;
                 const totalDuration = timing.duration;
                 const yearsElapsed = yearIndex - eventStartIndex; // 0 for the first year of the event

                let strategyForYear = null;

                if (allocationMethod === 'fixedAllocation') {
                     if (!targetStrategy) {
                         console.error(`Sim ${simulationIndex + 1}: Fixed invest event '${investEventName}' missing investmentStrategy. Carrying forward previous state for year ${currentYear + yearIndex}.`);
                         investArray[yearIndex] = (yearIndex > 0) ? investArray[yearIndex - 1] : null;
                         continue;
                     }
                     strategyForYear = cleanStrategyObject(targetStrategy);

                } else if (allocationMethod === 'glidePath') {
                     if (!targetStrategy || !finalGlideTarget) {
                         console.warn(`Sim ${simulationIndex + 1}: Warn - Glide path invest event "${investEventName}" missing initial (investmentStrategy) or final (finalInvestmentStrategy). Treating as fixed allocation with initial strategy for year ${currentYear + yearIndex}.`);
                         strategyForYear = cleanStrategyObject(targetStrategy);
                     } else {
                         // Define the fixed start and end points for interpolation
                         const fixedStartStrategy = cleanStrategyObject(targetStrategy);
                         const fixedEndStrategy = cleanStrategyObject(finalGlideTarget);
                         
                         if (!fixedStartStrategy || !fixedEndStrategy) { // Check if cleaning/cloning failed
                             console.error(`Sim ${simulationIndex + 1}: Error cleaning start or end strategy for glide path '${investEventName}'. Skipping year ${currentYear + yearIndex}.`);
                             investArray[yearIndex] = (yearIndex > 0) ? investArray[yearIndex - 1] : null;
                             continue;
                         }
                         
                         const eventStartIndex = timing.startYear - currentYear;
                         const yearsElapsed = yearIndex - eventStartIndex; // 0 for the first year, 1 for second, etc.
                         const totalDuration = timing.duration;
                         
                         // Calculate glide fraction (progress from start (0) to end (1))
                         const glideSpan = totalDuration - 1; // Number of steps (e.g., 3yr duration -> 2 steps)
                         let glideFraction = 0;
                         if (glideSpan > 0) {
                             glideFraction = Math.min(1, yearsElapsed / glideSpan); // Ensure fraction doesn't exceed 1
                         } else { // Handle duration of 1 year
                             glideFraction = 0; // Or 1? If duration is 1, use the start strategy.
                         }

                         // Interpolate between the FIXED start and FIXED end strategies
                         const currentStrategy = interpolateNestedStrategy(fixedStartStrategy, fixedEndStrategy, glideFraction);

                         strategyForYear = currentStrategy; 
                     }
                }
                // Add handling for other potential methods if necessary

                // --- Construct the object for investArray --- 
                if (strategyForYear) {
                    const infoForArray = {
                        method: allocationMethod,
                        strategy: strategyForYear
                    };
                    // Add cash override if specified in the event
                    if (shouldModifyCash && newCashAmount !== undefined && newCashAmount !== null) {
                        infoForArray.newMaximumCash = newCashAmount;
                    }
                    investArray[yearIndex] = infoForArray;
                } else {
                    // If strategy calculation failed, store null
                    investArray[yearIndex] = (yearIndex > 0) ? investArray[yearIndex - 1] : null;
                }

            } else {
                 // No *active* invest event this year. Set to null.
                 investArray[yearIndex] = null;
            }
        }
    } catch (error) {
        console.error(`Simulation ${simulationIndex + 1}: Error creating investArray: ${error.message}`);
        investArray.fill(null); // Clear potentially partial array on error
    }

    // Print the invest array for verification
    /*
    console.log(`\n--- Simulation ${simulationIndex + 1} - Calculated investArray ---`);
    investArray.forEach((investInfo, index) => {
        const year = currentYear + index;
        if (investInfo && investInfo.strategy) {
            // Now logging the strategy object directly
            console.log(`Year ${year} (Index ${index}): Method=${investInfo.method}, Strategy=`, investInfo.strategy); 
        } else {
            console.log(`Year ${year} (Index ${index}): No Invest Strategy`);
        }
    });
    console.log(`--- End investArray ---\n`);
    */
    // --- End Investment Strategies Array Creation ---

    //------------------------------------------------------------------------------------------------------
    
    // --- Yearly Simulation Loop --- 
    const yearlyResults = []; 
    const cashArray = Array(numYears).fill(0); 
    const investmentsValueArray = Array(numYears).fill({}); // Initialize with empty objects
    const expensesArray = Array(numYears).fill({}); 
    const earlyWithdrawalArray = Array(numYears).fill(0); 
    const incomeArrays = Array(numYears).fill({}); // NEW: Initialize array for income breakdowns
    const discretionaryRatioArray = Array(numYears).fill(0); // NEW: Initialize array for ratios
    
    let lastYearIndex = 0; // Track the last year index for error handling
    try {
        for (let i = 0; i < numYears; i++) {
            lastYearIndex = i; // Update before each iteration
            const currentState = simulateYear( 
                modelData,          // Pass the full model data
                investArray,        // Pass the pre-calculated array
                eventsByYear,       // Pass the pre-calculated array
                rebalanceArray,     // Pass the pre-calculated array
                inflationArray,     // Pass the pre-calculated array
                maritalStatusArray, // Pass the pre-calculated array
                i,                  // Pass the current year index
                previousYearState,  // Pass the state from the previous year
                prng                // <-- Pass the prng function
            );
            
            // Store results needed for the final output/analysis
            yearlyResults.push({ 
                netWorth: currentState.totalAssets, // Assuming totalAssets is calculated
                meetingFinancialGoal: currentState.financialGoalMet
            }); 
            
            // Store the detailed results in their respective arrays
            cashArray[i] = currentState.cash ?? 0;
            
            // Create and store the investment value breakdown for the year
            const investmentValuesForYear = {};
            (currentState.investments || []).forEach(inv => {
                investmentValuesForYear[inv.name] = inv.value || 0;
            });
            investmentValuesForYear['Cash'] = currentState.cash ?? 0; // Add Cash entry
            investmentsValueArray[i] = investmentValuesForYear; 
            
            expensesArray[i] = currentState.expenseBreakdown ?? {}; 
            earlyWithdrawalArray[i] = currentState.curYearEarlyWithdrawals ?? 0;
            incomeArrays[i] = currentState.incomeBreakdown ?? {}; // NEW: Store income breakdown

            previousYearState = currentState;

            // Append the year's events to the main log
            if (currentState.currentYearEventsLog && currentState.currentYearEventsLog.length > 0) {
                financialEventsLog.push(...currentState.currentYearEventsLog);
                // REMOVED: console.log(`[RunOneSim Log] Year ${currentState.year}: Added ${currentState.currentYearEventsLog.length} events. Total Log Length: ${financialEventsLog.length}`); // Log aggregation
            }

            // --- Check if financial goal was met. If not, stop this simulation run --- 
            if (!currentState.financialGoalMet) {
                console.log(`Simulation ${simulationIndex + 1}: Financial goal not met in year ${currentState.year} (Index ${i}). Stopping simulation.`);
                break; // Exit the loop for this simulation
            }

        }
    } catch (yearError) {
        console.error(`Simulation ${simulationIndex + 1}: Error calling simulateYear for year index ${lastYearIndex} (${currentYear + lastYearIndex}):`, yearError);
        yearlyResults.push({ 
             netWorth: previousYearState?.totalAssets ?? 0, 
             meetingFinancialGoal: false 
         });
         
         cashArray[lastYearIndex] = previousYearState?.cash ?? 0; 
         // Store error indication or empty object for investment values
         investmentsValueArray[lastYearIndex] = { error: `Simulation failed in year ${currentYear + lastYearIndex}` }; 
         expensesArray[lastYearIndex] = { error: `Simulation failed in year ${currentYear + lastYearIndex}` }; 
         earlyWithdrawalArray[lastYearIndex] = previousYearState?.curYearEarlyWithdrawals ?? 0; 
    }
    // --- End Yearly Simulation Loop ---
    
    // --- Calculate Discretionary Ratio Array Post-Simulation --- 
    const allScenarioEvents = modelData.scenario.events; // Cache for efficiency
    // Iterate only up to the number of years actually simulated
    const actualYearsSimulated = yearlyResults.length; 
    for (let i = 0; i < actualYearsSimulated; i++) { 
        const expenseBreakdownForYear = expensesArray[i];
        if (!expenseBreakdownForYear || typeof expenseBreakdownForYear !== 'object') {
            discretionaryRatioArray[i] = 0; // No expenses this year
            continue;
        }
        
        let totalActualDiscretionary = 0;
        let totalActualNonDiscretionary = 0;
        
        for (const expenseName in expenseBreakdownForYear) {
            const expenseValue = expenseBreakdownForYear[expenseName] || 0;
            
            // Find the corresponding event details in the main scenario data
            const eventDetails = allScenarioEvents.find(event => event.name === expenseName);
            
            if (eventDetails && eventDetails.type === 'expense' && eventDetails.expense) {
                if (eventDetails.expense.isDiscretionary) {
                    totalActualDiscretionary += expenseValue;
                } else {
                    totalActualNonDiscretionary += expenseValue;
                }
            } else {
                // Assumption: If not found or not an expense event, treat as non-discretionary?
                // Or log a warning? Let's assume non-discretionary for now (e.g., taxes).
                totalActualNonDiscretionary += expenseValue;
                // If taxes/penalties are in breakdown, they won't be found in events
                // console.warn(`Could not find event details for expense '${expenseName}' in year index ${i}. Treating as non-discretionary.`);
            }
        }
        
        const totalExpenses = totalActualDiscretionary + totalActualNonDiscretionary;
        if (totalExpenses > 0) {
            discretionaryRatioArray[i] = totalActualDiscretionary / totalExpenses;
        } else {
            discretionaryRatioArray[i] = 0; // No expenses, ratio is 0
        }
    }
    // --- End Discretionary Ratio Calculation ---
    
    // Return an object containing all the calculated arrays for this simulation run
    return {
        yearlyResults, // Array of { netWorth, meetingFinancialGoal }
        cashArray,
        investmentsValueArray,
        expensesArray,
        earlyWithdrawalArray,
        incomeArrays, // NEW: Return the collected income breakdowns
        discretionaryRatioArray, // NEW: Return the ratio array
        financialEventsLog // <-- Return the aggregated financial log
    };
}

module.exports = {
    runOneSimulation
};
