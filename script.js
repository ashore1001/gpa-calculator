const STORAGE_KEY = "gpa-calculator-courses-v1";
const PROFILE_STORAGE_KEY = "gpa-calculator-profile-v1";
const TARGETS_STORAGE_KEY = "gpa-calculator-targets-v1";
const AI_ENDPOINT_STORAGE_KEY = "gpa-calculator-ai-endpoint-v1";
const DEFAULT_REMOTE_AI_ENDPOINT = "https://gpa-calculator-ashore1.vercel.app/api/analyze";

const scoreBands = [
  { min: 96, max: 100, point: 4.8, grade: "A+" },
  { min: 93, max: 95, point: 4.5, grade: "A" },
  { min: 90, max: 92, point: 4.0, grade: "A-" },
  { min: 86, max: 89, point: 3.8, grade: "B+" },
  { min: 83, max: 85, point: 3.5, grade: "B" },
  { min: 80, max: 82, point: 3.0, grade: "B-" },
  { min: 76, max: 79, point: 2.8, grade: "C+" },
  { min: 73, max: 75, point: 2.5, grade: "C" },
  { min: 70, max: 72, point: 2.0, grade: "C-" },
  { min: 66, max: 69, point: 1.8, grade: "D+" },
  { min: 63, max: 65, point: 1.5, grade: "D" },
  { min: 60, max: 62, point: 1.0, grade: "D-" }
];

const legacyGradePoints = {
  "A+": 4.8,
  A: 4.5,
  "A-": 4.0,
  "B+": 3.8,
  B: 3.5,
  "B-": 3.0,
  "C+": 2.8,
  C: 2.5,
  "C-": 2.0,
  "D+": 1.8,
  D: 1.5,
  "D-": 1.0,
  F: 0
};

const levelLabels = {
  none: "暂无",
  basic: "入门",
  solid: "较扎实",
  strong: "突出"
};

let courses = loadCourses();
let profile = loadProfile();
let targets = loadTargets();
let latestLocalAnalysis = null;

const courseForm = document.querySelector("#courseForm");
const courseIdInput = document.querySelector("#courseId");
const courseNameInput = document.querySelector("#courseName");
const semesterInput = document.querySelector("#semester");
const creditsInput = document.querySelector("#credits");
const scoreInput = document.querySelector("#score");
const formTitle = document.querySelector("#formTitle");
const submitBtn = document.querySelector("#submitBtn");
const cancelEditBtn = document.querySelector("#cancelEditBtn");

const overallGpaEl = document.querySelector("#overallGpa");
const totalCreditsEl = document.querySelector("#totalCredits");
const courseCountEl = document.querySelector("#courseCount");
const bestSemesterEl = document.querySelector("#bestSemester");
const tableBody = document.querySelector("#courseTableBody");
const emptyState = document.querySelector("#emptyState");
const courseTableWrap = document.querySelector("#courseTableWrap");
const semesterList = document.querySelector("#semesterList");
const semesterFilter = document.querySelector("#semesterFilter");

const targetGpaInput = document.querySelector("#targetGpa");
const futureCreditsInput = document.querySelector("#futureCredits");
const goalResult = document.querySelector("#goalResult");
const exportCsvBtn = document.querySelector("#exportCsvBtn");
const clearAllBtn = document.querySelector("#clearAllBtn");

const profileForm = document.querySelector("#profileForm");
const profileSchoolInput = document.querySelector("#profileSchool");
const profileMajorInput = document.querySelector("#profileMajor");
const profileGradeInput = document.querySelector("#profileGrade");
const profileCurrentGpaInput = document.querySelector("#profileCurrentGpa");
const profileRankInput = document.querySelector("#profileRank");
const profileCohortSizeInput = document.querySelector("#profileCohortSize");
const englishTypeInput = document.querySelector("#englishType");
const englishScoreInput = document.querySelector("#englishScore");
const researchLevelInput = document.querySelector("#researchLevel");
const competitionLevelInput = document.querySelector("#competitionLevel");
const projectLevelInput = document.querySelector("#projectLevel");
const awardsTextInput = document.querySelector("#awardsText");

const targetForm = document.querySelector("#targetForm");
const targetSchoolInput = document.querySelector("#targetSchool");
const targetProgramInput = document.querySelector("#targetProgram");
const targetDirectionInput = document.querySelector("#targetDirection");
const targetMinRankInput = document.querySelector("#targetMinRank");
const targetMinGpaInput = document.querySelector("#targetMinGpa");
const targetEnglishRequirementInput = document.querySelector("#targetEnglishRequirement");
const targetResearchPreferenceInput = document.querySelector("#targetResearchPreference");
const targetList = document.querySelector("#targetList");

const runLocalAnalysisBtn = document.querySelector("#runLocalAnalysisBtn");
const runAiAnalysisBtn = document.querySelector("#runAiAnalysisBtn");
const competitivenessScoreEl = document.querySelector("#competitivenessScore");
const riskLevelEl = document.querySelector("#riskLevel");
const estimatedRangeEl = document.querySelector("#estimatedRange");
const localAnalysisResult = document.querySelector("#localAnalysisResult");
const aiStatus = document.querySelector("#aiStatus");
const aiReport = document.querySelector("#aiReport");
const aiEndpointInput = document.querySelector("#aiEndpoint");
const saveEndpointBtn = document.querySelector("#saveEndpointBtn");
const gpaTrendChart = document.querySelector("#gpaTrendChart");
const chartEmptyState = document.querySelector("#chartEmptyState");
const simCreditsInput = document.querySelector("#simCredits");
const simScoreInput = document.querySelector("#simScore");
const simResult = document.querySelector("#simResult");
const scenarioGrid = document.querySelector("#scenarioGrid");
const importCsvBtn = document.querySelector("#importCsvBtn");
const exportBackupBtn = document.querySelector("#exportBackupBtn");
const importBackupBtn = document.querySelector("#importBackupBtn");
const csvFileInput = document.querySelector("#csvFileInput");
const backupFileInput = document.querySelector("#backupFileInput");
const targetCompareList = document.querySelector("#targetCompareList");

courseForm.addEventListener("submit", handleCourseSubmit);
cancelEditBtn.addEventListener("click", resetForm);
semesterFilter.addEventListener("change", render);
targetGpaInput.addEventListener("input", updateGoalResult);
futureCreditsInput.addEventListener("input", updateGoalResult);
exportCsvBtn.addEventListener("click", exportCsv);
clearAllBtn.addEventListener("click", clearAllCourses);
profileForm.addEventListener("submit", handleProfileSubmit);
targetForm.addEventListener("submit", handleTargetSubmit);
runLocalAnalysisBtn.addEventListener("click", runLocalAnalysis);
runAiAnalysisBtn.addEventListener("click", runAiAnalysis);
saveEndpointBtn.addEventListener("click", saveAiEndpoint);
simCreditsInput.addEventListener("input", updateSimulator);
simScoreInput.addEventListener("input", updateSimulator);
importCsvBtn.addEventListener("click", () => csvFileInput.click());
exportBackupBtn.addEventListener("click", exportBackup);
importBackupBtn.addEventListener("click", () => backupFileInput.click());
csvFileInput.addEventListener("change", handleCsvImport);
backupFileInput.addEventListener("change", handleBackupImport);

