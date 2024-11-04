/**
 * @description       : 
 * @author            : ChangeMe
 * @group             : 
 * @last modified on  : 10-21-2024
 * @last modified by  : ChangeMe
**/
public class CreateXeroRecords {
    
    public static void retrieveAndCreateXeroContact(){
        
        
        List<XeroContact> wrapXeroContact = XeroAPI.getContacts();
        List<Xero_Contact__c> xeroContactList = new List<Xero_Contact__c>();
       //System.debug('wrapXeroContact ::: '+wrapXeroContact);

       Map<String, Xero_Contact__c> xeroContactIdWithXeroContact = new Map<String, Xero_Contact__c>();
       Set<string> xeroContactIds = new Set<String>();

       for(XeroContact xeroCon : wrapXeroContact){
            System.debug('Inside xeroCon::');
            xeroContactIds.add(xeroCon.ContactID);
       }   
       
        for(Xero_Contact__c xeroCon : [SELECT Id, Name, Xero_Contact_Id__c FROM Xero_Contact__c WHERE Xero_Contact_Id__c IN :xeroContactIds]){


            xeroContactIdWithXeroContact.put(xeroCon.Xero_Contact_Id__c, xeroCon);
        }

        //System.debug('xeroContactIdWithXeroContact::'+xeroContactIdWithXeroContact);
        
        for(XeroContact contact: wrapXeroContact){

            Xero_Contact__c xeroContactRecord = new Xero_Contact__c();

            if(xeroContactIdWithXeroContact.containsKey(contact.ContactID)) {

                //System.debug('Xero Contact found for upserting ::: ');
  
                xeroContactRecord = xeroContactIdWithXeroContact.get(contact.ContactID);
            }

            xeroContactRecord.Company_Name__c = contact.Name;
            xeroContactRecord.Account_Number__c = contact.AccountNumber;
            xeroContactRecord.First_Name__c = contact.FirstName;
            xeroContactRecord.Last_Name__c = contact.LastName;
            xeroContactRecord.Status__c = contact.ContactStatus;
            xeroContactRecord.Email_Address__c	= contact.EmailAddress;
            xeroContactRecord.Tax_Number__c = contact.TaxNumber;
            xeroContactRecord.Xero_Contact_Id__c = contact.ContactID;
            xeroContactRecord.Is_Customer__c = contact.IsCustomer;
            xeroContactRecord.Is_Supplier__c = contact.IsSupplier;
            xeroContactRecord.Default_Discount__c = contact.Discount;
            xeroContactRecord.Accounts_Payable_Tax_Type__c = contact.AccountsPayableTaxType;
            xeroContactRecord.Salesforce_Account__c = fetchAccountId(contact.Name);
            xeroContactRecord.Default_Revenue_Account_Code__c = contact.SalesDefaultAccountCode;
            xeroContactRecord.Default_Purchase_Revenue_Account_Code__c = contact.PurchasesDefaultAccountCode;
            
            if(contact.PaymentTerms != null){

                xeroContactRecord.Bill_Default_Due_Date_Days__c = contact.PaymentTerms.Bills.Day;
                xeroContactRecord.Bill_Default_Due_Date_Type__c = contact.PaymentTerms.Bills.Type;
                xeroContactRecord.Invoice_Default_Due_Date_Days__c = contact.PaymentTerms.Sales.Day;
                xeroContactRecord.Invoice_Default_Due_Date_Type__c = contact.PaymentTerms.Sales.Type;
                // System.debug('Payment Terms :::'+ contact.PaymentTerms.Bills.Day);
                // System.debug('Payment Terms :::'+ contact.PaymentTerms.Bills.Type);
            }

            // Address: 
            if(contact.Addresses.size() > 0){
                for(XeroContact.Address address : contact.Addresses){
                    if(address.AddressType == 'POBOX'){
                        xeroContactRecord.Billing_Address__Street__s =address.AddressLine1 + address.AddressLine2 +address.AddressLine3 + address.AddressLine4;
                        xeroContactRecord.Billing_Address__City__s = address.City;
                        xeroContactRecord.Billing_Address__StateCode__s = address.Region;
                        xeroContactRecord.Billing_Address__CountryCode__s = fetchCountryCode(address.Country);
                        System.debug('ContactId 71:::::'+ contact.ContactID);
                        System.debug('State Code 72 :::: '+address.Region);
                        System.debug('Country Code 72 ::: '+address.Country);
                        xeroContactRecord.Billing_Address__PostalCode__s = address.PostalCode;
                    }
        
                    if(address.AddressType == 'STREET'){
                        xeroContactRecord.Shipping_Address__Street__s = address.AddressLine1 + address.AddressLine2 +address.AddressLine3 + address.AddressLine4;
                        xeroContactRecord.Shipping_Address__City__s = address.City;
                        xeroContactRecord.Shipping_Address__StateCode__s = address.Region;
                        xeroContactRecord.Shipping_Address__CountryCode__s = fetchCountryCode(address.Country);
                        xeroContactRecord.Shipping_Address__PostalCode__s = address.PostalCode;
                   }
                }
            }

            // Phones: 
            if(contact.Phones.size() > 0){
                for(XeroContact.Phone phone : contact.Phones){
                    if(phone.PhoneType == 'DEFAULT'){
                        xeroContactRecord.Phone__c = phone.PhoneNumber;
                    }
                    if(phone.PhoneType == 'MOBILE'){
                        xeroContactRecord.Mobile__c = phone.PhoneNumber;
                    }
                    if(phone.PhoneType == 'FAX'){
                        xeroContactRecord.Fax__c = phone.PhoneNumber;
                    }
                   
                }
            }  
            
            if(contact.ContactPersons.size() >0){
                Integer personIndex =0;
                for(XeroContact.ContactPersons contactPerson : contact.ContactPersons){
                    
                    if(personIndex == 0){
                        System.debug('Contact Person 1'+contactPerson );
                        xeroContactRecord.Contact_1_First_name__c = contactPerson.FirstName;
                        xeroContactRecord.Contact_1_Last_Name__c = contactPerson.LastName;
                        xeroContactRecord.Contact_1_Email__c = contactPerson.EmailAddress;
                        xeroContactRecord.Contact_1_Include_in_Emails__c = contactPerson.IncludeInEmails;
                    }
                    if(personIndex == 1){
                        System.debug('Contact Person 2'+contactPerson );
                        xeroContactRecord.Contact_2_First_Name__c = contactPerson.FirstName;
                        xeroContactRecord.Contact_2_Last_Name__c = contactPerson.LastName;
                        xeroContactRecord.Contact_2_Email__c = contactPerson.EmailAddress;
                        xeroContactRecord.Contact_2_Include_in_Emails__c = contactPerson.IncludeInEmails;
                    }
                    if(personIndex == 2){
                        System.debug('Contact Person 3'+contactPerson );
                        xeroContactRecord.Contact_2_First_Name__c = contactPerson.FirstName;
                        xeroContactRecord.Contact_2_Last_Name__c = contactPerson.LastName;
                        xeroContactRecord.Contact_3_Email__c = contactPerson.EmailAddress;
                        xeroContactRecord.Contact_3_Include_in_Emails__c = contactPerson.IncludeInEmails;
                    }
                    if(personIndex == 3){
                        System.debug('Contact Person 4'+contactPerson );
                        xeroContactRecord.Contact_4_First_Name__c = contactPerson.FirstName;
                        xeroContactRecord.Contact_4_Last_Name__c = contactPerson.LastName;
                        xeroContactRecord.Contact_4_Email__c = contactPerson.EmailAddress;
                        xeroContactRecord.Contact_4_Include_in_Emails__c = contactPerson.IncludeInEmails;
                    }
                    if(personIndex == 4){
                        System.debug('Contact Person 5'+contactPerson );
                        xeroContactRecord.Contact_5_First_Name__c = contactPerson.FirstName;
                        xeroContactRecord.Contact_5_Last_Name__c = contactPerson.LastName;
                        xeroContactRecord.Contact_5_Email__c = contactPerson.EmailAddress;
                        xeroContactRecord.Contact_5_Include_in_Emails__c = contactPerson.IncludeInEmails;
                    }
                }

                personIndex = personIndex + 1;
            }

            if(contact.SalesTrackingCategories != null){
                System.debug('Inside Sales Category');

                Integer categoryIndex = 0;

                for(XeroContact.SalesTrackingCategories trackingCategory : contact.SalesTrackingCategories){
                    if(categoryIndex == 0){
                        xeroContactRecord.Tracking_Category_1_Name__c = trackingCategory.TrackingCategoryName;
                        xeroContactRecord.Sales_Tracking_Category_1_Default_Value__c = trackingCategory.TrackingOptionName;
                    }
                    if(categoryIndex == 1){
                        xeroContactRecord.Tracking_Category_2_Name__c = trackingCategory.TrackingCategoryName;
                        xeroContactRecord.Sales_Tracking_Category_2_Default_Value__c = trackingCategory.TrackingOptionName;
                    }
                    categoryIndex +=1;
                }
            }

            if(contact.PurchasesTrackingCategories != null ){
                System.debug('Inside Purchase Category');

                Integer categoryIndex = 0;

                for(XeroContact.PurchasesTrackingCategories trackingCategory : contact.PurchasesTrackingCategories){
                    if(categoryIndex == 0){
                        xeroContactRecord.Tracking_Category_1_Name__c = trackingCategory.TrackingCategoryName;
                        xeroContactRecord.Purchase_Tracking_Category_1_Value__c = trackingCategory.TrackingOptionName;
                    }
                    if(categoryIndex == 1){
                        xeroContactRecord.Tracking_Category_2_Name__c = trackingCategory.TrackingCategoryName;
                        xeroContactRecord.Purchase_Tracking_Category_2_Value__c = trackingCategory.TrackingOptionName;
                    }
                    categoryIndex +=1;
                }
            }
            xeroContactList.add(xeroContactRecord);
        }
        
        if(xeroContactList.size() != null){
            upsert xeroContactList Id; 
        }
    }

