package com.finsight.transfer;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountTransferRepository extends JpaRepository<AccountTransfer, UUID> {
    List<AccountTransfer> findAllByOwnerUserIdOrderByOccurredOnDescCreatedAtDescIdDesc(UUID ownerUserId);
}
