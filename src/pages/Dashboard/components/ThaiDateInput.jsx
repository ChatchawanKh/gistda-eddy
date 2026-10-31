// ช่องพิมพ์วันที่แบบ วว/ดด/ปปปป (ปี พ.ศ.) — พิมพ์แค่ตัวเลขแล้ว "/" จะเติมให้เอง
// value/onChange เป็น Date (เที่ยงคืน UTC) หรือ null ถ้ายังพิมพ์ไม่ครบ/ไม่ถูกต้อง
import { useState } from "react";
import TextField from "@mui/material/TextField";

import {
  formatDateDigits,
  normalizeDateInput,
  parseThaiDate,
  formatThaiDate,
} from "../utils/thaiDate";

const timeOf = (d) => (d ? d.getTime() : null);

export default function ThaiDateInput({
  label,
  value,
  onChange,
  onFocus,
  onEnter,
  active,
  error,
}) {
  const [text, setText] = useState(() => formatThaiDate(value));
  const [touched, setTouched] = useState(false);

  // value เปลี่ยนจากภายนอก (คลิกปฏิทิน/preset) → เขียนข้อความใหม่ แต่ถ้า value
  // มาจากข้อความที่กำลังพิมพ์อยู่เอง (รวมถึง null ตอนยังพิมพ์ไม่ครบ) ไม่ต้องทับ
  const [syncedTime, setSyncedTime] = useState(timeOf(value));
  if (timeOf(value) !== syncedTime) {
    setSyncedTime(timeOf(value));
    if (timeOf(value) !== timeOf(parseThaiDate(text).date)) {
      setText(formatThaiDate(value));
      setTouched(false);
    }
  }

  const handleChange = (e) => {
    const raw = e.target.value;
    const deleting = raw.length < text.length;
    const next = formatDateDigits(normalizeDateInput(raw), !deleting);
    setText(next);
    onChange(parseThaiDate(next).date);
  };

  const parsed = parseThaiDate(text);
  const incomplete = text !== "" && !parsed.date && !parsed.error;
  const message =
    parsed.error || (touched && incomplete ? "กรอกให้ครบ วว/ดด/ปปปป" : null) || error;

  return (
    <TextField
      size="small"
      label={label}
      value={text}
      placeholder="วว/ดด/ปปปป"
      onChange={handleChange}
      onFocus={onFocus}
      onBlur={() => setTouched(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onEnter?.();
      }}
      error={Boolean(message)}
      helperText={message || " "}
      focused={active || undefined}
      slotProps={{
        htmlInput: { inputMode: "numeric", autoComplete: "off", maxLength: 10 },
        formHelperText: { sx: { mx: 0.25, fontSize: 11, lineHeight: 1.3 } },
      }}
      sx={{
        flex: 1,
        minWidth: 0,
        "& .MuiInputBase-input": { fontSize: 13, letterSpacing: 0.3 },
        "& .MuiInputLabel-root": { fontSize: 13 },
      }}
    />
  );
}
