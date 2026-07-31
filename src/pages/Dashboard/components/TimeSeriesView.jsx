// src/pages/Dashboard/components/TimeSeriesView.jsx
import * as React from "react";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

import { frostFetch } from "../api/frostClient";

export default function TimeSeriesView({ datastreams, loading: loadingThings }) {
  const theme = useTheme();
  const { text, background, divider } = theme.palette;
  const [selectedId, setSelectedId] = React.useState("");
  const [rows, setRows] = React.useState([]);
  const [fetching, setFetching] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (!selectedId) return;
    let active = true;
    setFetching(true);
    setError(null);
    frostFetch(
      `/Datastreams(${selectedId})/Observations?$orderby=phenomenonTime desc&$top=50`
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
  }, [selectedId]);

  return (
    <>
      <Typography sx={{ fontSize: 20, fontWeight: 500, color: text.head, mb: 2 }}>
        กราฟข้อมูลตามเวลา
      </Typography>

      <FormControl size="small" sx={{ minWidth: 320, mb: 2 }}>
        <InputLabel>เลือกตัวแปรที่ต้องการดู</InputLabel>
        <Select
          label="เลือกตัวแปรที่ต้องการดู"
          value={selectedId}
          disabled={loadingThings}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          {datastreams.map((ds) => (
            <MenuItem key={ds["@iot.id"]} value={ds["@iot.id"]}>
              {ds.thingName} · {ds.ObservedProperty?.name || ds.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {fetching && <CircularProgress size={20} sx={{ mb: 2 }} />}

      {!fetching && selectedId && (
        <TableContainer
          sx={{
            border: `1px solid ${divider}`,
            borderRadius: `${theme.shape.borderRadius + 2}px`,
            bgcolor: background.paper,
            maxHeight: 420,
          }}
        >
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>เวลา (phenomenonTime)</TableCell>
                <TableCell>ค่า</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((obs) => (
                <TableRow key={obs["@iot.id"]}>
                  <TableCell>{new Date(obs.phenomenonTime).toLocaleString("th-TH")}</TableCell>
                  <TableCell>{obs.result}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {!selectedId && !fetching && (
        <Typography sx={{ fontSize: 13, color: text.secondary }}>
          เลือกตัวแปรด้านบนเพื่อดูข้อมูลย้อนหลัง 50 จุดล่าสุด
        </Typography>
      )}
    </>
  );
}