populateProfileForm();
populateAiEndpoint();
render();

function handleCourseSubmit(event) {
  event.preventDefault();

  const name = courseNameInput.value.trim();
  const semester = semesterInput.value.trim();
  const credits = Number.parseFloat(creditsInput.value);
  const score = Number.parseFloat(scoreInput.value);

  if (!name || !semester || !Number.isFinite(credits) || credits <= 0 || !isValidScore(score)) {
    alert("请填写完整且有效的课程信息。");
    return;
  }

  const editingId = courseIdInput.value;
  const courseData = {
    id: editingId || createId("course"),
    name,
    semester,
    credits,
    score
  };

  if (editingId) {
    courses = courses.map((course) => course.id === editingId ? courseData : course);
  } else {
    courses.push(courseData);
  }

  saveCourses();
  resetForm();
  render();
}

function render() {
  renderSemesterFilter();
  renderSummary();
  renderCourseTable();
  renderSemesterSummary();
  renderTargets();
  renderGpaTrendChart();
  renderTargetComparison();
  updateSimulator();
  updateGoalResult();
}

function renderSummary() {
  const totalCredits = getTotalCredits(courses);
  const overallGpa = calculateGpa(courses);
  const semesterStats = getSemesterStats();
  const bestSemester = semesterStats
    .filter((item) => item.credits > 0)
    .sort((a, b) => b.gpa - a.gpa)[0];

  overallGpaEl.textContent = formatGpa(overallGpa);
  totalCreditsEl.textContent = formatCredits(totalCredits);
  courseCountEl.textContent = courses.length;
  bestSemesterEl.textContent = bestSemester ? `${bestSemester.semester} ${formatGpa(bestSemester.gpa)}` : "暂无";

  if (!profileCurrentGpaInput.value && overallGpa > 0) {
    profileCurrentGpaInput.placeholder = `自动参考：${formatGpa(overallGpa)}`;
  }
}

