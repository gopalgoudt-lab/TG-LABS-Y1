import './manual.css';
import ManualAccessBar from './ManualAccessBar';

export default function ManualLayout({children}:{children:React.ReactNode}){
  return <div className="thyrocare-manual">
    <ManualAccessBar/>
    {children}
  </div>;
}
