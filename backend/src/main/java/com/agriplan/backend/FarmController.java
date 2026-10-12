
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
@RequestMapping("/api/farms")
@CrossOrigin(origins = "http://localhost:5173")
public class FarmController {

    private final FarmRepository farmRepository;
    private final WaterRecordRepository waterRecordRepository;
    private final JdbcTemplate jdbcTemplate;

    public FarmController(
            FarmRepository farmRepository,
            WaterRecordRepository waterRecordRepository,
            JdbcTemplate jdbcTemplate) {

        this.farmRepository = farmRepository;
        this.waterRecordRepository = waterRecordRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    // Get all registered farms
    @GetMapping
    public List<Farm> getAllFarms() {
        return farmRepository.findAll();
    }

    // Register a new farm
    @PostMapping
    public Farm addFarm(@RequestBody Farm farm) {
        return farmRepository.save(farm);
    }

    // Edit farm details without changing its ID
    @PutMapping("/{id}")
    public ResponseEntity<?> updateFarm(
            @PathVariable Long id,
            @RequestBody Farm updatedFarm) {

        Optional<Farm> existingOptional =
                farmRepository.findById(id);

        if (existingOptional.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        if (updatedFarm.getFarmerName() == null
                || updatedFarm.getFarmerName().isBlank()
                || updatedFarm.getLocation() == null
                || updatedFarm.getLocation().isBlank()
                || updatedFarm.getSoilType() == null
                || updatedFarm.getSoilType().isBlank()
                || updatedFarm.getCropName() == null
                || updatedFarm.getCropName().isBlank()
                || updatedFarm.getAreaAcres() == null
                || updatedFarm.getAreaAcres() <= 0) {

            return ResponseEntity.badRequest()
                    .body("Please provide valid farm details.");
        }

        Farm existingFarm = existingOptional.get();

        existingFarm.setFarmerName(updatedFarm.getFarmerName());
        existingFarm.setLocation(updatedFarm.getLocation());
        existingFarm.setSoilType(updatedFarm.getSoilType());
        existingFarm.setCropName(updatedFarm.getCropName());
        existingFarm.setAreaAcres(updatedFarm.getAreaAcres());

        return ResponseEntity.ok(
                farmRepository.save(existingFarm));
    }

    // Delete a farm and its related water records
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFarm(
            @PathVariable Long id) {

        if (!farmRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        // First, delete water records belonging to this farm
        waterRecordRepository.deleteByFarmId(id);

        // Then, delete the farm
        farmRepository.deleteById(id);

        // Reset the farm ID counter when no farms remain
        if (farmRepository.count() == 0) {
            jdbcTemplate.execute(
                    "ALTER TABLE farm AUTO_INCREMENT = 1");
        }

        // Reset the water record ID counter when no records remain
        if (waterRecordRepository.count() == 0) {
            jdbcTemplate.execute(
                    "ALTER TABLE water_record AUTO_INCREMENT = 1");
        }

        return ResponseEntity.noContent().build();
    }
}
