import { LightningElement, wire, api, track } from "lwc";
import { getRecord } from "lightning/uiRecordApi";
import { NavigationMixin } from "lightning/navigation";
import getOppRelatedProduct from "@salesforce/apex/CreateInvoiceController.getOppRelatedProduct";
import createXeroContact from "@salesforce/apex/CreateInvoiceController.createXeroContact";
import showContactWrapperData from "@salesforce/apex/CreateInvoiceController.showContactWrapperData";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import getExistingInvoiceRelatedToOpportunity from "@salesforce/apex/CreateInvoiceController.getExistingInvoiceRelatedToOpportunity";
import getXeroContactRelatedToAccount from "@salesforce/apex/CreateInvoiceController.getXeroContactRelatedToAccount";
import createInvoiceRecord from "@salesforce/apex/CreateInvoiceController.createInvoiceRecord";
import getXeroCurrencies from "@salesforce/apex/XeroAPI.getXeroCurrencies";
import getXeroBrandingThemeTemplate from "@salesforce/apex/XeroAPI.getXeroBrandingThemeTemplate";
import getXeroTaxRates from "@salesforce/apex/XeroAPI.getXeroTaxRates";
import getXeroContacts from "@salesforce/apex/CreateInvoiceController.getXeroContacts";
import getProducts from "@salesforce/apex/CreateInvoiceController.getProducts";
import getXeroAccounts from "@salesforce/apex/XeroAPI.getXeroAccounts"

// Fetch the Opportunity Record Data
const FIELDS = [
  "Opportunity.Name",
  "Opportunity.Account.Name",
  "Opportunity.AccountId",
  "Opportunity.Account.BillingCity",
  "Opportunity.Account.BillingCountry",
  "Opportunity.Account.BillingPostalCode",
  "Opportunity.Account.BillingStreet"
];

