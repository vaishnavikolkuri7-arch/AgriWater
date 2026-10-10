package com.agriplan.backend;

import java.util.List;
import java.util.Optional;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/water-records")
@CrossOrigin(origins = "http://localhost:5173")
public class WaterRecordController {

    private final WaterRecordRepository waterRecordRepository;
    private final FarmRepository farmRepository;

    public WaterRecordController(
            WaterRecordRepository waterRecordRepository,
            FarmRepository farmRepository) {
        this.waterRecordRepository = waterRecordRepository;
        this.farmRepository = farmRepository;
    }

    // READ: Get all water records
    @GetMapping
    public List<WaterRecord> getAllWaterRecords() {
        return waterRecordRepository.findAll();
    }

    // READ: Get water records for a specific farm
    @GetMapping("/farm/{farmId}")
    public ResponseEntity<?> getRecordsByFarm(
            @PathVariable Long farmId) {

        if (!farmRepository.existsById(farmId)) {
            return ResponseEntity.badRequest()
                    .body("Farm does not exist.");
        }

        return ResponseEntity.ok(
                waterRecordRepository.findByFarmId(farmId));
    }

    // CREATE: Save a new water record with an automatic timestamp
    @PostMapping
    public ResponseEntity<?> createWaterRecord(
            @RequestBody WaterRecord record) {

        if (!isFarmValid(record)) {
            return ResponseEntity.badRequest()
                    .body("Farm does not exist.");
        }

        if (!isValidRecord(record)) {
            return ResponseEntity.badRequest()
                    .body("Invalid water record values.");
        }

        // Generate the timestamp automatically when saving.
        // WaterRecord's @PrePersist method sets the current date and time.
        record.setRecordedAt(null);

        WaterRecord savedRecord =
                waterRecordRepository.save(record);

        return ResponseEntity.ok(savedRecord);
    }

    // UPDATE: Edit a water record without changing its original timestamp
    @PutMapping("/{id}")
    public ResponseEntity<?> updateWaterRecord(
            @PathVariable Long id,
            @RequestBody WaterRecord updatedRecord) {

        Optional<WaterRecord> existingOptional =
                waterRecordRepository.findById(id);

        if (existingOptional.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        if (!isFarmValid(updatedRecord)) {
            return ResponseEntity.badRequest()
                    .body("Farm does not exist.");
        }

        if (!isValidRecord(updatedRecord)) {
            return ResponseEntity.badRequest()
                    .body("Invalid water record values.");
        }

        // Update the existing record instead of creating a new one.
        WaterRecord existing = existingOptional.get();

        existing.setFarmId(updatedRecord.getFarmId());
        existing.setRainfallMm(updatedRecord.getRainfallMm());
        existing.setSoilMoisturePercent(
                updatedRecord.getSoilMoisturePercent());
        existing.setIrrigationLitres(
                updatedRecord.getIrrigationLitres());

        // Do not modify existing.recordedAt.
        WaterRecord savedRecord =
                waterRecordRepository.save(existing);

        return ResponseEntity.ok(savedRecord);
    }

    // DELETE: Remove a water record
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteWaterRecord(
            @PathVariable Long id) {

        if (!waterRecordRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        waterRecordRepository.deleteById(id);

        return ResponseEntity.noContent().build();
    }

    // Check that the selected farm exists
    private boolean isFarmValid(WaterRecord record) {
        return record.getFarmId() != null
                && farmRepository.existsById(record.getFarmId());
    }

    // Validate rainfall, soil moisture and irrigation usage
    private boolean isValidRecord(WaterRecord record) {
        return record.getRainfallMm() != null
                && record.getRainfallMm() >= 0
                && record.getSoilMoisturePercent() != null
                && record.getSoilMoisturePercent() >= 0
                && record.getSoilMoisturePercent() <= 100
                && record.getIrrigationLitres() != null
                && record.getIrrigationLitres() >= 0;
    }
}