function renderCourseTable() {
  const selectedSemester = semesterFilter.value;
  const visibleCourses = selectedSemester === "all"
    ? courses
    : courses.filter((course) => course.semester === selectedSemester);

  emptyState.classList.toggle("hidden", courses.length > 0);
  courseTableWrap.classList.toggle("hidden", courses.length === 0);
  tableBody.innerHTML = "";

  visibleCourses
    .slice()
    .sort((a, b) => a.semester.localeCompare(b.semester, "zh-CN") || a.name.localeCompare(b.name, "zh-CN"))
    .forEach((course) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><span class="course-title">${escapeHtml(course.name)}</span></td>
        <td>${escapeHtml(course.semester)}</td>
        <td>${formatCredits(course.credits)}</td>
        <td><span class="grade-badge">${formatScore(course.score)}</span></td>
        <td>${formatGpa(scoreToPoint(course.score))}</td>
        <td>
          <div class="row-actions">
            <button type="button" data-id="${course.id}" class="edit-course">编辑</button>
            <button type="button" data-id="${course.id}" class="delete-course">删除</button>
          </div>
        </td>
      `;
      tableBody.appendChild(row);
    });

  tableBody.querySelectorAll(".edit-course").forEach((button) => {
    button.addEventListener("click", () => startEdit(button.dataset.id));
  });

  tableBody.querySelectorAll(".delete-course").forEach((button) => {
    button.addEventListener("click", () => deleteCourse(button.dataset.id));
  });
}

function renderSemesterFilter() {
  const selectedValue = semesterFilter.value;
  const semesters = getSemesters();

  semesterFilter.innerHTML = '<option value="all">全部学期</option>';
  semesters.forEach((semester) => {
    const option = document.createElement("option");
    option.value = semester;
    option.textContent = semester;
    semesterFilter.appendChild(option);
  });

  semesterFilter.value = semesters.includes(selectedValue) ? selectedValue : "all";
}

function renderSemesterSummary() {
  const stats = getSemesterStats();
  semesterList.innerHTML = "";

  if (stats.length === 0) {
    semesterList.innerHTML = '<div class="empty-state">添加课程后，这里会显示每个学期的 GPA。</div>';
    return;
  }

  stats.forEach((item) => {
    const card = document.createElement("article");
    card.className = "semester-item";
    card.innerHTML = `
      <span>${escapeHtml(item.semester)}</span>
      <strong>${formatGpa(item.gpa)}</strong>
      <span>${formatCredits(item.credits)} 学分 · ${item.count} 门课</span>
    `;
    semesterList.appendChild(card);
  });
}

function renderGpaTrendChart() {
  const stats = getSemesterProgressStats();
  const hasData = stats.length > 0;
  gpaTrendChart.classList.toggle("hidden", !hasData);
  chartEmptyState.classList.toggle("hidden", hasData);

  if (!hasData) return;

  const context = gpaTrendChart.getContext("2d");
  const width = gpaTrendChart.width;
  const height = gpaTrendChart.height;
  const padding = { top: 24, right: 48, bottom: 58, left: 52 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxCredits = Math.max(1, ...stats.map((item) => item.cumulativeCredits));
  const xStep = stats.length === 1 ? 0 : plotWidth / (stats.length - 1);

  context.clearRect(0, 0, width, height);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);

  drawGrid(context, width, height, padding, plotWidth, plotHeight);

  const gpaPoint = (value, index) => ({
    x: padding.left + (stats.length === 1 ? plotWidth / 2 : index * xStep),
    y: padding.top + (1 - clamp(value / 5, 0, 1)) * plotHeight
  });
  const creditPoint = (value, index) => ({
    x: padding.left + (stats.length === 1 ? plotWidth / 2 : index * xStep),
    y: padding.top + (1 - clamp(value / maxCredits, 0, 1)) * plotHeight
  });

  drawLine(context, stats.map((item, index) => gpaPoint(item.gpa, index)), "#2563eb");
  drawLine(context, stats.map((item, index) => gpaPoint(item.cumulativeGpa, index)), "#0f766e");
  drawLine(context, stats.map((item, index) => creditPoint(item.cumulativeCredits, index)), "#9a3412", true);

  context.fillStyle = "#667085";
  context.font = "12px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  context.textAlign = "center";
  stats.forEach((item, index) => {
    const x = padding.left + (stats.length === 1 ? plotWidth / 2 : index * xStep);
    context.save();
    context.translate(x, height - 24);
    context.rotate(stats.length > 4 ? -0.35 : 0);
    context.fillText(item.semester.slice(0, 12), 0, 0);
    context.restore();
  });

  context.textAlign = "left";
  context.fillText("GPA", 10, padding.top + 4);
  context.textAlign = "right";
  context.fillText("学分", width - 8, padding.top + 4);
}

function drawGrid(context, width, height, padding, plotWidth, plotHeight) {
  context.strokeStyle = "#e4e8f0";
  context.lineWidth = 1;
  context.fillStyle = "#667085";
  context.font = "12px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  context.textAlign = "right";

  for (let i = 0; i <= 5; i += 1) {
    const y = padding.top + (i / 5) * plotHeight;
    const label = (5 - i).toFixed(1);
    context.beginPath();
    context.moveTo(padding.left, y);
    context.lineTo(width - padding.right, y);
    context.stroke();
    context.fillText(label, padding.left - 8, y + 4);
  }

  context.strokeStyle = "#cfd6e2";
  context.beginPath();
  context.moveTo(padding.left, padding.top);
  context.lineTo(padding.left, height - padding.bottom);
  context.lineTo(width - padding.right, height - padding.bottom);
  context.stroke();
}

function drawLine(context, points, color, dashed = false) {
  if (points.length === 0) return;

  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = 2.5;
  context.setLineDash(dashed ? [6, 5] : []);
  context.beginPath();
  points.forEach((point, index) => {
    if (index === 0) {
      context.moveTo(point.x, point.y);
    } else {
      context.lineTo(point.x, point.y);
    }
  });
  context.stroke();
  context.setLineDash([]);

  points.forEach((point) => {
    context.beginPath();
    context.arc(point.x, point.y, 4, 0, Math.PI * 2);
    context.fill();
  });
}

function updateSimulator() {
  const credits = Number.parseFloat(simCreditsInput.value);
  const score = Number.parseFloat(simScoreInput.value);
  const currentCredits = getTotalCredits(courses);
  const currentGpa = calculateGpa(courses);
  const currentPoints = getTotalPoints(courses);

  renderScenarioGrid(credits);

  if (!Number.isFinite(credits) || !Number.isFinite(score)) {
    simResult.textContent = "输入学分和预计分数后，会显示对总 GPA 的影响。";
    return;
  }

  if (credits <= 0 || !isValidScore(score)) {
    simResult.textContent = "学分需大于 0，分数需在 0 到 100 之间。";
    return;
  }

  const projectedGpa = (currentPoints + scoreToPoint(score) * credits) / (currentCredits + credits);
  const diff = projectedGpa - currentGpa;
  const trend = diff >= 0 ? "上升" : "下降";
  simResult.textContent = `这门课绩点 ${formatGpa(scoreToPoint(score))}。加入 ${formatCredits(credits)} 学分后，总 GPA 预计从 ${formatGpa(currentGpa)} ${trend}到 ${formatGpa(projectedGpa)}，变化 ${formatSignedGpa(diff)}。`;
}

function renderScenarioGrid(credits) {
  const scenarioCredits = Number.isFinite(credits) && credits > 0 ? credits : 5;
  const currentCredits = getTotalCredits(courses);
  const currentPoints = getTotalPoints(courses);
  const scenarios = [85, 90, 93, 96];

  scenarioGrid.innerHTML = scenarios.map((score) => {
    const gpa = currentCredits + scenarioCredits > 0
      ? (currentPoints + scoreToPoint(score) * scenarioCredits) / (currentCredits + scenarioCredits)
      : scoreToPoint(score);
    return `
      <article class="scenario-item">
        <span>${score} 分</span>
        <strong>${formatGpa(gpa)}</strong>
        <small>${formatCredits(scenarioCredits)} 学分后总 GPA</small>
      </article>
    `;
  }).join("");
}

function updateGoalResult() {
  const targetGpa = Number.parseFloat(targetGpaInput.value);
  const futureCredits = Number.parseFloat(futureCreditsInput.value);
  const currentCredits = getTotalCredits(courses);
  const currentPoints = getTotalPoints(courses);

  if (!Number.isFinite(targetGpa) || !Number.isFinite(futureCredits)) {
    goalResult.textContent = "输入目标 GPA 和未来学分后，会显示未来需要达到的平均 GPA。";
    return;
  }

  if (targetGpa < 0 || targetGpa > 5 || futureCredits <= 0) {
    goalResult.textContent = "目标 GPA 需在 0 到 5.0 之间，未来学分需大于 0。";
    return;
  }

  if (currentCredits === 0) {
    goalResult.textContent = `当前还没有历史课程。未来平均 GPA 达到 ${formatGpa(targetGpa)} 左右即可接近目标。`;
    return;
  }

  const requiredAverage = ((targetGpa * (currentCredits + futureCredits)) - currentPoints) / futureCredits;

  if (requiredAverage > 5) {
    goalResult.textContent = `需要未来平均 GPA ${formatGpa(requiredAverage)}，超过 5.0，按当前学分计划较难达到。`;
  } else if (requiredAverage <= 0) {
    goalResult.textContent = `按当前成绩，只要未来课程正常通过，就有机会保持 ${formatGpa(targetGpa)} 目标。`;
  } else {
    goalResult.textContent = `未来 ${formatCredits(futureCredits)} 学分需要平均 GPA 约 ${formatGpa(requiredAverage)}。`;
  }
}

function startEdit(id) {
  const course = courses.find((item) => item.id === id);
  if (!course) return;

  courseIdInput.value = course.id;
  courseNameInput.value = course.name;
  semesterInput.value = course.semester;
  creditsInput.value = course.credits;
  scoreInput.value = course.score;
  formTitle.textContent = "编辑课程";
  submitBtn.textContent = "保存修改";
  cancelEditBtn.classList.remove("hidden");
  courseNameInput.focus();
}

function deleteCourse(id) {
  const course = courses.find((item) => item.id === id);
  if (!course) return;

  const confirmed = confirm(`确定删除「${course.name}」吗？`);
  if (!confirmed) return;

  courses = courses.filter((item) => item.id !== id);
  saveCourses();
  resetForm();
  render();
}

function clearAllCourses() {
  if (courses.length === 0) {
    alert("当前没有可清空的课程数据。");
    return;
  }

  const confirmed = confirm("确定清空全部课程数据吗？档案和目标院校不会被删除。");
  if (!confirmed) return;

  courses = [];
  saveCourses();
  resetForm();
  render();
}

function exportCsv() {
  if (courses.length === 0) {
    alert("暂无课程数据可导出。");
    return;
  }

  const headers = ["课程名称", "学期", "学分", "分数", "成绩符", "绩点"];
  const rows = courses.map((course) => [
    course.name,
    course.semester,
    formatCredits(course.credits),
    formatScore(course.score),
    scoreToGrade(course.score),
    formatGpa(scoreToPoint(course.score))
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\n");

  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `gpa-courses-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function handleCsvImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const importedCourses = parseCoursesCsv(String(reader.result || ""));
      if (importedCourses.length === 0) {
        alert("没有识别到可导入的课程。请检查 CSV 列名是否包含课程名称、学期、学分、分数。");
        return;
      }

      courses = courses.concat(importedCourses);
      saveCourses();
      resetForm();
      render();
      alert(`已导入 ${importedCourses.length} 门课程。`);
    } catch (error) {
      alert(`CSV 导入失败：${error.message}`);
    } finally {
      csvFileInput.value = "";
    }
  };
  reader.readAsText(file, "utf-8");
}

