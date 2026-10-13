import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
const FARMS_API = "https://agriwater-tlpz.onrender.com/api/farms";
const RECORDS_API = "https://agriwater-tlpz.onrender.com/api/water-records";

function getDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(value) {
  const date = getDate(value);
  if (!date) return "Date unavailable";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortDateTime(value, index) {
  const date = getDate(value);
  if (!date) return `Record ${index + 1}`;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  if (!item) return null;

  return (
    <div className="agri-chart-tooltip">
      <strong>{item.farmName}</strong>
      <div>{item.fullDate}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey}>
          <span style={{ color: entry.color }}>● </span>
          {entry.name}: <strong>{entry.value}</strong>
          {entry.dataKey === "moisture"
            ? "%"
            : entry.dataKey === "rainfall"
              ? " mm"
              : " L"}
        </div>
      ))}
    </div>
  );
}

function DashboardStats() {
  const [farms, setFarms] = useState([]);
  const [records, setRecords] = useState([]);
  const [selectedFarm, setSelectedFarm] = useState("all");
  const [period, setPeriod] = useState("all");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [recordSearch, setRecordSearch] = useState("");
  const [sortBy, setSortBy] = useState("date-newest");

  useEffect(() => {
    let active = true;

    async function loadDashboardData() {
      try {
        setLoading(true);
        const [farmResponse, recordResponse] = await Promise.all([
          fetch(FARMS_API),
          fetch(RECORDS_API),
        ]);

        if (!farmResponse.ok || !recordResponse.ok) {
          throw new Error("Could not load dashboard data.");
        }

        const [farmData, recordData] = await Promise.all([
          farmResponse.json(),
          recordResponse.json(),
        ]);

        if (active) {
          setFarms(Array.isArray(farmData) ? farmData : []);
          setRecords(Array.isArray(recordData) ? recordData : []);
          setError("");
        }
      } catch {
        if (active) {
          setError(
            "Could not load statistics. Check that the backend and MySQL are running, then refresh the page."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboardData();
    return () => {
      active = false;
    };
  }, []);

  const farmNames = useMemo(() => {
    const map = new Map();
    farms.forEach((farm) => {
      map.set(String(farm.id), `${farm.farmerName || "Farm"}${farm.location ? ` — ${farm.location}` : ""}`);
    });
    return map;
  }, [farms]);

  const filteredRecords = useMemo(() => {
    const now = new Date();
    const cutoff =
      period === "7"
        ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        : period === "30"
          ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          : null;

    return records
      .filter(
        (record) =>
          selectedFarm === "all" || String(record.farmId) === selectedFarm
      )
      .filter((record) => {
        if (!cutoff) return true;
        const date = getDate(record.recordedAt);
        return date !== null && date >= cutoff;
      })
      .slice()
      .sort((a, b) => {
        const aDate = getDate(a.recordedAt)?.getTime() ?? 0;
        const bDate = getDate(b.recordedAt)?.getTime() ?? 0;
        return aDate - bDate || Number(a.id) - Number(b.id);
      });
  }, [records, selectedFarm, period]);

  const searchedRecords = useMemo(() => {
    const query = recordSearch.trim().toLowerCase();
    const results = filteredRecords.filter((record) => {
      const farmName = farmNames.get(String(record.farmId)) || `Farm ${record.farmId ?? "unknown"}`;
      const searchableText = [
        record.id,
        farmName,
        record.rainfallMm,
        record.soilMoisturePercent,
        record.irrigationLitres,
        formatDateTime(record.recordedAt),
      ].join(" ").toLowerCase();
      return searchableText.includes(query);
    });

    return results.sort((a, b) => {
      if (sortBy === "date-oldest") return (getDate(a.recordedAt)?.getTime() ?? 0) - (getDate(b.recordedAt)?.getTime() ?? 0);
      if (sortBy === "moisture-high") return Number(b.soilMoisturePercent || 0) - Number(a.soilMoisturePercent || 0);
      if (sortBy === "moisture-low") return Number(a.soilMoisturePercent || 0) - Number(b.soilMoisturePercent || 0);
      if (sortBy === "rainfall-high") return Number(b.rainfallMm || 0) - Number(a.rainfallMm || 0);
      if (sortBy === "irrigation-high") return Number(b.irrigationLitres || 0) - Number(a.irrigationLitres || 0);
      return (getDate(b.recordedAt)?.getTime() ?? 0) - (getDate(a.recordedAt)?.getTime() ?? 0);
    });
  }, [filteredRecords, farmNames, recordSearch, sortBy]);

  const averageMoisture = filteredRecords.length
    ? (
        filteredRecords.reduce(
          (sum, item) => sum + Number(item.soilMoisturePercent || 0),
          0
        ) / filteredRecords.length
      ).toFixed(1)
    : "0.0";

  const totalIrrigation = filteredRecords.reduce(
    (sum, item) => sum + Number(item.irrigationLitres || 0),
    0
  );

  const chartData = filteredRecords.map((record, index) => ({
    name: shortDateTime(record.recordedAt, index),
    fullDate: formatDateTime(record.recordedAt),
    farmName:
      farmNames.get(String(record.farmId)) || `Farm ${record.farmId ?? "unknown"}`,
    rainfall: Number(record.rainfallMm || 0),
    moisture: Number(record.soilMoisturePercent || 0),
    irrigation: Number(record.irrigationLitres || 0),
  }));

  const chartMargin = { top: 8, right: 8, left: -18, bottom: 8 };
  const xAxisProps = {
    dataKey: "name",
    tick: { fontSize: 11 },
    tickLine: false,
    axisLine: true,
    minTickGap: 18,
    interval: "preserveStartEnd",
  };

  return (
    <section className="panel dashboard-panel" id="historical-monitoring">
      <div className="section-heading">
        <div>
          <p className="eyebrow">MONITORING OVERVIEW</p>
          <h2>AgriWater Dashboard</h2>
          <p>Review saved measurements and compare water conditions over time.</p>
        </div>
        <span className="live-label">
          <span className="status-dot" /> Saved records
        </span>
      </div>

      {error && (
        <p role="alert" className="water-message error-message">
          {error}
        </p>
      )}

      <div className="dashboard-filters">
        <label>
          Filter by farm
          <select
            value={selectedFarm}
            onChange={(event) => setSelectedFarm(event.target.value)}
          >
            <option value="all">All farms</option>
            {farms.map((farm) => (
              <option key={farm.id} value={String(farm.id)}>
                {farm.farmerName} — {farm.location}
              </option>
            ))}
          </select>
        </label>

        <label>
          Date range
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          >
            <option value="all">All available records</option>
            <option value="30">Last 30 days</option>
            <option value="7">Last 7 days</option>
          </select>
        </label>

        <p className="filter-note">
          {loading
            ? "Loading saved records…"
            : `Showing ${filteredRecords.length} of ${records.length} records`}
        </p>
      </div>

      <div className="dashboard-stats">
        <article className="stat-card">
          <span className="stat-icon" aria-hidden="true">🌱</span>
          <h3>Total Farms</h3>
          <p>{loading ? "…" : farms.length}</p>
        </article>
        <article className="stat-card">
          <span className="stat-icon" aria-hidden="true">📋</span>
          <h3>Filtered Records</h3>
          <p>{loading ? "…" : filteredRecords.length}</p>
        </article>
        <article className="stat-card">
          <span className="stat-icon" aria-hidden="true">💧</span>
          <h3>Average Soil Moisture</h3>
          <p>{loading ? "…" : `${averageMoisture}%`}</p>
        </article>
        <article className="stat-card">
          <span className="stat-icon" aria-hidden="true">🚿</span>
          <h3>Total Irrigation</h3>
          <p>{loading ? "…" : `${totalIrrigation.toLocaleString("en-IN")} L`}</p>
        </article>
      </div>

      {loading ? (
        <div className="empty-state">
          <h3>Loading historical data…</h3>
          <p>Your saved measurements will appear here.</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon" aria-hidden="true">📈</span>
          <h3>No historical records for this filter</h3>
          <p>Save a water record or choose a different farm/date range to see charts.</p>
        </div>
      ) : (
        <div className="charts-grid">
          <article className="chart-card">
            <div className="chart-title-row">
              <div>
                <h3>Soil Moisture History</h3>
                <p>Moisture percentage at each saved measurement</p>
              </div>
              <span className="chart-unit">%</span>
            </div>
            <div className="chart-area">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={chartMargin}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis {...xAxisProps} />
                  <YAxis domain={[0, 100]} width={38} tick={{ fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="moisture"
                    name="Soil moisture"
                    stroke="#218653"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="chart-card">
            <div className="chart-title-row">
              <div>
                <h3>Rainfall History</h3>
                <p>Rainfall entered for each measurement</p>
              </div>
              <span className="chart-unit">mm</span>
            </div>
            <div className="chart-area">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={chartMargin}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis {...xAxisProps} />
                  <YAxis width={38} tick={{ fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar
                    dataKey="rainfall"
                    name="Rainfall"
                    fill="#3997d3"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={42}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="chart-card chart-card-wide">
            <div className="chart-title-row">
              <div>
                <h3>Irrigation Usage History</h3>
                <p>Water applied for each saved record</p>
              </div>
              <span className="chart-unit">litres</span>
            </div>
            <div className="chart-area">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={chartMargin}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis {...xAxisProps} />
                  <YAxis width={42} tick={{ fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar
                    dataKey="irrigation"
                    name="Irrigation"
                    fill="#d6a33b"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>
        </div>
      )}

      <section className="history-table-section" aria-labelledby="history-table-heading">
        <div className="history-table-heading">
          <div>
            <h3 id="history-table-heading">Historical Records</h3>
            <p>Search and sort saved measurements for quick review.</p>
          </div>
          <span className="history-count">{searchedRecords.length} record{searchedRecords.length === 1 ? "" : "s"}</span>
        </div>

        <div className="history-table-controls">
          <label className="history-search">
            Search records
            <input
              type="search"
              value={recordSearch}
              onChange={(event) => setRecordSearch(event.target.value)}
              placeholder="Search farm, date, or value…"
              aria-label="Search historical records"
            />
          </label>
          <label>
            Sort by
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="date-newest">Newest first</option>
              <option value="date-oldest">Oldest first</option>
              <option value="moisture-high">Highest soil moisture</option>
              <option value="moisture-low">Lowest soil moisture</option>
              <option value="rainfall-high">Highest rainfall</option>
              <option value="irrigation-high">Highest irrigation</option>
            </select>
          </label>
        </div>

        {searchedRecords.length === 0 ? (
          <div className="history-no-results">No records match your search. Try another word or clear the search field.</div>
        ) : (
          <div className="history-table-wrap">
            <table className="history-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Farm</th>
                  <th>Date &amp; time</th>
                  <th>Rainfall</th>
                  <th>Soil moisture</th>
                  <th>Irrigation</th>
                </tr>
              </thead>
              <tbody>
                {searchedRecords.map((record) => (
                  <tr key={record.id}>
                    <td data-label="ID">{record.id ?? "—"}</td>
                    <td data-label="Farm">{farmNames.get(String(record.farmId)) || `Farm ${record.farmId ?? "unknown"}`}</td>
                    <td data-label="Date & time">{formatDateTime(record.recordedAt)}</td>
                    <td data-label="Rainfall">{Number(record.rainfallMm || 0)} mm</td>
                    <td data-label="Soil moisture">{Number(record.soilMoisturePercent || 0)}%</td>
                    <td data-label="Irrigation">{Number(record.irrigationLitres || 0).toLocaleString("en-IN")} L</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="chart-footnote">
        Charts and the historical table use saved water records. They do not represent live sensor readings.
      </p>
    </section>
  );
}

export default DashboardStats;
