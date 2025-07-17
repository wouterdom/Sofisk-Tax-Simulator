// Utility functions for tax calculation, extrapolation, and prepayment optimization

export interface Prepayments {
  va1: number
  va2: number
  va3: number
  va4: number
}

export interface SimulationData {
  totalEstimatedTax: number
  prepayments: Prepayments
  // Add other fields as needed
}

export function calculateOptimalPrepayments(simulationData: SimulationData, optimizationGoal: 'spread' | 'q3' | 'q4') {
  const { totalEstimatedTax, prepayments } = simulationData
  const totalMade = prepayments.va1 + prepayments.va2 + prepayments.va3 + prepayments.va4
  const remaining = Math.max(0, totalEstimatedTax - totalMade)
  let optimized = { ...prepayments }
  if (optimizationGoal === 'spread') {
    const emptyQuarters = ['va3', 'va4'].filter(q => prepayments[q as keyof Prepayments] === 0)
    if (emptyQuarters.length > 0) {
      const perQuarter = remaining / emptyQuarters.length
      emptyQuarters.forEach(q => {
        optimized[q as keyof Prepayments] = perQuarter
      })
    }
  } else if (optimizationGoal === 'q3') {
    optimized.va3 = remaining
  } else if (optimizationGoal === 'q4') {
    optimized.va4 = remaining
  }
  return optimized
}

// Add more calculation functions as needed (e.g., tax calculation, extrapolation) 