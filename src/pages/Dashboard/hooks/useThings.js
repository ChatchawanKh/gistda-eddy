import { useState, useEffect, useCallback } from "react";
import { frostFetch } from "../api/frostClient";

export function useThings() {
  const [things, setThings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(() => {
    let active = true;
    setLoading(true);
    setError(null);
    frostFetch(
      "/Things?$expand=Locations,Datastreams($select=name,description,unitOfMeasurement,@iot.id" +
        ";$expand=ObservedProperty($select=name),Observations($orderby=phenomenonTime desc;$top=1))"
    )
      .then((data) => {
        if (active) setThings(data.value || []);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount: loading/error เริ่มต้นเป็นค่าเดิมอยู่แล้ว, ผลลัพธ์ตั้ง state หลัง await
  useEffect(() => reload(), [reload]);

  return { things, loading, error, reload };
}
