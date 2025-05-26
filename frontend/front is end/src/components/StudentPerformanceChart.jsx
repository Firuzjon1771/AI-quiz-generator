import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

export default function StatusPieChart({ quizzes }) {
  const counts = quizzes.reduce(
    (acc, q) => {
      const dueTs = q.due_at ? new Date(q.due_at) : null;
      const subTs = q.submitted_at ? new Date(q.submitted_at) : null;
      if (subTs) acc.submitted++;
      else if (dueTs && Date.now() > dueTs.getTime()) acc.late++;
      else acc.pending++;
      return acc;
    },
    { submitted: 0, pending: 0, late: 0 }
  );

  const data = [
    { name: "Submitted", value: counts.submitted },
    { name: "Pending", value: counts.pending },
    { name: "Late", value: counts.late },
  ];
  const COLORS = ["#155724", "#3182ce", "#e53e3e"];

  return (
    <div style={{ width: "100%", height: 240 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label
          >
            {data.map((entry, idx) => (
              <Cell key={entry.name} fill={COLORS[idx]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend verticalAlign="bottom" height={36} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
