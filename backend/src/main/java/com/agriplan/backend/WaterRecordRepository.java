
package com.agriplan.backend;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WaterRecordRepository
        extends JpaRepository<WaterRecord, Long> {

    List<WaterRecord> findByFarmId(Long farmId);
}

