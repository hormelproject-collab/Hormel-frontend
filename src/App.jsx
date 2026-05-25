// import './App.css'

import Dashboard from './homePage/Dashboard'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SelectLocation from './createBom/SelectedLocation';
import ProducedItems from './createBom/ProducedItems';
import SelectedLocation from './createBom/SelectedLocation';
import ResourceComponentInfo from './createBom/ResourceComponentInfo';
import CreateBOM from './createBom/CreateBOM';
import EngineeringChangeLog from './EngineeringChange/Engineeringlog';
import DownloadBOM from './DownloadBom/DownloadBomData';


function App() {

  return (
    <BrowserRouter>
      <Routes>
        {/* Home */}
        <Route path="/" element={<Dashboard />} />
        {/* Engineering-change log */}
        <Route path="/change-log" element={<EngineeringChangeLog />} />
         {/* Download BOM */}
        <Route path="/download-bom" element={<DownloadBOM />} />
        {/* CreateBOM */}
        <Route path="/create-bom" element={<CreateBOM />} />
        {/* start from scratch  */}
        <Route path="/produced-items" element={<ProducedItems />} />  {/* step 1 */}
        <Route path="/select-location" element={<SelectedLocation />} />{/* step 2 */}
        <Route path="/resource-component" element={<ResourceComponentInfo />} /> {/* step 3 */}

      </Routes>
    </BrowserRouter>
  );

}

export default App
