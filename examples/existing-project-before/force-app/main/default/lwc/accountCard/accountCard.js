import { LightningElement, api, wire } from 'lwc';
import getAccountDetails from '@salesforce/apex/AccountService.getAccountDetails';

export default class AccountCard extends LightningElement {
    @api recordId;

    // Anti-pattern 1: @wire without error handling
    @wire(getAccountDetails, { accountId: '$recordId' })
    account;

    connectedCallback() {
        // Anti-pattern 2: console.log in production code
        console.log('AccountCard connected, recordId:', this.recordId);
    }

    handleEdit() {
        // Anti-pattern 3: hardcoded Salesforce URL
        window.location.href = '/lightning/r/Account/' + this.recordId + '/edit';
    }

    handleUnsafeRender(userInput) {
        // Anti-pattern 4: innerHTML
        this.template.querySelector('.content').innerHTML = userInput;
    }
}