function parseCoursesCsv(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];

  const headers = rows[0].map((header) => normalizeHeader(header));
  const nameIndex = findHeaderIndex(headers, ["课程名称", "课程", "course", "name"]);
  const semesterIndex = findHeaderIndex(headers, ["学期", "semester", "term"]);
  const creditsIndex = findHeaderIndex(headers, ["学分", "credits", "credit"]);
  const scoreIndex = findHeaderIndex(headers, ["分数", "成绩", "score"]);

  if ([nameIndex, semesterIndex, creditsIndex, scoreIndex].some((index) => index === -1)) {
    throw new Error("缺少必要列：课程名称、学期、学分、分数。");
  }

  return rows.slice(1).map((row) => {
    const name = String(row[nameIndex] || "").trim();
    const semester = String(row[semesterIndex] || "").trim();
    const credits = Number.parseFloat(row[creditsIndex]);
    const score = Number.parseFloat(row[scoreIndex]);

    if (!name && !semester && !row[creditsIndex] && !row[scoreIndex]) return null;
    if (!name || !semester || !Number.isFinite(credits) || credits <= 0 || !isValidScore(score)) {
      throw new Error(`课程「${name || "未命名"}」数据不完整或不合法。`);
    }

    return {
      id: createId("course"),
      name,
      semester,
      credits,
      score
    };
  }).filter(Boolean);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  const normalizedText = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < normalizedText.length; i += 1) {
    const char = normalizedText[i];
    const nextChar = normalizedText[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}

function exportBackup() {
  const backup = {
    app: "gpa-calculator",
    version: 2,
    exportedAt: new Date().toISOString(),
    courses,
    profile: collectProfileFromForm(),
    targets,
    aiEndpoint: aiEndpointInput.value.trim()
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `gpa-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function handleBackupImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const backup = JSON.parse(String(reader.result || ""));
      const restoredCourses = Array.isArray(backup.courses) ? backup.courses.map(normalizeCourse).filter(Boolean) : [];
      const restoredProfile = backup.profile && typeof backup.profile === "object" ? backup.profile : {};
      const restoredTargets = Array.isArray(backup.targets) ? backup.targets.map(normalizeTarget).filter(Boolean) : [];
      const confirmed = confirm(`将恢复 ${restoredCourses.length} 门课程、${restoredTargets.length} 个目标院校，并覆盖当前档案。确定继续吗？`);
      if (!confirmed) return;

      courses = restoredCourses;
      profile = restoredProfile;
      targets = restoredTargets;
      localStorage.setItem(AI_ENDPOINT_STORAGE_KEY, typeof backup.aiEndpoint === "string" ? backup.aiEndpoint : "");
      saveCourses();
      saveProfile();
      saveTargets();
      populateProfileForm();
      populateAiEndpoint();
      resetForm();
      latestLocalAnalysis = null;
      render();
      alert("备份已恢复。");
    } catch (error) {
      alert(`备份恢复失败：${error.message}`);
    } finally {
      backupFileInput.value = "";
    }
  };
  reader.readAsText(file, "utf-8");
}

function resetForm() {
  courseForm.reset();
  courseIdInput.value = "";
  formTitle.textContent = "添加课程";
  submitBtn.textContent = "添加课程";
  cancelEditBtn.classList.add("hidden");
}

function handleProfileSubmit(event) {
  event.preventDefault();
  profile = collectProfileFromForm();
  saveProfile();
  renderTargetComparison();
  alert("档案已保存。");
}

function collectProfileFromForm() {
  return {
    school: profileSchoolInput.value.trim(),
    major: profileMajorInput.value.trim(),
    grade: profileGradeInput.value.trim(),
    currentGpa: parseOptionalNumber(profileCurrentGpaInput.value),
    rank: parseOptionalNumber(profileRankInput.value),
    cohortSize: parseOptionalNumber(profileCohortSizeInput.value),
    englishType: englishTypeInput.value,
    englishScore: parseOptionalNumber(englishScoreInput.value),
    researchLevel: researchLevelInput.value,
    competitionLevel: competitionLevelInput.value,
    projectLevel: projectLevelInput.value,
    awardsText: awardsTextInput.value.trim(),
    directions: Array.from(document.querySelectorAll('input[name="directions"]:checked')).map((input) => input.value)
  };
}

function populateProfileForm() {
  profileSchoolInput.value = profile.school || "";
  profileMajorInput.value = profile.major || "";
  profileGradeInput.value = profile.grade || "";
  profileCurrentGpaInput.value = numberToInputValue(profile.currentGpa);
  profileRankInput.value = numberToInputValue(profile.rank);
  profileCohortSizeInput.value = numberToInputValue(profile.cohortSize);
  englishTypeInput.value = profile.englishType || "";
  englishScoreInput.value = numberToInputValue(profile.englishScore);
  researchLevelInput.value = profile.researchLevel || "none";
  competitionLevelInput.value = profile.competitionLevel || "none";
  projectLevelInput.value = profile.projectLevel || "none";
  awardsTextInput.value = profile.awardsText || "";

  document.querySelectorAll('input[name="directions"]').forEach((input) => {
    input.checked = Array.isArray(profile.directions) && profile.directions.includes(input.value);
  });
}

function handleTargetSubmit(event) {
  event.preventDefault();
  const school = targetSchoolInput.value.trim();
  if (!school) {
    alert("请填写目标学校。");
    return;
  }

  targets.push({
    id: createId("target"),
    school,
    program: targetProgramInput.value.trim(),
    direction: targetDirectionInput.value,
    minRank: parseOptionalNumber(targetMinRankInput.value),
    minGpa: parseOptionalNumber(targetMinGpaInput.value),
    englishRequirement: targetEnglishRequirementInput.value.trim(),
    researchPreference: targetResearchPreferenceInput.value.trim()
  });

  saveTargets();
  targetForm.reset();
  renderTargets();
  renderTargetComparison();
}

function renderTargets() {
  targetList.innerHTML = "";

  if (targets.length === 0) {
    targetList.innerHTML = '<div class="empty-state">还没有目标院校。先添加一个目标，分析会更具体。</div>';
    return;
  }

  targets.forEach((target) => {
    const item = document.createElement("article");
    item.className = "target-item";
    item.innerHTML = `
      <h3>${escapeHtml(target.school)}</h3>
      <p>${escapeHtml(target.program || "未填写具体项目")} · ${escapeHtml(target.direction || "未填写方向")}</p>
      <div class="tag-row">
        ${target.minRank ? `<span class="tag">排名门槛：前 ${formatRank(target.minRank)}</span>` : ""}
        ${target.minGpa ? `<span class="tag">GPA 门槛：${formatGpa(target.minGpa)}</span>` : ""}
        ${target.englishRequirement ? `<span class="tag">${escapeHtml(target.englishRequirement)}</span>` : ""}
      </div>
      ${target.researchPreference ? `<p>科研偏好：${escapeHtml(target.researchPreference)}</p>` : ""}
      <div class="row-actions">
        <button type="button" data-id="${target.id}" class="delete-target">删除</button>
      </div>
    `;
    targetList.appendChild(item);
  });

  targetList.querySelectorAll(".delete-target").forEach((button) => {
    button.addEventListener("click", () => deleteTarget(button.dataset.id));
  });
}

function renderTargetComparison() {
  const currentProfile = collectProfileFromForm();
  const coursesSummary = getCoursesSummary();
  const currentGpa = Number.isFinite(currentProfile.currentGpa) ? currentProfile.currentGpa : coursesSummary.overallGpa;

  targetCompareList.innerHTML = "";

  if (targets.length === 0) {
    targetCompareList.innerHTML = '<div class="empty-state">添加目标院校后，这里会逐项对照 GPA、排名、英语和科研要求。</div>';
    return;
  }

  targets.forEach((target) => {
    const checks = buildTargetChecks(target, currentProfile, currentGpa);
    const item = document.createElement("article");
    item.className = "target-compare-card";
    item.innerHTML = `
      <div class="target-compare-heading">
        <div>
          <h3>${escapeHtml(target.school)}</h3>
          <p>${escapeHtml(target.program || "未填写具体项目")} · ${escapeHtml(target.direction || "未填写方向")}</p>
        </div>
        <span class="compare-summary ${getWorstCheckClass(checks)}">${getWorstCheckLabel(checks)}</span>
      </div>
      <div class="compare-grid">
        ${checks.map((check) => `
          <div class="compare-item ${check.status}">
            <span>${escapeHtml(check.label)}</span>
            <strong>${escapeHtml(check.statusLabel)}</strong>
            <small>${escapeHtml(check.detail)}</small>
          </div>
        `).join("")}
      </div>
    `;
    targetCompareList.appendChild(item);
  });
}

function buildTargetChecks(target, currentProfile, currentGpa) {
  const checks = [];

  if (target.minGpa) {
    const diff = currentGpa - target.minGpa;
    checks.push({
      label: "GPA",
      ...getThresholdStatus(diff, 0.1),
      detail: `当前 ${formatGpa(currentGpa)} / 门槛 ${formatGpa(target.minGpa)}`
    });
  } else {
    checks.push(createUnknownCheck("GPA", "目标未填写 GPA 门槛"));
  }

  if (target.minRank) {
    if (Number.isFinite(currentProfile.rank)) {
      const diff = target.minRank - currentProfile.rank;
      checks.push({
        label: "排名",
        ...getThresholdStatus(diff, 3),
        detail: `当前第 ${formatRank(currentProfile.rank)} / 门槛前 ${formatRank(target.minRank)}`
      });
    } else {
      checks.push(createUnknownCheck("排名", "档案未填写专业排名"));
    }
  } else {
    checks.push(createUnknownCheck("排名", "目标未填写排名门槛"));
  }

  if (target.englishRequirement) {
    const englishResult = compareEnglishRequirement(target.englishRequirement, currentProfile);
    checks.push({
      label: "英语",
      ...englishResult
    });
  } else {
    checks.push(createUnknownCheck("英语", "目标未填写英语要求"));
  }

  if (target.researchPreference) {
    const researchScore = getLevelScore(currentProfile.researchLevel, 10);
    checks.push({
      label: "科研",
      status: researchScore >= 7 ? "ok" : researchScore >= 3.8 ? "near" : "risk",
      statusLabel: researchScore >= 7 ? "较匹配" : researchScore >= 3.8 ? "接近" : "风险",
      detail: `当前科研：${levelLabels[currentProfile.researchLevel] || "暂无"}；目标偏好：${target.researchPreference}`
    });
  } else {
    checks.push(createUnknownCheck("科研", "目标未填写科研偏好"));
  }

  return checks;
}

function compareEnglishRequirement(requirement, currentProfile) {
  if (!currentProfile.englishType || !Number.isFinite(currentProfile.englishScore)) {
    return {
      status: "unknown",
      statusLabel: "信息不足",
      detail: `档案未填写英语成绩；目标要求：${requirement}`
    };
  }

  const requiredScore = extractFirstNumber(requirement);
  if (!Number.isFinite(requiredScore)) {
    return {
      status: "unknown",
      statusLabel: "需人工判断",
      detail: `当前 ${formatEnglish(currentProfile)}；目标要求：${requirement}`
    };
  }

  const diff = currentProfile.englishScore - requiredScore;
  const status = diff >= 0 ? "ok" : diff >= -20 ? "near" : "risk";
  return {
    status,
    statusLabel: status === "ok" ? "已满足" : status === "near" ? "接近" : "风险",
    detail: `当前 ${formatEnglish(currentProfile)}；目标要求：${requirement}`
  };
}

function getThresholdStatus(diff, nearRange) {
  if (diff >= 0) return { status: "ok", statusLabel: "已满足" };
  if (diff >= -nearRange) return { status: "near", statusLabel: "接近" };
  return { status: "risk", statusLabel: "风险" };
}

function createUnknownCheck(label, detail) {
  return {
    label,
    status: "unknown",
    statusLabel: "信息不足",
    detail
  };
}

function getWorstCheckClass(checks) {
  if (checks.some((check) => check.status === "risk")) return "risk";
  if (checks.some((check) => check.status === "near")) return "near";
  if (checks.some((check) => check.status === "unknown")) return "unknown";
  return "ok";
}

function getWorstCheckLabel(checks) {
  const status = getWorstCheckClass(checks);
  if (status === "risk") return "存在风险";
  if (status === "near") return "接近门槛";
  if (status === "unknown") return "信息不足";
  return "整体满足";
}

function deleteTarget(id) {
  const target = targets.find((item) => item.id === id);
  if (!target) return;

  const confirmed = confirm(`确定删除目标「${target.school}」吗？`);
  if (!confirmed) return;

  targets = targets.filter((item) => item.id !== id);
  saveTargets();
  renderTargets();
  renderTargetComparison();
}

function runLocalAnalysis() {
  profile = collectProfileFromForm();
  saveProfile();
  latestLocalAnalysis = buildLocalAnalysis(profile, getCoursesSummary(), targets);
  renderLocalAnalysis(latestLocalAnalysis);
}

async function runAiAnalysis() {
  profile = collectProfileFromForm();
  saveProfile();

  if (!latestLocalAnalysis) {
    latestLocalAnalysis = buildLocalAnalysis(profile, getCoursesSummary(), targets);
    renderLocalAnalysis(latestLocalAnalysis);
  }

  const endpoint = getAiEndpoint();
  if (!endpoint) {
    setAiStatus("请先填写并保存 Vercel 的 /api/analyze 接口地址。", "error");
    return;
  }

  setAiStatus("正在生成严师型 AI 分析，请稍等。", "");
  aiReport.classList.add("hidden");
  runAiAnalysisBtn.disabled = true;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        profile,
        coursesSummary: getCoursesSummary(),
        targets,
        localAnalysis: latestLocalAnalysis
      })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || `AI 接口返回 ${response.status}`);
    }

    renderAiReport(payload);
    setAiStatus("AI 分析已生成。", "success");
  } catch (error) {
    setAiStatus(`AI 分析失败：${error.message}`, "error");
  } finally {
    runAiAnalysisBtn.disabled = false;
  }
}

function buildLocalAnalysis(profileData, coursesSummary, targetListData) {
  const analysisGpa = Number.isFinite(profileData.currentGpa) ? profileData.currentGpa : coursesSummary.overallGpa;
  const hasRank = Number.isFinite(profileData.rank)
    && Number.isFinite(profileData.cohortSize)
    && profileData.rank > 0
    && profileData.cohortSize > 0
    && profileData.rank <= profileData.cohortSize;
  const rankPercent = hasRank ? profileData.rank / profileData.cohortSize : null;

  let score = 0;
  const strengths = [];
  const weaknesses = [];
  const nextActions = [];

  const gpaScore = clamp((analysisGpa / 4.8) * 35, 0, 35);
  score += gpaScore;
  if (analysisGpa >= 4.3) {
    strengths.push(`GPA ${formatGpa(analysisGpa)}，成绩面比较强。`);
  } else if (analysisGpa >= 3.8) {
    strengths.push(`GPA ${formatGpa(analysisGpa)}，具备继续冲刺基础。`);
    weaknesses.push("GPA 还没有形成明显压制优势，关键课程需要尽量稳住高分。");
  } else if (analysisGpa > 0) {
    weaknesses.push(`GPA ${formatGpa(analysisGpa)} 偏保守，需要优先提高绩点和核心课表现。`);
  } else {
    weaknesses.push("缺少 GPA 或课程数据，无法判断成绩底盘。");
  }

  if (hasRank) {
    const rankScore = getRankScore(rankPercent);
    score += rankScore;
    if (rankPercent <= 0.1) {
      strengths.push(`专业排名约前 ${formatPercent(rankPercent)}，排名条件较好。`);
    } else if (rankPercent <= 0.25) {
      weaknesses.push(`专业排名约前 ${formatPercent(rankPercent)}，需要确认是否进入目标门槛。`);
    } else {
      weaknesses.push(`专业排名约前 ${formatPercent(rankPercent)}，保研和强校申请风险较高。`);
    }
  } else {
    score += 8;
    weaknesses.push("排名信息不足，保研资格和目标院校判断会明显失真。");
    nextActions.push("先查清专业排名、专业人数、学院保研名额和近三年去向。");
  }

  const englishScore = getEnglishScore(profileData.englishType, profileData.englishScore);
  score += englishScore.points;
  if (englishScore.points >= 12) {
    strengths.push(englishScore.message);
  } else {
    weaknesses.push(englishScore.message);
    nextActions.push("把英语补到可证明水平：六级、雅思或托福至少拿出一个能写进材料的成绩。");
  }

  const researchScore = getLevelScore(profileData.researchLevel, 7);
  const competitionScore = getLevelScore(profileData.competitionLevel, 5);
  const projectScore = getLevelScore(profileData.projectLevel, 5);
  score += researchScore + competitionScore + projectScore;

  if (researchScore >= 5) strengths.push(`科研基础${levelLabels[profileData.researchLevel]}，有材料可写。`);
  if (competitionScore >= 4) strengths.push(`竞赛水平${levelLabels[profileData.competitionLevel]}，能作为补充亮点。`);
  if (projectScore >= 4) strengths.push(`项目经历${levelLabels[profileData.projectLevel]}，有展示空间。`);
  if (researchScore < 3) weaknesses.push("科研经历偏弱，外校推免和导师匹配会吃亏。");
  if (competitionScore < 2.5) weaknesses.push("竞赛亮点不足，简历区分度有限。");
  if (projectScore < 2.5) weaknesses.push("项目成果还不够清楚，需要整理成可展示材料。");

  if (profileData.awardsText) {
    score += 4;
    strengths.push("已有奖项或亮点描述，后续可以打磨进简历和个人陈述。");
  } else {
    weaknesses.push("奖项和材料亮点未填写，后续报告只能给出较粗判断。");
  }

  if (Array.isArray(profileData.directions) && profileData.directions.length > 0) {
    score += 3;
  } else {
    weaknesses.push("目标方向未选择，升学策略容易散。");
    nextActions.push("先明确主线：本校保研、外校推免、考研、出国、就业里至少定一个主目标。");
  }

  if (targetListData.length > 0) {
    score += 6;
    strengths.push(`已记录 ${targetListData.length} 个目标，后续可以逐个对照门槛。`);
  } else {
    weaknesses.push("没有目标院校，无法对照排名、GPA、英语和科研门槛。");
    nextActions.push("先添加 3-5 个目标：保底、匹配、冲刺各至少一个。");
  }

  targetListData.forEach((target) => {
    if (target.minGpa && analysisGpa > 0 && analysisGpa < target.minGpa) {
      weaknesses.push(`${target.school} 的已知 GPA 门槛高于当前 GPA。`);
    }
    if (target.minRank && hasRank && profileData.rank > target.minRank) {
      weaknesses.push(`${target.school} 的已知排名门槛比当前排名更靠前。`);
    }
  });

  nextActions.push("把课程表分成核心课、拉分课、风险课，优先处理最影响 GPA 的高学分课程。");
  nextActions.push("准备一版升学材料清单：简历、成绩单、排名证明、英语证明、项目说明、推荐人名单。");
  if (analysisGpa < 4.2) nextActions.push("下一阶段优先追求高学分课程 90+，不要把精力平均撒在低权重事项上。");
  if (researchScore < 5) nextActions.push("尽快找一个能持续产出的科研或项目线，目标是形成可展示成果，而不是只写参与经历。");

  const boundedScore = Math.round(clamp(score, 0, 100));
  const outcome = getOutcome(boundedScore, hasRank, rankPercent, analysisGpa);

  return {
    disclaimer: "非官方预测，仅用于自我规划；不代表学校政策、院校录取结论或真实概率承诺。",
    competitivenessScore: boundedScore,
    riskLevel: outcome.level,
    estimatedRange: outcome.range,
    summary: outcome.summary,
    strengths: uniqueList(strengths).slice(0, 8),
    weaknesses: uniqueList(weaknesses).slice(0, 10),
    nextActions: uniqueList(nextActions).slice(0, 8),
    signals: {
      gpa: formatGpa(analysisGpa),
      rankPercent: rankPercent === null ? null : formatPercent(rankPercent),
      targetCount: targetListData.length,
      courseCount: coursesSummary.courseCount,
      totalCredits: formatCredits(coursesSummary.totalCredits)
    }
  };
}

function renderLocalAnalysis(analysis) {
  competitivenessScoreEl.textContent = `${analysis.competitivenessScore}/100`;
  riskLevelEl.textContent = analysis.riskLevel;
  estimatedRangeEl.textContent = analysis.estimatedRange;
  localAnalysisResult.innerHTML = `
    <p class="disclaimer">${escapeHtml(analysis.disclaimer)}</p>
    <h3>结论</h3>
    <p>${escapeHtml(analysis.summary)}</p>
    ${renderList("优势", analysis.strengths)}
    ${renderList("短板", analysis.weaknesses)}
    ${renderList("下一步行动", analysis.nextActions)}
  `;
}

function renderAiReport(report) {
  aiReport.classList.remove("hidden");
  aiReport.innerHTML = `
    <h3>AI 严师报告</h3>
    <p><strong>结论：</strong>${escapeHtml(report.summary || "暂无")}</p>
    <p><strong>等级：</strong>${escapeHtml(report.riskLevel || "暂无")} · <strong>区间：</strong>${escapeHtml(report.estimatedRange || "暂无")}</p>
    ${renderList("优势", report.strengths || [])}
    ${renderList("短板", report.weaknesses || [])}
    ${renderList("下一步行动", report.nextActions || [])}
    <h3>导师式解读</h3>
    <p>${escapeHtml(report.mentorReport || "暂无报告。").replace(/\n/g, "<br>")}</p>
  `;
}

function renderList(title, items) {
  if (!items || items.length === 0) return "";
  return `
    <h3>${escapeHtml(title)}</h3>
    <ul>
      ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;
}

function setAiStatus(message, type) {
  aiStatus.textContent = message;
  aiStatus.classList.remove("error", "success");
  if (type) aiStatus.classList.add(type);
}

function saveAiEndpoint() {
  const endpoint = aiEndpointInput.value.trim();
  if (endpoint && !/^https?:\/\/.+\/api\/analyze$/.test(endpoint)) {
    alert("接口地址应形如：https://你的项目.vercel.app/api/analyze");
    return;
  }
  localStorage.setItem(AI_ENDPOINT_STORAGE_KEY, endpoint);
  alert(endpoint ? "AI 接口已保存。" : "AI 接口已清空。");
}

function populateAiEndpoint() {
  const savedEndpoint = localStorage.getItem(AI_ENDPOINT_STORAGE_KEY) || "";
  aiEndpointInput.value = savedEndpoint || getDefaultAiEndpoint();
}

function getAiEndpoint() {
  return aiEndpointInput.value.trim() || getDefaultAiEndpoint();
}

function getDefaultAiEndpoint() {
  const hostname = window.location.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".vercel.app")) {
    return "/api/analyze";
  }
  if (hostname === "ashore1001.github.io") {
    return DEFAULT_REMOTE_AI_ENDPOINT;
  }
  return "";
}

