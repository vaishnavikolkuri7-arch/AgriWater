
import { useState, useEffect } from "react";
import WaterMonitoring from "./WaterMonitoring";
import DashboardStats from "./DashboardStats";
import "./App.css";

const API_URL = "http://localhost:8080/api/farms";
const WATER_API_URL = "http://localhost:8080/api/water-records";

function App() {
  const emptyForm = {
    farmerName: "",
    location: "",
    soilType: "",
    cropName: "",
    areaAcres: "",
  };

  const [farm, setFarm] = useState(emptyForm);
  const [farms, setFarms] = useState([]);
  const [waterRecords, setWaterRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingFarmId, setEditingFarmId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadFarms() {
    setLoading(true);
    setError("");

    try {
      const [farmResponse, waterResponse] = await Promise.all([
        fetch(API_URL),
        fetch(WATER_API_URL),
      ]);

      if (!farmResponse.ok || !waterResponse.ok) {
        throw new Error("Could not load dashboard records.");
      }

      const farmData = await farmResponse.json();
      const waterData = await waterResponse.json();

      setFarms(farmData);
      setWaterRecords(waterData);
    } catch (err) {
      setError(
        "Unable to load data. Check that Spring Boot and MySQL are running."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFarms();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setFarm((previousFarm) => ({
      ...previousFarm,
      [name]: value,
    }));
  }

  function handleEditFarm(item) {
    setEditingFarmId(item.id);

    setFarm({
      farmerName: item.farmerName ?? "",
      location: item.location ?? "",
      soilType: item.soilType ?? "",
      cropName: item.cropName ?? "",
      areaAcres: item.areaAcres ?? "",
    });

    setError("");
    setMessage("");

    document.getElementById("register")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function cancelEdit() {
    setEditingFarmId(null);
    setFarm({ ...emptyForm });
    setError("");
    setMessage("Edit cancelled.");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const isEditing = editingFarmId !== null;

      const response = await fetch(
        isEditing ? `${API_URL}/${editingFarmId}` : API_URL,
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...farm,
            areaAcres: Number(farm.areaAcres),
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 404 && isEditing) {
          throw new Error("The farm record was not found.");
        }

        if (response.status === 400) {
          throw new Error("Please enter valid farm details.");
        }

        throw new Error(
          isEditing
            ? "Could not update the farm."
            : "Could not register the farm."
        );
      }

      setFarm({ ...emptyForm });
      setEditingFarmId(null);

      setMessage(
        isEditing
          ? "Farmer details updated successfully!"
          : "Farm registered successfully!"
      );

      await loadFarms();
    } catch (err) {
      setError(
        err.message ||
          "Could not save the farm. Check the backend and MySQL."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteFarm(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this farm?"
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Could not delete the farm.");
      }

      if (editingFarmId === id) {
        setEditingFarmId(null);
        setFarm({ ...emptyForm });
      }

      setMessage("Farm deleted successfully.");
      await loadFarms();
    } catch (err) {
      setError("Could not delete the farm. Please try again.");
    }
  }

  const totalRainfall = waterRecords.reduce(
    (total, record) => total + Number(record.rainfallMm || 0),
    0
  );

  return (
    <div className="app">
      <aside className="sidebar">
        <h2>AgriWater</h2>
        <p>SMART AGRICULTURE</p>
        <a href="#dashboard">Dashboard</a>
        <a href="#register">Register Farm</a>
        <a href="#farms">Farm Records</a>
      </aside>

      <main className="main-content" id="dashboard">
        <header className="topbar">
          <div>
            <h1>Water Management System</h1>
            <p>Better Water Management, Better Crop Growth</p>
          </div>

          <span className="status">System Dashboard</span>
        </header>

        <section className="welcome">
          <h2>Welcome to AgriWater</h2>
          <p>
            Manage agricultural fields, monitor water resources,
            and support better crop growth.
          </p>
        </section>

        {/* Dashboard statistics and chart */}
        <DashboardStats />

        {/* Live statistics from the backend */}
        <section className="stats">
          <div className="stat-card">
            <p>Registered Farms</p>
            <h2>{loading ? "..." : farms.length}</h2>
          </div>

          <div className="stat-card">
            <p>Water Records</p>
            <h2>{loading ? "..." : waterRecords.length}</h2>
          </div>

          <div className="stat-card">
            <p>Total Rainfall Recorded</p>
            <h2>
              {loading ? "..." : `${totalRainfall.toFixed(1)} mm`}
            </h2>
          </div>
        </section>

        {/* Register or edit farm details */}
        <section className="panel" id="register">
          <h2>
            {editingFarmId !== null
              ? "Edit Farmer Details"
              : "Register Your Farm"}
          </h2>

          <p>
            {editingFarmId !== null
              ? "Update the details below and save your changes."
              : "Enter the agricultural field details below."}
          </p>

          {error && (
            <p role="alert" className="error-message">
              {error}
            </p>
          )}

          {message && (
            <p role="status" className="success-message">
              {message}
            </p>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <label>
                Farmer Name
                <input
                  name="farmerName"
                  value={farm.farmerName}
                  onChange={handleChange}
                  placeholder="Enter farmer name"
                  required
                />
              </label>

              <label>
                Farm Location
                <input
                  name="location"
                  value={farm.location}
                  onChange={handleChange}
                  placeholder="Enter village or district"
                  required
                />
              </label>

              <label>
                Soil Type
                <select
                  name="soilType"
                  value={farm.soilType}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select soil type</option>
                  <option>Red Sandy Soil</option>
                  <option>Sandy Loam</option>
                  <option>Black Cotton Soil</option>
                  <option>Other</option>
                </select>
              </label>

              <label>
                Crop Name
                <input
                  name="cropName"
                  value={farm.cropName}
                  onChange={handleChange}
                  placeholder="Enter crop name"
                  required
                />
              </label>

              <label>
                Farm Area (acres)
                <input
                  type="number"
                  name="areaAcres"
                  min="0.1"
                  step="0.1"
                  value={farm.areaAcres}
                  onChange={handleChange}
                  placeholder="Enter farm area"
                  required
                />
              </label>
            </div>

            <div className="form-actions">
              <button
                className="primary-button"
                type="submit"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingFarmId !== null
                    ? "Update Farmer Details"
                    : "Add Farm"}
              </button>

              {editingFarmId !== null && (
                <button
                  className="delete-button"
                  type="button"
                  onClick={cancelEdit}
                  disabled={saving}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </section>

        {/* Water monitoring and irrigation recommendations */}
        <WaterMonitoring />

        {/* Farm records */}
        <section className="panel" id="farms">
          <h2>Farm Records</h2>

          {loading ? (
            <p>Loading farm records...</p>
          ) : farms.length === 0 ? (
            <p>No farms registered yet.</p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Farmer</th>
                    <th>Location</th>
                    <th>Soil Type</th>
                    <th>Crop</th>
                    <th>Area</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {farms.map((item) => (
                    <tr key={item.id}>
                      <td>{item.farmerName}</td>
                      <td>{item.location}</td>
                      <td>{item.soilType}</td>
                      <td>{item.cropName}</td>
                      <td>{item.areaAcres} acres</td>
                      <td>
                        <div className="form-actions">
                          <button
                            className="primary-button"
                            type="button"
                            onClick={() => handleEditFarm(item)}
                            disabled={saving}
                          >
                            Edit
                          </button>

                          <button
                            className="delete-button"
                            type="button"
                            onClick={() => deleteFarm(item.id)}
                            disabled={saving}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer>
          AgriWater | Sustainable Farming for a Better Future
        </footer>
      </main>
    </div>
  );
}

export default App;
