const STORAGE_KEY = "gpa-calculator-courses-v1";

const gradePoints = {
  A: 5.0,
  "A-": 4.7,
  "B+": 4.3,
  B: 4.0,
  "B-": 3.7,
  "C+": 3.3,
  C: 3.0,
  "C-": 2.7,
  "D+": 2.3,
  D: 2.0,
  F: 0
};

let courses = loadCourses();

const courseForm = document.querySelector("#courseForm");
const courseIdInput = document.querySelector("#courseId");
const courseNameInput = document.querySelector("#courseName");
const semesterInput = document.querySelector("#semester");
const creditsInput = document.querySelector("#credits");
const gradeInput = document.querySelector("#grade");
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

courseForm.addEventListener("submit", handleCourseSubmit);
cancelEditBtn.addEventListener("click", resetForm);
semesterFilter.addEventListener("change", render);
targetGpaInput.addEventListener("input", updateGoalResult);
futureCreditsInput.addEventListener("input", updateGoalResult);
exportCsvBtn.addEventListener("click", exportCsv);
clearAllBtn.addEventListener("click", clearAllCourses);

render();

function handleCourseSubmit(event) {
  event.preventDefault();

  const name = courseNameInput.value.trim();
  const semester = semesterInput.value.trim();
  const credits = Number.parseFloat(creditsInput.value);
  const grade = gradeInput.value;

  if (!name || !semester || !Number.isFinite(credits) || credits <= 0 || !gradePoints.hasOwnProperty(grade)) {
    alert("请填写完整且有效的课程信息。");
    return;
  }

  const editingId = courseIdInput.value;
  const courseData = {
    id: editingId || createId(),
    name,
    semester,
    credits,
    grade
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
        <td><span class="grade-badge">${course.grade}</span></td>
        <td>${formatGpa(gradePoints[course.grade])}</td>
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
  gradeInput.value = course.grade;
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
    alert("当前没有可清空的数据。");
    return;
  }

  const confirmed = confirm("确定清空全部 GPA 数据吗？此操作无法撤销。");
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

  const headers = ["课程名称", "学期", "学分", "成绩", "绩点"];
  const rows = courses.map((course) => [
    course.name,
    course.semester,
    formatCredits(course.credits),
    course.grade,
    formatGpa(gradePoints[course.grade])
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

function resetForm() {
  courseForm.reset();
  courseIdInput.value = "";
  formTitle.textContent = "添加课程";
  submitBtn.textContent = "添加课程";
  cancelEditBtn.classList.add("hidden");
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
    const point = gradePoints[course.grade] ?? 0;
    return sum + point * Number(course.credits || 0);
  }, 0);
}

function saveCourses() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
}

function loadCourses() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isValidCourse) : [];
  } catch (error) {
    console.warn("Failed to load GPA courses:", error);
    return [];
  }
}

function isValidCourse(course) {
  return course
    && typeof course.id === "string"
    && typeof course.name === "string"
    && typeof course.semester === "string"
    && Number.isFinite(Number(course.credits))
    && gradePoints.hasOwnProperty(course.grade);
}

function createId() {
  return crypto.randomUUID ? crypto.randomUUID() : `course-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatGpa(value) {
  return Number(value || 0).toFixed(2);
}

function formatCredits(value) {
  const number = Number(value || 0);
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

function escapeCsvCell(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
