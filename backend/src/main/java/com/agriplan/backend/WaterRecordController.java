
package com.agriplan.backend;

import java.util.List;
import java.util.Optional;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
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
@CrossOrigin(origins = {
    "http://localhost:5173",
    "https://wondrous-jalebi-46e9d6.netlify.app"
})
public class WaterRecordController {

    private final WaterRecordRepository waterRecordRepository;
    private final FarmRepository farmRepository;
    private final JdbcTemplate jdbcTemplate;

    public WaterRecordController(
            WaterRecordRepository waterRecordRepository,
            FarmRepository farmRepository,
            JdbcTemplate jdbcTemplate) {

        this.waterRecordRepository = waterRecordRepository;
        this.farmRepository = farmRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping
    public List<WaterRecord> getAllWaterRecords() {
        return waterRecordRepository.findAll();
    }

    @GetMapping("/farm/{farmId}")
    public ResponseEntity<?> getRecordsByFarm(
            @PathVariable Long farmId) {

        if (farmId <= 0 || !farmRepository.existsById(farmId)) {
            return ResponseEntity.badRequest()
                    .body("Farm ID is invalid or the farm does not exist.");
        }

        return ResponseEntity.ok(
                waterRecordRepository.findByFarmId(farmId));
    }

    @PostMapping
    public ResponseEntity<?> createWaterRecord(
            @RequestBody(required = false) WaterRecord record) {

        String error = validateRecord(record);

        if (error != null) {
            return ResponseEntity.badRequest().body(error);
        }

        record.setRecordedAt(null);

        WaterRecord savedRecord =
                waterRecordRepository.save(record);

        return ResponseEntity.ok(savedRecord);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateWaterRecord(
            @PathVariable Long id,
            @RequestBody(required = false) WaterRecord updatedRecord) {

        if (id <= 0) {
            return ResponseEntity.badRequest()
                    .body("Water record ID must be greater than zero.");
        }

        Optional<WaterRecord> existingOptional =
                waterRecordRepository.findById(id);

        if (existingOptional.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        String error = validateRecord(updatedRecord);

        if (error != null) {
            return ResponseEntity.badRequest().body(error);
        }

        WaterRecord existing = existingOptional.get();

        existing.setFarmId(updatedRecord.getFarmId());
        existing.setRainfallMm(updatedRecord.getRainfallMm());
        existing.setSoilMoisturePercent(
                updatedRecord.getSoilMoisturePercent());
        existing.setIrrigationLitres(
                updatedRecord.getIrrigationLitres());

        // Preserve the original recorded timestamp.
        WaterRecord savedRecord =
                waterRecordRepository.save(existing);

        return ResponseEntity.ok(savedRecord);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteWaterRecord(
            @PathVariable Long id) {

        if (id <= 0 || !waterRecordRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        waterRecordRepository.deleteById(id);
        waterRecordRepository.flush();

        if (waterRecordRepository.count() == 0) {
            jdbcTemplate.execute(
                    "ALTER TABLE water_record AUTO_INCREMENT = 1");
        }

        return ResponseEntity.noContent().build();
    }

    private String validateRecord(WaterRecord record) {

        if (record == null) {
            return "Water record data is required.";
        }

        if (record.getFarmId() == null || record.getFarmId() <= 0) {
            return "Please select a valid farm.";
        }

        if (!farmRepository.existsById(record.getFarmId())) {
            return "The selected farm does not exist.";
        }

        if (record.getRainfallMm() == null
                || !Double.isFinite(record.getRainfallMm())
                || record.getRainfallMm() < 0) {
            return "Rainfall must be a finite number greater than or equal to 0 mm.";
        }

        if (record.getSoilMoisturePercent() == null
                || !Double.isFinite(record.getSoilMoisturePercent())
                || record.getSoilMoisturePercent() < 0
                || record.getSoilMoisturePercent() > 100) {
            return "Soil moisture must be between 0 and 100 percent.";
        }

        if (record.getIrrigationLitres() == null
                || !Double.isFinite(record.getIrrigationLitres())
                || record.getIrrigationLitres() < 0) {
            return "Irrigation usage must be a finite number greater than or equal to 0 litres.";
        }

        return null;
    }
}
