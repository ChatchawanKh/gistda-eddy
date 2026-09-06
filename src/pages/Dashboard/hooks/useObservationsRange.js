// ดึง Observations ของ Datastream หนึ่งตัวภายในช่วงเวลา from/to (ISO string)
// ใช้ร่วมกันโดยทุกกราฟใน Insight Dashboard เพื่อ query ตาม date range เดียวกัน
import { useState, useEffect } from "react";
import { frostFetch } from "../api/frostClient";

const MAX_POINTS = 3000;

export function useObservationsRange(datastreamId, from, to) {
  const [rows, setRows] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect --
       fetch lifecycle: เคลียร์ rows เมื่อ params ไม่ครบ และตั้ง fetching/error
       ก่อนเริ่ม fetch เป็น pattern มาตรฐานของ data fetching (ผลลัพธ์ตั้ง state หลัง await) */
    if (!datastreamId || !from || !to) {
      setRows([]);
      return;
    }
    let active = true;
    setFetching(true);
    setError(null);
    /* eslint-enable react-hooks/set-state-in-effect */

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
