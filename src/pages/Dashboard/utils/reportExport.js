// src/pages/Dashboard/utils/reportExport.js
// สร้างไฟล์ Summary Report ของสถานีหนึ่งในช่วงเวลาที่เลือก จากข้อมูลใน FROST
// - .txt : รูปแบบเดียวกับไฟล์ EddyPro full output ของ FluxSuite (tab คั่น,
//          แถว DATAH = ชื่อคอลัมน์, DATAU = หน่วย, DATA = ข้อมูล, ค่าว่าง = NaN)
//          ผู้ใช้ที่เคยใช้ FluxSuite เปิดด้วยเครื่องมือเดิมได้
// - .csv : comma คั่น แถวหัวเดียว (ชื่อคอลัมน์ [หน่วย]) ค่าว่าง = ช่องว่าง
//          มี BOM ให้ Excel อ่านภาษาไทย/สัญลักษณ์ µ ถูก
// ทั้งสองไฟล์มีแค่ตัวแปรที่ FROST มี (16 ตัว) ไม่ใช่ครบ 228 คอลัมน์ของ EddyPro
// และค่าเป็นค่าตามที่ FROST เก็บ ไม่มีการปัด/แปลงหน่วย

import { frostFetchAll } from "../api/frostClient";

// ชื่อคอลัมน์ของตัวแปร: ใช้ eddypro_column ถ้ามี (ตรงกับไฟล์ต้นทาง)
// ไม่มีก็ใช้ชื่อ ObservedProperty/Datastream แทนช่องว่างด้วย _
function columnName(ds) {
  const col = ds.properties?.eddypro_column;
  if (col) return col;
  return String(ds.ObservedProperty?.name || ds.name || `ds_${ds["@iot.id"]}`)
    .trim()
    .replace(/\s+/g, "_");
}

// ดึง Observation ทั้งหมดในช่วง (ทุกหน้า) ของทุก Datastream แล้วรวมเป็นตาราง
// แถวละ 1 เวลา — คืนค่า { columns, rows } โดย rows เรียงตามเวลา
// rows[i] = { time: ISO string, values: { [datastreamId]: number } }
export async function fetchReportTable(thing, from, to, onProgress) {
  const datastreams = thing?.Datastreams || [];
  let done = 0;
  const results = await Promise.all(
    datastreams.map(async (ds) => {
      const obs = await frostFetchAll(
        `/Datastreams(${ds["@iot.id"]})/Observations` +
          `?$filter=phenomenonTime ge ${from} and phenomenonTime le ${to}` +
          `&$select=phenomenonTime,result&$orderby=phenomenonTime asc&$top=10000`,
      );
      done += 1;
      onProgress?.(done, datastreams.length);
      return [ds, obs];
    }),
  );

  const byTime = new Map();
  results.forEach(([ds, obs]) => {
    obs.forEach((o) => {
      if (!byTime.has(o.phenomenonTime)) byTime.set(o.phenomenonTime, {});
      byTime.get(o.phenomenonTime)[ds["@iot.id"]] = o.result;
    });
  });

  const rows = Array.from(byTime.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([time, values]) => ({ time, values }));

  const columns = datastreams.map((ds) => ({
    id: ds["@iot.id"],
    name: columnName(ds),
    unit: ds.unitOfMeasurement?.symbol || "",
  }));

  return { columns, rows };
}

// แยก date/time จาก phenomenonTime ตามตัวเลขที่ FROST เก็บ (ส่วน UTC ของสตริง)
// ไม่แปลง timezone — ดูประเด็นเวลาคลาด 7 ชั่วโมงใน docs/frost-data-issues.md
function splitDateTime(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return {
    date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`,
  };
}

function isNumber(v) {
  return typeof v === "number" && Number.isFinite(v);
}

export function buildTxt({ columns, rows }) {
  const lines = [
    ["DATAH", "date", "time", ...columns.map((c) => c.name)].join("\t"),
    ["DATAU", "[yyyy-mm-dd]", "[HH:MM]", ...columns.map((c) => `[${c.unit || "#"}]`)].join("\t"),
    ...rows.map(({ time, values }) => {
      const { date, time: hhmm } = splitDateTime(time);
      return [
        "DATA",
        date,
        hhmm,
        ...columns.map((c) => (isNumber(values[c.id]) ? String(values[c.id]) : "NaN")),
      ].join("\t");
    }),
  ];
  return lines.join("\r\n") + "\r\n";
}

function csvCell(value) {
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildCsv({ columns, rows }) {
  const header = [
    "date",
    "time",
    ...columns.map((c) => (c.unit ? `${c.name} [${c.unit}]` : c.name)),
  ];
  const lines = [
    header.map(csvCell).join(","),
    ...rows.map(({ time, values }) => {
      const { date, time: hhmm } = splitDateTime(time);
      return [
        date,
        hhmm,
        ...columns.map((c) => (isNumber(values[c.id]) ? String(values[c.id]) : "")),
      ]
        .map(csvCell)
        .join(",");
    }),
  ];
  // BOM ให้ Excel เปิดเป็น UTF-8
  return "﻿" + lines.join("\r\n") + "\r\n";
}

// ชื่อไฟล์ เช่น Rice_RoiET_summary_2026-03-02_2026-03-09.csv
export function reportFileName(thing, from, to, ext) {
  const station = String(thing?.properties?.abbreviation || thing?.name || "station")
    .trim()
    .replace(/[^\w-]+/g, "_");
  const day = (iso) => String(iso).slice(0, 10);
  return `${station}_summary_${day(from)}_${day(to)}.${ext}`;
}

export function downloadTextFile(content, fileName, mimeType) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // ปล่อย URL หลังเบราว์เซอร์เริ่มดาวน์โหลดแล้ว
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
