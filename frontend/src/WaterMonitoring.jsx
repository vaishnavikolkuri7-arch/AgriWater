import { useEffect, useState } from "react";
const API_URL = "http://localhost:8080/api/water-records";
const FARM_API_URL = "http://localhost:8080/api/farms";
// Format the timestamp returned by the backend for display in the table.
function formatRecordedAt(recordedAt) {
  if (!recordedAt) {
    return "Not available";
  }
  const date = new Date(recordedAt);
  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}
// Determine water status from soil moisture.
function getWaterStatus(value) {
  if (value === "" || value === null || value === undefined) {
    return "Enter soil moisture";
  }
  const moisture = Number(value);
  if (!Number.isFinite(moisture) || moisture < 0 || moisture > 100) {
    return "Invalid value";
  }
  if (moisture < 30) return "Low";
  if (moisture <= 60) return "Normal";
  return "High";
}
// Generate recommendations using moisture, crop, soil, and rainfall.
function getIrrigationRecommendation(record, farm) {
  const value = record?.soilMoisturePercent;
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    !Number.isFinite(Number(value)) ||
    Number(value) < 0 ||
    Number(value) > 100
  ) {
    return "Enter a valid soil moisture reading between 0 and 100%.";
  }
  const moisture = Number(value);
  const rainfallValue = record?.rainfallMm;
  const rainfall =
    rainfallValue === "" || rainfallValue == null
      ? 0
      : Number(rainfallValue);
  const crop = String(farm?.cropName ?? "").toLowerCase();
  const soil = String(farm?.soilType ?? "").toLowerCase();
  if (!Number.isFinite(rainfall) || rainfall < 0) {
    return "Invalid rainfall reading. Check the rainfall value.";
  }
  let advice = "";
  // General advice based on soil moisture.
  if (moisture < 20) {
    advice =
      "Very dry reading: Check soil around the crop roots. If the root zone is dry, irrigate in a controlled amount and recheck moisture after watering.";
  } else if (moisture < 30) {
    advice =
      "Low moisture: Inspect the root-zone soil and crop condition. If water is needed, irrigate gradually and check the sensor again.";
  } else if (moisture <= 60) {
    advice =
      "Moderate reading: Check the crop and root-zone soil. If the soil has enough water for the crop, postpone irrigation and continue monitoring.";
  } else if (moisture <= 80) {
    advice =
      "High moisture: Delay additional irrigation while checking the root zone and looking for standing water.";
  } else {
    advice =
      "Very high moisture: Pause additional irrigation temporarily. Check for waterlogging, drainage problems, and sensor accuracy.";
  }
  // Crop-specific guidance.
  if (crop.includes("paddy") || crop.includes("rice")) {
    advice +=
      " Paddy: Check the crop growth stage and field water level before deciding whether more water is needed.";
  } else if (crop.includes("cotton")) {
    advice +=
      " Cotton: Check moisture near the active root zone and avoid prolonged dryness or waterlogging.";
  } else if (
    crop.includes("tomato") ||
    crop.includes("chilli") ||
    crop.includes("vegetable")
  ) {
    advice +=
      " Vegetables: Monitor root-zone moisture regularly and avoid allowing the soil to become excessively dry or waterlogged.";
  } else if (crop.includes("maize") || crop.includes("corn")) {
    advice +=
      " Maize: Consider the growth stage, particularly flowering and grain formation, when assessing water needs.";
  } else if (farm?.cropName) {
    advice +=
      ` ${farm.cropName}: Check the crop's growth stage and water requirements before deciding how much to irrigate.`;
  }
  // Soil-specific guidance.
  if (soil.includes("black cotton")) {
    advice +=
      " Black cotton soil: It can retain water and drain slowly. Check for excess moisture and waterlogging before irrigating again.";
  } else if (soil.includes("sandy loam")) {
    advice +=
      " Sandy loam: Check moisture regularly because drainage and water retention depend on the soil's condition.";
  } else if (soil.includes("sandy") || soil.includes("red")) {
    advice +=
      " Sandy or red soil: These soils often retain less water than clay-rich soils. Monitor moisture more frequently and avoid excessive watering.";
  } else if (farm?.soilType) {
    advice +=
      ` Soil type (${farm.soilType}): Consider its water-retention and drainage characteristics when planning irrigation.`;
  }
  // Use the rainfall value entered for this measurement.
  if (rainfall >= 10) {
    advice +=
      " Rainfall: At least 10 mm is recorded. Check actual root-zone moisture and field conditions before adding irrigation.";
  } else if (rainfall > 0) {
    advice +=
      " Rainfall: Some rain is recorded. Check whether it has reached the crop's root zone before changing the irrigation plan.";
  } else {
    advice +=
      " Rainfall: No rainfall is recorded for this measurement. Check the soil and crop before deciding whether irrigation is needed.";
  }
  return advice;
}
function WaterMonitoring() {
  const [farms, setFarms] = useState([]);
  const [records, setRecords] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const emptyForm = {
    farmId: "",
    rainfallMm: "",
    soilMoisturePercent: "",
    irrigationLitres: "",
  };
  const [form, setForm] = useState({ ...emptyForm });
  async function loadData() {
    try {
      const [farmResponse, recordResponse] = await Promise.all([
        fetch(FARM_API_URL),
        fetch(API_URL),
      ]);
      if (!farmResponse.ok || !recordResponse.ok) {
        throw new Error("Could not load records.");
      }
      const farmData = await farmResponse.json();
      const recordData = await recordResponse.json();
      setFarms(farmData);
      setRecords(recordData);
      setError("");
    } catch (err) {
      setError(
        "Could not load data. Check that Spring Boot and MySQL are running."
      );
    }
  }
  useEffect(() => {
    loadData();
  }, []);
  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }
  function resetForm() {
    setForm({ ...emptyForm });
    setEditingId(null);
  }
  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;
    setMessage("");
    setError("");
    const moisture = Number(form.soilMoisturePercent);
    const rainfall = Number(form.rainfallMm);
    const irrigation = Number(form.irrigationLitres);
    if (!form.farmId) {
      setError("Please select a farm.");
      return;
    }
    if (
      form.soilMoisturePercent === "" ||
      !Number.isFinite(moisture) ||
      moisture < 0 ||
      moisture > 100
    ) {
      setError("Soil moisture must be between 0 and 100.");
      return;
    }
    if (
      form.rainfallMm === "" ||
      form.irrigationLitres === "" ||
      !Number.isFinite(rainfall) ||
      rainfall < 0 ||
      !Number.isFinite(irrigation) ||
      irrigation < 0
    ) {
      setError(
        "Enter valid non-negative rainfall and irrigation values."
      );
      return;
    }
    setSaving(true);
    try {
      const recordData = {
        farmId: Number(form.farmId),
        rainfallMm: rainfall,
        soilMoisturePercent: moisture,
        irrigationLitres: irrigation,
      };
      const isEditing = editingId !== null;
      const response = await fetch(
        isEditing ? `${API_URL}/${editingId}` : API_URL,
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(recordData),
        }
      );
      if (!response.ok) {
        throw new Error(
          isEditing
            ? "Could not update the record."
            : "Could not save the record."
        );
      }
      setMessage(
        isEditing
          ? "Water record updated successfully!"
          : "Water record saved successfully!"
      );
      resetForm();
      await loadData();
    } catch (err) {
      setError(
        err.message ||
          "Operation failed. Check the backend and API endpoint."
      );
    } finally {
      setSaving(false);
    }
  }
  function handleEdit(record) {
    setEditingId(record.id);
    setForm({
      farmId: String(record.farmId),
      rainfallMm: String(record.rainfallMm),
      soilMoisturePercent: String(record.soilMoisturePercent),
      irrigationLitres: String(record.irrigationLitres),
    });
    setMessage("");
    setError("");
    document
      .getElementById("water-monitoring")
      ?.scrollIntoView({ behavior: "smooth" });
  }
  async function handleDelete(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this water record?"
    );
    if (!confirmed) return;
    setMessage("");
    setError("");
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Could not delete the record.");
      }
      if (editingId === id) {
        resetForm();
      }
      setMessage("Water record deleted successfully!");
      await loadData();
    } catch (err) {
      setError(err.message || "Could not delete the record.");
    }
  }
  // Find the farm selected in the form.
  const selectedFarm = farms.find(
    (farm) => String(farm.id) === String(form.farmId)
  );
  return (
    <section className="panel" id="water-monitoring">
      <h2>Water Monitoring</h2>
      <p>
        Record, view, update and delete farm water measurements.
      </p>
      {message && (
        <p role="status" className="water-message">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="water-message">
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>
            Select Farm
            <select
              name="farmId"
              value={form.farmId}
              onChange={handleChange}
              required
            >
              <option value="">Choose a farm</option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.farmerName} - {farm.location}
                </option>
              ))}
            </select>
          </label>
          <label>
            Rainfall (mm)
            <input
              type="number"
              name="rainfallMm"
              min="0"
              step="0.1"
              value={form.rainfallMm}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Soil Moisture (%)
            <input
              type="number"
              name="soilMoisturePercent"
              min="0"
              max="100"
              step="0.1"
              value={form.soilMoisturePercent}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Irrigation Usage (litres)
            <input
              type="number"
              name="irrigationLitres"
              min="0"
              step="0.1"
              value={form.irrigationLitres}
              onChange={handleChange}
              required
            />
          </label>
        </div>
        <div className="water-status">
          <strong>Current Water Status: </strong>
          <span
            className={`water-badge ${getWaterStatus(
              form.soilMoisturePercent
            )
              .toLowerCase()
              .replace(/\s+/g, "-")}`}
          >
            {getWaterStatus(form.soilMoisturePercent)}
          </span>
        </div>
        {/* Live crop-, soil-, and rainfall-aware recommendation */}
        <div className="irrigation-recommendation">
          <strong>Irrigation Recommendation</strong>
          {(() => {
            const moisture = Number(form.soilMoisturePercent);
            const recommendation = getIrrigationRecommendation(
              {
                soilMoisturePercent: form.soilMoisturePercent,
                rainfallMm: form.rainfallMm,
              },
              selectedFarm
            );

            let action = "Check sensor reading";
            let actionClass = "recommendation-monitor";

            if (
              form.soilMoisturePercent !== "" &&
              Number.isFinite(moisture) &&
              moisture >= 0 &&
              moisture <= 100
            ) {
              if (moisture < 20) {
                action = "Check root-zone dryness";
                actionClass = "recommendation-dry";
              } else if (moisture < 30) {
                action = "Assess irrigation needs";
                actionClass = "recommendation-dry";
              } else if (moisture <= 60) {
                action = "Monitor — irrigation may not be needed";
                actionClass = "recommendation-monitor";
              } else if (moisture <= 80) {
                action = "Delay irrigation and check drainage";
                actionClass = "recommendation-wet";
              } else {
                action = "Pause irrigation and check waterlogging";
                actionClass = "recommendation-wet";
              }
            }

            return (
              <>
                <div className={`recommendation-action ${actionClass}`}>
                  {action}
                </div>
                <p>{recommendation}</p>
              </>
            );
          })()}
        </div>
        <div className="water-actions">
          <button
            className="primary-button"
            type="submit"
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : editingId !== null
                ? "Update Water Record"
                : "Save Water Record"}
          </button>
          {editingId !== null && (
            <button
              className="delete-button"
              type="button"
              onClick={resetForm}
              disabled={saving}
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>
      <h2>Water Monitoring Records</h2>
      {records.length === 0 ? (
        <p>No water records available yet.</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Record ID</th>
                <th>Recorded Date &amp; Time</th>
                <th>Farm ID</th>
                <th>Rainfall (mm)</th>
                <th>Soil Moisture (%)</th>
                <th>Water Status</th>
                <th>Irrigation (litres)</th>
                <th>Irrigation Recommendation</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const status = getWaterStatus(
                  record.soilMoisturePercent
                );
                const recordFarm = farms.find(
                  (farm) =>
                    String(farm.id) === String(record.farmId)
                );
                return (
                  <tr key={record.id}>
                    <td>{record.id}</td>
                    <td>{formatRecordedAt(record.recordedAt)}</td>
                    <td>{record.farmId}</td>
                    <td>{record.rainfallMm}</td>
                    <td>{record.soilMoisturePercent}%</td>
                    <td>
                      <span
                        className={`water-badge ${status
                          .toLowerCase()
                          .replace(/\s+/g, "-")}`}
                      >
                        {status}
                      </span>
                    </td>
                    <td>{record.irrigationLitres}</td>
                    {/* Recommendation for each saved water record */}
                    <td>
                      {getIrrigationRecommendation(
                        record,
                        recordFarm
                      )}
                    </td>
                    <td>
                      <div className="water-actions">
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() => handleEdit(record)}
                          disabled={saving}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="delete-button"
                          onClick={() => handleDelete(record.id)}
                          disabled={saving}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
export default WaterMonitoring;
