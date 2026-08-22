import './manual.css';
import ManualAccessBar from './ManualAccessBar';
import ReportDeliveryControl from './ReportDeliveryControl';

export default function ManualLayout({children}:{children:React.ReactNode}){
  return <div className="thyrocare-manual">
    <ManualAccessBar/>
    <ReportDeliveryControl/>
    {children}
  </div>;
}