function getCoursesSummary() {
  const semesterStats = getSemesterStats();
  const sortedCourses = courses.slice().sort((a, b) => scoreToPoint(a.score) - scoreToPoint(b.score));
  return {
    overallGpa: calculateGpa(courses),
    totalCredits: getTotalCredits(courses),
    totalPoints: getTotalPoints(courses),
    courseCount: courses.length,
    semesterStats,
    weakestCourses: sortedCourses.slice(0, 5).map((course) => ({
      name: course.name,
      semester: course.semester,
      credits: course.credits,
      score: course.score,
      point: scoreToPoint(course.score)
    }))
  };
}

function getSemesterStats() {
  return getSemesters().map((semester) => {
    const semesterCourses = courses.filter((course) => course.semester === semester);
    return {
      semester,
      count: semesterCourses.length,
      credits: getTotalCredits(semesterCourses),
      gpa: calculateGpa(semesterCourses)
    };
  });
}

function getSemesterProgressStats() {
  let runningCourses = [];
  return getSemesters().map((semester) => {
    const semesterCourses = courses.filter((course) => course.semester === semester);
    runningCourses = runningCourses.concat(semesterCourses);
    return {
      semester,
      credits: getTotalCredits(semesterCourses),
      cumulativeCredits: getTotalCredits(runningCourses),
      gpa: calculateGpa(semesterCourses),
      cumulativeGpa: calculateGpa(runningCourses)
    };
  });
}

