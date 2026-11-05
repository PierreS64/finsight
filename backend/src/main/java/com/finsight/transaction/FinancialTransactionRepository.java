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

    @Query(value = "SELECT COALESCE((SELECT SUM(CASE WHEN kind = 'INCOME' THEN amount ELSE -amount END) "
            + "FROM public.financial_transactions WHERE owner_user_id = :owner AND account_id = :account), 0) "
            + "+ COALESCE((SELECT SUM(amount) FROM public.account_transfers "
            + "WHERE owner_user_id = :owner AND to_account_id = :account), 0) "
            + "- COALESCE((SELECT SUM(amount) FROM public.account_transfers "
            + "WHERE owner_user_id = :owner AND from_account_id = :account), 0)", nativeQuery = true)
    BigDecimal netForAccount(@Param("owner") UUID owner, @Param("account") UUID account);
}
