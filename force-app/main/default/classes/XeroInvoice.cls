/**
* Author: 
* @description Wrapper class for serialising and de-serialising Xero Invoices
*
* CHANGE LOG
**/
public class XeroInvoice {
    public String Type; //ACCREC
    public String InvoiceID; //94b8a8d6-31fd-4d8c-8791-d1a2a7dfe898
    public String InvoiceNumber; //asdsdasd
    public String Reference; //ABC123
    public XeroContact Contact;
    public String Date_x; //2019-08-20T00:00:00
    public String DueDate; //2019-08-20T00:00:00
    public String BrandingThemeID;
    public String DateString;
    public String DueDateString;
    
    public Boolean SentToContact;
    public Decimal AmountDue;
    public Decimal AmountPaid; 
    public Decimal AmountCredited; 
    public Decimal CurrencyRate;
    public Boolean IsDiscounted;
    public Boolean HasAttachments;
    public Boolean HasErrors;
    
    public String Status; //AUTHORISED
    public String LineAmountTypes; //Exclusive
    public Decimal SubTotal; //100
    public Decimal TotalTax; //15
    public Decimal Total; //115
    public String UpdatedDateUTC; ///Date(1566260876040+0000)/
    public String CurrencyCode; //NZD
    public String Url;
    
    public List<LineItem> LineItems;
    public List<Payment> Payments;
    public List<CreditNote> CreditNotes;
    public List<PrePayment> Prepayments;
    public List<OverPayment> Overpayments;
    
    public List<XeroValidationError> ValidationErrors;
    
    public class Payment {
        public String PaymentID;
        public Decimal CurrencyRate;
        public Decimal Amount;
        public String Date_x;
        public Boolean HasAccount;
        
    }
    
    public class CreditNote {
    }
    
    public class PrePayment {
    }
    
    public class OverPayment {
    }
    
    public class LineItem {
        public String Name;
        public String LineItemID; //006fc261-ee0b-4f4c-bb55-c96ca97cdb53
        public String Description; //Some Stufff
        public String AccountCode; //200
        public String TaxType; //OUTPUT2
        public Decimal UnitAmount; //100
        public Decimal Discount;
        public Decimal TaxAmount; //15
        public Decimal LineAmount; //100
        public Decimal Quantity; //1
        public List<TrackingCategory> Tracking;
        public List<XeroValidationError> ValidationErrors;
        
        public LineItem(
            String name,
            String lineItemID,
            String description,
            String accountCode,
            String taxType,
            Decimal discount,
            Decimal unitAmount,
            Decimal taxAmount,
            Decimal lineAmount,
            Decimal quantity,
            List<TrackingCategory> tracking,
            List<XeroValidationError> validationErrors
        ) {
            this.Name = name;
            this.LineItemID = lineItemID;
            this.Description = description;
            this.AccountCode = accountCode;
            this.TaxType = taxType;
            this.Discount = discount;
            this.UnitAmount = unitAmount;
            this.TaxAmount = taxAmount;
            this.LineAmount = lineAmount;
            this.Quantity = quantity;
            this.Tracking = tracking;
            this.validationErrors = validationErrors;
        }
    }
    
    public class TrackingCategory {
        public String Name;
        public String Option;
        
        public TrackingCategory(String name, String option) {
            this.Name = name;
            this.Option = option;
        }
    }
    
    public XeroInvoice() {
        
        // Pass in default values here
        this.Type = 'ACCREC';
        
        // Set the parent account
    }
    
    public String serialize() {
        // Serialise the full XeroInvoice object into a string
        String serialized = JSON.serialize(this, true);
        
        // Replace the _x with the correct format
        //serialized = serialized.replace('"Date_x"', '"Date"');
        
        return serialized;
    }
}