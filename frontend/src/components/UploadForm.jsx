import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaBrain, FaFileUpload, FaListOl, FaRegFileAlt } from "react-icons/fa";
import Spinner from "./Spinner";
import { ToggleSwitch } from "./ToggleSwitch";
import "../styles/UploadForm.css";
import ProgressBar from "../components/ProgresBar";
import { showToast } from "../components/toast";
export default function UploadForm({ setTopic, setSummary, setQuestions }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(10);
  const [mcCount, setMcCount] = useState(0);
  const [withSummary, setWithSummary] = useState(false);
  const [summaryLength, setSummaryLength] = useState(2);
  const [autoDetectTopic, setAutoDetectTopic] = useState(true);
  const [topicJsonMap, setTopicJsonMap] = useState(null);
  const [selectedJsonTopic, setSelectedJsonTopic] = useState("");
  const [manualTopic, setManualTopic] = useState("");
  const [selectedBuiltInTopic, setSelectedBuiltInTopic] = useState("");
  const [availableKeywords, setAvailableKeywords] = useState([]);
  const [selectedKeywords, setSelectedKeywords] = useState([]);
  const [customKeyword, setCustomKeyword] = useState("");
  const [builtInMap, setBuiltInMap] = useState({});
  useEffect(() => {
    axios
      .get("/api/topics")
      .then((res) => setBuiltInMap(res.data))
      .catch(console.error);
  }, []);
  const builtInTopics = Object.keys(builtInMap);

  const effectiveTopic = (() => {
    if (topicJsonMap) return selectedJsonTopic;
    if (selectedBuiltInTopic) return selectedBuiltInTopic;
    return manualTopic.trim();
  })();
  const isJsonBranch = !!topicJsonMap;
  const isBuiltIn = !isJsonBranch && !!builtInMap[effectiveTopic];
  const isNewTopic =
    !isJsonBranch && effectiveTopic && !builtInMap[effectiveTopic];

  useEffect(() => {
    let kws = [];
    if (isJsonBranch && selectedJsonTopic) {
      kws = topicJsonMap[selectedJsonTopic] || [];
    } else if (isBuiltIn) {
      kws = builtInMap[effectiveTopic] || [];
    }
    setAvailableKeywords(kws);
    setSelectedKeywords([]);
  }, [
    isJsonBranch,
    selectedJsonTopic,
    selectedBuiltInTopic,
    manualTopic,
    builtInMap,
    topicJsonMap,
  ]);

  const filteredBuiltInTopics = builtInTopics.filter((t) =>
    manualTopic.trim() === ""
      ? true
      : t.toLowerCase().includes(manualTopic.toLowerCase())
  );

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setText(ev.target.result);
    reader.readAsText(f);
  };

  const handleTopicJsonUpload = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const obj = JSON.parse(ev.target.result);
        setTopicJsonMap(obj);
        setSelectedJsonTopic("");
      } catch {
        showToast("Invalid JSON file", "warning");
      }
    };
    reader.readAsText(f);
  };

  const handleAddCustomKeyword = () => {
    const kw = customKeyword.trim();
    if (!kw) return;
    setSelectedKeywords((p) => [...p, kw]);
    setAvailableKeywords((p) => [...p, kw]);
    setCustomKeyword("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!text.trim() && !file) {
      showToast(
        "Please paste or upload your text before generating.",
        "warning"
      );
      return;
    }

    setLoading(true);

    let content = text;
    if (file) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        const up = await axios.post("/api/upload", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        content = up.data.text;
        setText(content);
      } catch {
        showToast("Upload failed", "error");
        setLoading(false);
        return;
      }
    }

    let topicToUse = "";
    if (autoDetectTopic) {
      try {
        const dt = await axios.post("/api/detect", { text: content });
        const detection = dt.data || {};
        const scoresObj = detection.Scores || {};
        const allScores = Object.values(scoresObj).map((v) => Number(v) || 0);
        const maxScore = allScores.length ? Math.max(...allScores) : 0;
        if (!detection.Primary || maxScore < 3) {
          showToast(
            "Unable to detect a meaningful topic from your text. " +
              "Please enter a clearer scientific passage or pick a topic manually.",
            "error"
          );
          setLoading(false);
          return;
        }
        topicToUse = detection.Primary;
      } catch {
        console.warn("Topic detect failed");
      }
    } else {
      if (isJsonBranch) {
        if (!selectedJsonTopic) {
          showToast("Please choose a topic from your JSON.", "warning");
          setLoading(false);
          return;
        }
        topicToUse = selectedJsonTopic;
      } else {
        if (!effectiveTopic) {
          showToast("Please enter or pick a topic.", "warning");
          setLoading(false);
          return;
        }
        if (isNewTopic && selectedKeywords.length === 0) {
          showToast("New topic → please enter ≥1 keyword.", "warning");
          setLoading(false);
          return;
        }
        topicToUse = effectiveTopic;
      }
    }
    setTopic(topicToUse);

    try {
      let res;
      const openCount = totalCount - mcCount;

      if (autoDetectTopic) {
        res = await axios.post("/api/quiz/generate", {
          text: content,
          topic: topicToUse,
          total_count: totalCount,
          open_count: openCount,
          mc_count: mcCount,
          with_summary: withSummary,
          summary_length: summaryLength,
        });
        if (res.data.summary) setSummary(res.data.summary);
      } else {
        const payload = {
          text: content,
          topic: topicToUse,
          total_count: totalCount,
          keywords: selectedKeywords,
          with_summary: withSummary,
          summary_length: summaryLength,
        };
        res = await axios.post("/api/quiz/generate_by_keywords", payload);

        await axios
          .post("/api/topics/add", {
            topic: topicToUse,
            keywords: selectedKeywords,
          })
          .catch(() => {}); // existing → noop

        setBuiltInMap((m) => ({
          ...m,
          [topicToUse]: selectedKeywords,
        }));
      }

      setQuestions(res.data.questions || []);
    } catch (err) {
      console.error(err);
      showToast(
        "Generation failed: " + (err.response?.data?.error || err.message),
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <div className="settings-grid">
        <div className="setting">
          <FaBrain className="setting-icon" />
          <label htmlFor="detect-topic">Auto-detect topic</label>
          <ToggleSwitch
            id="detect-topic"
            checked={autoDetectTopic}
            onChange={(v) => {
              setAutoDetectTopic(v);
              setTopicJsonMap(null);
              setSelectedJsonTopic("");
              setManualTopic("");
              setSelectedBuiltInTopic("");
              setAvailableKeywords([]);
              setSelectedKeywords([]);
            }}
          />
        </div>

        {!autoDetectTopic && (
          <>
            <div className="setting">
              <label>Topic</label>
              <input
                type="text"
                className="stylish-input"
                placeholder="Enter topic name"
                disabled={loading || topicJsonMap}
                value={manualTopic}
                onChange={(e) => {
                  setManualTopic(e.target.value);
                  setSelectedBuiltInTopic("");
                }}
              />
            </div>
            <div className="setting">
              <label>Or pick built-in topic</label>
              <select
                disabled={loading || topicJsonMap}
                value={selectedBuiltInTopic}
                onChange={(e) => setSelectedBuiltInTopic(e.target.value)}
              >
                <option value="">— pick built-in —</option>
                {filteredBuiltInTopics.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="setting">
              <label>Or upload topic→keywords JSON</label>
              <input
                type="file"
                accept=".json"
                disabled={loading}
                onChange={handleTopicJsonUpload}
              />
              {topicJsonMap && (
                <select
                  disabled={loading}
                  value={selectedJsonTopic}
                  onChange={(e) => setSelectedJsonTopic(e.target.value)}
                >
                  <option value="">— pick from JSON —</option>
                  {Object.keys(topicJsonMap).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </>
        )}

        {!autoDetectTopic && effectiveTopic && (
          <div className="setting keyword-block">
            {isNewTopic && !isJsonBranch && (
              <p className="alert">
                “{effectiveTopic}” is new — please enter its keywords below:
              </p>
            )}

            <label className="keyword-title">Pick keywords</label>

            {availableKeywords.length > 0 && (
              <>
                <div className="keyword-toolbar">
                  <button
                    type="button"
                    onClick={() => setSelectedKeywords([...availableKeywords])}
                  >
                    Select All
                  </button>
                  <button type="button" onClick={() => setSelectedKeywords([])}>
                    Clear All
                  </button>
                </div>
                <div className="keyword-list-grid">
                  {availableKeywords.map((kw) => (
                    <label key={kw} className="keyword-item">
                      <input
                        type="checkbox"
                        checked={selectedKeywords.includes(kw)}
                        onChange={() => {
                          setSelectedKeywords((prev) =>
                            prev.includes(kw)
                              ? prev.filter((x) => x !== kw)
                              : [...prev, kw]
                          );
                        }}
                      />
                      {kw}
                    </label>
                  ))}
                </div>
              </>
            )}

            <div className="custom-keyword-row">
              <input
                type="text"
                className="stylish-input"
                placeholder="Add custom keyword"
                disabled={loading}
                value={customKeyword}
                onChange={(e) => setCustomKeyword(e.target.value)}
              />
              <button type="button" onClick={handleAddCustomKeyword}>
                Add
              </button>
            </div>
          </div>
        )}

        <div className="setting">
          <FaListOl className="setting-icon" />
          <label>Total questions</label>
          <div className="slider-container">
            <input
              type="range"
              min={1}
              max={50}
              value={totalCount}
              disabled={loading}
              onChange={(e) => setTotalCount(+e.target.value)}
            />
            <span className="slider-value">{totalCount}</span>
          </div>
        </div>

        <div className="setting">
          <FaRegFileAlt className="setting-icon" />
          <label>Include summary</label>
          <ToggleSwitch
            checked={withSummary}
            onChange={setWithSummary}
            disabled={loading}
          />
          {withSummary && (
            <input
              type="number"
              min={1}
              className="text-input"
              placeholder="Length"
              disabled={loading}
              value={summaryLength}
              onChange={(e) => setSummaryLength(Math.max(1, +e.target.value))}
            />
          )}
        </div>

        <div className="setting file-setting">
          <FaFileUpload className="setting-icon" />
          <label className="file-label">
            <span className="btn-file">Choose content file</span>
            <input
              type="file"
              accept=".txt,.pdf"
              disabled={loading}
              onChange={handleFile}
            />
          </label>
          {file && <span className="file-name">{file.name}</span>}
        </div>
      </div>

      <textarea
        rows={6}
        className="main-textarea"
        placeholder="Paste your text here…"
        disabled={loading}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <ProgressBar loading={loading} />

      <button type="submit" className="upload-btn" disabled={loading}>
        Generate
      </button>
    </form>
  );
}
