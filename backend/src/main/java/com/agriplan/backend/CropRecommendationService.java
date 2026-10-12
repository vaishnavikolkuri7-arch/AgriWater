
package com.agriplan.backend;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class CropRecommendationService {

    public List<String> recommendCrops(
            String soilType,
            String waterAvailability,
            double soilMoisturePercent,
            String season,
            String location) {

        List<String> recommendations = new ArrayList<>();

        String soil = soilType == null
                ? "" : soilType.toLowerCase(Locale.ROOT);

        String water = waterAvailability == null
                ? "" : waterAvailability.toLowerCase(Locale.ROOT);

        String currentSeason = season == null
                ? "" : season.toLowerCase(Locale.ROOT);

        // Low soil moisture or low water availability
        boolean limitedWater =
                water.equals("low") || soilMoisturePercent < 20;

        if (limitedWater) {
            recommendations.add("Pearl Millet (Bajra)");
            recommendations.add("Sorghum (Jowar)");
            recommendations.add("Green Gram (Moong)");
        }

        // Red sandy soil generally has lower water retention
        else if (soil.contains("red") || soil.contains("sandy")) {
            recommendations.add("Pearl Millet (Bajra)");
            recommendations.add("Green Gram (Moong)");
            recommendations.add("Groundnut");
        }

        // Black cotton soil can retain more moisture
        else if (soil.contains("black")) {
            recommendations.add("Cotton");
            recommendations.add("Sorghum (Jowar)");
            recommendations.add("Pigeon Pea (Red Gram)");
        }

        // General options when the soil type is not recognized
        else {
            recommendations.add("Sorghum (Jowar)");
            recommendations.add("Green Gram (Moong)");
            recommendations.add("Pigeon Pea (Red Gram)");
        }

        // Add a seasonal note as a recommendation candidate
        if (currentSeason.contains("kharif")) {
            recommendations.add("Kharif option: Pigeon Pea (Red Gram)");
        } else if (currentSeason.contains("rabi")) {
            recommendations.add("Rabi option: Chickpea (Bengal Gram)");
        }

        return recommendations;
    }
}
