import { LightningElement, wire, track, api } from "lwc";
import contactRecordsAssociatedWithAccount from "@salesforce/apex/CreateInvoiceController.contactRecordsAssociatedWithAccount";
import getAccountRelatedToOpportunity from "@salesforce/apex/CreateInvoiceController.getAccountRelatedToOpportunity";

export default class XeroContactCreationComponent extends LightningElement {
  @api accountdata;
  @track contactFirstName = "";
  @track contactLastName = "";
  @track contactEmail = "";
  @track xeroContactDetailsValue = false;
  @track contactPersons = [];
  salesforceContactOptions = [];
  FirstName;
  LastName;
  EmailAddress;
  IncludeInEmails;
  xeroAccountNumber;
  xeroAccountName;
  xeroAccountAddressState;
  xeroAccountAddressPostalCode;
  xeroAccountAddressCountry;
  xeroAccountAddressCity;
  xeroAccountPhone;
  accountNumber;
  accountName;
  accountAddressCity;
  accountAddressCountry;
  accountAddressPostalCode;
  accountAddressState;
  accountPhone;
  addMoreContactPersonsButton = false;
  maxContactPersons = 5;
  salesforceContactInsertionValue = "";
  salesforceContactPersonOptions = [];
  contactPersonsList = [];
  addMoreContactPersonButtonDisabled = false;
  relatedContacts = new Map();

  // Fetch contacts when component is initialized
  connectedCallback() {
    this.fetchContacts();
  }

  // Fetch contacts from Apex method
  fetchContacts() {
    contactRecordsAssociatedWithAccount({ accountId: this.accountdata })
      .then((result) => {
        console.log("accountId===:::: ", this.accountId);
        try {
          result.forEach((element) => {
            let currentContact = {};
            currentContact.Name = element.Name;
            currentContact.Id = element.Id;
            currentContact.FirstName = element.FirstName;
            currentContact.LastName = element.LastName;
            currentContact.Email = element.Email;
            this.relatedContacts.set(element.Id, currentContact);
          });
          console.log("This.relatedContacts :::: ", this.relatedContacts);
          console.log("Contacts:::::: " + JSON.stringify(this.relatedContacts));
        } catch (error) {
          console.log("Error", error);
        }

        // If no contacts are fetched, show only the "Enter Details Manually" option
        if (result.length === 0) {
          this.salesforceContactOptions = [
            { label: "Enter Details Manually", value: "Enter Details Manually" }
          ];
        } else {
          // Otherwise, map contacts to combobox options and add "Enter Details Manually"
          this.salesforceContactOptions = [
            {
              label: "Enter Details Manually",
              value: "Enter Details Manually"
            },

            ...result.map((contact) => {
              return { label: contact.Name, value: contact.Id };
            })
          ];
        }
      })
      .catch((error) => {
        this.error = error;
        this.salesforceContactOptions = [
          { label: "Enter Details Manually", value: "Enter Details Manually" }
        ];
        console.error("Error fetching contacts:", error);
      });
  }
  handleContactPersonDeatils(event) {
    console.log("Name", event.target.name);
    console.log("dataId", event.target.dataset.id);

    if (event.target.name == "contactPersonFirstName") {
      this.FirstName = event.target.value;
      this.contactPersonsList[event.target.dataset.id - 1].FirstName =
        event.target.value;
    } else if (event.target.name == "contactPersonLastName") {
      this.LastName = event.target.value;
      this.contactPersonsList[event.target.dataset.id - 1].LastName =
        event.target.value;
    } else if (event.target.name == "contactPersonEmailAddress") {
      this.EmailAddress = event.target.value;
      this.contactPersonsList[event.target.dataset.id - 1].EmailAddress =
        event.target.value;
    } else if (event.target.name == "contactPersonIncludeInEmails") {
      console.log("Inside Email Check==");
      this.IncludeInEmails = event.target.value;
      console.log(
        "this.ContactPersonIncludeInEmail::: " + event.target.checked
      );
      this.contactPersonsList[event.target.dataset.id - 1].IncludeInEmails =
        event.target.checked;
    }

    console.log("this.contactPersonsList::: ", this.contactPersonsList);
  }

  handleXeroAccountDetails(event) {
    console.log(
      "this.contactPersonsList::: ",
      JSON.stringify(this.contactPersonsList)
    );
    if (event.target.name == "xeroAccountNumber") {
      this.xeroAccountNumber = event.target.value;
    } else if (event.target.name == "xeroAccountName") {
      this.xeroAccountName = event.target.value;
    } else if (event.target.name == "xeroAccountStreetAddress") {
      this.xeroAccountStreetAddress = event.target.value;
    } else if (event.target.name == "xeroAccountAddressCity") {
      this.xeroAccountAddressCity = event.target.value;
    } else if (event.target.name == "xeroAccountAddressState") {
      this.xeroAccountAddressState = event.target.value;
    } else if (event.target.name == "xeroAccountAddressPostalCode") {
      this.xeroAccountAddressPostalCode = event.target.value;
    } else if (event.target.name == "xeroAccountAddressCountry") {
      this.xeroAccountAddressCountry = event.target.value;
    } else if (event.target.name == "xeroAccountPhone") {
      this.xeroAccountPhone = event.target.value;
    }
  }

