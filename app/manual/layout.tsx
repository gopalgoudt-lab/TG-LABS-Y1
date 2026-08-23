import './manual.css';
import ManualAccessBar from './ManualAccessBar';
import ReportDeliveryControl from './ReportDeliveryControl';
import DiscountPercentEnhancer from './DiscountPercentEnhancer';
import BillReportShareEnhancer from './BillReportShareEnhancer';
import DeleteUploadedFilesEnhancer from './DeleteUploadedFilesEnhancer';
import OrderWorkflowEnhancer from './OrderWorkflowEnhancer';
import PaymentCollectionEnhancer from './PaymentCollectionEnhancer';

export default function ManualLayout({children}:{children:React.ReactNode}){
  return <div className="thyrocare-manual">
    <ManualAccessBar/>
    <ReportDeliveryControl/>
    <DiscountPercentEnhancer/>
    <BillReportShareEnhancer/>
    <DeleteUploadedFilesEnhancer/>
    <OrderWorkflowEnhancer/>
    <PaymentCollectionEnhancer/>
    {children}
  </div>;
}
