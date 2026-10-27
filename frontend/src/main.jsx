
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import axios from "axios";
import jsPDF from "jspdf";
import {
  Upload,
  FileText,
  LogOut,
  LoaderCircle,
  Download,
  Trash2,
  BriefcaseBusiness,
  History,
  CheckCircle,
  AlertCircle,
  Sparkles,
} from "lucide-react";

import Login from "./components/Login";
import Signup from "./components/Signup";
import "./styles.css";

const API =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function App() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });

  const [showSignup, setShowSignup] = useState(false);
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const token = localStorage.getItem("token");

  const authConfig = () => ({
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setFile(null);
    setResult(null);
    setHistory([]);
    setError("");
    setSuccess("");
  };

  const loadHistory = async () => {
    const currentToken = localStorage.getItem("token");

    if (!currentToken) {
      return;
    }

    try {
      const response = await axios.get(
        `${API}/history`,
        authConfig()
      );

      const items = response.data?.history ??
        response.data?.data ??
        response.data;

      setHistory(Array.isArray(items) ? items : []);
    } catch (err) {
      if (err.response?.status === 401) {
        setError("Your session expired. Please log in again.");
        logout();
        return;
      }

      console.error("History loading failed:", err);
    }
  };

  useEffect(() => {
    if (user && token) {
      loadHistory();
    }
    // Load history when the logged-in user changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];

    setError("");
    setSuccess("");
    setResult(null);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (selectedFile.type !== "application/pdf") {
      setFile(null);
      setError("Please select a PDF file.");
      event.target.value = "";
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setFile(null);
      setError("PDF must be smaller than 5 MB.");
      event.target.value = "";
      return;
    }

    setFile(selectedFile);
  };

  const analyzeResume = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setResult(null);

    if (!file) {
      setError("Please upload your resume in PDF format.");
      return;
    }

    if (!localStorage.getItem("token")) {
      setError("Please log in again before analyzing your resume.");
      logout();
      return;
    }

    const formData = new FormData();
    formData.append("resume", file);
    formData.append("jobDescription", jobDescription);

    setLoading(true);

    try {
      const response = await axios.post(
        `${API}/analyze`,
        formData,
        authConfig()
      );

      const data = response.data;
      const analysis = data?.result ?? data?.analysis ?? data;

      setResult(analysis);
      setSuccess("Resume analyzed successfully.");
      await loadHistory();
    } catch (err) {
      console.error("Resume analysis failed:", err);

      if (err.response?.status === 401) {
        setError("Your session expired. Please log in again.");
        logout();
      } else {
        setError(
          err.response?.data?.message ||
            err.response?.data?.error ||
            "Resume analysis failed. Check that the backend is running and try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    if (!result) {
      setError("Analyze a resume before downloading the report.");
      return;
    }

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 15;
    const usableWidth = pageWidth - margin * 2;
    let y = 20;

    const addText = (label, value) => {
      if (value === undefined || value === null || value === "") {
        return;
      }

      const textValue =
        typeof value === "string"
          ? value
          : Array.isArray(value)
            ? value.map((item) =>
                typeof item === "string"
                  ? item
                  : JSON.stringify(item)
              ).join(", ")
            : JSON.stringify(value, null, 2);

      const lines = pdf.splitTextToSize(
        `${label}: ${textValue}`,
        usableWidth
      );

      if (y + lines.length * 7 > 275) {
        pdf.addPage();
        y = 20;
      }

      pdf.text(lines, margin, y);
      y += lines.length * 7 + 4;
    };

    pdf.setFontSize(18);
    pdf.text("AI Resume Analyzer Report", margin, y);
    y += 12;

    pdf.setFontSize(11);
    addText("Resume", file?.name || "Uploaded resume");
    addText("Analysis", result.summary || result.overallSummary);
    addText("Overall Score", result.score ?? result.overallScore);
    addText("ATS Score", result.atsScore);
    addText("Skills", result.skills);
    addText("Strengths", result.strengths);
    addText("Weaknesses", result.weaknesses);
    addText("Missing Keywords", result.missingKeywords);
    addText("Recommendations", result.recommendations);

    if (y === 32) {
      addText("Full result", result);
    }

    pdf.save("AI-Resume-Analysis-Report.pdf");
  };

  const renderValue = (value) => {
    if (value === undefined || value === null || value === "") {
      return "Not available";
    }

    if (Array.isArray(value)) {
      return (
        <ul>
          {value.map((item, index) => (
            <li key={index}>
              {typeof item === "string"
                ? item
                : JSON.stringify(item)}
            </li>
          ))}
        </ul>
      );
    }

    if (typeof value === "object") {
      return (
        <pre className="result-json">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }

    return String(value);
  };

  if (!user) {
    return showSignup ? (
      <Signup
        onSignupSuccess={() => {
          setShowSignup(false);
          setError("");
        }}
        onSwitchToLogin={() => setShowSignup(false)}
      />
    ) : (
      <Login
        onLoginSuccess={(loggedInUser) => {
          const savedUser =
            loggedInUser || localStorage.getItem("user");

          if (savedUser && typeof savedUser === "object") {
            localStorage.setItem("user", JSON.stringify(savedUser));
            setUser(savedUser);
          } else {
            try {
              setUser(JSON.parse(savedUser || "null"));
            } catch {
              setUser(null);
            }
          }

          setError("");
        }}
        onSwitchToSignup={() => setShowSignup(true)}
      />
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="brand">
          <div className="brand-icon">
            <Sparkles size={24} />
          </div>

          <div>
            <h1>AI Resume Analyzer</h1>
            <p>Improve your resume with AI</p>
          </div>
        </div>

        <div className="header-actions">
          <span className="user-label">
            {user.name || user.username || user.email || "User"}
          </span>

          <button
            type="button"
            className="logout-button"
            onClick={logout}
          >
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard">
        <section className="welcome-section">
          <h2>Welcome to your Resume Dashboard</h2>
          <p>
            Upload your resume, add a job description, and review
            the analysis to improve your job application.
          </p>
        </section>

        {error && (
          <div className="message error-message" role="alert">
            <AlertCircle size={19} />
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {success && (
          <div className="message success-message" role="status">
            <CheckCircle size={19} />
            <span>{success}</span>
            <button
              type="button"
              onClick={() => setSuccess("")}
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        )}

        <div className="dashboard-grid">
          <section className="panel upload-panel">
            <div className="panel-heading">
              <Upload size={22} />
              <h2>Analyze Your Resume</h2>
            </div>

            <form onSubmit={analyzeResume}>
              <label className="field-label" htmlFor="resume-file">
                Upload Resume (PDF, maximum 5 MB)
              </label>

              <label className="upload-box" htmlFor="resume-file">
                <FileText size={35} />
                <span>
                  {file ? file.name : "Choose your resume PDF"}
                </span>
                <small>Click here to select a file</small>
              </label>

              <input
                id="resume-file"
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                hidden
              />

              <label
                className="field-label"
                htmlFor="job-description"
              >
                Job Description (optional)
              </label>

              <textarea
                id="job-description"
                value={jobDescription}
                onChange={(event) =>
                  setJobDescription(event.target.value)
                }
                placeholder="Paste the job description here to compare your resume with the role..."
                rows={7}
              />

              <button
                type="submit"
                className="primary-button"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <LoaderCircle className="spin" size={19} />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles size={19} />
                    Analyze Resume
                  </>
                )}
              </button>
            </form>
          </section>

          <section className="panel history-panel">
            <div className="panel-heading">
              <History size={22} />
              <h2>Recent Analysis</h2>

              <button
                type="button"
                className="icon-button"
                onClick={loadHistory}
                title="Refresh history"
              >
                <History size={17} />
              </button>
            </div>

            {history.length === 0 ? (
              <div className="empty-state">
                <FileText size={38} />
                <p>No analysis history yet.</p>
                <small>
                  Your previous analyses will appear here.
                </small>
              </div>
            ) : (
              <div className="history-list">
                {history.map((item, index) => (
                  <div
                    className="history-item"
                    key={item._id || item.id || index}
                  >
                    <div className="history-item-icon">
                      <FileText size={20} />
                    </div>

                    <div className="history-item-content">
                      <strong>
                        {item.fileName ||
                          item.resumeName ||
                          item.filename ||
                          `Resume Analysis ${index + 1}`}
                      </strong>

                      <small>
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleDateString()
                          : "Previous analysis"}
                      </small>
                    </div>

                    <span className="history-score">
                      {item.score ??
                        item.atsScore ??
                        item.result?.score ??
                        "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {result && (
          <section className="panel results-panel">
            <div className="results-header">
              <div className="panel-heading">
                <BriefcaseBusiness size={23} />
                <h2>Resume Analysis Results</h2>
              </div>

              <button
                type="button"
                className="primary-button download-button"
                onClick={downloadReport}
              >
                <Download size={18} />
                Download Report
              </button>
            </div>

            <div className="score-grid">
              <div className="score-card">
                <span>Overall Score</span>
                <strong>
                  {result.score ??
                    result.overallScore ??
                    result.overall_score ??
                    "—"}
                </strong>
              </div>

              <div className="score-card">
                <span>ATS Score</span>
                <strong>
                  {result.atsScore ??
                    result.ats_score ??
                    "—"}
                </strong>
              </div>

              <div className="score-card">
                <span>Matched Keywords</span>
                <strong>
                  {result.matchedKeywords?.length ??
                    result.matched_keywords?.length ??
                    "—"}
                </strong>
              </div>
            </div>

            <div className="results-grid">
              <article className="result-card">
                <h3>Summary</h3>
                {renderValue(
                  result.summary ||
                    result.overallSummary ||
                    result.overall_summary
                )}
              </article>

              <article className="result-card">
                <h3>Skills</h3>
                {renderValue(
                  result.skills ||
                    result.extractedSkills ||
                    result.extracted_skills
                )}
              </article>

              <article className="result-card">
                <h3>Strengths</h3>
                {renderValue(result.strengths)}
              </article>

              <article className="result-card">
                <h3>Areas to Improve</h3>
                {renderValue(
                  result.weaknesses ||
                    result.improvements ||
                    result.areasToImprove
                )}
              </article>

              <article className="result-card">
                <h3>Missing Keywords</h3>
                {renderValue(
                  result.missingKeywords ||
                    result.missing_keywords
                )}
              </article>

              <article className="result-card">
                <h3>Recommendations</h3>
                {renderValue(
                  result.recommendations ||
                    result.suggestions
                )}
              </article>
            </div>
          </section>
        )}
      </main>

      <footer className="app-footer">
        <p>AI Resume Analyzer · Build a stronger resume</p>
      </footer>
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
