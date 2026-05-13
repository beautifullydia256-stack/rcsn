/**
 * fast-check configuration for property-based testing
 * 
 * This configuration ensures all property tests run with a minimum of 100 iterations
 * to provide comprehensive input coverage as specified in the design document.
 */

export const PROPERTY_TEST_CONFIG = {
  /**
   * Number of test iterations for property-based tests
   * Minimum: 100 (as per design document requirement)
   */
  numRuns: 100,
  
  /**
   * Seed for reproducible test runs
   * Set this to a specific value to reproduce a failing test
   */
  seed: undefined as number | undefined,
  
  /**
   * Path for shrinking (finding minimal failing case)
   */
  path: undefined as string | undefined,
  
  /**
   * Enable verbose mode for debugging
   */
  verbose: false,
  
  /**
   * Maximum number of shrink iterations
   */
  maxSkipsPerRun: 100,
} as const;

/**
 * Helper function to create property test parameters with default config
 */
export function propertyTestParams(overrides?: Partial<typeof PROPERTY_TEST_CONFIG>) {
  return {
    ...PROPERTY_TEST_CONFIG,
    ...overrides,
  };
}