function getSemesters() {
  return Array.from(new Set(courses.map((course) => course.semester)))
    .sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function calculateGpa(courseList) {
  const totalCredits = getTotalCredits(courseList);
  if (totalCredits === 0) return 0;
  return getTotalPoints(courseList) / totalCredits;
}

function getTotalCredits(courseList) {
  return courseList.reduce((sum, course) => sum + Number(course.credits || 0), 0);
}

function getTotalPoints(courseList) {
  return courseList.reduce((sum, course) => {
    return sum + scoreToPoint(course.score) * Number(course.credits || 0);
  }, 0);
}

function getRankScore(rankPercent) {
  if (rankPercent <= 0.03) return 25;
  if (rankPercent <= 0.05) return 23;
  if (rankPercent <= 0.1) return 21;
  if (rankPercent <= 0.15) return 17;
  if (rankPercent <= 0.25) return 12;
  if (rankPercent <= 0.4) return 7;
  return 3;
}

function getEnglishScore(type, score) {
  if (!type || !Number.isFinite(score)) {
    return { points: 4, message: "英语成绩未填写，外校推免、出国和部分项目会有不确定性。" };
  }

  if (type === "cet4") {
    if (score >= 550) return { points: 12, message: `四级 ${score}，英语证明尚可，但建议继续补六级。` };
    if (score >= 425) return { points: 8, message: `四级 ${score}，基础通过，但竞争力有限。` };
    return { points: 3, message: `四级 ${score}，英语短板明显。` };
  }

  if (type === "cet6") {
    if (score >= 560) return { points: 15, message: `六级 ${score}，英语证明较强。` };
    if (score >= 500) return { points: 13, message: `六级 ${score}，英语证明比较稳。` };
    if (score >= 425) return { points: 10, message: `六级 ${score}，已过线但不算优势。` };
    return { points: 4, message: `六级 ${score}，英语仍是短板。` };
  }

  if (type === "ielts") {
    if (score >= 7) return { points: 15, message: `雅思 ${score}，英语证明较强。` };
    if (score >= 6.5) return { points: 13, message: `雅思 ${score}，多数规划场景够用。` };
    if (score >= 6) return { points: 10, message: `雅思 ${score}，需要看目标项目门槛。` };
    return { points: 4, message: `雅思 ${score}，出国或英文项目风险较高。` };
  }

  if (type === "toefl") {
    if (score >= 100) return { points: 15, message: `托福 ${score}，英语证明较强。` };
    if (score >= 90) return { points: 13, message: `托福 ${score}，多数规划场景够用。` };
    if (score >= 80) return { points: 10, message: `托福 ${score}，需要看目标项目门槛。` };
    return { points: 4, message: `托福 ${score}，英文项目风险较高。` };
  }

  return { points: 4, message: "英语信息无法识别，需要补充可比较的分数。" };
}

function getLevelScore(level, maxScore) {
  const ratios = {
    none: 0,
    basic: 0.38,
    solid: 0.72,
    strong: 1
  };
  return (ratios[level] ?? 0) * maxScore;
}

function getOutcome(score, hasRank, rankPercent, gpa) {
  if (!hasRank) {
    return {
      level: "信息不足",
      range: "无法估计",
      summary: "缺少专业排名和专业人数，保研/升学判断只能看成绩和材料，不能给出可靠区间。"
    };
  }

  if (score >= 80 && rankPercent <= 0.1 && gpa >= 4.2) {
    return {
      level: "高",
      range: "70%-85%",
      summary: "成绩和排名底盘较强，有较高升学竞争力，但仍要看学院名额、目标项目门槛和材料质量。"
    };
  }

  if (score >= 65 && rankPercent <= 0.2) {
    return {
      level: "中",
      range: "45%-65%",
      summary: "具备竞争基础，但短板会决定上限。需要尽快补齐英语、科研、目标门槛对照和材料准备。"
    };
  }

  if (score >= 50) {
    return {
      level: "偏低",
      range: "25%-45%",
      summary: "当前条件有机会，但风险不低。必须把 GPA、排名和可展示材料作为优先级最高的事情。"
    };
  }

  return {
    level: "低",
    range: "10%-25%",
    summary: "当前条件偏弱，不能只靠愿望规划。需要先把成绩底盘和目标路径重新拆解。"
  };
}

function saveCourses() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
}

