public class XeroAPICalloutService {
    
    public static HttpResponse executeCallout (String method, String resourceName, String requestBody, Map<String, String> headers) {
        
        String errorMessage = '';
        
        HttpRequest request = new HttpRequest();
        request.setMethod(method);
        request.setEndpoint( 'callout:XeroIntegrationCredentials/' + (resourceName.equalsIgnoreCase('connections') ? 'connections': 'api.xro/2.0/' + resourceName) );
        
        request.setHeader('Accept', 'application/json');
        
        if(resourceName.equalsIgnoreCase('connections')){
            request.setHeader('xero-tenant-id', '');
        }else{
            request.setHeader('xero-tenant-id', XeroUtilApi.getXeroTenantId());
        }
        
        request.setTimeout(120000);
        if (String.isNotBlank(requestBody)) {
            request.setBody(requestBody);
            request.setHeader('Content-Type', 'application/json');
        }
        
        if (headers != null && !headers.isEmpty()) {
            for (String headerKey :headers.keySet()) {
                request.setHeader(headerKey, headers.get(headerKey));
            }
        }
        
        HttpResponse response = new HttpResponse();
        
        try{
            
            response = new Http().send(request);
            
        }catch(System.Exception  ex){
            if(String.valueOf(ex.getMessage()).startsWith('Unauthorized endpoint')){
                errorMessage = 'Unauthorize endpoint: An Administer must go to Setup -> Administer -> Security Control ->'
                    +' Remote Site Setting and add '+' '+ request.getEndpoint() +' Endpoint';
            }else{
                errorMessage = 'Unexpected Error while communicating with API. '
                    +'Status '+response.getStatus()+' and Status Code '+response.getStatuscode()+
                    response.getBody();
            }
        }
        
        return response;
    }  

}