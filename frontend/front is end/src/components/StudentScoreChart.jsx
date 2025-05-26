import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";

function shortTitle(str) {
  return str.length > 12 ? str.slice(0, 12) + "…" : str;
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const { fullName, score } = payload[0].payload;
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #ccc",
        padding: "8px",
        borderRadius: "4px",
        maxWidth: "280px",
        whiteSpace: "normal",
      }}
    >
      <p style={{ margin: 0, fontWeight: "600" }}>{fullName}</p>
      <p style={{ margin: "4px 0 0 0" }}>
        <strong>Score:</strong> {score}
      </p>
    </div>
  );
};

export default function StudentScoreChart({ quizzes }) {
  const data = quizzes.map((q) => ({
    fullName: q.title,
    name: shortTitle(q.title),
    score: q.score != null ? q.score : 0,
  }));

  const COLORS = [
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff7f50",
    "#a4de6c",
    "#d0ed57",
    "#8dd1e1",
    "#83a6ed",
    "#8e44ad",
  ];

  return (
    <div style={{ width: "100%", height: 240, marginBottom: "1.5rem" }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          margin={{ top: 20, right: 20, left: 0, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            interval={0}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis allowDecimals={false} />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "rgba(0,0,0,0.1)" }}
          />
          <Bar dataKey="score">
            {data.map((entry, idx) => (
              <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