function loadCourses() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeCourse).filter(Boolean) : [];
  } catch (error) {
    console.warn("Failed to load GPA courses:", error);
    return [];
  }
}

function normalizeCourse(course) {
  if (!(course
    && typeof course.id === "string"
    && typeof course.name === "string"
    && typeof course.semester === "string"
    && Number.isFinite(Number(course.credits)))) {
    return null;
  }

  const score = isValidScore(Number(course.score))
    ? Number(course.score)
    : legacyScoreFromGrade(course.grade);

  if (!isValidScore(score)) {
    return null;
  }

  return {
    id: course.id,
    name: course.name,
    semester: course.semester,
    credits: Number(course.credits),
    score
  };
}

function saveProfile() {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.warn("Failed to load profile:", error);
    return {};
  }
}

function saveTargets() {
  localStorage.setItem(TARGETS_STORAGE_KEY, JSON.stringify(targets));
}

function loadTargets() {
  try {
    const raw = localStorage.getItem(TARGETS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeTarget).filter(Boolean) : [];
  } catch (error) {
    console.warn("Failed to load targets:", error);
    return [];
  }
}

function normalizeTarget(target) {
  if (!target || typeof target.id !== "string" || typeof target.school !== "string") {
    return null;
  }

  return {
    id: target.id,
    school: target.school,
    program: target.program || "",
    direction: target.direction || "",
    minRank: parseOptionalNumber(target.minRank),
    minGpa: parseOptionalNumber(target.minGpa),
    englishRequirement: target.englishRequirement || "",
    researchPreference: target.researchPreference || ""
  };
}

