public class XeroUtilApi {
    
    // Get XeroTenantId
    
    public static String getXeroTenantId () {
        
        HttpResponse response = XeroAPICalloutService.executeCallout('GET', 'connections', null, null); 
        
        if(response.getStatusCode() == 200) {
             // Deserialize the response body into a Map<String, Object>
            List<Object> responseList = (List<Object>)JSON.deserializeUntyped(response.getBody());
             if (!responseList.isEmpty()) {
                // Assuming you want the tenantId from the first object in the list
                Map<String, Object> connection = (Map<String, Object>)responseList.get(0);
                
                // Extract the tenantId
                String xeroTenantId = (String)connection.get('tenantId');
                
               return xeroTenantId;
            } else {
                return 'No connections found in the response.';
            }
        } else {
            return 'Failed to call Xero API. Status Code: ' + response.getStatusCode();
        }
    }
    
    

}