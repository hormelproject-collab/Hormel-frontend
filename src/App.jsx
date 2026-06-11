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
import ReviewSummary from './createBom/AddItemBOMRoutingRecord/ReviewSummary';
import BomUpload from './BomUpload';
import DeleteBomHome from './DeleteBOM/DeleteBOMDashboard';
import DeleteExistingBomStep1 from './DeleteBOM/DeleteExistingBOM';
import DeleteBomSummaryStep2 from './DeleteBOM/DeleteBOMSummary';
import DeleteExistingItemBomRoutingStep1 from './DeleteBOM/DeleteExistingIBR';
import DeleteItemBomRoutingSummaryStep2 from './DeleteBOM/DeleteExistingIBRSummary';
import EngineeringChangeDetailAdd from './EngineeringChange/EngineeringChangesDetail_Add';
import EngineeringChangeDetailDeleteBOM from './EngineeringChange/EngineeringChangesDetail_Delete';
import ViewBomData from './ViewBomData/ViewBomData';

function App() {

  return (
    <BrowserRouter>
      <Routes>
        {/* Home */}
        <Route path="/" element={<Dashboard />} />
        {/* Engineering-change log */}
        <Route path="/change-log" element={<EngineeringChangeLog />} />
        <Route path="/change-log/engineering-change-detail-add" 
        element={<EngineeringChangeDetailAdd />} />

        <Route
          path="/change-log/engineering-change-detail-delete-bom"
          element={<EngineeringChangeDetailDeleteBOM />}
        />

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
        <Route path="/review-summary" element={<ReviewSummary />} />
        {/* Delete BOM */}
        <Route path="/delete-bom-dashboard" element={<DeleteBomHome />} />
        <Route path="/delete-bom-dashboard/delete-existing-bom" element={<DeleteExistingBomStep1 />} />
        <Route path="/delete-bom-dashboard/delete-existing-bom/summary" element={<DeleteBomSummaryStep2 />} />
        {/* Delete IBR */}
        <Route path="/delete-bom-dashboard/delete-existing-ibr" element={<DeleteExistingItemBomRoutingStep1 />} />
        <Route path="/delete-bom-dashboard/delete-existing-ibr/summary" element={<DeleteItemBomRoutingSummaryStep2 />} />
       {/* View Bom */}
        <Route path="/view-bom-data" element={<ViewBomData />} />
       
      
      </Routes>
    </BrowserRouter>
  );

}

export default App