function isValidScore(score) {
  return Number.isFinite(score) && score >= 0 && score <= 100;
}

function scoreToPoint(score) {
  const numericScore = Number(score);
  if (!isValidScore(numericScore) || numericScore < 60) return 0;

  const roundedScore = Math.floor(numericScore);
  const matchedBand = scoreBands.find((band) => roundedScore >= band.min && roundedScore <= band.max);
  return matchedBand ? matchedBand.point : 0;
}

function scoreToGrade(score) {
  const numericScore = Number(score);
  if (!isValidScore(numericScore) || numericScore < 60) return "F";

  const roundedScore = Math.floor(numericScore);
  const matchedBand = scoreBands.find((band) => roundedScore >= band.min && roundedScore <= band.max);
  return matchedBand ? matchedBand.grade : "F";
}

function legacyScoreFromGrade(grade) {
  if (!Object.prototype.hasOwnProperty.call(legacyGradePoints, grade)) {
    return null;
  }

  return Math.min(100, Math.max(0, 50 + legacyGradePoints[grade] * 10));
}

function createId(prefix) {
  return crypto.randomUUID ? crypto.randomUUID() : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseOptionalNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeHeader(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "");
}

function findHeaderIndex(headers, candidates) {
  return headers.findIndex((header) => candidates.some((candidate) => header === normalizeHeader(candidate)));
}

function extractFirstNumber(value) {
  const match = String(value || "").match(/\d+(?:\.\d+)?/);
  return match ? Number.parseFloat(match[0]) : null;
}

function formatEnglish(profileData) {
  const labels = {
    cet4: "四级",
    cet6: "六级",
    ielts: "雅思",
    toefl: "托福"
  };
  if (!profileData.englishType || !Number.isFinite(profileData.englishScore)) return "未填写";
  return `${labels[profileData.englishType] || profileData.englishType} ${profileData.englishScore}`;
}

function numberToInputValue(value) {
  return Number.isFinite(value) ? String(value) : "";
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function uniqueList(items) {
  return Array.from(new Set(items.filter(Boolean)));
}

function formatGpa(value) {
  return Number(value || 0).toFixed(2);
}

function formatSignedGpa(value) {
  const number = Number(value || 0);
  return `${number >= 0 ? "+" : ""}${number.toFixed(2)}`;
}

function formatCredits(value) {
  const number = Number(value || 0);
  return Number.isInteger(number) ? String(number) : number.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function formatScore(value) {
  const number = Number(value || 0);
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1).replace(/\.0$/, "")}%`;
}

function formatRank(value) {
  return Number.isInteger(Number(value)) ? String(value) : String(value);
}

function escapeCsvCell(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
