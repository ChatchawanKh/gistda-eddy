// src/pages/Dashboard/UserManagementSection.jsx
// เนื้อหาส่วนบริหารจัดการสิทธิ์ผู้ใช้งาน — ฝังอยู่ในพื้นที่เนื้อหาของ Dashboard (ไม่ใช่หน้าแยก)
// แสดงเฉพาะเมื่อ activeKey === "users" และผู้ใช้ปัจจุบันเป็น admin เท่านั้น (คุมที่ Dashboard.jsx)
import * as React from "react";
import { useTheme, alpha } from "@mui/material/styles";

import TableContainer from "@mui/material/TableContainer";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Checkbox from "@mui/material/Checkbox";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import TableSortLabel from "@mui/material/TableSortLabel";
import TableBody from "@mui/material/TableBody";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Fade from "@mui/material/Fade";
import Divider from "@mui/material/Divider";

import PersonAddRoundedIcon from "@mui/icons-material/PersonAddRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import LockResetRoundedIcon from "@mui/icons-material/LockResetRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import RadioButtonUncheckedRoundedIcon from "@mui/icons-material/RadioButtonUncheckedRounded";
import HourglassTopRoundedIcon from "@mui/icons-material/HourglassTopRounded";
import HowToRegRoundedIcon from "@mui/icons-material/HowToRegRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";

import SwapVertRoundedIcon from "@mui/icons-material/SwapVertRounded";
import UnfoldMoreRoundedIcon from "@mui/icons-material/UnfoldMoreRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";

import axiosClient from "../../api/axiosClient";
import ConfirmDialog from "../../components/ConfirmDialog";
import { useAuth } from "../../context/AuthContext";
// util ฝั่ง client เดียวกับที่ใช้ในหน้า Register / ResetPassword / SettingsSection
import { validatePassword } from "../../../server/auth/utils/validatePassword";

const emptyForm = {
  email: "",
  password: "",
  confirmPassword: "",
  full_name: "",
  role_name: "user",
};

// คอลัมน์ที่รองรับการเรียงลำดับ พร้อมฟังก์ชันดึงค่าที่ใช้เปรียบเทียบของแต่ละแถว
const SORT_ACCESSORS = {
  email: (u) => (u.email || "").toLowerCase(),
  full_name: (u) => (u.full_name || "").toLowerCase(),
  role_name: (u) => (u.role_name || "").toLowerCase(),
  status: (u) => (!u.is_approved ? 0 : u.is_active ? 2 : 1), // รอการอนุมัติ < ระงับ < ใช้งานได้
  last_login_at: (u) =>
    u.last_login_at ? new Date(u.last_login_at).getTime() : 0,
};

const BULK_ACTION_LABELS = {
  activate: {
    title: "ยืนยันการเปิดใช้งานบัญชีหลายรายการ",
    confirmLabel: "เปิดใช้งานทั้งหมด",
    color: "primary",
  },
  deactivate: {
    title: "ยืนยันการระงับการใช้งานบัญชีหลายรายการ",
    confirmLabel: "ระงับการใช้งานทั้งหมด",
    color: "warning",
  },
  delete: {
    title: "ยืนยันการลบผู้ใช้งานหลายรายการ",
    confirmLabel: "ลบทั้งหมด",
    color: "error",
  },
  change_role: {
    title: "ยืนยันการเปลี่ยนสิทธิ์ผู้ใช้งานหลายรายการ",
    confirmLabel: "เปลี่ยนสิทธิ์ทั้งหมด",
    color: "secondary",
  },
};

// ข้อความ tooltip ที่ใช้ซ้ำ เมื่อกำลังอยู่ในโหมดเลือกหลายแถว (bulk mode) — บังคับให้ใช้
// แถบดำเนินการพร้อมกันด้านบนแทนปุ่ม/Chip รายแถว เพื่อไม่ให้สับสนว่า action มีผลกับแถวเดียวหรือทั้งกลุ่ม
const BULK_MODE_LOCK_HINT = "";

// เงื่อนไขรหัสผ่านที่โชว์เป็น checklist สด ๆ ระหว่างพิมพ์ (ใช้ร่วมกันทั้ง dialog เพิ่มผู้ใช้งาน
// และ dialog ตั้งรหัสผ่านใหม่ — ไม่รวมกฎ blacklist/ผูกกับอีเมล เพราะแจ้งผ่าน error message ตอน submit แทน)
const PASSWORD_RULES = [
  {
    key: "length",
    label: "มากกว่า 10 ตัวอักษร",
    test: (v) => v.length >= 10,
  },
  { key: "upper", label: "มีตัวพิมพ์ใหญ่ (A-Z)", test: (v) => /[A-Z]/.test(v) },
  { key: "lower", label: "มีตัวพิมพ์เล็ก (a-z)", test: (v) => /[a-z]/.test(v) },
  { key: "digit", label: "มีตัวเลข (0-9)", test: (v) => /[0-9]/.test(v) },
  {
    key: "special",
    label: "มีอักขระพิเศษ (เช่น ! @ # $)",
    test: (v) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(v),
  },
];

// ---- Helper: ผสมสีให้ได้ผลลัพธ์ทึบแสง 100% (ไม่ใช้ alpha) ----
// ใช้เฉพาะกับพื้นหลังของคอลัมน์ sticky (checkbox ซ้าย / การจัดการ ขวา) เท่านั้น
// เพราะพื้นหลังแบบโปร่งแสง (alpha) จะโดนเนื้อหาของแถวอื่นที่เลื่อนอยู่ด้านล่าง
// ทะลุขึ้นมาซ้อนทับตัวหนังสือตอน scroll แนวนอน — ต้องผสมเป็นสีทึบไว้ล่วงหน้าแทน
function parseColorToRgb(input) {
  if (!input) return [255, 255, 255];
  const value = String(input).trim();
  if (value.startsWith("#")) {
    let hex = value.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((c) => c + c)
        .join("");
    }
    const num = parseInt(hex, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }
  const match = value.match(/rgba?\(([^)]+)\)/i);
  if (match) {
    const parts = match[1].split(",").map((v) => parseFloat(v.trim()));
    return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
  }
  return [255, 255, 255];
}

function mixOpaqueColor(tintColor, baseColor, ratio) {
  const [tr, tg, tb] = parseColorToRgb(tintColor);
  const [br, bg, bb] = parseColorToRgb(baseColor);
  const mix = (a, b) => Math.round(a * ratio + b * (1 - ratio));
  return `rgb(${mix(tr, br)}, ${mix(tg, bg)}, ${mix(tb, bb)})`;
}

function PasswordChecklist({ password }) {
  const theme = useTheme();

  return (
    <Stack spacing={0.5} sx={{ pl: 0.5 }}>
      {PASSWORD_RULES.map((rule) => {
        const passed = rule.test(password);
        return (
          <Box
            key={rule.key}
            sx={{ display: "flex", alignItems: "center", gap: 0.75 }}
          >
            {passed ? (
              <CheckCircleRoundedIcon
                sx={{ fontSize: 16, color: theme.palette.success.main }}
              />
            ) : (
              <RadioButtonUncheckedRoundedIcon
                sx={{
                  fontSize: 16,
                  color: theme.palette.text.secondary,
                  opacity: 0.5,
                }}
              />
            )}
            <Typography
              variant="caption"
              sx={{
                color: passed ? theme.palette.success.main : "text.secondary",
              }}
            >
              {rule.label}
            </Typography>
          </Box>
        );
      })}
    </Stack>
  );
}

