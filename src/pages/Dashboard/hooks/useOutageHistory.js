// ดึงเวลาของ Observation (เฉพาะ phenomenonTime) ของสถานีหนึ่ง ตั้งแต่ from ถึงปัจจุบัน
// เพื่อหาช่วงที่ขาดข้อมูลฝั่ง client — ใช้ตัวแปรตัวแทน 1 ตัวต่ออุปกรณ์ (Sensor.name)
// เพราะตัวแปรของอุปกรณ์เดียวกันมาจากไฟล์เดียวกัน เวลาจึงตรงกัน
// ดึงค่าก่อน from เพิ่ม 1 ค่า เพื่อให้รู้ว่าช่วงที่ขาดซึ่งเริ่มก่อน from เริ่มเมื่อไร
// from = null → ดึงทั้งหมด
import { useState, useEffect } from "react";
import { frostFetch, frostFetchAll } from "../api/frostClient";
import { sensorNameOf, latestTimeOf } from "../utils/alertStatus";

// phenomenonTime อาจเป็น interval "start/end" — ใช้เวลาสิ้นสุด
function toMs(phenomenonTime) {
  return new Date(String(phenomenonTime).split("/").pop()).getTime();
}

function pickRepresentatives(thing) {
  const map = new Map();
  (thing?.Datastreams || []).forEach((ds) => {
    const key = sensorNameOf(ds);
    const current = map.get(key);
    // เลือกตัวที่มีข้อมูลล่าสุดใหม่สุดของอุปกรณ์ (ISO UTC เทียบแบบ string ได้)
    if (!current || (latestTimeOf(ds) || "") > (latestTimeOf(current) || "")) {
      map.set(key, ds);
    }
  });
  return Array.from(map, ([name, ds]) => ({ name, ds }));
}

async function fetchTimes(id, from) {
  const base = `/Datastreams(${id})/Observations?$select=phenomenonTime`;
  const inRange = frostFetchAll(
    `${base}&$orderby=phenomenonTime asc&$top=5000` +
      (from ? `&$filter=phenomenonTime ge ${from}` : ""),
  );
  const before = from
    ? frostFetch(
        `${base}&$orderby=phenomenonTime desc&$top=1&$filter=phenomenonTime lt ${from}`,
      ).then((data) => data.value || [])
    : Promise.resolve([]);
  const [rows, prev] = await Promise.all([inRange, before]);
  return [...prev, ...rows]
    .map((o) => toMs(o.phenomenonTime))
    .filter(Number.isFinite);
}

export function useOutageHistory(thing, from) {
  const [sensors, setSensors] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect --
       fetch lifecycle เดียวกับ useObservationsRange */
    const reps = pickRepresentatives(thing);
    if (!reps.length) {
      setSensors([]);
      return;
    }
    let active = true;
    setFetching(true);
    setError(null);
    /* eslint-enable react-hooks/set-state-in-effect */

    Promise.allSettled(reps.map((r) => fetchTimes(r.ds["@iot.id"], from)))
      .then((results) => {
        if (!active) return;
        const next = [];
        let failed = 0;
        results.forEach((r, i) => {
          if (r.status === "fulfilled") {
            next.push({ name: reps[i].name, times: r.value });
          } else {
            failed += 1;
          }
        });
        setSensors(next);
        if (failed) setError(`ดึงข้อมูลไม่สำเร็จ ${failed} อุปกรณ์`);
      })
      .finally(() => {
        if (active) setFetching(false);
      });

    return () => {
      active = false;
    };
  }, [thing, from]);

  return { sensors, fetching, error };
}
