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
import getXeroAccounts from "@salesforce/apex/XeroAPI.getXeroAccounts";
import errorToastMsg from "@salesforce/label/c.Error_Toast_Event";
import successToastMsg from "@salesforce/label/c.Success_Toast_Message";
import { CloseActionScreenEvent } from "lightning/actions";

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
  @track isLoaded = false;
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
    console.log("Error toast message --- " + errorToastMsg);
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
      console.log(
        "this.xerocontactRelatedToAccount --- " +
          this.xeroContactRelatedToAccount
      );
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
  wiredXeroAccountsValue({ error, data }) {
    if (data) {
      this.accountCodeOptions = Object.keys(data).map((key) => {
        return {
          label: key,
          value: data[key]
        };
      });
      console.log(
        "this.accountCodeOptions ::::::: " +
          JSON.stringify(this.accountCodeOptions)
      );
    }
  }

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
          UnitPrice: 0,
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
      this.hidePreviousButton = true;
      this.hideNextButton = false;
      this.currentStep = "1";
    } else if (this.thirdPage == true && this.secondPage == false) {
      this.thirdPage = false;
      this.firstPage = false;
      this.secondPage = true;
      this.currentStep = "2";
      this.nextButton = "Next";
      this.hideNextButton = false;
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
      console.log("data ----- " + JSON.stringify(data));

      try {
        data.forEach((element) => {
          let currentProduct = {};
          currentProduct.Name = element.Name;
          currentProduct.Id = element.Id;
          currentProduct.Description = element.Product2.Description;
          // Komal Changes
          currentProduct.UnitPrice = element.UnitPrice;
          console.log("currentProduct ---- " + JSON.stringify(currentProduct));
          console.log("elementId ----- " + element.Id);
          this.relatedProducts.set(element.Id, currentProduct);
        });
        console.log("This.relatedProducts :::: ", this.relatedProducts);
        console.log("Contacts:::::: " + JSON.stringify(this.relatedContacts));
      } catch (error) {
        console.log("Error", error);
      }
    });
  }

  dropDownInFocus = false;
  handleBlur() {
    if (!this.dropDownInFocus) {
      this.closeDropbox();
    }
  }
  handleMouseleave() {
    this.dropDownInFocus = false;
  }
  handleMouseEnter() {
    this.dropDownInFocus = true;
  }
  closeDropbox() {
    let sldsCombobox = this.template.querySelector(".slds-combobox");
    sldsCombobox.classList.remove("slds-is-open");
  }

  hideSearchList(event) {
    console.log(this.searchedItemId);
    // this.invoiceItems.forEach((element) => {
    //   if (element.id == this.searchedItemId) {
    //     element.isDropdownVisible = false;
    //   }
    // });
    this.isLoaded = false;
  }

  handleSelectedProduct(event) {
    console.log("handle Selected Product run");
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
          (element.UnitPrice = selectedProductDetails["UnitPrice"]),
          (element.Discount = 0),
          (element.AccountCode = ""),
          (element.TaxType = ""),
          (element.LineAmount = 0),
          (element.isDropdownVisible = false);
      }
      console.log(element);
    });
    this.isLoaded = true;
    console.log(
      "this.invoiceItems :: 515 ---" + JSON.stringify(this.invoiceItems)
    );
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
    console.log("cancelled");
    this.dispatchEvent(new CloseActionScreenEvent());
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

  handleSpecificValueChange(event) {
    console.log("specific field changed.");
    const dataId = event.target.dataset.id;
    const dataName = event.target.dataset.name;
    console.log("data Id --- " + dataId);
    console.log("data Name ---- " + dataName);
    console.log(
      "invoiceItems before changes ----" + JSON.stringify(this.invoiceItems)
    );
    this.invoiceItems.forEach((element) => {
      console.log("for loop run");
      console.log("element.Id ---" + element.id);
      if (element.id == dataId) {
        if (dataName == "Quantity") {
          console.log("element.quantity before --- " + element.Quantity);
          element.Quantity = event.target.value;
          console.log("event.target.value --- " + event.target.value);
          console.log("element.quantity after change --- " + element.Quantity);
        } else if (dataName == "AccountCode") {
          element.AccountCode = event.target.value;
        }
      }
    });
    console.log(
      "InvoiceItems after specific value change --- " +
        JSON.stringify(this.invoiceItems)
    );
  }

  //Calls on the Add button
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
        UnitPrice: 0,
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
        if (this.isRadioExistingChecked || this.isRadioCreateContactChecked) {
          this.hideNextButton = false;
        } else {
          this.hideNextButton = true;
        }
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
          message: successToastMsg,
          variant: "Success"
        });
        this.dispatchEvent(toastEvent);
        this.dispatchEvent(new CloseActionScreenEvent());
      } else if (invoiceResult === "Failed") {
        const toastEvent = new ShowToastEvent({
          message: errorToastMsg,
          variant: "Error"
        });
        this.dispatchEvent(toastEvent);
        this.dispatchEvent(new CloseActionScreenEvent());
      }
    });
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

    getXeroContacts({
      accountName: this.xeroContactDetails["Name"],
      accountNumber: this.xeroContactDetails["AccountNumber"]
    }).then((result) => {
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