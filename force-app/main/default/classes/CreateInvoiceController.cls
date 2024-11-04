/*
* Author : Komal Kumawat and Sagar Anand
* Description: This class is used to handle all the methods related to lwc component.
* Last Modified By:  
*/

public with sharing class CreateInvoiceController {
  //public static String ContactWrapperValue;

  @AuraEnabled(cacheable=true)
  public static String getOppRelatedProduct(String oppId) {
    List<OppProductWrapper> oppProductList = new List<OppProductWrapper>();

    for (OpportunityLineItem oppLine : [
      SELECT
        Id,
        Name,
        OpportunityId,
        Quantity,
        UnitPrice,
        Discount,
        Description,
        TotalPrice
      FROM OpportunityLineItem
      WHERE OpportunityId = :oppId
    ]) {
      oppProductList.add(
        new OppProductWrapper(
          oppLine.Id,
          oppLine.Name,
          oppLine.Description,
          oppLine.Quantity,
          oppLine.UnitPrice,
          oppLine.Discount,
          '',
          oppLine.TotalPrice
        )
      );
    }
    return JSON.serialize(oppProductList);
  }

  @AuraEnabled(cacheable=true)
  public static List<PricebookEntry> getProducts(String searchKey) {
    return [
      SELECT Name, Product2.Description, UnitPrice
      FROM PricebookEntry
      WHERE Name LIKE :('%' + searchKey + '%')
    ];
  }

  @AuraEnabled(cacheable=true)
  public static String getExistingInvoiceRelatedToOpportunity(
    Id opportunityId
  ) {
    List<ExistingInvoiceWrapper> oppInvoiceList = new List<ExistingInvoiceWrapper>();

    for (Xero_Invoice__c invoice : [
      SELECT Id, Opportunity__c, Name
      FROM Xero_Invoice__c
      WHERE Opportunity__c = :opportunityId
    ]) {
      oppInvoiceList.add(new ExistingInvoiceWrapper(invoice.Id, invoice.Name));
    }
    return JSON.serialize(oppInvoiceList);
  }

  // @AuraEnabled(cacheable=true)
  // public static String showContactWrapperData(Id opportunityId) {
  //   //    String st = getExistingInvoiceRelatedToOpportunity(opportunityId);
  //   //     System.debug('Test ====');

  //   return ContactWrapperValue;
  // }

  @AuraEnabled
  public static Map<String, String> createXeroContact(
    String accountId,
    String xeroContactDetails
  ) {
    XeroContact xeroContacts = (XeroContact) JSON.deserialize(
      xeroContactDetails,
      XeroContact.class
    );
    System.debug('xeroContacts -- ' + xeroContacts);
    System.debug('xeroContact.serialize() ::: ' + xeroContacts.serialize());
    //callout to xeroAPI in order to create xero Contact on Xero Side
    XeroContact xeroContactResponse = XeroAPI.sendContact(xeroContacts);
    System.debug('xeroContactResponse -- ' + xeroContactResponse);

    String SFContactId = createXeroContactInSF(accountId, xeroContactResponse);
    System.debug('SFContactId --- ' + SFContactId);
    return new Map<String, String>{
      'XeroContactId' => xeroContactResponse.ContactID,
      'SFContactId' => SFContactId
    };
  }

  @AuraEnabled
  public static String createInvoiceRecord(
    String xeroInvoiceDetails,
    String SFContactId,
    String accountId,
    String opportunityId
  ) {
    try {
      System.debug('Inside Invoice record');
      System.debug('xero  Invoices -- ' + xeroInvoiceDetails);
      XeroInvoice xeroinvoices = (XeroInvoice) JSON.deserialize(
        xeroInvoiceDetails,
        XeroInvoice.class
      );

      System.debug('xeroInvoice -- ' + xeroinvoices);
      System.debug('xeroInvoice.serialize() ::: ' + xeroInvoices.serialize());

      XeroInvoice xeroInvoiceResponse = XeroAPI.sendInvoice(xeroInvoices);
      String invoiceRecordMsg = createInvoiceRecordInSF(
        SFContactId,
        accountId,
        opportunityId,
        xeroInvoiceResponse
      );
      return invoiceRecordMsg;
    } catch (Exception e) {
      return 'Failed';
    }

    // Create Xero Invoice Record in Salesforce After creating in Xero.
  }

  public static String createInvoiceRecordInSF(
    String contactId,
    String accountId,
    String opportunityId,
    XeroInvoice invoiceFieldDetails
  ) {
    try {
      System.debug('contactId -- ' + contactId);
      System.debug('invoiceFieldDetails -- ' + invoiceFieldDetails);
      Xero_Invoice__c xeroInvoice = new Xero_Invoice__c();
      xeroInvoice.Account__c = accountId;
      xeroInvoice.Opportunity__c = opportunityId;
      xeroInvoice.Branding_Theme_Id__c = invoiceFieldDetails.BrandingThemeID;
      xeroInvoice.Issue_Date__c = date.valueOf(invoiceFieldDetails.DateString);
      xeroInvoice.Due_Date__c = date.valueOf(invoiceFieldDetails.DueDateString);
      xeroInvoice.Reference__c = invoiceFieldDetails.Reference;
      xeroInvoice.Currency_Code__c = invoiceFieldDetails.CurrencyCode;
      xeroInvoice.Amounts_Are__c = invoiceFieldDetails.LineAmountTypes;
      xeroInvoice.Xero_Contact__c = contactId;
      xeroInvoice.Invoice_Id__c = invoiceFieldDetails.InvoiceID;
      xeroInvoice.Status__c = invoiceFieldDetails.Status;
      xeroInvoice.Sub_Total__c = invoiceFieldDetails.SubTotal;
      xeroInvoice.Total__c = invoiceFieldDetails.Total;
      xeroInvoice.Total_Tax__c = invoiceFieldDetails.TotalTax;
      xeroInvoice.Type__c = invoiceFieldDetails.Type;
      xeroInvoice.Amount_Due__c = invoiceFieldDetails.AmountDue;
      xeroInvoice.Currency_Rate__c = invoiceFieldDetails.CurrencyRate;

      insert xeroInvoice;
      String InvoiceLineItemMsg = createLineItemsInSF(
        xeroInvoice.Id,
        invoiceFieldDetails
      );
      return InvoiceLineItemMsg;
    } catch (Exception e) {
      return 'Failed';
    }
  }

  //method to create  invoice line items of the corresponding created invoice.

  public static String createLineItemsInSF(
    String xeroInvoiceId,
    XeroInvoice invoiceDetails
  ) {
    try {
      List<Xero_Invoice_Line_Item__c> invoiceLineItems = new List<Xero_Invoice_Line_Item__c>();
      for (XeroInvoice.LineItem item : invoiceDetails.LineItems) {
        Xero_Invoice_Line_Item__c invoiceItem = new Xero_Invoice_Line_Item__c();
        invoiceItem.Name = item.Name;
        invoiceItem.Description__c = item.Description;
        invoiceItem.Quantity__c = item.Quantity;
        invoiceItem.Unit_Price__c = item.UnitAmount;
        invoiceItem.Discount_Rate__c = item.Discount;
        invoiceItem.Tax_Type__c = item.TaxType;
        invoiceItem.Account_Code__c = item.AccountCode;
        invoiceItem.Tax_Amount__c = item.taxAmount;
        invoiceItem.Amount__c = item.lineAmount;
        invoiceItem.Invoice__c = xeroInvoiceId;
        invoiceLineItems.add(invoiceItem);
      }
      // if (invoiceLineItems != null) {
      insert invoiceLineItems;
      return 'Succeed';
      // }
    } catch (Exception e) {
      return 'Failed';
    }
  }

  //@AuraEnabled(cacheable=true)
  public static String getExistingContactRelatedToInvoice(Set<Id> contactIds) {
    List<ContactWrapper> contactWrapperList = new List<ContactWrapper>();

    for (Contact con : [
      SELECT Id, Name, Email
      FROM Contact
      WHERE Id IN :contactIds
    ]) {
      contactWrapperList.add(new ContactWrapper(con.Id, con.Name, con.Email));
    }
    return JSON.serialize(contactWrapperList);
  }

  public class ContactWrapper {
    public Id contactId;
    public String contactName;
    public String contactEmail;

    public ContactWrapper(Id conId, String conName, String conEmail) {
      this.contactId = conId;
      this.contactName = conName;
      this.contactEmail = conEmail;
    }
  }

  public class OppProductWrapper {
    public Id id;
    public String Name;
    public String Description;
    public Decimal Quantity;
    public Decimal UnitPrice;
    public Decimal Discount;
    public String AccountCode;
    public Decimal LineAmount;

    public OppProductWrapper(
      Id id,
      String name,
      String description,
      Decimal quantity,
      Decimal unitPrice,
      Decimal discount,
      String account,
      Decimal amount
    ) {
      this.Id = id;
      this.Name = name;
      this.Description = description;
      this.Quantity = quantity;
      this.UnitPrice = unitPrice;
      this.Discount = discount;
      this.AccountCode = account;
      this.LineAmount = amount;
    }
  }

  public class ExistingInvoiceWrapper {
    public Id id;
    public String name;
    public ExistingInvoiceWrapper(Id Id, String Name) {
      this.id = Id;
      this.name = Name;
    }
  }

  public static void createOrUpdateXeroContact(List<XeroContact> xeroContacts) {
    Set<String> xeroContactIds = new Set<String>();
    Map<String, Contact> xeroContactIdWithContact = new Map<String, Contact>();

    for (XeroContact contact : xeroContacts) {
      xeroContactIds.add(contact.ContactID);
    }

    List<Contact> xeroContactsList = [
      SELECT Id, Xero_Contact_Id__c
      FROM Contact
      WHERE Xero_Contact_Id__c IN :xeroContactIds
    ];

    for (Contact con : [
      SELECT Id, Xero_Contact_Id__c
      FROM Contact
      WHERE Xero_Contact_Id__c IN :xeroContactIds
    ]) {
      xeroContactIdWithContact.put(con.Xero_Contact_Id__c, con);
    }

    for (XeroContact xeroCon : xeroContacts) {
      if (xeroContactIdWithContact.containsKey(xeroCon.ContactID)) {
        Contact xeroContactToUpdate = xeroContactIdWithContact.get(
          xeroCon.ContactID
        );
      } else {
        //Create new Contact
        Contact newContact = new Contact();
        newContact.FirstName = xeroCon.FirstName;
        newContact.LastName = xeroCon.LastName;
        newContact.Email = xeroCon.EmailAddress;
        newContact.Account_Number__c = xeroCon.AccountNumber;

        if (xeroCon.Addresses != null) {
          for (XeroContact.Address addr : xeroCon.Addresses) {
            // Assign address values based on the AddressType
            if (addr.AddressType == 'POBOX') {
              newContact.Billing_Address__Street__s = addr.AddressLine1;
              newContact.Billing_Address__City__s = addr.City;
              newContact.Billing_Address__StateCode__s = addr.Region;
              newContact.Billing_Address__CountryCode__s = addr.Country;
              newContact.Billing_Address__PostalCode__s = addr.PostalCode;
            } else if (addr.AddressType == 'STREET') {
              // Alternatively, map this to different fields if required
              newContact.Shipping_Address__Street__s = addr.AddressLine1;
              newContact.Shipping_Address__City__s = addr.City;
              newContact.Shipping_Address__CountryCode__s = addr.Country;
              newContact.Shipping_Address__StateCode__s = addr.Region;
              newContact.Shipping_Address__PostalCode__s = addr.PostalCode;
            }
          }
        }
      }
    }
  }

  // Methods to show Xero Contact related to Account
  @AuraEnabled(cacheable=true)
  public static List<Xero_Contact__c> getXeroContactRelatedToAccount(
    String accountId
  ) {
    // Return Xero Contact records for a specific Account
    return [
      SELECT
        Id,
        First_Name__c,
        Last_Name__c,
        Email_Address__c,
        Xero_Contact_Id__c
      FROM Xero_Contact__c
      WHERE Salesforce_Account__c = :accountId
      ORDER BY CreatedDate DESC
      LIMIT 1
    ];
  }

  @AuraEnabled(cacheable=false)
  public static List<Contact> contactRecordsAssociatedWithAccount(
    String accountId
  ) {
    return [
      SELECT Id, Name, FirstName, LastName, Email
      FROM Contact
      WHERE AccountId = :accountId
    ];
  }

  @Auraenabled(cacheable=false)
  public static List<Account> getAccountRelatedToOpportunity(String accountId) {
    System.debug('Inside Account');
    System.debug('accountId==== ' + accountId);
    System.debug(
      'account======= ' +
      [
        SELECT
          Id,
          Name,
          AccountNumber,
          Industry,
          BillingAddress,
          BillingStreet,
          BillingCity,
          BillingState,
          BillingPostalCode,
          BillingCountry,
          Phone
        FROM Account
        WHERE Id = :accountId
      ]
    );
    return [
      SELECT
        Id,
        Name,
        AccountNumber,
        Industry,
        BillingAddress,
        BillingStreet,
        BillingCity,
        BillingState,
        BillingPostalCode,
        BillingCountry,
        Phone
      FROM Account
      WHERE Id = :accountId
    ];
  }

  @AuraEnabled
  public static Boolean getXeroContacts(
    String accountName,
    String accountNumber
  ) {
    List<Xero_Contact__c> fetchedXeroContact = [
      SELECT Id, Account_Number__c, Company_Name__c
      FROM Xero_Contact__c
      WHERE
        Account_Number__c = :accountNumber
        AND Company_Name__c = :accountName
    ];

    if (fetchedXeroContact.size() > 0) {
      return true;
    } else {
      return false;
    }
  }

  public static String createXeroContactInSF(
    String accountId,
    XeroContact contact
  ) {
    Xero_Contact__c xeroContactRecord = new Xero_Contact__c();

    xeroContactRecord.Company_Name__c = contact.Name;
    xeroContactRecord.Account_Number__c = contact.AccountNumber;
    xeroContactRecord.First_Name__c = contact.FirstName;
    xeroContactRecord.Last_Name__c = contact.LastName;
    xeroContactRecord.Status__c = contact.ContactStatus;
    xeroContactRecord.Email_Address__c = contact.EmailAddress;
    xeroContactRecord.Xero_Contact_Id__c = contact.ContactID;
    xeroContactRecord.Is_Customer__c = contact.IsCustomer;
    xeroContactRecord.Is_Supplier__c = contact.IsSupplier;
    xeroContactRecord.Salesforce_Account__c = accountId;

    // Address:
    if (contact.Addresses.size() > 0) {
      for (XeroContact.Address address : contact.Addresses) {
        if (address.AddressType == 'POBOX') {
          xeroContactRecord.Billing_Address__Street__s =
            address.AddressLine1 +
            address.AddressLine2 +
            address.AddressLine3 +
            address.AddressLine4;

          xeroContactRecord.Billing_Address__CountryCode__s = CreateXeroRecords.fetchCountryCode(
            address.Country
          );
          xeroContactRecord.Billing_Address__StateCode__s = address.Region;
          xeroContactRecord.Billing_Address__City__s = address.City;

          System.debug('Country Code ::: ' + address.Country);
          xeroContactRecord.Billing_Address__PostalCode__s = address.PostalCode;
        }

        if (address.AddressType == 'STREET') {
          xeroContactRecord.Shipping_Address__Street__s =
            address.AddressLine1 +
            address.AddressLine2 +
            address.AddressLine3 +
            address.AddressLine4;

          xeroContactRecord.Shipping_Address__CountryCode__s = CreateXeroRecords.fetchCountryCode(
            address.Country
          );
          xeroContactRecord.Shipping_Address__StateCode__s = address.Region;
          xeroContactRecord.Shipping_Address__City__s = address.City;
          xeroContactRecord.Shipping_Address__PostalCode__s = address.PostalCode;
        }
      }
    }

    // Phones:
    if (contact.Phones.size() > 0) {
      for (XeroContact.Phone phone : contact.Phones) {
        if (phone.PhoneType == 'DEFAULT') {
          xeroContactRecord.Phone__c = phone.PhoneNumber;
        }
        if (phone.PhoneType == 'MOBILE') {
          xeroContactRecord.Mobile__c = phone.PhoneNumber;
        }
      }
    }

    if (contact.ContactPersons.size() > 0) {
      Integer personIndex = 0;
      for (XeroContact.ContactPersons contactPerson : contact.ContactPersons) {
        if (personIndex == 0) {
          System.debug('Contact Person 1' + contactPerson);
          xeroContactRecord.Contact_1_First_name__c = contactPerson.FirstName;
          xeroContactRecord.Contact_1_Last_Name__c = contactPerson.LastName;
          xeroContactRecord.Contact_1_Email__c = contactPerson.EmailAddress;
          xeroContactRecord.Contact_1_Include_in_Emails__c = contactPerson.IncludeInEmails;
        }
        if (personIndex == 1) {
          System.debug('Contact Person 2' + contactPerson);
          xeroContactRecord.Contact_2_First_Name__c = contactPerson.FirstName;
          xeroContactRecord.Contact_2_Last_Name__c = contactPerson.LastName;
          xeroContactRecord.Contact_2_Email__c = contactPerson.EmailAddress;
          xeroContactRecord.Contact_2_Include_in_Emails__c = contactPerson.IncludeInEmails;
        }
        if (personIndex == 2) {
          System.debug('Contact Person 3' + contactPerson);
          xeroContactRecord.Contact_2_First_Name__c = contactPerson.FirstName;
          xeroContactRecord.Contact_2_Last_Name__c = contactPerson.LastName;
          xeroContactRecord.Contact_3_Email__c = contactPerson.EmailAddress;
          xeroContactRecord.Contact_3_Include_in_Emails__c = contactPerson.IncludeInEmails;
        }
        if (personIndex == 3) {
          System.debug('Contact Person 4' + contactPerson);
          xeroContactRecord.Contact_4_First_Name__c = contactPerson.FirstName;
          xeroContactRecord.Contact_4_Last_Name__c = contactPerson.LastName;
          xeroContactRecord.Contact_4_Email__c = contactPerson.EmailAddress;
          xeroContactRecord.Contact_4_Include_in_Emails__c = contactPerson.IncludeInEmails;
        }
        if (personIndex == 4) {
          System.debug('Contact Person 5' + contactPerson);
          xeroContactRecord.Contact_5_First_Name__c = contactPerson.FirstName;
          xeroContactRecord.Contact_5_Last_Name__c = contactPerson.LastName;
          xeroContactRecord.Contact_5_Email__c = contactPerson.EmailAddress;
          xeroContactRecord.Contact_5_Include_in_Emails__c = contactPerson.IncludeInEmails;
        }
      }

      personIndex = personIndex + 1;
    }
    insert xeroContactRecord;
    return xeroContactRecord.Id;
  }
}