import { useOutletContext } from "react-router-dom";

import AlertsView from "./components/AlertsView";

export default function AlertsPage() {
  const { things, loading } = useOutletContext();
  return <AlertsView things={things} loading={loading} />;
}
