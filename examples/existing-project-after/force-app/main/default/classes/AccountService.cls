/**
 * Example Apex class with several deliberate anti-patterns for smoke-testing
 * AI-Kit inline diagnostics.
 */
public class AccountService {

    // Anti-pattern 1: missing 'with sharing' declaration

    public static List<Account> getAccountsByIds(List<Id> ids) {
        List<Account> results = new List<Account>();

        // Anti-pattern 2: SOQL inside a loop
        for (Id id : ids) {
            List<Account> accs = [SELECT Id, Name, Phone FROM Account WHERE Id = :id];
            results.addAll(accs);
        }

        return results;
    }

    public static void updateAccounts(List<Account> accounts) {
        // Anti-pattern 3: DML inside a loop
        for (Account a : accounts) {
            a.Description = 'Updated';
            update a;
        }
    }

    public static Account getHardcoded() {
        // Anti-pattern 4: hardcoded Salesforce ID
        return [SELECT Id, Name FROM Account WHERE Id = '001000000000001AAA' LIMIT 1];
    }

    public static void riskyOperation() {
        try {
            insert new Account(Name = 'Test');
        } catch (Exception e) { }
    }
}
