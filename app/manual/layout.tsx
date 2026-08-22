import './manual.css';
import ManualAccessBar from './ManualAccessBar';
import ReportDeliveryControl from './ReportDeliveryControl';
import DiscountPercentEnhancer from './DiscountPercentEnhancer';
import BillReportShareEnhancer from './BillReportShareEnhancer';

export default function ManualLayout({children}:{children:React.ReactNode}){
  return <div className="thyrocare-manual">
    <ManualAccessBar/>
    <ReportDeliveryControl/>
    <DiscountPercentEnhancer/>
    <BillReportShareEnhancer/>
    {children}
  </div>;
}
