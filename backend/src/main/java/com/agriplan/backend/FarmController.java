
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
@RequestMapping("/api/farms")
@CrossOrigin(origins = "http://localhost:5173")
public class FarmController {

    private final FarmRepository farmRepository;

    public FarmController(FarmRepository farmRepository) {
        this.farmRepository = farmRepository;
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

    // Edit existing farmer and farm details
    @PutMapping("/{id}")
    public ResponseEntity<?> updateFarm(
            @PathVariable Long id,
            @RequestBody Farm updatedFarm) {

        Optional<Farm> existingOptional = farmRepository.findById(id);

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

        Farm savedFarm = farmRepository.save(existingFarm);

        return ResponseEntity.ok(savedFarm);
    }

    // Delete a farm
    @DeleteMapping("/{id}")
    public void deleteFarm(@PathVariable Long id) {
        farmRepository.deleteById(id);
    }
}
