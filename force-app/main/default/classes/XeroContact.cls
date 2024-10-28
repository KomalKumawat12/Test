public class XeroContact {

    public String ContactID;
	public String ContactStatus;
	public String Name;
	public String FirstName;
	public String LastName;
	public String EmailAddress;
	public String BankAccountDetails;
    public String AccountNumber;
    public String AccountsPayableTaxType;
    public String AccountsRecievableTaxType;
    public String PurchasesDefaultAccountCode;
    public String SalesDefaultAccountCode;
    public String PurchasesDefaultLineAmountType;
	public List<Address> Addresses;
    public Decimal Discount;
    public String TaxNumber;
    public BatchPayments BatchPayments;
    public Bills Bills;
    public Sales Sales;
    public List<ContactPersons> ContactPersons;
    public List<PurchasesTrackingCategories> PurchasesTrackingCategories;
     public List<SalesTrackingCategories> SalesTrackingCategories;
	public List<Phone> Phones;
    public PaymentTerms PaymentTerms;
	public String UpdatedDateUTC;
	public Boolean IsSupplier;
	public Boolean IsCustomer;
	public Boolean HasAttachments;
	public Boolean HasValidationErrors;
    public List<XeroValidationError> ValidationErrors;

    public class Address {
        public String AddressType; // POBOX, STREET
        public String AddressLine1;
        public String AddressLine2;
        public String AddressLine3;
        public String AddressLine4;
        public String City;
        public String Region;
        public String PostalCode;
        public String Country;
        public String AttentionTo;

        public Address (String addressType, String addressLine1, String region, String city, String postalCode, String country) {

            this.AddressType = addressType;
            this.AddressLine1 = addressLine1;
            this.Region = region;
            this.City = city;
            this.PostalCode = postalCode;
            this.Country = country;

           
        }
    }
    public class BatchPayments {
        public String BankAccountNumber;
        public String BankAccountName;
        
        public BatchPayments(String bankAccountNumber, String bankAccountName) {
            this.BankAccountNumber = bankAccountNumber;
            this.BankAccountName =  bankAccountName;
        }
    }
    
    
    public class PaymentTerms{
        public Bills Bills;
        public Sales Sales;        
    }
    
    public class Bills{
		public Integer Day;
		public String Type;
        public Bills(Integer day, String type){
            this.Day = day;
            this.type = type;
        }
	}
    
     public class Sales{
		public Integer Day;
		public String Type;
        public Sales(Integer day, String type){
            this.Day = day;
            this.type = type;
        }
	}
    
    public class ContactPersons {
        public String FirstName;
        public String LastName;
        public String EmailAddress;
		public Boolean IncludeInEmails;
        
        public ContactPersons(String firstName, String lastName, String emailAddress, Boolean includeInEmails){
            this.FirstName = firstName;
            this.LastName = lastName;
            this.EmailAddress = emailAddress;
			this.IncludeInEmails = includeInEmails;
        }
    }

    public class Phone {

        public String PhoneType; // DEFAULT, DDI, MOBILE, FAX
        public String PhoneNumber;
        public String PhoneAreaCode;
        public String PhoneCountryCode;

        public Phone(String phoneNumber, String phoneType) {

            this.PhoneType = phoneType;
            this.PhoneNumber = phoneNumber;
        }   
    }
    
    public class PurchasesTrackingCategories{
        
        public String TrackingCategoryName; 
        public String TrackingOptionName;
       
        public PurchasesTrackingCategories(String trackingName, String trackingOption) {

            this.TrackingCategoryName = trackingName;
            this.TrackingOptionName = trackingOption;
        }   
        
    }
    
    public class SalesTrackingCategories{
        
        public String TrackingCategoryName; 
        public String TrackingOptionName;
       
        public SalesTrackingCategories(String trackingName, String trackingOption) {

            this.TrackingCategoryName = trackingName;
            this.TrackingOptionName = trackingOption;
        }  
        
    }
    
    
    // Constructor to convert Salesforce Account
    // To a Xero Contact
    public XeroContact(Account account) {

        
        //this.ContactID = account.Xero_Id__c;
        this.ContactStatus = 'ACTIVE';
        this.Name = account.Name;
        this.Addresses = new List<Address>();
        this.Phones = new List<Phone>();

        if (!account.Contacts.isEmpty()) {

            this.FirstName = account.Contacts[0].FirstName;
            this.LastName = account.Contacts[0].LastName;
            this.EmailAddress = account.Contacts[0].Email;
        }

       // this.addAddresses(account);
        //this.addPhones(account);
    }

    public XeroContact(String xeroContactId) {
        this.ContactID = xeroContactId;
    }

    /*public void addAddresses(Account account) {

        if (String.isNotBlank(account.BillingStreet)) {
            this.Addresses.add(new Address(account, 'POBOX'));
        }

        if (String.isNotBlank(account.ShippingStreet)) {
            this.Addresses.add(new Address(account, 'STREET'));
        }
    }*/

    public void addPhones(Account account) {

        if (String.isNotBlank(account.Phone)) {
            this.Phones.add(new Phone(account.Phone, 'DEFAULT'));
        }

        if (String.isNotBlank(account.Fax)) {
            this.Phones.add(new Phone(account.Fax, 'FAX'));
        }

        if (!account.Contacts.isEmpty() && String.isNotBlank(account.Contacts[0].MobilePhone)) {
            this.Phones.add(new Phone(account.Contacts[0].MobilePhone, 'MOBILE'));
        }
    }

    // Serialise to JSON String for Xero
    public String serialize() {
        return JSON.serialize(this, true);
    }

}