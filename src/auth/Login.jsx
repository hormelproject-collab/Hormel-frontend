import { useMsal } from "@azure/msal-react";
import { loginRequest } from "./msalConfig";

export default function LoginButton() {
  const { instance } = useMsal();

  const handleLogin = async () => {
    await instance.loginPopup(loginRequest);
  };

  return (
    <button onClick={handleLogin}>
      Microsoft Login
    </button>
  );
}