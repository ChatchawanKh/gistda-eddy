// src/pages/Dashboard/hooks/useObservationsRange.js
// ดึง Observations ของ Datastream หนึ่งตัว ภายในช่วงเวลาที่กำหนด (from/to เป็น
// ISO string) ใช้ร่วมกันโดยทุกกราฟใน Insight Dashboard (DashboardInsight.jsx)
// เพื่อให้ทุกกราฟ query ตาม date range เดียวกันได้
import * as React from "react";
import { frostFetch } from "../api/frostClient";

const MAX_POINTS = 3000;

export function useObservationsRange(datastreamId, from, to) {
  const [rows, setRows] = React.useState([]);
  const [fetching, setFetching] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (!datastreamId || !from || !to) {
      setRows([]);
      return;
    }
    let active = true;
    setFetching(true);
    setError(null);

    frostFetch(
      `/Datastreams(${datastreamId})/Observations?$filter=phenomenonTime ge ${from} and phenomenonTime le ${to}&$orderby=phenomenonTime asc&$top=${MAX_POINTS}`
    )
      .then((data) => {
        if (active) setRows(data.value || []);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setFetching(false);
      });

    return () => {
      active = false;
    };
  }, [datastreamId, from, to]);

  return { rows, fetching, error };
}
