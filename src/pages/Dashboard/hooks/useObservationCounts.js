// นับจำนวน Observation ของหลาย Datastream ภายในช่วงเวลา from/to (ISO string)
// ใช้ $count ของ FROST-Server ($top=0 จึงไม่ดึงข้อมูลจริงมา) — คืนค่าเป็น
// { [datastreamId]: count } ตัวไหน query ไม่สำเร็จจะไม่มี key นั้น
import { useState, useEffect } from "react";
import { frostFetch } from "../api/frostClient";

export function useObservationCounts(datastreamIds, from, to) {
  const [counts, setCounts] = useState({});
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);
  // join เป็น string ให้ dependency ของ effect คงที่ แม้ array ถูกสร้างใหม่ทุก render
  const idsKey = (datastreamIds || []).join(",");

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect --
       fetch lifecycle เดียวกับ useObservationsRange */
    if (!idsKey || !from || !to) {
      setCounts({});
      return;
    }
    let active = true;
    setFetching(true);
    setError(null);
    /* eslint-enable react-hooks/set-state-in-effect */

    const ids = idsKey.split(",");
    Promise.allSettled(
      ids.map((id) =>
        frostFetch(
          `/Datastreams(${id})/Observations?$filter=phenomenonTime ge ${from} and phenomenonTime le ${to}&$count=true&$top=0`,
        ).then((data) => [id, data["@iot.count"]]),
      ),
    )
      .then((results) => {
        if (!active) return;
        const next = {};
        let failed = 0;
        results.forEach((r) => {
          if (r.status === "fulfilled" && Number.isFinite(r.value[1])) {
            next[r.value[0]] = r.value[1];
          } else {
            failed += 1;
          }
        });
        setCounts(next);
        if (failed) setError(`นับจำนวนข้อมูลไม่สำเร็จ ${failed} ตัวแปร`);
      })
      .finally(() => {
        if (active) setFetching(false);
      });

    return () => {
      active = false;
    };
  }, [idsKey, from, to]);

  return { counts, fetching, error };
}