export default class CreateInvoiceComponent extends NavigationMixin(
  LightningElement
) {
  firstPage = true;
  secondPage = false;
  thirdPage = false;
  oppRecordName;
  oppAccountName;
  oppAccountId;
  currentStep = "1";
  opportunityProductPage = false;
  isLoaded = false;
  contactRecordPage = false;
  invoiceItems = [];
  primaryContactEmail;
  primaryContactLastName;
  primaryContactFirstName;
  buttonPage = false;

  oppAccountAddressData = {};

  existingContact;
  invoiceTemplateValue;
  invoiceCurrencyValue;
  invoiceAmountsAreValue;
  opportunityExistingInvoiceRecords;
  invoiceDateValue;
  referenceValue;
  invoiceDueDateValue;
  xeroContactRelatedToAccount;
  nextButton = "Next";
  cancelButton = "Cancel";
  previousButton = "Previous";
  hidePreviousButton = true;
  hideNextButton = true;
  isXeroContactAlreadyExists;
  xeroContactDetails; //stores the contact details dispatched from xeroContactCreationComponent (Child Comp)
  searchedProduct;
  searchKey;
  productUnitPrice;
  productDescription;
  searchedItemId;
  relatedProducts = new Map();
  invoiceTemplates;
  currencyOptions;
  xeroContactId;
  SFContactId;
  accountCodeOptions;

  @track filteredProducts = [];
  @track isRadioCreateContactChecked = false;
  @track isRadioExistingChecked = false;
  @track isRadioBlankInvoiceChecked = false;
  @track isRadioOppProductChecked = false;
  @api recordId; // Automatically populated with the record ID
  @api objectApiName; // Automatically populated with the object API name
  @track accountdata;

  amountsAreDropDownValue = [
    { label: "Tax Exclusive", value: "Exclusive" },
    { label: "Tax Inclusive", value: "Inclusive" },
    { label: "No Tax", value: "NoTax" }
  ];

  get stepOneClass() {
    return this.currentStep >= "1" ? "active-step" : "";
  }

  get stepTwoClass() {
    return this.currentStep >= "2" ? "active-step" : "";
  }

  get stepThreeClass() {
    return this.currentStep >= "3" ? "active-step" : "";
  }
  //get records of the corresponding opportunity for which invoice is going to create
  @wire(getRecord, { recordId: "$recordId", fields: FIELDS })
  wiredRecord({ error, data }) {
    if (data) {
      this.oppRecordName = data.fields.Name.value;
      this.oppAccountName = data.fields.Account.value.fields.Name.value;
      this.oppAccountId = data.fields.AccountId.value;
      let temp = {};
      temp.City = data.fields.Account.value.fields.BillingCity.value;
      temp.Country = data.fields.Account.value.fields.BillingCountry.value;
      temp.PostalCode =
        data.fields.Account.value.fields.BillingPostalCode.value;
      temp.Street = data.fields.Account.value.fields.BillingStreet.value;
      this.oppAccountAddressData = temp;
      this.accountdata = data.fields.AccountId.value;
    } else if (error) {
      this.oppRecordName = "Error fetching record name";
      this.oppAccountName = "Error fetching Account name";
    }
    this.getOppProducts();
  }

  //get existing invoice related to corresponding opportunity if any
  @wire(getExistingInvoiceRelatedToOpportunity, { opportunityId: "$recordId" })
  wiredOppExistingInvoiceRec({ error, data }) {
    if (data) {
      console.log("Invoicedata==== ", data);
      this.opportunityExistingInvoiceRecords = JSON.parse(data);
    } else if (error) {
      this.error = error;
    }
  }

  //get Xero Contact from the Account related to current opportunity to show on the screen for easier navigation
  @wire(getXeroContactRelatedToAccount, { accountId: "$oppAccountId" })
  wiredXeroContacts({ error, data }) {
    if (data) {
      console.log("getXeroContactRelatedToContact==== " + JSON.stringify(data));
      this.xeroContactRelatedToAccount = data;
    }
  }

  //get xero currencies for the picklist values of currency field on third page
  @wire(getXeroCurrencies)
  wiredXeroCurrencies({ error, data }) {
    if (data) {
      this.currencyOptions = [
        ...data.map((theme) => {
          return { label: theme, value: theme };
        })
      ];
    } else {
      // Otherwise, map contacts to combobox options and add "Enter Details Manually"
      this.currencyOptions = [{ label: "USD", value: "USD" }];
    }
  }

  //get invoice template for the picklist values of invoice template field on third page
  @wire(getXeroBrandingThemeTemplate)
  wiredXeroBrandingThemesTemplate({ error, data }) {
    if (data) {
      console.log(
        "getXeroBrandingThemeTemplate ::::::: " + JSON.stringify(data)
      );

      this.invoiceTemplates = Object.keys(data).map((key) => {
        return {
          label: key,
          value: data[key]
        };
      });
      console.log("this.invoiceTemplates ::::::: " + this.invoiceTemplates);
    }
  }

  //get Xero Tax Rates for the values of TaxRate combo box on third page - opportunity-product table
  @wire(getXeroTaxRates)
  wiredXeroTaxRatesValue({ error, data }) {
    if (data) {
      this.taxRateOptions = Object.keys(data).map((key) => {
        return {
          label: key,
          value: data[key]
        };
      });
      console.log(
        "this.taxRateOptions ::::::: " + JSON.stringify(this.taxRateOptions)
      );
    }
  }

  @wire(getXeroAccounts)
  wiredXeroAccountsValue({error,data}){
    if(data){
      this.accountCodeOptions = Object.keys(data).map((key) => {
        return {
          label: key,
          value: data[key]
        };
      });
      console.log(
        "this.accountCodeOptions ::::::: " + JSON.stringify(this.accountCodeOptions)
      );
    }
  }

  // handleFirstStepBar() {
  //   this.firstPage = true;
  //   this.secondPage = false;
  //   this.thirdPage = false;
  //   this.currentStep = "1";
  // }
  // handleSecondStepBar() {
  //   this.secondPage = true;
  //   this.firstPage = false;
  //   this.thirdPage = false;
  //   this.currentStep = "2";
  // }
  // handleThirdStepBar() {
  //   this.thirdPage = true;
  //   this.firstPage = false;
  //   this.secondPage = false;
  //   this.currentStep = "3";
  // }

  handleStepBarChange(event) {
    let dataId = event.target.dataset.id;
    if (dataId === "firstStep") {
      this.firstPage = true;
      this.secondPage = false;
      this.thirdPage = false;
      this.currentStep = "1";
    } else if (dataId === "secondStep") {
      this.secondPage = true;
      this.firstPage = false;
      this.thirdPage = false;
      this.currentStep = "2";
    } else if (dataId === "thirdStep") {
      this.thirdPage = true;
      this.firstPage = false;
      this.secondPage = false;
      this.currentStep = "3";
    }
  }

  // handleBlankInvoiceRadioChange(event) {
  //   this.isRadioBlankInvoiceChecked = event.target.checked;
  //   this.isRadioOppProductChecked = false;
  //   this.hideNextButton = false;
  //   const newId = this.invoiceItems.length;
  //   console.log("newId handleBlankInvoiceRadioChange :::: " + newId);
  //   this.invoiceItems = [
  //     {
  //       id: newId,
  //       Name: "",
  //       Description: "",
  //       Quantity: 1,
  //       UnitAmount: 0,
  //       Discount: 0,
  //       AccountCode: "",
  //       TaxType: "",
  //       //region: '',
  //       LineAmount: 0,
  //       isDropdownVisible: false
  //     }
  //   ];
  // }
  // handleOpportunityProductsButton(event) {
  //   this.isRadioOppProductChecked = event.target.checked;
  //   this.isRadioBlankInvoiceChecked = false;
  //   this.opportunityProductPage = true;
  //   this.hideNextButton = false;
  //   this.getOppProducts();
  // }

  handleInvoiceTypeRadioChange(event) {
    let dataId = event.target.dataset.id;
    if (dataId === "BlankInvoice") {
      this.isRadioBlankInvoiceChecked = event.target.checked;
      this.isRadioOppProductChecked = false;
      this.hideNextButton = false;
      const newId = this.invoiceItems.length;
      console.log("newId handleBlankInvoiceRadioChange :::: " + newId);
      this.invoiceItems = [
        {
          id: newId,
          Name: "",
          Description: "",
          Quantity: 1,
          UnitAmount: 0,
          Discount: 0,
          AccountCode: "",
          TaxType: "",
          //region: '',
          LineAmount: 0,
          isDropdownVisible: false
        }
      ];
    } else if (dataId === "InvoiceWithOppProducts") {
      this.isRadioOppProductChecked = event.target.checked;
      this.isRadioBlankInvoiceChecked = false;
      this.opportunityProductPage = true;
      this.hideNextButton = false;
      this.getOppProducts();
    }
  }

  handleClickOnPrevious() {
    this.firstPage = true;
    this.secondPage = false;
    this.isRadioCreateContactChecked = false;
    this.isRadioExistingChecked = false;
    this.contactRecordPage = false;
    this.currentStep = "1";
  }
  // handleNewContactRadioChange(event) {
  //   this.isRadioCreateContactChecked = event.target.checked;
  //   this.isRadioExistingChecked = false;
  //   this.contactRecordPage = true;
  //   this.buttonPage = false;
  //   this.hideNextButton = false;
  //   console.alert("isRadioCreateContactChecked:::" + event.target.checked);
  //   console.log("isRadioExistingChecked::::" + event.target.unchecked);
  // }
  // handleExistingContactRadioChangeButton(event) {
  //   this.isRadioCreateContactChecked = false;
  //   this.contactRecordPage = false;
  //   console.log("handleExistingContactRadioChangeButton called");
  //   console.log(
  //     "xeroContactRelatedToAccount --- " +
  //       JSON.stringify(this.xeroContactRelatedToAccount)
  //   );
  //   this.primaryContactFirstName =
  //     this.xeroContactRelatedToAccount[0]["First_Name__c"];
  //   this.primaryContactLastName =
  //     this.xeroContactRelatedToAccount[0]["Last_Name__c"];
  //   this.primaryContactEmail =
  //     this.xeroContactRelatedToAccount[0]["Email_Address__c"];
  //   this.xeroContactId =
  //     this.xeroContactRelatedToAccount[0]["Xero_Contact_Id__c"];
  //   this.SFContactId = this.xeroContactRelatedToAccount[0]["Id"];
  //   console.log(
  //     "PrimaryContDetailsFName for existing -- " + this.primaryContactFirstName
  //   );
  //   console.log(
  //     "PrimaryContDetailsLName for existing-- " + this.primaryContactLastName
  //   );
  //   console.log(
  //     "PrimaryContDetailsEmail for existing -- " + this.primaryContactEmail
  //   );

  //   this.isRadioExistingChecked = event.target.checked;
  //   this.isRadioCreateContactChecked = false;
  //   this.hideNextButton = false;
  //   console.alert("isRadioExistingChecked::::" + this.isRadioExistingChecked);
  //   console.log(
  //     "isRadioCreateContactChecked:::" + this.isRadioCreateContactChecked
  //   );
  // }

  handleContactTypeRadioChange(event) {
    let dataId = event.target.dataset.id;
    if (dataId === "NewContact") {
      this.isRadioCreateContactChecked = event.target.checked;
      this.isRadioExistingChecked = false;
      this.contactRecordPage = true;
      this.buttonPage = false;
      this.hideNextButton = false;
      console.alert("isRadioCreateContactChecked:::" + event.target.checked);
      console.log("isRadioExistingChecked::::" + event.target.unchecked);
    } else if (dataId === "ExistingContact") {
      this.isRadioCreateContactChecked = false;
      this.contactRecordPage = false;
      console.log("handleExistingContactRadioChangeButton called");
      console.log(
        "xeroContactRelatedToAccount --- " +
          JSON.stringify(this.xeroContactRelatedToAccount)
      );
      this.primaryContactFirstName =
        this.xeroContactRelatedToAccount[0]["First_Name__c"];
      this.primaryContactLastName =
        this.xeroContactRelatedToAccount[0]["Last_Name__c"];
      this.primaryContactEmail =
        this.xeroContactRelatedToAccount[0]["Email_Address__c"];
      this.xeroContactId =
        this.xeroContactRelatedToAccount[0]["Xero_Contact_Id__c"];
      this.SFContactId = this.xeroContactRelatedToAccount[0]["Id"];
      console.log(
        "PrimaryContDetailsFName for existing -- " +
          this.primaryContactFirstName
      );
      console.log(
        "PrimaryContDetailsLName for existing-- " + this.primaryContactLastName
      );
      console.log(
        "PrimaryContDetailsEmail for existing -- " + this.primaryContactEmail
      );

      this.isRadioExistingChecked = event.target.checked;
      this.isRadioCreateContactChecked = false;
      this.hideNextButton = false;
      console.alert("isRadioExistingChecked::::" + this.isRadioExistingChecked);
      console.log(
        "isRadioCreateContactChecked:::" + this.isRadioCreateContactChecked
      );
    }
  }

  handleClickOnInvoicePrevious() {
    if (this.secondPage == true && this.firstPage == false) {
      this.firstPage = true;
      this.secondPage = false;
      this.thirdPage = false;
      // this.isRadioCreateContactChecked = false;
      // this.isRadioExistingChecked = false;
      this.hidePreviousButton = true;
      this.hideNextButton = false;
      this.currentStep = "1";
    } else if (this.thirdPage == true && this.secondPage == false) {
      this.thirdPage = false;
      this.firstPage = false;
      this.secondPage = true;
      this.currentStep = "2";
      this.nextButton = "Next";
    }
  }

  handleChangeOnInvoiceTemplates(event) {
    this.invoiceTemplateValue = event.target.value;
    console.log(
      " this.invoiceTemplateValue :::::: 307::: " + this.invoiceTemplateValue
    );
  }

  handleChangeInvoiceCurrency(event) {
    this.invoiceCurrencyValue = event.target.value;
  }
  handleChangeInvoiceAmountsAre(event) {
    this.invoiceAmountsAreValue = event.target.value;
  }
  handleChangeInvoiceReference(event) {
    this.referenceValue = event.target.value;
  }
  handleChangeInvoiceDate(event) {
    this.invoiceDateValue = event.target.value;
  }

  handleChangeInvoiceDueDate(event) {
    this.invoiceDueDateValue = event.target.value;
  }

  getOppProducts() {
    getOppRelatedProduct({ oppId: this.recordId }).then((data) => {
      this.invoiceItems = JSON.parse(data);
      console.log("InvoiceitemsNow ==== " + JSON.stringify(this.invoiceItems));
    });
  }

  //get products from apex class to show on the dropdown
  getProductList() {
    getProducts({ searchKey: this.searchKey }).then((data) => {
      this.filteredProducts = data; // Store the fetched data

      try {
        data.forEach((element) => {
          let currentProduct = {};
          currentProduct.Name = element.Name;
          currentProduct.Id = element.Id;
          currentProduct.Description = element.Product2.Description;
          // Komal Changes
          currentProduct.UnitAmount = element.UnitPrice;
          this.relatedProducts.set(element.Id, currentProduct);
        });
        console.log("This.relatedProducts :::: ", this.relatedProducts);
        // console.log('Contacts:::::: '+JSON.stringify(this.relatedContacts));
      } catch (error) {
        console.log("Error", error);
      }
    });
  }

  handleSelectedProduct(event) {
    this.isLoaded = false;
    console.log("selected item id -- " + this.searchedItemId);
    this.searchedProduct = event.target.innerText;
    console.log("SearchedProduct -- " + this.searchedProduct);
    console.log("event.target.dataId :::: " + event.target.dataset.id);
    let selectedProductDetails = {};
    selectedProductDetails = this.relatedProducts.get(event.target.dataset.id);
    console.log(
      "selectedProductDetails ::: " + JSON.stringify(selectedProductDetails)
    );

    this.invoiceItems.forEach((element) => {
      console.log("Comparision", element.id, this.searchedItemId);

      if (element.id == this.searchedItemId) {
        (element.id = this.searchedItemId),
          (element.Name = selectedProductDetails["Name"]),
          (element.Description = selectedProductDetails["Description"]),
          (element.Quantity = 1),
          (element.UnitAmount = selectedProductDetails["UnitPrice"]),
          (element.Discount = 0),
          (element.AccountCode = ""),
          (element.TaxType = ""),
          (element.LineAmount = 0),
          (element.isDropdownVisible = false);
      }
      console.log(element);
    });
    this.isLoaded = true;
    console.log("this.invoiceItems ---" + JSON.stringify(this.invoiceItems));
  }

  navigateToInvoiceRecord(event) {
    const invoiceId = event.target.dataset.id;

    this[NavigationMixin.GenerateUrl]({
      type: "standard__recordPage",
      attributes: {
        recordId: invoiceId,
        objectApiName: "Xero_Invoice__c	", // Change this to the actual API name of the Invoice object.
        actionName: "view"
      }
    }).then((url) => {
      // Open the URL in a new tab
      window.open(url, "_blank");
    });
  }

  handleOnOppAccIdClick() {
    // Navigation to the Account record page
    this[NavigationMixin.GenerateUrl]({
      type: "standard__recordPage",
      attributes: {
        recordId: this.oppAccountId, // Use Account record ID here
        objectApiName: "Account",
        actionName: "view"
      }
    }).then((url) => {
      // Open the URL in a new tab
      window.open(url, "_blank");
    });
  }

  //TODO : Implement Close screen event
  handleClickOnCancel(event) {
    var url = window.location.href;
    var value = url.substr(0, url.lastIndexOf("/") + 1);
    window.history.back();
    return false;
  }

  //Calls on the item name change
  handleChange(event) {
    const field = event.target;
    const itemId = field.dataset.id;
    this.searchedItemId = itemId;
    const updatedItems = this.invoiceItems.map((item) => {
      if (item.id == itemId) {
        console.log("value change", [field.Name], field.value);
        return { ...item, [field.dataset.name]: field.value };
      }
      return item;
    });
    console.log("updatedItems", updatedItems);

    this.invoiceItems = updatedItems;
    this.searchKey = event.target.value;
    this.invoiceItems.forEach((element) => {
      if (element.id == itemId) {
        element.isDropdownVisible = this.searchKey.length > 0;
      }
    });
    this.getProductList();
  }

  //Calls on the Add button t
  handleAddItem() {
    console.log(
      "this.invoiceItems :::559 :::" + JSON.stringify(this.invoiceItems)
    );
    const newId = this.invoiceItems.length + 1;
    console.log("newId handleAddItem :::: " + newId);

    this.invoiceItems = [
      ...this.invoiceItems,
      {
        id: newId,
        Name: "",
        Description: "",
        Quantity: 1,
        UnitAmount: 0,
        Discount: 0,
        AccountCode: "",
        TaxType: "",
        //region: '',
        LineAmount: 0,
        isDropdownVisible: false
      }
    ];
  }

  handleClickOnSubmitOrNext(event) {
    this.hidePreviousButton = false;
    if (event.target.label == "Next") {
      if (this.secondPage == false) {
        this.firstPage = false;
        this.secondPage = true;
        this.currentStep = "2";
        this.hideNextButton = true;
      } else if (this.thirdPage == false && this.secondPage == true) {
        this.firstPage = false;
        this.secondPage = false;
        this.thirdPage = true;
        this.currentStep = "3";
        this.nextButton = "Submit";
        const childComponent = this.template.querySelector(
          "c-xero-contact-creation-component"
        );
        if (childComponent) {
          childComponent.handleOnNextClick();
        } else {
          console.error("Child component not found.");
        }
      }
    } else if (event.target.label == "Submit") {
      console.log("label--- " + event.target.label);
      console.log(
        "this.xerocontactdetail --- " + JSON.stringify(this.xeroContactDetails)
      );
      //method to call the createXeroContact imperatively
      if (this.isRadioCreateContactChecked) {
        createXeroContact({
          accountId: this.oppAccountId,
          xeroContactDetails: JSON.stringify(this.xeroContactDetails)
        })
          .then((result) => {
            console.log("Contact Details");
            console.log("result --- " + JSON.stringify(result));

            this.xeroContactId = result.XeroContactId;
            this.SFContactId = result.SFContactId;
            console.log("this.xeroContactId --- " + this.xeroContactId);
            console.log("this.SFContactId --- " + this.SFContactId);
            this.invokeCreateInvoiceRecord();
          })
          .catch((error) => {
            const toastEvent = new ShowToastEvent({
              message: "Xero Contact Creation Unsuccessful!",
              variant: "Error"
            });
            this.dispatchEvent(toastEvent);
          });
      } else {
        this.invokeCreateInvoiceRecord();
      }
    }
  }
  // method to call the createInvoiceRecord imperatively
  invokeCreateInvoiceRecord() {
    // if (this.ContactID) {
    let invoiceFieldValues = {
      AccountId: this.oppAccountId,
      OpportunityId: this.recordId,
      BrandingThemeID: this.invoiceTemplateValue,
      Date: this.invoiceDateValue,
      DueDate: this.invoiceDueDateValue,
      Reference: this.referenceValue,
      CurrencyCode: this.invoiceCurrencyValue,
      LineAmountTypes: this.invoiceAmountsAreValue,
      Type: "ACCREC",
      Contact: {
        ContactID: this.xeroContactId
      },
      LineItems: this.invoiceItems
    };
    console.log(
      "invoiceFieldValue::::538:::  --" + JSON.stringify(invoiceFieldValues)
    );
    console.log("sfcontactId -- " + this.SFContactId);
    createInvoiceRecord({
      xeroInvoiceDetails: JSON.stringify(invoiceFieldValues),
      SFContactId: this.SFContactId,
      accountId: this.oppAccountId,
      opportunityId: this.recordId
    }).then((invoiceResult) => {
      console.log("invoice details");
      console.log("xeroInvoiceId --- " + invoiceResult);
      console.log(
        "invoiceFieldValues--- " + JSON.stringify(invoiceFieldValues)
      );
      if (invoiceResult === "Succeed") {
        const toastEvent = new ShowToastEvent({
          message: "Invoice Genereted Successfully!",
          variant: "Success"
        });
        this.dispatchEvent(toastEvent);
      } else if (invoiceResult === "Failed") {
        const toastEvent = new ShowToastEvent({
          message: "Unable to generate Invoice!",
          variant: "Error"
        });
        this.dispatchEvent(toastEvent);
      }
    });
    // .catch((error) => {
    //   const toastEvent = new ShowToastEvent({
    //     message: "Xero Invoice Creation Unsuccessful!",
    //     variant: "Error"
    //   });
    //   this.dispatchEvent(toastEvent);
    // });
  }

  //Calls on Delete button
  handleDelete(event) {
    const itemId = event.target.dataset.id;
    this.invoiceItems = this.invoiceItems.filter(
      (item) => item.id !== parseInt(itemId, 10)
    );
  }

  renderedCallback() {
    if (this.isLoaded) return;
    const STYLE = document.createElement("style");
    STYLE.innerText = `.uiModal--medium .modal-container{width:100% !important;
        max-width: 1230px;
        min-width:480px;
        max-height:100%;
        min-height:480px;}`;
    this.template.querySelector("lightning-card").appendChild(STYLE);
    this.isLoaded = true;
  }

  get isXeroContactDisabled() {
    return !(
      this.xeroContactRelatedToAccount &&
      this.xeroContactRelatedToAccount.length > 0
    );
  }

  get isAutoOppProductPopulationDisabled() {
    return !(this.invoiceItems && this.invoiceItems.length > 0);
  }

  primaryContactDetails(event) {
    this.xeroContactDetails = event.detail;
    this.primaryContactFirstName = this.xeroContactDetails["FirstName"];
    this.primaryContactLastName = this.xeroContactDetails["LastName"];
    this.primaryContactEmail = this.xeroContactDetails["EmailAddress"];

    console.log(
      "PrimaryContDetailsFName for blank -- " + this.primaryContactFirstName
    );
    console.log(
      "PrimaryContDetailsLName for blank-- " + this.primaryContactLastName
    );
    console.log(
      "PrimaryContDetailsEmail for blank -- " + this.primaryContactEmail
    );
    console.log(
      'this.xeroContactDetails["accountName"] ---' +
        this.xeroContactDetails["accountName"]
    );
    console.log(
      'this.xeroContactDetails["accountNumber"] ---' +
        this.xeroContactDetails["accountNumber"]
    );

    getXeroContacts({
      accountName: this.xeroContactDetails["accountName"],
      accountNumber: this.xeroContactDetails["accountNumber"]
    }).then((result) => {
      console.log("result " + result);
      if (result == true) {
        const toastEvent = new ShowToastEvent({
          message:
            "Xero contact already exists with the same Name and Account Number!",
          variant: "Error"
        });
        this.dispatchEvent(toastEvent);
        this.secondPage = true;
        this.thirdPage = false;
        this.currentStep = "2";
        this.nextButton = "Next";
      } else {
        const toastEvent = new ShowToastEvent({
          message: "Xero contact details has been saved successfully!",
          variant: "Success"
        });
        this.dispatchEvent(toastEvent);
      }
    });
  }
}