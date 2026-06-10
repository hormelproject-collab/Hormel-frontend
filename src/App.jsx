// import './App.css'

import Dashboard from './homePage/Dashboard'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SelectLocation from './createBom/startFromScratch/SelectedLocation';
import ProducedItems from './createBom/startFromScratch/ProducedItems';
import SelectedLocation from './createBom/startFromScratch/SelectedLocation';
import ResourceComponentInfo from './createBom/startFromScratch/ResourceComponentInfo';
import CreateBOM from './createBom/CreateBOM';
import SelectExistingBOM from './createBom/startFromExisting/SelectExistingBOM';
import ModifyExistingBOM from './createBom/startFromExisting/ModifyExistingBOM';
import EngineeringChangeLog from './EngineeringChange/Engineeringlog';
import EngineeringChangeDetail from './EngineeringChange/EngineeringChangesDetail';
import DownloadBOM from './DownloadBom/DownloadBomData';
import SummaryPage from './createBom/Summary';
import CreateItemBOMRoutingRecord from './createBom/AddItemBOMRoutingRecord/CreateItemBOMRoutingRecord';
import ModifySelectExistingBOM from './modifyBom/ModifySelectExistingBOM';
import ModifyExistingBOMData from './modifyBom/ModifyExistingBOMData';
import ModifyExistingBOMSummary from './modifyBom/ModifyExistingBOMSummary';

function App() {

  return (
    <BrowserRouter>
      <Routes>
        {/* Home */}
        <Route path="/" element={<Dashboard />} />
        {/* Engineering-change log */}
        <Route path="/change-log" element={<EngineeringChangeLog />} />
        <Route path="/change-log-details" element={<EngineeringChangeDetail />} />
         {/* Download BOM */}
        <Route path="/download-bom" element={<DownloadBOM />} />
        {/* CreateBOM */}
        <Route path="/create-bom" element={<CreateBOM />} />

        {/* start from scratch  */}
        <Route path="/produced-items" element={<ProducedItems />} />  {/* step 1 */}
        <Route path="/select-location" element={<SelectedLocation />} />{/* step 2 */}
        <Route path="/resource-component" element={<ResourceComponentInfo />} /> {/* step 3 */}
         <Route path="/summary" element={<SummaryPage />} /> {/* step 4 */}

        {/* Start from Existing BOM*/}
        <Route path="/select-existing-bom" element={<SelectExistingBOM />} /> {/* step 1 */}
        <Route path="/modify-existing-bom/:id" element={<ModifyExistingBOM />} /> {/* step 2 */}

        {/* Add Item BOM Routing Record */}
        <Route path="/create-item-bom-routing-record" element={<CreateItemBOMRoutingRecord />} /> {/* step 1 */}

        {/* Modify Select Existing BOM */}
        {/* step 1 */}
        <Route path="/modify-select-existing-bom" element={<ModifySelectExistingBOM />} /> 
        {/* step 2 */}
        <Route path="/modify-existing-bom-data/:id" element={<ModifyExistingBOMData />} /> 
        {/* step 3 */}
        <Route path="/review-changes" element={<ModifyExistingBOMSummary />} /> 

      </Routes>
    </BrowserRouter>
  );

}

export default App
