
package com.agriplan.backend;

import java.time.LocalDateTime;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;

@Entity
public class WaterRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long farmId;

    private Double rainfallMm;

    private Double soilMoisturePercent;

    private Double irrigationLitres;

    private LocalDateTime recordedAt;

    public WaterRecord() {
    }

    @PrePersist
    public void setRecordedAtBeforeSave() {
        if (this.recordedAt == null) {
            this.recordedAt = LocalDateTime.now();
        }
    }

    public Long getId() {
        return id;
    }

    public Long getFarmId() {
        return farmId;
    }

    public void setFarmId(Long farmId) {
        this.farmId = farmId;
    }

    public Double getRainfallMm() {
        return rainfallMm;
    }

    public void setRainfallMm(Double rainfallMm) {
        this.rainfallMm = rainfallMm;
    }

    public Double getSoilMoisturePercent() {
        return soilMoisturePercent;
    }

    public void setSoilMoisturePercent(Double soilMoisturePercent) {
        this.soilMoisturePercent = soilMoisturePercent;
    }

    public Double getIrrigationLitres() {
        return irrigationLitres;
    }

    public void setIrrigationLitres(Double irrigationLitres) {
        this.irrigationLitres = irrigationLitres;
    }

    public LocalDateTime getRecordedAt() {
        return recordedAt;
    }

    public void setRecordedAt(LocalDateTime recordedAt) {
        this.recordedAt = recordedAt;
    }
}
