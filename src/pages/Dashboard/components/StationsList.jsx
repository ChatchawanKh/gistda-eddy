import * as React from "react";
import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";

import StationDatastreamsTable from "./StationDatastreamsTable";

export default function StationsList({ things, loading, error }) {
  const theme = useTheme();
  const { text } = theme.palette;

  if (loading) return <CircularProgress size={20} />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <>
      <Typography sx={{ fontSize: 20, fontWeight: 500, color: text.head, mb: 2 }}>
        สถานีตรวจวัด
      </Typography>
      {things.map((t) => (
        <Box key={t["@iot.id"]} sx={{ mb: 3 }}>
          <StationDatastreamsTable thing={t} />
        </Box>
      ))}
    </>
  );
}
