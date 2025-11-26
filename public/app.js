// app.js - fills official-like UI and shows result only after success

const API_BASE = (function(){
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") return "http://localhost:3000";
  return "https://exambeuresultbackend.onrender.com";
})();
const API = API_BASE.replace(/\/+$/,'') + "/result";

// DOM refs
const regInput = document.getElementById("regInput");
const semSelect = document.getElementById("semesterSelect");
const getBtn = document.getElementById("getBtn");
const refreshBtn = document.getElementById("refreshBtn");
const printBtn = document.getElementById("printBtn");
const statusEl = document.getElementById("status");
const resultSection = document.getElementById("resultSection");

// table bodies
const theoryBody = document.getElementById("theoryBody");
const practicalBody = document.getElementById("practicalBody");

// meta fields
const semesterLabel = document.getElementById("semesterLabel");
const examHeldLabel = document.getElementById("examHeldLabel");
const regLabel = document.getElementById("regLabel");
const nameLabel = document.getElementById("nameLabel");
const fatherLabel = document.getElementById("fatherLabel");
const motherLabel = document.getElementById("motherLabel");
const collegeCode = document.getElementById("collegeCode");
const collegeName = document.getElementById("collegeName");
const courseCode = document.getElementById("courseCode");
const courseName = document.getElementById("courseName");
const examTitle = document.getElementById("examTitle");
const publishDate = document.getElementById("publish_date");
const sgpa_display = document.getElementById("sgpa_display");
const remarksValue = document.getElementById("remarksValue");

function setStatus(msg, isError=false){
  if(statusEl) { statusEl.textContent = "Status: " + msg; statusEl.style.color = isError ? "red" : "#444"; }
  else console.log((isError?"ERROR: ":"")+msg);
}

function hideResult(){ if(resultSection) resultSection.classList.add("hidden"); }
function showResult(){ if(resultSection) resultSection.classList.remove("hidden"); }

function clearTables(){
  if(theoryBody) theoryBody.innerHTML = "";
  if(practicalBody) practicalBody.innerHTML = "";
}

// sanitize
function esc(s){ if(s===null||s===undefined) return ""; return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c])); }

function fillMeta(d){
  semesterLabel.textContent = d.semester || "-";
  examHeldLabel.textContent = d.exam_held || d.examHeld || "-";
  regLabel.textContent = d.redg_no || regInput.value || "-";
  nameLabel.textContent = d.name || "-";
  fatherLabel.textContent = d.father_name || "-";
  motherLabel.textContent = d.mother_name || "-";
  collegeCode.textContent = d.college_code || "-";
  collegeName.textContent = d.college_name || "-";
  courseCode.textContent = d.course_code || "-";
  courseName.textContent = d.course || "-";
  examTitle.textContent = (d.sourcePage ? d.sourcePage + " | " : "") + (d.exam_held || d.examHeld || "Result");
  publishDate.textContent = d.publish_date || d.publishDate || "-";
  sgpa_display.textContent = (Array.isArray(d.sgpa) ? (d.sgpa[d.semIndex||0]||"-") : (d.sgpa||"-")) || "-";
  remarksValue.textContent = d.fail_any || d.remarks || "-";
  // color remarks
  const t = (remarksValue.textContent||"").toLowerCase();
  if(t.includes("pass")) remarksValue.style.color = "#198754";
  else if(t.includes("fail")||t.includes("ab")) remarksValue.style.color = "#b00020";
  else remarksValue.style.color = "#333";
}

function addRow(body, r){
  if(!body) return;
  const tr = document.createElement("tr");
  tr.innerHTML = `<td align="center">${esc(r.code||"")}</td>
    <td align="left">${esc(r.name||"")}</td>
    <td align="center">${esc(r.ese||"")}</td>
    <td align="center">${esc(r.ia||"")}</td>
    <td align="center">${esc(r.total||"")}</td>
    <td align="center">${esc(r.grade||"")}</td>
    <td align="center">${esc(r.credit||"")}</td>`;
  body.appendChild(tr);
}

function fillTables(d){
  clearTables();
  if(Array.isArray(d.theorySubjects) && d.theorySubjects.length){
    d.theorySubjects.forEach(s => addRow(theoryBody, s));
  }
  if(Array.isArray(d.practicalSubjects) && d.practicalSubjects.length){
    d.practicalSubjects.forEach(s => addRow(practicalBody, s));
  }
  // SGPA grid
  const sg = Array.isArray(d.sgpa) ? d.sgpa : (d.sgpa ? d.sgpa.toString().split(",") : []);
  const ids = ["I","II","III","IV","V","VI","VII","VIII"];
  ids.forEach((id, i) => {
    const el = document.getElementById("sgpa_"+id);
    if(el) el.textContent = (sg[i] && String(sg[i]).trim()!=="")? sg[i] : "-";
  });
  document.getElementById("cur_cgpa").textContent = d.cgpa || "-";
}

// main fetch
async function fetchResult(){
  const reg = (regInput.value||"").trim();
  const sem = (semSelect.value||"").trim();
  const year = (document.getElementById("examYear")||{value:"2024"}).value;
  const examHeld = (document.getElementById("examHeld")||{value:"July/2025"}).value;

  if(!reg){ setStatus("Please enter Registration No", true); return; }

  hideResult();
  clearTables();
  setStatus("Fetching...");

  try{
    const url = API + "?reg="+encodeURIComponent(reg)+"&sem="+encodeURIComponent(sem)+"&year="+encodeURIComponent(year)+"&examHeld="+encodeURIComponent(examHeld);
    const res = await fetch(url, {cache:"no-store"});
    if(!res.ok){
      const txt = await res.text().catch(()=>"");
      setStatus("Server returned "+res.status+". "+txt.slice(0,200), true);
      hideResult();
      return;
    }
    const j = await res.json().catch(()=>null);
    if(!j){ setStatus("Invalid JSON from server", true); hideResult(); return; }

    if(j.success && j.data){
      fillMeta(j.data);
      fillTables(j.data);
      showResult();
      setStatus("Result loaded (" + (j.from||"unknown") + ")");
    } else {
      const reason = j.message || j.error || "No Result";
      setStatus("No Result Found. " + reason, true);
      hideResult();
    }
  } catch(err){
    setStatus("Network / Proxy error: " + (err.message||err), true);
    hideResult();
  }
}

// events
if(getBtn) getBtn.addEventListener("click", fetchResult);
if(refreshBtn) refreshBtn.addEventListener("click", fetchResult);
if(printBtn) printBtn.addEventListener("click", ()=>window.print());
if(regInput) regInput.addEventListener("keyup", e => { if(e.key==="Enter") fetchResult(); });

// on load hide result
hideResult();