    public static String fetchCountryCode(String countryName){
        System.debug('Inside country code method:::');

        String objectName = 'Xero_Contact__c';
        String fieldName ='Billing_Address__CountryCode__s';

        Map<String,String> countryNameWithCountryCode = new Map<String,String>();

        Schema.SObjectType objSobjectType = Schema.getGlobalDescribe().get(objectName) ;
        Schema.DescribeSObjectResult objDescribeSobject = objSobjectType.getDescribe() ;

        Map<String,Schema.SObjectField> fields = objDescribeSobject.fields.getMap() ;

        Schema.DescribeFieldResult fieldResult = fields.get(fieldName).getDescribe();

        List<Schema.PicklistEntry> ple = fieldResult.getPicklistValues();

        for( Schema.PicklistEntry pickListVal : ple){
            // System.debug('Values ::: '+pickListVal.getLabel() +' '+pickListVal.getValue());
            countryNameWithCountryCode.put(pickListVal.getLabel(), pickListVal.getValue());
        }

        System.debug('CountryName:::::: '+countryName);
        System.debug('CountryCode193 ::: '+ countryNameWithCountryCode.get(countryName));
                return  countryNameWithCountryCode.get(countryName);
    }

    public static String fetchAccountId(String xeroContactCompany){
        // System.debug('Inside account id method:::');
        // System.debug('xeroContactName ::: '+xeroContactCompany);
       
        List<Account> account = [Select Id From Account Where Name =:xeroContactCompany LIMIT 1];
        // System.debug('Account Id ::: '+Account);
        if(!account.isEmpty()){
            return account[0].Id;
        }else{
            return null;
        }
    }