export default function UserManagementSection() {
  const theme = useTheme();
  const { primary, divider, text, background } = theme.palette;
  const radius = theme.shape.borderRadius;
  const { user: currentUser } = useAuth(); // admin ที่กำลัง login อยู่ตอนนี้

  // สีทึบแสงสำหรับพื้นหลังคอลัมน์ sticky (checkbox ซ้าย / การจัดการ ขวา) ในแต่ละสถานะของแถว
  // คำนวณล่วงหน้าครั้งเดียวต่อการ render เพื่อไม่ให้พื้นหลังโปร่งแสงทำให้ตัวหนังสือ
  // ของคอลัมน์อื่นที่เลื่อนอยู่ด้านล่างทะลุขึ้นมาซ้อนทับ
  const stickyColors = React.useMemo(() => {
    const base = background.paper;
    return {
      normal: base,
      normalHover: mixOpaqueColor(text.primary, base, 0.045),
      self: mixOpaqueColor(primary.main, base, 0.055),
      selfHover: mixOpaqueColor(primary.main, base, 0.09),
      selected: mixOpaqueColor(primary.main, base, 0.11),
      selectedHover: mixOpaqueColor(primary.main, base, 0.16),
    };
  }, [background.paper, primary.main, text.primary]);

  const [users, setUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [info, setInfo] = React.useState("");

  const [showCreatePassword, setShowCreatePassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [showResetPassword, setShowResetPassword] = React.useState(false);
  const [showBulkPassword, setShowBulkPassword] = React.useState(false);

  // --- ค้นหา + เรียงลำดับ ---
  const [searchText, setSearchText] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("all"); // all | admin | user
  const [orderBy, setOrderBy] = React.useState("email"); // คอลัมน์ที่ใช้เรียง
  const [order, setOrder] = React.useState("asc"); // asc | desc

  const [addOpen, setAddOpen] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);

  const [resetTarget, setResetTarget] = React.useState(null); // { user_id, email }
  const [resetPasswordValue, setResetPasswordValue] = React.useState("");

  const [deleteTarget, setDeleteTarget] = React.useState(null); // { user_id, email }
  const [deleting, setDeleting] = React.useState(false);

  const [statusTarget, setStatusTarget] = React.useState(null); // { user_id, email, is_active }
  const [togglingStatus, setTogglingStatus] = React.useState(false);

  const [approveTarget, setApproveTarget] = React.useState(null); // { user_id, email }
  const [approving, setApproving] = React.useState(false);

  // --- เลือกหลายแถว + ดำเนินการพร้อมกัน (bulk actions) ---
  const [selectedIds, setSelectedIds] = React.useState(() => new Set());
  const [bulkAction, setBulkAction] = React.useState(null); // { type: 'activate' | 'deactivate' | 'delete', targets: [user,...] }
  const [bulkRoleValue, setBulkRoleValue] = React.useState("user");
  const bulkRoleAllSame = React.useMemo(() => {
    const targets = users.filter((u) => selectedIds.has(u.user_id));
    if (targets.length === 0) return true;
    return targets.every((u) => u.role_name === bulkRoleValue);
  }, [users, selectedIds, bulkRoleValue]);

  const [bulkPassword, setBulkPassword] = React.useState("");
  const [bulkError, setBulkError] = React.useState("");
  const [bulkProcessing, setBulkProcessing] = React.useState(false);

  // เช็ค policy รหัสผ่านของฟอร์ม "เพิ่มผู้ใช้งานใหม่" (ผูกกับอีเมลที่กำลังกรอกในฟอร์มเดียวกัน)
  const createPasswordErrors = React.useMemo(
    () => validatePassword(form.password, form.email),
    [form.password, form.email],
  );
  const isCreatePasswordValid =
    form.password.length > 0 && createPasswordErrors.length === 0;
  const createPasswordsMatch =
    form.confirmPassword.length > 0 && form.password === form.confirmPassword;

  // เช็ค policy รหัสผ่านของ dialog "ตั้งรหัสผ่านใหม่" (ผูกกับอีเมลของ user เป้าหมาย)
  const resetPasswordErrors = React.useMemo(
    () => validatePassword(resetPasswordValue, resetTarget?.email),
    [resetPasswordValue, resetTarget?.email],
  );

  const isResetPasswordValid =
    resetPasswordValue.length > 0 && resetPasswordErrors.length === 0;

  async function fetchUsers() {
    setLoading(true);
    try {
      const { data } = await axiosClient.get("/users");
      setUsers(data.users);
    } catch (err) {
      setError(err.response?.data?.message || "โหลดรายชื่อผู้ใช้งานไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    fetchUsers();
  }, []);

  // สลับทิศทางการเรียง หรือเปลี่ยนคอลัมน์ที่ใช้เรียงเมื่อคลิกหัวตาราง
  function handleSort(field) {
    if (orderBy === field) {
      setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setOrderBy(field);
      setOrder("asc");
    }
  }

  // กรองตามคำค้นหา (อีเมล/ชื่อ-นามสกุล) + สิทธิ์ แล้วจึงเรียงลำดับตามคอลัมน์ที่เลือก
  const displayedUsers = React.useMemo(() => {
    const q = searchText.trim().toLowerCase();

    let result = users.filter((u) => {
      const matchesQuery =
        !q ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.full_name || "").toLowerCase().includes(q);
      const matchesRole = roleFilter === "all" || u.role_name === roleFilter;
      return matchesQuery && matchesRole;
    });

    const accessor = SORT_ACCESSORS[orderBy] || SORT_ACCESSORS.email;
    result = [...result].sort((a, b) => {
      // ปักหมุดแถวของผู้ใช้ปัจจุบัน (ตัวเอง) ไว้บนสุดเสมอ ไม่ว่าจะเรียงคอลัมน์ไหนหรือทิศทางใด
      const aIsSelf = a.user_id === currentUser?.user_id;
      const bIsSelf = b.user_id === currentUser?.user_id;
      if (aIsSelf && !bIsSelf) return -1;
      if (!aIsSelf && bIsSelf) return 1;

      const va = accessor(a);
      const vb = accessor(b);
      if (va < vb) return order === "asc" ? -1 : 1;
      if (va > vb) return order === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [users, searchText, roleFilter, orderBy, order, currentUser?.user_id]);

  // แถวที่สามารถเลือกได้ (ตัดตัวเองออกเสมอ กันดำเนินการ bulk กับบัญชีตัวเอง)
  const selectableIds = React.useMemo(
    () =>
      displayedUsers
        .filter((u) => u.user_id !== currentUser?.user_id)
        .map((u) => u.user_id),
    [displayedUsers, currentUser?.user_id],
  );

  const selectedCount = selectedIds.size;
  const allSelected =
    selectableIds.length > 0 &&
    selectableIds.every((id) => selectedIds.has(id));
  const someSelected =
    !allSelected && selectableIds.some((id) => selectedIds.has(id));

  // สรุปจำนวนตามสิทธิ์ ใช้แสดงเป็นการ์ดสรุปด้านบนตาราง
  const summary = React.useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => u.role_name === "admin").length;
    const pending = users.filter((u) => !u.is_approved).length;
    return { total, admins, pending };
  }, [users]);

  // ล้างการเลือกเมื่อเปลี่ยนคำค้นหา/ตัวกรอง เพื่อไม่ให้ดำเนินการกับแถวที่ถูกซ่อนอยู่โดยไม่ตั้งใจ
  React.useEffect(() => {
    setSelectedIds(new Set());
  }, [searchText, roleFilter]);

  function toggleSelectAll() {
    setSelectedIds(() => (allSelected ? new Set() : new Set(selectableIds)));
  }

  function toggleSelectRow(userId) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  // เปิด popup ยืนยันก่อนดำเนินการพร้อมกันหลายราย (ต้องกรอกรหัสผ่านของ admin เอง)
  function requestBulkAction(type) {
    const targets = users.filter((u) => selectedIds.has(u.user_id));
    if (targets.length === 0) return;
    setBulkError("");
    setBulkPassword("");
    setBulkAction({
      type,
      targets,
      role_name: type === "change_role" ? bulkRoleValue : undefined,
    });
  }

  function closeBulkDialog() {
    if (bulkProcessing) return;
    setBulkAction(null);
    setBulkPassword("");
    setBulkError("");
    setShowBulkPassword(false);
  }

  async function handleConfirmBulkAction() {
    if (!bulkPassword) {
      setBulkError("กรุณากรอกรหัสผ่านของท่านเพื่อยืนยันการดำเนินการ");
      return;
    }
    setBulkProcessing(true);
    setBulkError("");
    try {
      const userIds = bulkAction.targets.map((u) => u.user_id);

      if (bulkAction.type === "delete") {
        await axiosClient.post("/users/bulk-delete", {
          user_ids: userIds,
          password: bulkPassword,
        });
        setInfo(`ลบผู้ใช้งานสำเร็จ ${userIds.length} รายการ`);
      } else if (bulkAction.type === "change_role") {
        await axiosClient.patch("/users/bulk-role", {
          user_ids: userIds,
          role_name: bulkAction.role_name,
          password: bulkPassword,
        });
        setInfo(
          `เปลี่ยนสิทธิ์เป็น ${
            bulkAction.role_name === "admin" ? "Admin" : "User"
          } สำเร็จ ${userIds.length} รายการ`,
        );
        setTimeout(() => setInfo(""), 3000);
      } else {
        await axiosClient.patch("/users/bulk-status", {
          user_ids: userIds,
          is_active: bulkAction.type === "activate",
          password: bulkPassword,
        });
        setInfo(
          bulkAction.type === "activate"
            ? `เปิดใช้งานบัญชีสำเร็จ ${userIds.length} รายการ`
            : `ระงับการใช้งานบัญชีสำเร็จ ${userIds.length} รายการ`,
        );
        setTimeout(() => setInfo(""), 3000);
      }

      setBulkAction(null);
      setBulkPassword("");
      setSelectedIds(new Set());
      await fetchUsers();
    } catch (err) {
      setBulkError(
        err.response?.data?.message ||
          "รหัสผ่านไม่ถูกต้อง หรือดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
      );
    } finally {
      setBulkProcessing(false);
    }
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    setError("");

    if (!isCreatePasswordValid) {
      setError(createPasswordErrors[0] || "รหัสผ่านไม่ตรงตามเงื่อนไข");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน กรุณากรอกให้ตรงกัน");
      return;
    }

    try {
      const { email, password, full_name, role_name } = form;
      await axiosClient.post("/users", {
        email,
        password,
        full_name,
        role_name,
      });
      setForm(emptyForm);
      setAddOpen(false);
      setInfo("เพิ่มผู้ใช้งานสำเร็จ");
      await fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || "เพิ่มผู้ใช้งานไม่สำเร็จ");
    }
  }

  async function handleChangeRole(userId, newRole) {
    if (userId === currentUser?.user_id) {
      setError(
        "ไม่สามารถเปลี่ยนสิทธิ์ของตัวเองได้ กรุณาให้ผู้ดูแลระบบท่านอื่นเปลี่ยนสิทธิ์ให้",
      );
      return;
    }
    setError("");
    try {
      await axiosClient.patch(`/users/${userId}/role`, { role_name: newRole });
      await fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || "เปลี่ยนสิทธิ์ไม่สำเร็จ");
    }
  }

  // เปิด popup ยืนยันก่อนอนุมัติผู้ใช้งานที่สมัครเอง (ข้อ 5.7.2)
  function requestApprove(user) {
    setApproveTarget(user);
  }

  async function handleConfirmApprove() {
    setApproving(true);
    setError("");
    try {
      await axiosClient.patch(`/users/${approveTarget.user_id}/approve`);
      setInfo(
        `อนุมัติผู้ใช้งาน ${approveTarget.email} สำเร็จ — ผู้ใช้งานสามารถเข้าสู่ระบบได้แล้ว`,
      );
      setApproveTarget(null);
      await fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || "อนุมัติผู้ใช้งานไม่สำเร็จ");
    } finally {
      setApproving(false);
    }
  }

  // เปิด popup ยืนยันก่อนระงับ/เปิดใช้งานบัญชี (แทนการยิง API ทันทีตอนคลิก chip)
  // กันดำเนินการกับบัญชีของตัวเองเสมอ ไม่ว่าจะกดจาก chip สถานะหรือปุ่มในคอลัมน์การจัดการ
  function requestToggleStatus(user) {
    if (user.user_id === currentUser?.user_id) {
      setError(
        "ไม่สามารถระงับการใช้งานบัญชีของตัวเองได้ กรุณาให้ผู้ดูแลระบบท่านอื่นดำเนินการ",
      );
      return;
    }
    setStatusTarget(user);
  }

  async function handleConfirmToggleStatus() {
    setTogglingStatus(true);
    setError("");
    try {
      await axiosClient.patch(`/users/${statusTarget.user_id}/status`, {
        is_active: !statusTarget.is_active,
      });
      setInfo(
        statusTarget.is_active
          ? `ระงับการใช้งานบัญชี ${statusTarget.email} แล้ว`
          : `เปิดใช้งานบัญชี ${statusTarget.email} แล้ว`,
      );

      setTimeout(() => {
        setInfo("");
      }, 6000);

      setStatusTarget(null);
      await fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || "อัปเดตสถานะไม่สำเร็จ");
    } finally {
      setTogglingStatus(false);
    }
  }

  // เปิด popup ยืนยันก่อนลบผู้ใช้งาน (แทน window.confirm)
  // กันลบบัญชีของตัวเองเสมอ
  function requestDelete(user) {
    if (user.user_id === currentUser?.user_id) {
      setError(
        "ไม่สามารถลบบัญชีของตัวเองได้ กรุณาให้ผู้ดูแลระบบท่านอื่นดำเนินการ",
      );
      return;
    }
    setDeleteTarget(user);
  }

  async function handleConfirmDelete() {
    setDeleting(true);
    setError("");
    try {
      await axiosClient.delete(`/users/${deleteTarget.user_id}`);
      setInfo(`ลบผู้ใช้งาน ${deleteTarget.email} สำเร็จ`);
      setDeleteTarget(null);
      await fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || "ลบผู้ใช้งานไม่สำเร็จ");
    } finally {
      setDeleting(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setError("");
    if (!isResetPasswordValid) {
      setError(resetPasswordErrors[0] || "รหัสผ่านไม่ตรงตามเงื่อนไข");
      return;
    }
    try {
      await axiosClient.patch(`/users/${resetTarget.user_id}/reset-password`, {
        newPassword: resetPasswordValue,
      });
      setInfo(
        `ตั้งรหัสผ่านใหม่ให้ ${resetTarget.email} สำเร็จ — แจ้งผู้ใช้งานผ่านช่องทางที่ปลอดภัย`,
      );
      setResetTarget(null);
      setResetPasswordValue("");
    } catch (err) {
      setError(err.response?.data?.message || "ตั้งรหัสผ่านใหม่ไม่สำเร็จ");
    }
  }

  return (
    <Box>
      {/* ===== Header ===== */}
      <Stack
        sx={{
          mb: 2,
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: 20,
              fontWeight: 400,
              color: text.head,
            }}
          >
            บริหารจัดการสิทธิ์ผู้ใช้งาน
          </Typography>
          <Typography sx={{ fontSize: 13, color: text.secondary }}>
            เพิ่ม ลบ เปลี่ยนสิทธิ์ และตั้งรหัสผ่านใหม่ให้ผู้ใช้งาน
          </Typography>
        </Box>

        <Button
          variant="contained"
          disableElevation
          startIcon={<PersonAddRoundedIcon />}
          onClick={() => setAddOpen(true)}
          sx={{
            height: 36,
            borderRadius: 50,
            textTransform: "none",
            fontWeight: 400,
            px: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          เพิ่มผู้ใช้งาน
        </Button>
      </Stack>

      {/* ===== การ์ดสรุปภาพรวม ===== */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{ mb: 2.5 }}
      >
        {[
          {
            label: "ผู้ดูแลระบบ",
            value: summary.admins,
            icon: <AdminPanelSettingsRoundedIcon sx={{ fontSize: 20 }} />,
            // สีม่วง — แยกให้ชัดจากการ์ดอื่น ไม่ fallback ไปเป็นสีเดียวกับ "ผู้ใช้งาน"
            color: theme.palette.secondary?.main || "#7c3aed",
          },
          {
            label: "ผู้ใช้งาน",
            value: summary.total,
            icon: <GroupRoundedIcon sx={{ fontSize: 20 }} />,
            // สีหลักของระบบ (primary)
            color: primary.main,
          },
          {
            label: "รอการอนุมัติ",
            value: summary.pending,
            icon: <HourglassTopRoundedIcon sx={{ fontSize: 20 }} />,
            // สีส้ม/เหลือง เตือนให้สังเกตเห็นง่าย
            color: theme.palette.warning?.main || "#f59e0b",
          },
        ].map((card) => (
          <Paper
            key={card.label}
            variant="outlined"
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              px: 2,
              py: 1.5,
              borderRadius: `${radius + 2}px`,
              borderColor: card.color,
              bgcolor: background.paper,
            }}
          >
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: `${radius}px`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: alpha(card.color, 0.12),
                color: card.color,
                flexShrink: 0,
              }}
            >
              {card.icon}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{ fontSize: 12.5, color: text.secondary, lineHeight: 1.3 }}
              >
                {card.label}
              </Typography>
              <Typography
                sx={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: card.color,
                  lineHeight: 1.3,
                }}
              >
                {card.value}
              </Typography>
            </Box>
          </Paper>
        ))}
      </Stack>

      <Fade in={Boolean(info)} unmountOnExit>
        <Alert
          severity="success"
          sx={{ mb: 2, borderRadius: `${radius}px` }}
          onClose={() => setInfo("")}
        >
          {info}
        </Alert>
      </Fade>
      <Fade in={Boolean(error)} unmountOnExit>
        <Alert
          severity="error"
          sx={{ mb: 2, borderRadius: `${radius}px` }}
          onClose={() => setError("")}
        >
          {error}
        </Alert>
      </Fade>

      {/* แถบค้นหา + กรองสิทธิ์ */}
      <Paper
        variant="outlined"
        sx={{
          mb: 2,
          p: 1.5,
          borderRadius: `${radius + 2}px`,
          borderColor: divider,
          bgcolor: background.paper,
        }}
      >
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            size="small"
            placeholder="ค้นหาจากอีเมลหรือชื่อ-นามสกุล..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            sx={{
              flex: 1,
              "& .MuiOutlinedInput-root": {
                borderRadius: `${radius}px`,
                bgcolor: "#fff",
              },
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon
                      sx={{ fontSize: 18, color: text.secondary }}
                    />
                  </InputAdornment>
                ),
                endAdornment: searchText ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchText("")}>
                      <ClearRoundedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="role-filter-label" htmlFor="role-filter-input">
              สิทธิ์
            </InputLabel>

            <Select
              labelId="role-filter-label"
              slotProps={{ htmlInput: { id: "role-filter-input" } }}
              id="role-filter"
              inputProps={{ id: "role-filter-input" }}
              label="สิทธิ์"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              sx={{ borderRadius: `${radius}px`, bgcolor: "#fff" }}
            >
              <MenuItem value="all">ทั้งหมด</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="user">User</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* แถบดำเนินการพร้อมกัน — แสดงเมื่อมีการเลือกอย่างน้อย 1 แถว */}
      <Fade in={selectedCount > 0} unmountOnExit>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1.5,
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            py: 1.25,
            mb: 1.5,
            borderRadius: `${radius + 2}px`,
            bgcolor: alpha(primary.main, 0.05),
            border: `1px solid ${alpha(primary.main, 0.25)}`,
          }}
        >
          <Typography
            sx={{ fontSize: 14, fontWeight: 400, color: primary.main }}
          >
            เลือกแล้ว {selectedCount} รายการ
          </Typography>

          <Stack
            direction="row"
            spacing={1.5}
            flexWrap="wrap"
            alignItems="center"
            sx={{ rowGap: 1 }}
          >
            {/* ===== โซน 1: เปลี่ยนสิทธิ์ — segment แยกต่างหาก โทนสี secondary ===== */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                pl: 1.25,
                pr: 0.75,
                py: 0.5,
                borderRadius: 50,
                bgcolor: alpha(
                  theme.palette.secondary?.main || "#7c3aed",
                  0.08,
                ),
                border: `1px solid ${alpha(
                  theme.palette.secondary?.main || "#7c3aed",
                  0.3,
                )}`,
              }}
            >
              <Typography
                sx={{
                  fontSize: 12.5,
                  color: theme.palette.secondary?.main || "#7c3aed",
                  whiteSpace: "nowrap",
                }}
              >
                เปลี่ยนสิทธิ์เป็น
              </Typography>

              <Select
                size="small"
                value={bulkRoleValue}
                onChange={(e) => setBulkRoleValue(e.target.value)}
                variant="standard"
                disableUnderline
                IconComponent={KeyboardArrowDownRoundedIcon}
                inputProps={{ "aria-label": "เปลี่ยนสิทธิ์เป็น" }}
                sx={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: theme.palette.secondary?.main || "#7c3aed",
                  "& .MuiSelect-select": { py: 0.25, pr: "22px !important" },
                  "& .MuiSvgIcon-root": {
                    color: theme.palette.secondary?.main || "#7c3aed",
                  },
                }}
              >
                <MenuItem value="user" sx={{ fontSize: 13 }}>
                  User
                </MenuItem>
                <MenuItem value="admin" sx={{ fontSize: 13 }}>
                  Admin
                </MenuItem>
              </Select>

              <Button
                size="small"
                variant="contained"
                disableElevation
                disabled={bulkRoleAllSame}
                onClick={() => requestBulkAction("change_role")}
                sx={{
                  ml: 0.5,
                  minWidth: "auto",
                  height: 26,
                  px: 1.5,
                  fontSize: 12,
                  textTransform: "none",
                  fontWeight: 400,
                  borderRadius: 50,
                  bgcolor: theme.palette.secondary?.main || "#7c3aed",
                  "&:hover": {
                    bgcolor: theme.palette.secondary?.dark || "#6d28d9",
                  },
                  "&.Mui-disabled": {
                    bgcolor: alpha(
                      theme.palette.secondary?.main || "#7c3aed",
                      0.25,
                    ),
                    color: "#fff",
                  },
                }}
              >
                ยืนยัน
              </Button>
            </Box>

            <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />

            {/* ===== โซน 2: action สถานะ/ลบ — กลุ่มเดิม ===== */}
            <Stack
              direction="row"
              spacing={1}
              flexWrap="wrap"
              sx={{ rowGap: 1 }}
            >
              <Button
                size="small"
                variant="outlined"
                color="success"
                startIcon={<CheckCircleRoundedIcon sx={{ fontSize: 16 }} />}
                onClick={() => requestBulkAction("activate")}
                sx={{
                  textTransform: "none",
                  fontWeight: 400,
                  borderRadius: `${radius}px`,
                  borderColor: "success.main",
                  "&:hover": {
                    bgcolor: (theme) => alpha(theme.palette.success.main, 0.08),
                    borderColor: "success.main",
                  },
                }}
              >
                เปิดใช้งาน
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="warning"
                startIcon={<BlockRoundedIcon sx={{ fontSize: 16 }} />}
                onClick={() => requestBulkAction("deactivate")}
                sx={{
                  textTransform: "none",
                  fontWeight: 400,
                  borderRadius: `${radius}px`,
                  borderColor: "warning.main",
                  "&:hover": {
                    bgcolor: (theme) => alpha(theme.palette.warning.main, 0.08),
                    borderColor: "warning.main",
                  },
                }}
              >
                ระงับการใช้งาน
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<DeleteRoundedIcon sx={{ fontSize: 16 }} />}
                onClick={() => requestBulkAction("delete")}
                sx={{
                  textTransform: "none",
                  fontWeight: 400,
                  borderRadius: `${radius}px`,
                  borderColor: "error.main",
                  "&:hover": {
                    bgcolor: (theme) => alpha(theme.palette.error.main, 0.08),
                    borderColor: "error.main",
                  },
                }}
              >
                ลบ
              </Button>
              <Button
                size="small"
                variant="text"
                onClick={() => setSelectedIds(new Set())}
                sx={{
                  color: text.secondary,
                  textTransform: "none",
                  fontWeight: 400,
                  borderRadius: `${radius}px`,
                }}
              >
                ยกเลิกการเลือก
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Fade>

      <Box
        sx={{
          border: `1px solid ${divider}`,
          borderRadius: `${radius + 2}px`,
          overflow: "hidden",
          bgcolor: background.paper,
          maxWidth: "100%",
          boxShadow: `0 1px 2px ${alpha("#000", 0.04)}`,
        }}
      >
        <TableContainer
          sx={{
            width: "100%",
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
            "&::-webkit-scrollbar": { height: 8 },
            "&::-webkit-scrollbar-thumb": {
              borderRadius: 8,
              bgcolor: alpha(text.secondary, 0.25),
            },
          }}
        >
          <Table
            size="small"
            sx={{
              minWidth: 900,
              "& th, & td": { whiteSpace: "nowrap" },
              "& tbody tr": {
                transition: "background-color 120ms ease",
              },
              "& th:first-of-type, & td:first-of-type": {
                position: "sticky",
                left: 0,
                zIndex: 3,
                backgroundColor: background.paper,
              },
              "& thead th:first-of-type": {
                backgroundColor: background.default,
                zIndex: 4,
              },
              "& th:last-of-type, & td:last-of-type": {
                position: "sticky",
                right: 0,
                zIndex: 3,
                backgroundColor: background.paper,
                boxShadow: `-6px 0 6px -6px ${alpha(primary.main, 0.25)}`,
              },
              "& thead th:last-of-type": {
                backgroundColor: background.default,
                zIndex: 4,
              },
            }}
          >
            <TableHead>
              <TableRow
                sx={{
                  "& th": {
                    fontWeight: 400,
                    fontSize: 13,
                    color: text.secondary,
                    bgcolor: background.default,
                    borderBottom: `1px solid ${divider}`,
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                  },
                }}
              >
                <TableCell padding="checkbox">
                  <Checkbox
                    size="small"
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={toggleSelectAll}
                    disabled={selectableIds.length === 0}
                    sx={{
                      "&.Mui-disabled": { color: "#acacac" },
                    }}
                  />
                </TableCell>

                <TableCell sortDirection={orderBy === "email" ? order : false}>
                  <TableSortLabel
                    active={orderBy === "email"}
                    direction={orderBy === "email" ? order : "asc"}
                    onClick={() => handleSort("email")}
                    IconComponent={UnfoldMoreRoundedIcon}
                    sx={{
                      "& .MuiTableSortLabel-icon": {
                        fontSize: 18,
                        opacity: 0.45,
                        transition: "0.2s ease",
                        transform: "none !important",
                      },

                      "&.Mui-active .MuiTableSortLabel-icon": {
                        opacity: 1,
                        color: "primary.main",
                      },

                      // sort asc = ลูกศรขึ้น
                      "&.Mui-active[aria-sort='ascending'] .MuiTableSortLabel-icon":
                        {
                          transform: "rotate(180deg) !important",
                        },

                      // sort desc = ลูกศรลง
                      "&.Mui-active[aria-sort='descending'] .MuiTableSortLabel-icon":
                        {
                          transform: "rotate(0deg) !important",
                        },
                    }}
                  >
                    ผู้ใช้งาน
                  </TableSortLabel>
                </TableCell>

                <TableCell
                  sortDirection={orderBy === "role_name" ? order : false}
                >
                  <TableSortLabel
                    active={orderBy === "role_name"}
                    direction={orderBy === "role_name" ? order : "asc"}
                    onClick={() => handleSort("role_name")}
                    IconComponent={UnfoldMoreRoundedIcon}
                    sx={{
                      "& .MuiTableSortLabel-icon": {
                        fontSize: 18,
                        opacity: 0.45,
                        transition: "0.2s ease",
                        transform: "none !important",
                      },

                      "&.Mui-active .MuiTableSortLabel-icon": {
                        opacity: 1,
                        color: "primary.main",
                      },

                      // sort asc = ลูกศรขึ้น
                      "&.Mui-active[aria-sort='ascending'] .MuiTableSortLabel-icon":
                        {
                          transform: "rotate(180deg) !important",
                        },

                      // sort desc = ลูกศรลง
                      "&.Mui-active[aria-sort='descending'] .MuiTableSortLabel-icon":
                        {
                          transform: "rotate(0deg) !important",
                        },
                    }}
                  >
                    สิทธิ์
                  </TableSortLabel>
                </TableCell>

                <TableCell sortDirection={orderBy === "status" ? order : false}>
                  <TableSortLabel
                    active={orderBy === "status"}
                    direction={orderBy === "status" ? order : "asc"}
                    onClick={() => handleSort("status")}
                    IconComponent={UnfoldMoreRoundedIcon}
                    sx={{
                      "& .MuiTableSortLabel-icon": {
                        fontSize: 18,
                        opacity: 0.45,
                        transition: "0.2s ease",
                        transform: "none !important",
                      },

                      "&.Mui-active .MuiTableSortLabel-icon": {
                        opacity: 1,
                        color: "primary.main",
                      },

                      // sort asc = ลูกศรขึ้น
                      "&.Mui-active[aria-sort='ascending'] .MuiTableSortLabel-icon":
                        {
                          transform: "rotate(180deg) !important",
                        },

                      // sort desc = ลูกศรลง
                      "&.Mui-active[aria-sort='descending'] .MuiTableSortLabel-icon":
                        {
                          transform: "rotate(0deg) !important",
                        },
                    }}
                  >
                    สถานะ
                  </TableSortLabel>
                </TableCell>

                <TableCell
                  sortDirection={orderBy === "last_login_at" ? order : false}
                >
                  <TableSortLabel
                    active={orderBy === "last_login_at"}
                    direction={orderBy === "last_login_at" ? order : "asc"}
                    onClick={() => handleSort("last_login_at")}
                    IconComponent={UnfoldMoreRoundedIcon}
                    sx={{
                      "& .MuiTableSortLabel-icon": {
                        fontSize: 18,
                        opacity: 0.45,
                        transition: "0.2s ease",
                        transform: "none !important",
                      },

                      "&.Mui-active .MuiTableSortLabel-icon": {
                        opacity: 1,
                        color: "primary.main",
                      },

                      // sort asc = ลูกศรขึ้น
                      "&.Mui-active[aria-sort='ascending'] .MuiTableSortLabel-icon":
                        {
                          transform: "rotate(180deg) !important",
                        },

                      // sort desc = ลูกศรลง
                      "&.Mui-active[aria-sort='descending'] .MuiTableSortLabel-icon":
                        {
                          transform: "rotate(0deg) !important",
                        },
                    }}
                  >
                    เข้าใช้งานล่าสุด
                  </TableSortLabel>
                </TableCell>

                <TableCell align="left">การจัดการ</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {!loading &&
                displayedUsers.map((u) => {
                  const isSelf = u.user_id === currentUser?.user_id;
                  // ล็อกไม่ให้ทำ action รายแถว (สถานะ/ลบ) เมื่อกำลังเลือกหลายแถวอยู่
                  // เพื่อบังคับให้ใช้แถบดำเนินการพร้อมกันด้านบนแทน (UX ที่ชัดเจนไม่กำกวม)
                  const isRowActionLocked = isSelf || selectedCount > 0;
                  return (
                    <TableRow
                      key={u.user_id}
                      hover
                      selected={selectedIds.has(u.user_id)}
                      sx={{
                        ...(isSelf && {
                          borderLeft: `3px solid ${primary.main}`,
                          "& td:nth-of-type(2)": { pl: "13px" },
                        }),
                        bgcolor: isSelf
                          ? alpha(primary.main, 0.045)
                          : "transparent",
                        // สีพื้นหลังของคอลัมน์ sticky ต้องเป็นสีทึบแสงเสมอ (ไม่ใช้ alpha)
                        // เพราะถ้าโปร่งแสง เนื้อหาของแถวอื่นที่เลื่อนอยู่ด้านล่างจะทะลุ
                        // ขึ้นมาซ้อนทับตัวหนังสือตอน scroll แนวนอน
                        "& td:first-of-type, & td:last-of-type": {
                          bgcolor: isSelf
                            ? stickyColors.self
                            : stickyColors.normal,
                          transition: "background-color 120ms ease",
                        },
                        "&:hover td:first-of-type, &:hover td:last-of-type": {
                          bgcolor: isSelf
                            ? stickyColors.selfHover
                            : stickyColors.normalHover,
                        },
                        "&.Mui-selected td:first-of-type, &.Mui-selected td:last-of-type":
                          {
                            bgcolor: stickyColors.selected,
                          },
                        "&.Mui-selected:hover td:first-of-type, &.Mui-selected:hover td:last-of-type":
                          {
                            bgcolor: stickyColors.selectedHover,
                          },
                      }}
                    >
                      <TableCell padding="checkbox">
                        <Tooltip
                          placement="top"
                          // title={
                          //   isSelf
                          //     ? "ไม่สามารถเลือกบัญชีของตัวเองเพื่อดำเนินการพร้อมกันได้"
                          //     : ""
                          // }
                          arrow
                          disableHoverListener={!isSelf}
                        >
                          <span>
                            <Checkbox
                              size="small"
                              checked={selectedIds.has(u.user_id)}
                              onChange={() => toggleSelectRow(u.user_id)}
                              disabled={isSelf}
                              sx={{ "&.Mui-disabled": { color: "#acacac" } }}
                            />
                          </span>
                        </Tooltip>
                      </TableCell>

                      <TableCell sx={{ maxWidth: { xs: 220, md: "none" } }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            sx={{
                              fontSize: 13.5,
                              fontWeight: isSelf ? 600 : 500,
                              color: text.head,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              lineHeight: 1.4,
                            }}
                          >
                            {u.full_name || "-"}
                            {isSelf && (
                              <Chip
                                label="คุณ"
                                size="small"
                                color="primary"
                                variant="outlined"
                                sx={{
                                  ml: 0.75,
                                  height: 20,
                                  fontSize: 11,
                                  fontWeight: 400,
                                  borderRadius: 999,
                                  "& .MuiChip-label": {
                                    px: 1,
                                  },
                                }}
                              />
                            )}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: 12,
                              color: text.secondary,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              lineHeight: 1.4,
                            }}
                          >
                            {u.email}
                          </Typography>
                        </Box>
                      </TableCell>

                      <TableCell>
                        <Tooltip
                          placement="top"
                          title={
                            selectedCount > 0
                              ? BULK_MODE_LOCK_HINT
                              : isSelf
                                ? ""
                                : ""
                          }
                          arrow
                          disableHoverListener={!isRowActionLocked}
                        >
                          {/* span ครอบไว้เพื่อให้ Tooltip แสดงได้แม้ Select จะถูก disabled */}
                          <span>
                            <FormControl
                              size="small"
                              sx={{ minWidth: 110 }}
                              disabled={isRowActionLocked}
                            >
                              <Select
                                inputProps={{ "aria-label": "สิทธิ์ผู้ใช้งาน" }}
                                value={u.role_name}
                                onChange={(e) =>
                                  handleChangeRole(u.user_id, e.target.value)
                                }
                                sx={{
                                  fontSize: 13,
                                  borderRadius: `${radius}px`,
                                  "&.Mui-disabled": {
                                    color: "#acacac",
                                    WebkitTextFillColor: "#acacac",
                                  },
                                  "& .MuiSvgIcon-root.Mui-disabled": {
                                    color: "#acacac",
                                  },
                                }}
                              >
                                <MenuItem value="user">User</MenuItem>
                                <MenuItem value="admin">Admin</MenuItem>
                              </Select>
                            </FormControl>
                          </span>
                        </Tooltip>
                      </TableCell>

                      <TableCell>
                        {!u.is_approved ? (
                          <Chip
                            size="small"
                            icon={
                              <HourglassTopRoundedIcon sx={{ fontSize: 14 }} />
                            }
                            label="รอการอนุมัติ"
                            color="warning"
                            onClick={() => requestApprove(u)}
                            sx={{
                              cursor: "pointer",
                              fontSize: 11.5,
                              fontWeight: 400,
                              borderRadius: `${radius}px`,
                            }}
                          />
                        ) : (
                          <Tooltip
                            placement="top"
                            title={
                              selectedCount > 0
                                ? BULK_MODE_LOCK_HINT
                                : isSelf
                                  ? ""
                                  : ""
                            }
                            arrow
                            disableHoverListener={!isRowActionLocked}
                          >
                            <span>
                              <Chip
                                size="small"
                                icon={
                                  u.is_active ? (
                                    <CheckCircleRoundedIcon
                                      sx={{ fontSize: 14 }}
                                    />
                                  ) : (
                                    <BlockRoundedIcon sx={{ fontSize: 14 }} />
                                  )
                                }
                                label={
                                  u.is_active ? "ใช้งานได้" : "ระงับการใช้งาน"
                                }
                                color={u.is_active ? "success" : "default"}
                                variant={u.is_active ? "outlined" : "filled"}
                                onClick={() => requestToggleStatus(u)}
                                disabled={isRowActionLocked}
                                sx={{
                                  cursor: isRowActionLocked
                                    ? "not-allowed"
                                    : "pointer",
                                  fontSize: 11.5,
                                  fontWeight: 400,
                                  borderRadius: `${radius}px`,
                                  "&.Mui-disabled": {
                                    opacity: 1,
                                    color: "#acacac",
                                    borderColor: "#acacac",
                                    "& .MuiChip-icon": { color: "#acacac" },
                                  },
                                }}
                              />
                            </span>
                          </Tooltip>
                        )}
                      </TableCell>

                      <TableCell sx={{ fontSize: 12.5, color: text.secondary }}>
                        {u.last_login_at
                          ? new Date(u.last_login_at).toLocaleString("th-TH")
                          : "-"}
                      </TableCell>

                      <TableCell align="left">
                        <Stack
                          direction="row"
                          spacing={0.5}
                          justifyContent="flex-start"
                          sx={{
                            p: 0.5,
                            // ml: "auto",
                            width: "fit-content",
                            borderRadius: 2.5,
                            bgcolor: alpha(theme.palette.grey[500], 0.04),
                            border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                          }}
                        >
                          {!u.is_approved && (
                            <>
                              <Tooltip title="อนุมัติผู้ใช้งาน" arrow>
                                <IconButton
                                  size="small"
                                  onClick={() => requestApprove(u)}
                                  sx={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: 2,
                                    color: "text.secondary",
                                    transition: "all .18s ease",
                                    "& svg": {
                                      fontSize: 17,
                                    },
                                    "&:hover": {
                                      color: "success.main",
                                      bgcolor: alpha(
                                        theme.palette.success.main,
                                        0.1,
                                      ),
                                      transform: "translateY(-1px)",
                                      boxShadow: 1,
                                    },
                                  }}
                                >
                                  <HowToRegRoundedIcon />
                                </IconButton>
                              </Tooltip>

                              <Divider orientation="vertical" flexItem />
                            </>
                          )}

                          <Tooltip
                            placement="left"
                            title={
                              isRowActionLocked
                                ? selectedCount > 0
                                  ? BULK_MODE_LOCK_HINT
                                  : "ไม่สามารถตั้งรหัสผ่านใหม่ให้บัญชีของตัวเองผ่านช่องทางนี้ได้"
                                : "ตั้งรหัสผ่านใหม่"
                            }
                            slotProps={{
                              tooltip: {
                                sx: {
                                  bgcolor: theme.palette.primary.main,
                                  borderRadius: 50,
                                  fontWeight: 400,
                                },
                              },
                            }}
                          >
                            {/* span ครอบไว้เพื่อให้ Tooltip แสดงได้แม้ IconButton จะถูก disabled */}
                            <span>
                              <IconButton
                                size="small"
                                disabled={isRowActionLocked}
                                onClick={() => {
                                  setResetTarget(u);
                                  setResetPasswordValue("");
                                }}
                                sx={{
                                  width: 34,
                                  height: 34,
                                  borderRadius: 2,
                                  color: "text.secondary",
                                  transition: "all .18s ease",
                                  "& svg": { fontSize: 17 },
                                  "&.Mui-disabled": { color: "#acacac" },
                                  "&:hover": isRowActionLocked
                                    ? {}
                                    : {
                                        color: "primary.main",
                                        bgcolor: (theme) =>
                                          alpha(
                                            theme.palette.primary.main,
                                            0.1,
                                          ),
                                        transform: "translateY(-1px)",
                                        boxShadow: 1,
                                      },
                                }}
                              >
                                <LockResetRoundedIcon />
                              </IconButton>
                            </span>
                          </Tooltip>

                          <Tooltip
                            placement="top"
                            title={selectedCount > 0 ? BULK_MODE_LOCK_HINT : ""}
                            arrow
                            disableHoverListener={!isRowActionLocked}
                          >
                            <span>
                              <Button
                                size="small"
                                variant="text"
                                startIcon={
                                  <DeleteRoundedIcon sx={{ fontSize: 17 }} />
                                }
                                onClick={() => requestDelete(u)}
                                disabled={isRowActionLocked}
                                sx={{
                                  minWidth: "auto",
                                  px: 1.2,
                                  py: 0.6,
                                  borderRadius: 2,
                                  textTransform: "none",
                                  fontWeight: 400,
                                  fontSize: 13,
                                  color: isRowActionLocked
                                    ? "action.disabled"
                                    : "error.main",
                                  transition: "all .18s ease",
                                  "&:hover": !isRowActionLocked
                                    ? {
                                        color: "error.main",
                                        bgcolor: alpha(
                                          theme.palette.error.main,
                                          0.1,
                                        ),
                                        transform: "translateY(-1px)",
                                        boxShadow: 1,
                                      }
                                    : {},
                                }}
                              >
                                ลบผู้ใช้งาน
                              </Button>
                            </span>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>

        {loading && (
          <Box
            sx={{
              p: 3,
              textAlign: "center",
              color: text.secondary,
              fontSize: 13,
            }}
          >
            กำลังโหลดข้อมูล...
          </Box>
        )}
        {!loading && users.length > 0 && displayedUsers.length === 0 && (
          <Box
            sx={{
              p: 3,
              textAlign: "center",
              color: text.secondary,
              fontSize: 13,
            }}
          >
            ไม่พบผู้ใช้งานที่ตรงกับคำค้นหา
          </Box>
        )}
        {!loading && users.length === 0 && (
          <Box
            sx={{
              p: 3,
              textAlign: "center",
              color: text.secondary,
              fontSize: 13,
            }}
          >
            ยังไม่มีผู้ใช้งานในระบบ
          </Box>
        )}
      </Box>

      {/* Dialog: เพิ่มผู้ใช้งานใหม่ */}
      <Dialog
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          setForm(emptyForm);
          setShowCreatePassword(false);
          setShowConfirmPassword(false);
        }}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: `${radius + 4}px` } }}
      >
        <form onSubmit={handleCreateUser}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
            เพิ่มผู้ใช้งานใหม่
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <TextField
                id="email"
                label="อีเมล"
                type="email"
                required
                fullWidth
                size="small"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                sx={{
                  "& .MuiOutlinedInput-root": { borderRadius: `${radius}px` },
                }}
              />
              <TextField
                id="full-name"
                label="ชื่อ-นามสกุล"
                fullWidth
                size="small"
                value={form.full_name}
                onChange={(e) =>
                  setForm({ ...form, full_name: e.target.value })
                }
                sx={{
                  "& .MuiOutlinedInput-root": { borderRadius: `${radius}px` },
                }}
              />

              <Box>
                <TextField
                  id="password"
                  label="รหัสผ่านเริ่มต้น"
                  type={showCreatePassword ? "text" : "password"}
                  required
                  fullWidth
                  size="small"
                  sx={{
                    "& .MuiOutlinedInput-root": { borderRadius: `${radius}px` },
                  }}
                  slotProps={{
                    htmlInput: { minLength: 10 },
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            tabIndex={-1}
                            onClick={() => setShowCreatePassword((v) => !v)}
                            edge="end"
                          >
                            {showCreatePassword ? (
                              <VisibilityOffRoundedIcon sx={{ fontSize: 18 }} />
                            ) : (
                              <VisibilityRoundedIcon sx={{ fontSize: 18 }} />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                />
                <Box sx={{ mt: 1 }}>
                  <PasswordChecklist password={form.password} />
                </Box>
              </Box>

              <TextField
                id="confirm-password"
                label="ยืนยันรหัสผ่านเริ่มต้น"
                type={showConfirmPassword ? "text" : "password"}
                required
                fullWidth
                size="small"
                sx={{
                  "& .MuiOutlinedInput-root": { borderRadius: `${radius}px` },
                }}
                slotProps={{
                  htmlInput: { minLength: 10 },
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          tabIndex={-1}
                          onClick={() => setShowConfirmPassword((v) => !v)}
                          edge="end"
                        >
                          {showConfirmPassword ? (
                            <VisibilityOffRoundedIcon sx={{ fontSize: 18 }} />
                          ) : (
                            <VisibilityRoundedIcon sx={{ fontSize: 18 }} />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
                value={form.confirmPassword}
                onChange={(e) =>
                  setForm({ ...form, confirmPassword: e.target.value })
                }
                error={
                  form.confirmPassword.length > 0 &&
                  form.password !== form.confirmPassword
                }
                helperText={
                  form.confirmPassword.length > 0 &&
                  form.password !== form.confirmPassword
                    ? "รหัสผ่านไม่ตรงกัน"
                    : " "
                }
              />
              <FormControl fullWidth size="small">
                <InputLabel id="create-role-label" htmlFor="create-role-input">
                  สิทธิ์การใช้งาน
                </InputLabel>

                <Select
                  id="create-role"
                  labelId="create-role-label"
                  inputProps={{ id: "create-role-input" }}
                  label="สิทธิ์การใช้งาน"
                  value={form.role_name}
                  onChange={(e) =>
                    setForm({ ...form, role_name: e.target.value })
                  }
                  sx={{ borderRadius: `${radius}px` }}
                >
                  <MenuItem value="user">User</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button
              onClick={() => {
                setAddOpen(false);
                setForm(emptyForm);
                setShowCreatePassword(false);
                setShowConfirmPassword(false);
              }}
              sx={{ textTransform: "none", borderRadius: `${radius}px` }}
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              variant="contained"
              disableElevation
              disabled={!isCreatePasswordValid || !createPasswordsMatch}
              sx={{
                textTransform: "none",
                fontWeight: 400,
                borderRadius: `${radius}px`,
              }}
            >
              บันทึก
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog: ตั้งรหัสผ่านใหม่ */}
      <Dialog
        open={Boolean(resetTarget)}
        onClose={() => setResetTarget(null)}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: `${radius + 4}px` } }}
      >
        <form onSubmit={handleResetPassword}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
            ตั้งรหัสผ่านใหม่
          </DialogTitle>
          <DialogContent>
            <Typography sx={{ fontSize: 13, color: text.secondary, mb: 2 }}>
              สำหรับผู้ใช้งาน: <strong>{resetTarget?.email}</strong>
            </Typography>

            <TextField
              id="reset-password"
              label="รหัสผ่านใหม่"
              type={showResetPassword ? "text" : "password"}
              required
              fullWidth
              size="small"
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: `${radius}px` },
              }}
              slotProps={{
                htmlInput: { minLength: 10 },
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        tabIndex={-1}
                        onClick={() => setShowResetPassword((v) => !v)}
                        edge="end"
                      >
                        {showResetPassword ? (
                          <VisibilityOffRoundedIcon sx={{ fontSize: 18 }} />
                        ) : (
                          <VisibilityRoundedIcon sx={{ fontSize: 18 }} />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
              value={resetPasswordValue}
              onChange={(e) => setResetPasswordValue(e.target.value)}
              helperText="แจ้งให้ผู้ใช้งานทราบผ่านช่องทางที่ปลอดภัยหลังบันทึก"
            />

            <Box sx={{ mt: 1 }}>
              <PasswordChecklist password={resetPasswordValue} />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button
              onClick={() => setResetTarget(null)}
              sx={{ textTransform: "none", borderRadius: `${radius}px` }}
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              variant="contained"
              disableElevation
              disabled={!isResetPasswordValid}
              sx={{
                textTransform: "none",
                fontWeight: 400,
                borderRadius: `${radius}px`,
              }}
            >
              บันทึกรหัสผ่านใหม่
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      {/* Popup: ยืนยันการอนุมัติผู้ใช้งานที่สมัครเอง */}
      <ConfirmDialog
        open={Boolean(approveTarget)}
        title="ยืนยันการอนุมัติผู้ใช้งาน"
        message={
          <>
            ต้องการอนุมัติผู้ใช้งาน <strong>{approveTarget?.email}</strong>{" "}
            ใช่หรือไม่?
            <br />
            หลังอนุมัติ ผู้ใช้งานคนนี้จะสามารถเข้าสู่ระบบได้ทันที
          </>
        }
        confirmLabel="อนุมัติ"
        severity="info"
        loading={approving}
        onCancel={() => setApproveTarget(null)}
        onConfirm={handleConfirmApprove}
      />

      {/* Popup: ยืนยันการลบผู้ใช้งาน */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="ยืนยันการลบผู้ใช้งาน"
        message={
          <>
            ต้องการลบผู้ใช้งาน <strong>{deleteTarget?.email}</strong>{" "}
            ใช่หรือไม่?
            <br />
            การลบไม่สามารถย้อนกลับได้ บัญชีนี้จะหายไปถาวร
          </>
        }
        confirmLabel="ลบผู้ใช้งาน"
        severity="error"
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* Popup: ยืนยันการระงับ/เปิดใช้งานบัญชี */}
      <ConfirmDialog
        open={Boolean(statusTarget)}
        title={
          statusTarget?.is_active
            ? "ยืนยันการระงับการใช้งาน"
            : "ยืนยันการเปิดใช้งานบัญชี"
        }
        message={
          statusTarget?.is_active ? (
            <>
              ต้องการระงับการใช้งานบัญชี <strong>{statusTarget?.email}</strong>{" "}
              ใช่หรือไม่?
              <br />
              ผู้ใช้งานคนนี้จะไม่สามารถเข้าสู่ระบบได้จนกว่าจะเปิดใช้งานอีกครั้ง
            </>
          ) : (
            <>
              ต้องการเปิดใช้งานบัญชี <strong>{statusTarget?.email}</strong>{" "}
              อีกครั้งใช่หรือไม่?
            </>
          )
        }
        confirmLabel={statusTarget?.is_active ? "ระงับการใช้งาน" : "เปิดใช้งาน"}
        severity={statusTarget?.is_active ? "warning" : "info"}
        loading={togglingStatus}
        onCancel={() => setStatusTarget(null)}
        onConfirm={handleConfirmToggleStatus}
      />

      {/* Dialog: ยืนยันการดำเนินการพร้อมกันหลายราย — ต้องกรอกรหัสผ่านของ admin เอง */}
      <Dialog
        open={Boolean(bulkAction)}
        onClose={closeBulkDialog}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: `${radius + 4}px` } }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
          {bulkAction ? BULK_ACTION_LABELS[bulkAction.type].title : ""}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, color: text.secondary, mb: 1.5 }}>
            การดำเนินการนี้จะมีผลกับผู้ใช้งาน{" "}
            <strong>{bulkAction?.targets?.length || 0}</strong> รายการ:
          </Typography>
          <Box
            sx={{
              maxHeight: 140,
              overflowY: "auto",
              mb: 2,
              border: `1px solid ${divider}`,
              borderRadius: `${radius}px`,
              p: 1,
              bgcolor: background.default,
            }}
          >
            {bulkAction?.targets?.map((u) => (
              <Typography
                key={u.user_id}
                sx={{ fontSize: 12.5, color: text.secondary }}
              >
                • {u.email}
              </Typography>
            ))}
          </Box>

          {bulkAction?.type === "change_role" && (
            <Alert severity="info" sx={{ mb: 2, borderRadius: `${radius}px` }}>
              จะเปลี่ยนสิทธิ์เป็น{" "}
              <strong>
                {bulkAction.role_name === "admin" ? "Admin" : "User"}
              </strong>
            </Alert>
          )}

          {bulkAction?.type === "delete" && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: `${radius}px` }}>
              การลบไม่สามารถย้อนกลับได้ ข้อมูลบัญชีเหล่านี้จะหายไปถาวรทั้งหมด
            </Alert>
          )}

          <TextField
            label="กรอกรหัสผ่านของท่านเพื่อยืนยัน"
            type={showBulkPassword ? "text" : "password"}
            fullWidth
            required
            size="small"
            autoFocus
            value={bulkPassword}
            onChange={(e) => setBulkPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleConfirmBulkAction();
              }
            }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: `${radius}px` } }}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      tabIndex={-1}
                      onClick={() => setShowBulkPassword((v) => !v)}
                      edge="end"
                    >
                      {showBulkPassword ? (
                        <VisibilityOffRoundedIcon sx={{ fontSize: 18 }} />
                      ) : (
                        <VisibilityRoundedIcon sx={{ fontSize: 18 }} />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          {bulkError && (
            <Alert
              severity="error"
              sx={{ mt: 1.5, borderRadius: `${radius}px` }}
            >
              {bulkError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={closeBulkDialog}
            disabled={bulkProcessing}
            sx={{ textTransform: "none", borderRadius: `${radius}px` }}
          >
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            disableElevation
            color={
              bulkAction ? BULK_ACTION_LABELS[bulkAction.type].color : "primary"
            }
            onClick={handleConfirmBulkAction}
            disabled={bulkProcessing || !bulkPassword}
            sx={{
              textTransform: "none",
              fontWeight: 400,
              borderRadius: `${radius}px`,
              color: "#fff",
            }}
          >
            {bulkProcessing
              ? "กำลังดำเนินการ..."
              : bulkAction
                ? BULK_ACTION_LABELS[bulkAction.type].confirmLabel
                : "ยืนยัน"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
