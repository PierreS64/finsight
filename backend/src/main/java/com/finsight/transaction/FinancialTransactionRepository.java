package com.finsight.transaction;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FinancialTransactionRepository extends JpaRepository<FinancialTransaction, UUID>, JpaSpecificationExecutor<FinancialTransaction> {
    List<FinancialTransaction> findAllByOwnerUserIdOrderByOccurredOnDescCreatedAtDescIdDesc(UUID ownerUserId);

    @Query(value = "SELECT COALESCE(SUM(CASE WHEN kind = 'INCOME' THEN amount ELSE -amount END), 0) "
            + "FROM public.financial_transactions WHERE owner_user_id = :owner AND account_id = :account", nativeQuery = true)
    BigDecimal netForAccount(@Param("owner") UUID owner, @Param("account") UUID account);
}
