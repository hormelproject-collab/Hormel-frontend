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
import EngineeringChangeDetailModify from './EngineeringChange/EngineeringChangesDetail_modify';
import DownloadBOM from './DownloadBom/DownloadBomData';
import SummaryPage from './createBom/Summary';
import CreateItemBOMRoutingRecord from './createBom/AddItemBOMRoutingRecord/CreateItemBOMRoutingRecord';
import ModifySelectExistingBOM from './modifyBom/ModifySelectExistingBOM';
import ModifyExistingBOMData from './modifyBom/ModifyExistingBOMData';
import ModifyExistingBOMSummary from './modifyBom/ModifyExistingBOMSummary';
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
import Login from './auth/Login';
import ProtectedRoute from './auth/ProtectedRoute';
import { AuthProvider } from './auth/AuthProvider';

const protect = (element) => <ProtectedRoute>{element}</ProtectedRoute>;

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Login */}
          {/*<Route path="/login" element={<Login />} />*/}

          {/* Home */}
          <Route path="/" element={protect(<Dashboard />)} />

          {/* Engineering-change log */}
          <Route path="/change-log" element={protect(<EngineeringChangeLog />)} />
          <Route
            path="/change-log/engineering-change-detail-add"
            element={protect(<EngineeringChangeDetailAdd />)}
          />
          <Route
            path="/change-log/engineering-change-detail-delete-bom"
            element={protect(<EngineeringChangeDetailDeleteBOM />)}
          />
          <Route
            path="/change-log/engineering-change-detail-modify"
            element={protect(<EngineeringChangeDetailModify />)}
          />

          {/* Download BOM */}
          <Route path="/download-bom" element={protect(<DownloadBOM />)} />

          {/* Create BOM */}
          <Route path="/create-bom" element={protect(<CreateBOM />)} />

          {/* Start from Scratch */}
          <Route path="/produced-items" element={protect(<ProducedItems />)} />
          <Route path="/select-location" element={protect(<SelectedLocation />)} />
          <Route path="/resource-component" element={protect(<ResourceComponentInfo />)} />
          <Route path="/summary" element={protect(<SummaryPage />)} />

          {/* Start from Existing BOM */}
          <Route path="/select-existing-bom" element={protect(<SelectExistingBOM />)} />
          <Route path="/modify-existing-bom/:id" element={protect(<ModifyExistingBOM />)} />

          {/* Add Item BOM Routing Record */}
          <Route path="/create-item-bom-routing-record" element={protect(<CreateItemBOMRoutingRecord />)} />

          {/* Modify Existing BOM */}
          <Route path="/modify-select-existing-bom" element={protect(<ModifySelectExistingBOM />)} />
          <Route path="/modify-existing-bom-data/:id" element={protect(<ModifyExistingBOMData />)} />
          <Route path="/review-changes" element={protect(<ModifyExistingBOMSummary />)} />
          <Route path="/review-summary" element={protect(<ReviewSummary />)} />

          {/* Delete BOM */}
          <Route path="/delete-bom-dashboard" element={protect(<DeleteBomHome />)} />
          <Route
            path="/delete-bom-dashboard/delete-existing-bom"
            element={protect(<DeleteExistingBomStep1 />)}
          />
          <Route
            path="/delete-bom-dashboard/delete-existing-bom/summary"
            element={protect(<DeleteBomSummaryStep2 />)}
          />

          {/* Delete IBR */}
          <Route
            path="/delete-bom-dashboard/delete-existing-ibr"
            element={protect(<DeleteExistingItemBomRoutingStep1 />)}
          />
          <Route
            path="/delete-bom-dashboard/delete-existing-ibr/summary"
            element={protect(<DeleteItemBomRoutingSummaryStep2 />)}
          />

          {/* View BOM */}
          <Route path="/view-bom-data" element={protect(<ViewBomData />)} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
