
package com.agriplan.backend;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface WaterRecordRepository
        extends JpaRepository<WaterRecord, Long> {

    List<WaterRecord> findByFarmId(Long farmId);

    @Modifying
    @Transactional
    @Query("DELETE FROM WaterRecord w WHERE w.farmId = :farmId")
    void deleteByFarmId(@Param("farmId") Long farmId);
}