    public static void retrieveAndUpsertXeroInvoice(){
        List<XeroInvoice> wrapXeroInvoices = XeroAPI.getInvoices();
        List<Xero_Invoice__c> upsertXeroInvoices = new List<Xero_Invoice__c>();
       //System.debug('wrapXeroContact ::: '+wrapXeroContact);

       Map<String, Xero_Invoice__c> xeroInvoiceIdWithXeroInvoice = new Map<String, Xero_Invoice__c>();
       Set<string> xeroInvoiceIds = new Set<String>();

       for(XeroInvoice xeroInvoice : wrapXeroInvoices){
            System.debug('Inside xeroInvoice::');
            xeroInvoiceIds.add(xeroInvoice.InvoiceID);
       }   
       
        for(Xero_Invoice__c invoice : [SELECT Id, Name, Invoice_Id__c FROM Xero_Invoice__c WHERE Invoice_Id__c IN :xeroInvoiceIds]){
            xeroInvoiceIdWithXeroInvoice.put(invoice.Invoice_Id__c, invoice);
        }

        System.debug('xeroInvoiceIdWithXeroInvoice::'+xeroInvoiceIdWithXeroInvoice);

        for(XeroInvoice invoiceData: wrapXeroInvoices){

            Xero_Invoice__c xeroInvoiceRecord = new Xero_Invoice__c();

            if(xeroInvoiceIdWithXeroInvoice.containsKey(invoiceData.InvoiceID)) {

                System.debug('Xero Invoice found for upserting ::: ');
  
                xeroInvoiceRecord = xeroInvoiceIdWithXeroInvoice.get(invoiceData.InvoiceID);
            }

            // xeroInvoiceRecord.Account__c = accountId;
            // xeroInvoiceRecord.Opportunity__c = opportunityId;
            xeroInvoiceRecord.Branding_Theme_Id__c = invoiceData.BrandingThemeID;
            xeroInvoiceRecord.Issue_Date__c = date.valueOf(invoiceData.DateString);
            xeroInvoiceRecord.Due_Date__c = date.valueOf(invoiceData.DueDateString);
            xeroInvoiceRecord.Reference__c = invoiceData.Reference;
            xeroInvoiceRecord.Currency_Code__c = invoiceData.CurrencyCode;
            xeroInvoiceRecord.Amounts_Are__c = invoiceData.LineAmountTypes;
            //xeroInvoiceRecord.Xero_Contact__c = contactId;
            xeroInvoiceRecord.Invoice_Id__c = invoiceData.InvoiceID;
            xeroInvoiceRecord.Status__c = invoiceData.Status;
            xeroInvoiceRecord.Sub_Total__c = invoiceData.SubTotal;
            xeroInvoiceRecord.Total__c = invoiceData.Total;
            xeroInvoiceRecord.Total_Tax__c = invoiceData.TotalTax;
            xeroInvoiceRecord.Type__c = invoiceData.Type;
            xeroInvoiceRecord.Amount_Due__c = invoiceData.AmountDue;
            xeroInvoiceRecord.Currency_Rate__c = invoiceData.CurrencyRate;
            xeroInvoiceRecord.Sent_to_Contact__c = invoiceData.SentToContact;
            xeroInvoiceRecord.Amount_Paid__c = invoiceData.AmountPaid;
            //xeroInvoiceRecord.Fully_Paid_On_Date__c = 

            if(invoiceData.)

            upsertXeroInvoices.add(xeroInvoiceRecord);
        }

        if(upsertXeroInvoices != null){
            upsert upsertXeroInvoices Id;
        }
        
    }
}