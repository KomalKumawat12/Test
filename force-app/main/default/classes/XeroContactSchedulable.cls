public class XeroContactSchedulable implements Schedulable{
    public void execute(SchedulableContext SC){
       CreateXeroRecords.retrieveAndCreateXeroContact();
    }

}