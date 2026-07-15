// import { useMsal } from "@azure/msal-react";
// import { loginRequest } from "../auth/msalConfig";

// const ProtectedRoute = ({ children }) => {
//     const { instance, accounts } = useMsal();

//     if (!accounts || accounts.length === 0) {
//         instance.loginRedirect(loginRequest);
//         return <div>Redirecting to Microsoft Login...</div>;
//     }

//     return children;
// };

// export default ProtectedRoute;

export default function ProtectedRoute({ children }) {
  return children;
}
