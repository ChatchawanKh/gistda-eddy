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

import PersonAddRoundedIcon from "@mui/icons-material/PersonAddRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import LockResetRoundedIcon from "@mui/icons-material/LockResetRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import HourglassTopRoundedIcon from "@mui/icons-material/HourglassTopRounded";
import HowToRegRoundedIcon from "@mui/icons-material/HowToRegRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";

import axiosClient from "../../api/axiosClient";
import ConfirmDialog from "../../components/ConfirmDialog";
import { useAuth } from "../../context/AuthContext";

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
};

export default function UserManagementSection() {
  const theme = useTheme();
  const { primary, divider, text, background } = theme.palette;
  const radius = theme.shape.borderRadius;
  const { user: currentUser } = useAuth(); // admin ที่กำลัง login อยู่ตอนนี้

  const [users, setUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [info, setInfo] = React.useState("");

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
  const [bulkPassword, setBulkPassword] = React.useState("");
  const [bulkError, setBulkError] = React.useState("");
  const [bulkProcessing, setBulkProcessing] = React.useState(false);

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
    setBulkAction({ type, targets });
  }

  function closeBulkDialog() {
    if (bulkProcessing) return;
    setBulkAction(null);
    setBulkPassword("");
    setBulkError("");
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

    if (form.password.length < 8) {
      setError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
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
  function requestToggleStatus(user) {
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
      setStatusTarget(null);
      await fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || "อัปเดตสถานะไม่สำเร็จ");
    } finally {
      setTogglingStatus(false);
    }
  }

  // เปิด popup ยืนยันก่อนลบผู้ใช้งาน (แทน window.confirm)
  function requestDelete(user) {
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
    if (resetPasswordValue.length < 8) {
      setError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
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
              fontWeight: 500,
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
          startIcon={<PersonAddRoundedIcon />}
          onClick={() => setAddOpen(true)}
          sx={{
            borderRadius: `${radius}px`,
            textTransform: "none",
            fontWeight: 700,
          }}
        >
          เพิ่มผู้ใช้งาน
        </Button>
      </Stack>

      {info && (
        <Alert
          severity="success"
          sx={{ mb: 2, borderRadius: `${radius}px` }}
          onClose={() => setInfo("")}
        >
          {info}
        </Alert>
      )}
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2, borderRadius: `${radius}px` }}
          onClose={() => setError("")}
        >
          {error}
        </Alert>
      )}

      {/* แถบค้นหา + กรองสิทธิ์ */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{ mb: 2 }}
      >
        <TextField
          size="small"
          placeholder="ค้นหาจากอีเมลหรือชื่อ-นามสกุล..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          sx={{
            flex: 1,
            "& .MuiOutlinedInput-root": { borderRadius: `${radius}px` },
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
          >
            <MenuItem value="all">ทั้งหมด</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
            <MenuItem value="user">User</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {/* แถบดำเนินการพร้อมกัน — แสดงเมื่อมีการเลือกอย่างน้อย 1 แถว */}
      {selectedCount > 0 && (
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
            borderRadius: `${radius}px`,
            bgcolor: alpha(primary.main, 0.08),
            border: `1px solid ${alpha(primary.main, 0.3)}`,
          }}
        >
          <Typography
            sx={{ fontSize: 13.5, fontWeight: 700, color: primary.main }}
          >
            เลือกแล้ว {selectedCount} รายการ
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button
              size="small"
              variant="outlined"
              color="success"
              startIcon={<CheckCircleRoundedIcon sx={{ fontSize: 16 }} />}
              onClick={() => requestBulkAction("activate")}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                borderRadius: `${radius}px`,
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
                fontWeight: 700,
                borderRadius: `${radius}px`,
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
                fontWeight: 700,
                borderRadius: `${radius}px`,
              }}
            >
              ลบ
            </Button>
            <Button
              size="small"
              onClick={() => setSelectedIds(new Set())}
              sx={{ textTransform: "none", color: text.secondary }}
            >
              ยกเลิกการเลือก
            </Button>
          </Stack>
        </Box>
      )}

      <Box
        sx={{
          border: `1px solid ${divider}`,
          borderRadius: `${radius + 4}px`,
          overflow: "hidden",
          bgcolor: background.paper,
          maxWidth: "100%",
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
                    fontWeight: 500,
                    fontSize: 14,
                    color: text.secondary,
                    bgcolor: background.default,
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
                  />
                </TableCell>
                <TableCell sortDirection={orderBy === "email" ? order : false}>
                  <TableSortLabel
                    active={orderBy === "email"}
                    direction={orderBy === "email" ? order : "asc"}
                    onClick={() => handleSort("email")}

                  >
                    อีเมล
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  sortDirection={orderBy === "full_name" ? order : false}
                >
                  <TableSortLabel
                    active={orderBy === "full_name"}
                    direction={orderBy === "full_name" ? order : "asc"}
                    onClick={() => handleSort("full_name")}
                  >
                    ชื่อ-นามสกุล
                  </TableSortLabel>
                </TableCell>
                <TableCell
                  sortDirection={orderBy === "role_name" ? order : false}
                >
                  <TableSortLabel
                    active={orderBy === "role_name"}
                    direction={orderBy === "role_name" ? order : "asc"}
                    onClick={() => handleSort("role_name")}
                  >
                    สิทธิ์
                  </TableSortLabel>
                </TableCell>
                <TableCell sortDirection={orderBy === "status" ? order : false}>
                  <TableSortLabel
                    active={orderBy === "status"}
                    direction={orderBy === "status" ? order : "asc"}
                    onClick={() => handleSort("status")}
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
                  return (
                    <TableRow
                      key={u.user_id}
                      hover
                      selected={selectedIds.has(u.user_id)}
                      sx={
                        isSelf
                          ? {
                              bgcolor: background.light,
                              borderLeft: `3px solid ${primary.main}`,
                              "& td:nth-of-type(2)": { pl: "13px" },
                              "& td:first-of-type": {
                                bgcolor: background.light,
                              },
                              "& td:last-of-type": {
                                bgcolor: background.light,
                              },
                            }
                          : undefined
                      }
                    >
                      <TableCell padding="checkbox">
                        <Tooltip
                          title={
                            isSelf
                              ? "ไม่สามารถเลือกบัญชีของตัวเองเพื่อดำเนินการพร้อมกันได้"
                              : ""
                          }
                          arrow
                          disableHoverListener={!isSelf}
                        >
                          <span>
                            <Checkbox
                              size="small"
                              checked={selectedIds.has(u.user_id)}
                              onChange={() => toggleSelectRow(u.user_id)}
                              disabled={isSelf}
                            />
                          </span>
                        </Tooltip>
                      </TableCell>

                      <TableCell
                        sx={{ fontSize: 13, maxWidth: { xs: 200, md: "none" } }}
                      >
                        <Stack
                          direction="row"
                          // alignItems="center"
                          spacing={1}
                          sx={{ minWidth: 0 }}
                        >
                          <Box
                            component="span"
                            sx={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {u.email}
                          </Box>
                        </Stack>
                      </TableCell>

                      <TableCell
                        sx={{
                          fontSize: 13,
                          maxWidth: { xs: 160, md: "none" },
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {u.full_name || "-"}
                      </TableCell>

                      <TableCell>
                        <Tooltip
                          title={
                            isSelf
                              ? "ไม่สามารถเปลี่ยนสิทธิ์ของตัวเองได้ ให้ผู้ดูแลระบบท่านอื่นเปลี่ยนให้"
                              : ""
                          }
                          arrow
                          disableHoverListener={!isSelf}
                        >
                          {/* span ครอบไว้เพื่อให้ Tooltip แสดงได้แม้ Select จะถูก disabled */}
                          <span>
                            <FormControl
                              size="small"
                              sx={{ minWidth: 110 }}
                              disabled={isSelf}
                            >
                              <Select
                                inputProps={{
                                  "aria-label": "สิทธิ์ผู้ใช้งาน",
                                }}
                                value={u.role_name}
                                onChange={(e) =>
                                  handleChangeRole(u.user_id, e.target.value)
                                }
                                sx={{
                                  fontSize: 13,
                                  borderRadius: `${radius}px`,
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
                            sx={{ cursor: "pointer", fontSize: 11.5 }}
                          />
                        ) : (
                          <Chip
                            size="small"
                            icon={
                              u.is_active ? (
                                <CheckCircleRoundedIcon sx={{ fontSize: 14 }} />
                              ) : (
                                <BlockRoundedIcon sx={{ fontSize: 14 }} />
                              )
                            }
                            label={u.is_active ? "ใช้งานได้" : "ระงับการใช้งาน"}
                            color={u.is_active ? "success" : "default"}
                            variant={u.is_active ? "outlined" : "filled"}
                            onClick={() => requestToggleStatus(u)}
                            sx={{ cursor: "pointer", fontSize: 11.5 }}
                          />
                        )}
                      </TableCell>

                      <TableCell sx={{ fontSize: 12.5, color: text.secondary }}>
                        {u.last_login_at
                          ? new Date(u.last_login_at).toLocaleString("th-TH")
                          : "-"}
                      </TableCell>

                      <TableCell align="right">
                        <Stack
                          direction="row"
                          spacing={0.25}
                          // justifyContent="flex-end"
                          // alignItems="center"
                          sx={{ flexWrap: "nowrap" }}
                        >
                          {!u.is_approved && (
                            <Tooltip title="อนุมัติผู้ใช้งาน" arrow>
                              <IconButton
                                size="small"
                                onClick={() => requestApprove(u)}
                              >
                                <HowToRegRoundedIcon
                                  sx={{ fontSize: 18, color: "success.main" }}
                                />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="ตั้งรหัสผ่านใหม่" arrow>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setResetTarget(u);
                                setResetPasswordValue("");
                              }}
                            >
                              <LockResetRoundedIcon
                                sx={{ fontSize: 18, color: primary.main }}
                              />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="ลบผู้ใช้งาน" arrow>
                            <IconButton
                              size="small"
                              onClick={() => requestDelete(u)}
                            >
                              <DeleteRoundedIcon
                                sx={{ fontSize: 18, color: "error.main" }}
                              />
                            </IconButton>
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
        }}
        fullWidth
        maxWidth="xs"
      >
        <form onSubmit={handleCreateUser}>
          <DialogTitle sx={{ fontWeight: 800 }}>เพิ่มผู้ใช้งานใหม่</DialogTitle>
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
              />
              <TextField
                id="password"
                label="รหัสผ่านเริ่มต้น"
                type="password"
                required
                fullWidth
                size="small"
                slotProps={{ htmlInput: { minLength: 8 } }}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                helperText="อย่างน้อย 8 ตัวอักษร"
              />
              <TextField
                id="confirm-password"
                label="ยืนยันรหัสผ่านเริ่มต้น"
                type="password"
                required
                fullWidth
                size="small"
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
              }}
              sx={{ textTransform: "none" }}
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={
                form.password.length < 8 ||
                form.password !== form.confirmPassword
              }
              sx={{
                textTransform: "none",
                fontWeight: 700,
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
      >
        <form onSubmit={handleResetPassword}>
          <DialogTitle sx={{ fontWeight: 800 }}>ตั้งรหัสผ่านใหม่</DialogTitle>
          <DialogContent>
            <Typography sx={{ fontSize: 13, color: text.secondary, mb: 2 }}>
              สำหรับผู้ใช้งาน: <strong>{resetTarget?.email}</strong>
            </Typography>
            <TextField
              id="reset-password"
              label="รหัสผ่านใหม่"
              type="text"
              required
              fullWidth
              size="small"
              slotProps={{ htmlInput: { minLength: 8 } }}
              value={resetPasswordValue}
              onChange={(e) => setResetPasswordValue(e.target.value)}
              helperText="อย่างน้อย 8 ตัวอักษร — แจ้งให้ผู้ใช้งานทราบผ่านช่องทางที่ปลอดภัยหลังบันทึก"
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button
              onClick={() => setResetTarget(null)}
              sx={{ textTransform: "none" }}
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{
                textTransform: "none",
                fontWeight: 700,
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
            การลบไม่สามารถย้อนกลับได้ ข้อมูลบัญชีนี้จะหายไปถาวร
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
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
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

          {bulkAction?.type === "delete" && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: `${radius}px` }}>
              การลบไม่สามารถย้อนกลับได้ ข้อมูลบัญชีเหล่านี้จะหายไปถาวรทั้งหมด
            </Alert>
          )}

          <TextField
            label="กรอกรหัสผ่านของท่านเพื่อยืนยัน"
            type="password"
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
            sx={{ textTransform: "none" }}
          >
            ยกเลิก
          </Button>
          <Button
            variant="contained"
            color={
              bulkAction ? BULK_ACTION_LABELS[bulkAction.type].color : "primary"
            }
            onClick={handleConfirmBulkAction}
            disabled={bulkProcessing || !bulkPassword}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              borderRadius: `${radius}px`,
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
