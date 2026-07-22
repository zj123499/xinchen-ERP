"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, GraduationCap, Phone, Mail, MapPin, RefreshCw, FileText, DollarSign, User, MessageSquare, Clock, Calendar, Pencil, X, Upload, Trash2, ChevronDown } from "lucide-react";

interface StudentDetail {
  id: number;
  name: string;
  phone?: string;
  wechat?: string;
  email?: string;
  gender?: string;
  birthDate?: string;
  nationality?: string;
  currentSchool?: string;
  currentMajor?: string;
  education?: string;
  gpa?: string;
  targetCountry?: string;
  targetDegree?: string;
  targetMajor?: string;
  budget?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  remark?: string;
  currentStatus?: string;
  createdAt: string;
  assignedTo?: { id: number; realName: string; username: string };
  leads: { id: number; name: string; phone: string; status: string; assignedTo: { id: number; realName: string }; createdAt: string }[];
  followUps: { id: number; type: string; content: string; nextPlan?: string; nextFollowUpAt?: string; createdAt: string; user: { id: number; realName: string } }[];
  contracts: { id: number; contractNo: string; signDate: string; totalAmount: string; status: string; businessLine?: { id: number; name: string }; orders: { id: number; orderNo: string; productName: string; amount: string; status: string }[] }[];
  applications: { id: number; country?: string; schoolName?: string; major?: string; materialStatus?: string; visaStatus?: string; offerResult?: string }[];
  payments: { id: number; amount: string; paymentType: string; status: string; createdAt: string }[];
  lifecycleEvents: { id: number; eventType: string; eventDate: string; description?: string }[];
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  LEAD: { label: "线索", color: "bg-blue-100 text-blue-800" },
  CONSULTING: { label: "咨询中", color: "bg-yellow-100 text-yellow-800" },
  SIGNED: { label: "已签约", color: "bg-purple-100 text-purple-800" },
  APPLYING: { label: "申请中", color: "bg-orange-100 text-orange-800" },
  OFFER: { label: "已录取", color: "bg-green-100 text-green-800" },
  VISA: { label: "签证中", color: "bg-cyan-100 text-cyan-800" },
  ENROLLED: { label: "已入学", color: "bg-emerald-100 text-emerald-800" },
  ALUMNI: { label: "已毕业", color: "bg-gray-100 text-gray-800" },
};

