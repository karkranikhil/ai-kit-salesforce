# /write-tests

Create or update Apex tests and LWC tests for the specified code.

## For Apex tests

1. Read the existing class or trigger being tested.
2. Identify the main scenarios: positive, negative, bulk (200+ records), security.
3. Create or update the test class using this structure:
   - `@TestSetup` for shared test data
   - Individual test methods for each scenario
   - `Test.startTest()` / `Test.stopTest()` around DML
4. Do not use `SeeAllData=true`.
5. Cover at least: positive case, null/empty inputs, bulk (200 records), with/without sharing.

## For LWC Jest tests

1. Read the component JS file.
2. Create a Jest test file that:
   - Tests initial render
   - Tests user interactions
   - Mocks wire adapters and Apex calls
   - Tests error states
3. Follow the patterns in the existing `__tests__` folders.

## Output

Provide the complete test file(s). State the expected coverage improvement.
