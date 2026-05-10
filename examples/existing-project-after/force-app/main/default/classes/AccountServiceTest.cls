@IsTest
public class AccountServiceTest {

    // Anti-pattern: multiple test methods, no @TestSetup

    @IsTest
    static void testGetAccountsByIds() {
        Account a = new Account(Name = 'Test Account');
        insert a;
        List<Account> results = AccountService.getAccountsByIds(new List<Id>{ a.Id });
        System.assertEquals(1, results.size());
    }

    @IsTest
    static void testUpdateAccounts() {
        Account a = new Account(Name = 'Another Account');
        insert a;
        AccountService.updateAccounts(new List<Account>{ a });
        Account updated = [SELECT Description FROM Account WHERE Id = :a.Id];
        System.assertEquals('Updated', updated.Description);
    }

    // Anti-pattern: SeeAllData
    @IsTest(SeeAllData=true)
    static void testGetHardcoded() {
        Account result = AccountService.getHardcoded();
        System.assertNotEquals(null, result);
    }
}
