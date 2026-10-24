package com.finsight.category;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CategoryRepository extends JpaRepository<Category, UUID> {
    @Query("select c from Category c where c.ownerUserId is null or c.ownerUserId = :owner order by c.categoryType, c.name")
    List<Category> visibleTo(@Param("owner") UUID owner);
}