  @wire(getAccountRelatedToOpportunity, { accountId: "$accountdata" })
  wiredContacts({ error, data }) {
    console.log("accounts===== " + data);
    console.log("accountId---- " + this.accountdata);
    if (data) {
      console.log("accountData====  " + JSON.stringify(data));
      console.log("account ::: " + data[0].Name);
      // Xero Account Details
      this.xeroAccountNumber = data[0].AccountNumber;
      this.xeroAccountName = data[0].Name;
      this.xeroAccountStreetAddress = data[0].BillingStreet;
      this.xeroAccountAddressCity = data[0].BillingCity;
      this.xeroAccountAddressState = data[0].BillingState;
      this.xeroAccountAddressCountry = data[0].BillingCountry;
      this.xeroAccountAddressPostalCode = data[0].BillingPostalCode;
      this.xeroAccountPhone = data[0].Phone;

      // Salesforce Account Details
      this.accountNumber = data[0].AccountNumber;
      this.accountName = data[0].Name;
      this.accountStreetAddress = data[0].BillingStreet;
      this.accountAddressCity = data[0].BillingCity;
      this.accountAddressState = data[0].BillingState;
      this.accountAddressCountry = data[0].BillingCountry;
      this.accountAddressPostalCode = data[0].BillingPostalCode;
      this.accountPhone = data[0].Phone;
    } else if (error) {
      this.error = error;
    }
  }

  handleContactDetailValues(event) {
    if (event.target.name == "contactFirstName") {
      this.contactFirstName = event.target.value;
    } else if (event.target.name == "contactLastName") {
      this.contactLastName = event.target.value;
    } else if (event.target.name == "contactEmail") {
      this.contactEmail = event.target.value;
    }
  }

  handleChangeSalesforceContact(event) {
    this.salesforceContactInsertionValue = event.detail.value;
    console.log(
      "this.salesforceContactInsertionValue ::" +
        this.salesforceContactInsertionValue
    );
    if (this.salesforceContactInsertionValue === "Enter Details Manually") {
      this.xeroContactDetailsValue = true;
      this.xeroContactFirstName = "";
      this.xeroContactLastName = "";
      this.xeroContactEmailAddress = "";
      this.addMoreContactPersonsButton = true;
    } else {
      this.xeroContactDetailsValue = true;

      let selectedContactDetails = {};
      selectedContactDetails = this.relatedContacts.get(event.detail.value);

      this.xeroContactFirstName = selectedContactDetails.FirstName;
      this.xeroContactLastName = selectedContactDetails.LastName;
      this.xeroContactEmailAddress = selectedContactDetails.Email;
      this.addMoreContactPersonsButton = true;
    }
  }
  addMoreXeroContactPersons() {
    console.log("firstname=== " + JSON.stringify(this.contactPersonListObject));

    if (this.contactPersonsList.length < this.maxContactPersons) {
      console.log("Inside If----");
      const newId = this.contactPersonsList.length + 1;
      const newContactPersonSelect = {
        Id: newId,
        FirstName: "",
        LastName: "",
        EmailAddress: "",
        IncludeInEmails: false
      };

      this.contactPersonsList = [
        ...this.contactPersonsList,
        newContactPersonSelect
      ];
      console.log(
        " this.contactPersonsList=== " + JSON.stringify(this.contactPersonsList)
      );
      if (this.contactPersonsList.length == this.maxContactPersons) {
        this.addMoreContactPersonButtonDisabled = true;
      }
    }
  }

  // Computed property to return dynamic button style based on its disabled state
  get addMoreButtonStyle() {
    return this.addMoreContactPersonButtonDisabled
      ? "background-color: grey; color: white;"
      : "background-color: #0070d2; color: white;";
  }

  handleRemoveContactPersons(event) {
    const comboBoxId = event.target.dataset.id;
    this.contactPersonsList = this.contactPersonsList.filter(
      (comboBox) => comboBox.id !== parseInt(comboBoxId, 10)
    );
    this.contactPersonsList.length = this.contactPersonsList.length - 1;
    if (this.contactPersonsList.length != this.maxContactPersons) {
      this.addMoreContactPersonButtonDisabled = false;
    }
  }

  @api handleOnNextClick() {
    console.log("Inside handleOnNextCLick===");
    const contactDetails = new CustomEvent("getcontactdetails", {
      detail: {
        FirstName: this.xeroContactFirstName,
        LastName: this.xeroContactLastName,
        EmailAddress: this.xeroContactEmailAddress,
        Name: this.xeroAccountName,
        AccountNumber: this.xeroAccountNumber,
        Addresses: [
          {
            AddressType: "POBOX",
            AddressLine1: this.xeroAccountStreetAddress,
            City: this.xeroAccountAddressCity,
            Region: this.xeroAccountAddressState,
            PostalCode: this.xeroAccountAddressPostalCode,
            Country: this.xeroAccountAddressCountry
          }
        ],
        Phones: [
          {
            PhoneType: "DEFAULT",
            PhoneNumber: this.xeroAccountPhone
          }
        ],
        ContactPersons: this.contactPersonsList
      }
    });
    //Dispatch Event
    this.dispatchEvent(contactDetails);
  }
}