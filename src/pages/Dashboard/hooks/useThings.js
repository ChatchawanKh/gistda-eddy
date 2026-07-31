// src/pages/Dashboard/hooks/useThings.js
import * as React from "react";
import { frostFetch } from "../api/frostClient";

// ดึงทุกสถานี พร้อม Location, Datastreams, ObservedProperty
// และค่าล่าสุด 1 จุดของแต่ละ Datastream ในการเรียกเดียว (nested $expand)
export function useThings() {
  const [things, setThings] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const reload = React.useCallback(() => {
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

  React.useEffect(() => reload(), [reload]);

  return { things, loading, error, reload };
}