const FOLLOW_TYPE_MAP: Record<string, string> = { phone: "电话", wechat: "微信", visit: "面谈", other: "其他" };

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [edit, setEdit] = useState({
    name: "", gender: "", phone: "", wechat: "", email: "", currentStatus: "", targetCountry: "", targetDegree: "", targetMajor: "", budget: "", remark: "",
  });

  // 材料管理
  const [files, setFiles] = useState<any[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState("申请材料");
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const fileCategories = ["申请材料", "成绩单", "语言成绩", "文书", "Offer", "签证", "合同", "其他"];

  async function fetchFiles() {
    if (!student) return;
    setFilesLoading(true);
    try {
      const res = await fetch(`/api/students/${student.id}/files`);
      const data = await res.json();
      setFiles(data.list || []);
    } catch { setFiles([]); }
    finally { setFilesLoading(false); }
  }

  async function handleUpload() {
    if (!uploadFile || !student) return;
    setUploading(true); setUploadMsg("");
    try {
      const form = new FormData();
      form.append("file", uploadFile);
      form.append("studentId", String(student.id));
      form.append("category", uploadCategory);
      const res = await fetch("/api/students/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "上传失败");
      setUploadMsg(`✅ 上传成功`);
      setUploadFile(null);
      fetchFiles();
    } catch (e: any) { setUploadMsg(`❌ ${e.message}`); }
    finally { setUploading(false); }
  }

  async function deleteFile(fileId: number) {
    if (!student || !confirm("确定删除该文件？")) return;
    await fetch(`/api/students/${student.id}/files?fileId=${fileId}`, { method: "DELETE" });
    fetchFiles();
  }

  useEffect(() => { if (student) fetchFiles(); }, [student?.id]);

  // 申请意向管理
  const [intentions, setIntentions] = useState<any[]>([]);
  const [intentForm, setIntentForm] = useState({ country: "", institution: "", major: "", degree: "硕士", priority: 0, remark: "" });
  const [showIntentForm, setShowIntentForm] = useState(false);

  async function fetchIntentions() {
    if (!student) return;
    try { const r = await fetch(`/api/students/${student.id}/intentions`); const d = await r.json(); setIntentions(d.list || []); }
    catch { setIntentions([]); }
  }
  async function addIntention() {
    if (!student || !intentForm.country) return;
    await fetch(`/api/students/${student.id}/intentions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(intentForm) });
    setIntentForm({ country: "", institution: "", major: "", degree: "硕士", priority: 0, remark: "" });
    setShowIntentForm(false);
    fetchIntentions();
  }
  async function deleteIntention(intentId: number) {
    if (!student || !confirm("确定删除？")) return;
    await fetch(`/api/students/${student.id}/intentions?intentId=${intentId}`, { method: "DELETE" });
    fetchIntentions();
  }
  useEffect(() => { if (student) fetchIntentions(); }, [student?.id]);

  function formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function openEdit() {
    if (!student) return;
    setEdit({
      name: student.name || "", gender: student.gender || "", phone: student.phone || "", wechat: student.wechat || "",
      email: student.email || "", currentStatus: student.currentStatus || "LEAD", targetCountry: student.targetCountry || "",
      targetDegree: student.targetDegree || "", targetMajor: student.targetMajor || "", budget: student.budget || "", remark: student.remark || "",
    });
    setFormError("");
    setShowEdit(true);
  }

  async function handleSave() {
    if (!edit.name.trim()) { setFormError("姓名不能为空"); return; }
    setSubmitting(true);
    setFormError("");
    try {
      const res = await fetch("/api/students/" + id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edit),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || `保存失败 (${res.status})`);
      setShowEdit(false);
      fetchStudent();
    } catch (err: any) {
      setFormError(err.message || "保存失败");
    } finally { setSubmitting(false); }
  }

  async function fetchStudent() {
    setLoading(true);
    try {
      const res = await fetch('/api/students/' + id);
      if (!res.ok) throw new Error("Not found");
      setStudent(await res.json());
    } catch { router.push("/students"); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchStudent(); }, [id]);

  if (loading) return <div className="flex items-center justify-center py-20"><RefreshCw className="w-6 h-6 animate-spin text-gray-400" /></div>;
  if (!student) return null;

  const statusInfo = STATUS_MAP[student.currentStatus || ""] || { label: "未知", color: "bg-gray-100 text-gray-800" };

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push("/students")} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${statusInfo.color}`}>{statusInfo.label}</span>
            {student.assignedTo && <span className="text-sm text-gray-500 flex items-center gap-1"><User className="w-3.5 h-3.5" />{student.assignedTo.realName}</span>}
            <span className="text-sm text-gray-400">创建于 {new Date(student.createdAt).toLocaleDateString("zh-CN")}</span>
          </div>
          <button onClick={openEdit}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
            <Pencil className="w-4 h-4" />编辑
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {/* 基本信息 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-500" />基本信息
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <InfoItem label="姓名" value={student.name} />
              <InfoItem label="性别" value={student.gender === "MALE" ? "男" : student.gender === "FEMALE" ? "女" : "-"} />
              <InfoItem label="出生日期" value={student.birthDate ? new Date(student.birthDate).toLocaleDateString("zh-CN") : "-"} />
              <InfoItem label="手机号" value={student.phone || "-"} icon={<Phone className="w-3.5 h-3.5 text-gray-400" />} />
              <InfoItem label="微信" value={student.wechat || "-"} />
              <InfoItem label="邮箱" value={student.email || "-"} icon={<Mail className="w-3.5 h-3.5 text-gray-400" />} />
              <InfoItem label="国籍" value={student.nationality || "-"} />
              <InfoItem label="当前学校" value={student.currentSchool || "-"} />
              <InfoItem label="当前专业" value={student.currentMajor || "-"} />
              <InfoItem label="学历" value={student.education || "-"} />
              <InfoItem label="GPA" value={student.gpa || "-"} />
              <InfoItem label="意向国家" value={student.targetCountry || "-"} icon={<MapPin className="w-3.5 h-3.5 text-gray-400" />} />
              <InfoItem label="意向学位" value={student.targetDegree || "-"} />
              <InfoItem label="意向专业" value={student.targetMajor || "-"} />
              <InfoItem label="预算" value={student.budget ? `¥${Number(student.budget).toLocaleString()}` : "-"} />
            </div>
            {student.remark && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="text-xs text-gray-400 mb-1">备注</div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">{student.remark}</div>
              </div>
            )}
          </div>

          {/* 跟进时间线 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-500" />跟进记录
            </h2>
            {student.followUps.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">暂无跟进记录</p>
            ) : (
              <div>
                {student.followUps.map((fu, idx) => (
                  <div key={fu.id} className={`relative pl-6 pb-6 ${idx < student.followUps.length - 1 ? "border-l-2 border-gray-100" : ""}`}>
                    <div className="absolute left-0 top-1.5 -translate-x-1/2"><div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow" /></div>
                    <div className="ml-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">{fu.user.realName}</span>
                        <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{FOLLOW_TYPE_MAP[fu.type] || fu.type}</span>
                        <span className="text-xs text-gray-400">{new Date(fu.createdAt).toLocaleString("zh-CN")}</span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{fu.content}</p>
                      {fu.nextPlan && <p className="text-sm text-blue-600 mt-1">下一步: {fu.nextPlan}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 合同 */}
          {student.contracts.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />合同 ({student.contracts.length})
              </h2>
              <div className="space-y-3">
                {student.contracts.map((c) => (
                  <div key={c.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">{c.contractNo}</span>
                      <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">{c.status}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm text-gray-600">
                      <div>签约: {new Date(c.signDate).toLocaleDateString("zh-CN")}</div>
                      <div>金额: ¥{Number(c.totalAmount).toLocaleString()}</div>
                      <div>{c.businessLine?.name || "-"}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 右侧 */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">当前状态</h2>
            <span className={`inline-flex text-sm font-medium px-3 py-1 rounded-full ${statusInfo.color}`}>{statusInfo.label}</span>
          </div>

          {student.leads.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">关联线索</h2>
              <div className="space-y-2">
                {student.leads.map((l) => (
                  <button key={l.id} onClick={() => router.push('/leads/' + l.id)}
                    className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                    <div className="text-sm font-medium text-gray-900">{l.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{l.phone} · {l.status} · {l.assignedTo.realName}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {student.applications.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">申请项目</h2>
              <div className="space-y-3">
                {student.applications.map((a) => (
                  <div key={a.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-900">{a.schoolName || "未填写"}</div>
                    <div className="text-xs text-gray-500 mt-1">{a.country} · {a.major}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {student.payments.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-500" />收款记录
              </h2>
              <div className="space-y-2">
                {student.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                    <span className="text-gray-600">{p.paymentType}</span>
                    <span className="font-medium text-gray-900">¥{Number(p.amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 材料管理 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />申请材料
              </h2>
              <button onClick={() => { setUploadFile(null); setUploadCategory("申请材料"); setUploadMsg(""); setShowUpload(!showUpload); }}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700">
                <Upload className="w-3.5 h-3.5" />上传
              </button>
            </div>

            {/* 上传面板 */}
            {showUpload && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <select value={uploadCategory} onChange={e => setUploadCategory(e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-xs outline-none">
                    {fileCategories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                  onChange={e => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-gray-700 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700" />
                {uploadFile && <p className="text-xs text-gray-500 mt-1">{uploadFile.name} ({formatSize(uploadFile.size)})</p>}
                {uploadMsg && <p className={`text-xs mt-1 ${uploadMsg.startsWith("✅") ? "text-green-600" : "text-red-500"}`}>{uploadMsg}</p>}
                <button onClick={handleUpload} disabled={!uploadFile || uploading}
                  className="mt-2 w-full py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50">
                  {uploading ? "上传中..." : "确认上传"}
                </button>
              </div>
            )}

            {/* 文件列表 */}
            {filesLoading ? (
              <p className="text-xs text-gray-400 text-center py-4">加载中...</p>
            ) : files.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">暂无材料文件，点击上方按钮上传</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {files.map((f: any) => (
                  <div key={f.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-900 truncate">{f.originalName}</span>
                        <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">{f.category}</span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">{f.sizeText} · {f.uploaderName} · {new Date(f.createdAt).toLocaleDateString()}</p>
                    </div>
                    <button onClick={() => deleteFile(f.id)}
                      className="ml-2 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 申请意向（多国多校多专业） */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-500" />申请意向
              </h2>
              <button onClick={() => setShowIntentForm(!showIntentForm)}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700">
                + 添加意向
              </button>
            </div>
            {showIntentForm && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-gray-500">国家 <span className="text-red-400">*</span></label>
                    <input value={intentForm.country} onChange={e => setIntentForm(f => ({ ...f, country: e.target.value }))}
                      className="w-full px-2 py-1 border rounded text-xs outline-none" placeholder="如：英国" />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500">院校</label>
                    <input value={intentForm.institution} onChange={e => setIntentForm(f => ({ ...f, institution: e.target.value }))}
                      className="w-full px-2 py-1 border rounded text-xs outline-none" placeholder="如：UCL" />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500">专业</label>
                    <input value={intentForm.major} onChange={e => setIntentForm(f => ({ ...f, major: e.target.value }))}
                      className="w-full px-2 py-1 border rounded text-xs outline-none" placeholder="如：计算机科学" />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-500">学位</label>
                    <select value={intentForm.degree} onChange={e => setIntentForm(f => ({ ...f, degree: e.target.value }))}
                      className="w-full px-2 py-1 border rounded text-xs outline-none">
                      <option value="本科">本科</option><option value="硕士">硕士</option><option value="博士">博士</option><option value="预科">预科</option><option value="其他">其他</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={addIntention} disabled={!intentForm.country}
                    className="flex-1 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50">保存</button>
                  <button onClick={() => setShowIntentForm(false)} className="py-1 px-3 border rounded text-xs">取消</button>
                </div>
              </div>
            )}
            {intentions.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">暂无申请意向，点击上方按钮添加</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {intentions.map((it: any) => (
                  <div key={it.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium">{it.country}</span>
                        {it.institution && <span className="text-xs text-gray-500">· {it.institution}</span>}
                        {it.major && <span className="text-xs text-gray-500">· {it.major}</span>}
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{it.degree || "硕士"}</span>
                      </div>
                    </div>
                    <button onClick={() => deleteIntention(it.id)}
                      className="ml-2 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {student.lifecycleEvents.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />生命周期
              </h2>
              <div className="space-y-3">
                {student.lifecycleEvents.map((evt) => (
                  <div key={evt.id} className="flex items-start gap-3 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <div className="text-gray-900 font-medium">{evt.eventType}</div>
                      <div className="text-xs text-gray-400">{new Date(evt.eventDate).toLocaleDateString("zh-CN")}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showEdit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">编辑学生</h3>
              <button onClick={() => setShowEdit(false)} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <EField label="姓名 *"><input className={eIpt} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></EField>
              <EField label="性别">
                <select className={eIpt} value={edit.gender} onChange={(e) => setEdit({ ...edit, gender: e.target.value })}>
                  <option value="">未填写</option><option value="MALE">男</option><option value="FEMALE">女</option>
                </select>
              </EField>
              <EField label="手机号"><input className={eIpt} value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></EField>
              <EField label="微信"><input className={eIpt} value={edit.wechat} onChange={(e) => setEdit({ ...edit, wechat: e.target.value })} /></EField>
              <EField label="邮箱"><input className={eIpt} value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></EField>
              <EField label="当前状态">
                <select className={eIpt} value={edit.currentStatus} onChange={(e) => setEdit({ ...edit, currentStatus: e.target.value })}>
                  {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </EField>
              <EField label="意向国家"><input className={eIpt} value={edit.targetCountry} onChange={(e) => setEdit({ ...edit, targetCountry: e.target.value })} /></EField>
              <EField label="意向学位"><input className={eIpt} value={edit.targetDegree} onChange={(e) => setEdit({ ...edit, targetDegree: e.target.value })} /></EField>
              <EField label="意向专业"><input className={eIpt} value={edit.targetMajor} onChange={(e) => setEdit({ ...edit, targetMajor: e.target.value })} /></EField>
              <EField label="预算(元)"><input className={eIpt} type="number" value={edit.budget} onChange={(e) => setEdit({ ...edit, budget: e.target.value })} /></EField>
              <div className="col-span-2">
                <EField label="备注"><textarea className={eIpt} rows={2} value={edit.remark} onChange={(e) => setEdit({ ...edit, remark: e.target.value })} /></EField>
              </div>
            </div>
            {formError && <div className="px-6 pb-2 text-sm text-red-500">{formError}</div>}
            <div className="flex justify-end gap-3 px-6 py-4 border-t">
              <button onClick={() => setShowEdit(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">取消</button>
              <button onClick={handleSave} disabled={submitting}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">
                {submitting ? "保存中..." : "保存修改"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const eIpt = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none";

function EField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      {children}
    </div>
  );
}

function InfoItem({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="text-sm text-gray-900 flex items-center gap-1">{icon}{value}</div>
    </div>
  );
}
