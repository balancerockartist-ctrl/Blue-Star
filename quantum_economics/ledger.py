"""
ledger.py – Quantum Ledger
===========================

The :class:`QuantumLedger` is an append-only record of all confirmed
:class:`~quantum_economics.transaction.QuantumTransaction` objects.  Each
entry extends a **chain hash** (SHA-256 of the previous hash concatenated with
the new transaction fingerprint), making the ledger tamper-evident — any
modification to a historical record breaks all subsequent chain hashes.

This forms the immutable backbone of the Blue-Star credit economy.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Iterator, List

from quantum_economics.transaction import QuantumTransaction, TransactionState


@dataclass
class LedgerEntry:
    """A single immutable entry in the :class:`QuantumLedger`."""

    sequence: int
    transaction: QuantumTransaction
    chain_hash: str
    recorded_at: datetime = field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class QuantumLedger:
    """
    Append-only tamper-evident ledger for Blue-Star credit transactions.

    Parameters
    ----------
    genesis_hash:
        Optional seed hash for the chain (default: SHA-256 of
        ``"BLUE-STAR-GENESIS"``).

    Examples
    --------
    >>> from quantum_economics import QuantumTransaction, QuantumLedger
    >>> tx = QuantumTransaction("SKU-001", "Organic Apples", 12.5, "buyer-42")
    >>> tx.settle(confirmed=True)
    12.5
    >>> ledger = QuantumLedger()
    >>> ledger.record(tx)
    >>> print(ledger.chain_hash)  # doctest: +SKIP
    """

    _GENESIS_INPUT = "BLUE-STAR-GENESIS"

    def __init__(self, genesis_hash: str | None = None) -> None:
        self._entries: List[LedgerEntry] = []
        if genesis_hash is not None:
            self._chain_hash = genesis_hash
        else:
            self._chain_hash = hashlib.sha256(
                self._GENESIS_INPUT.encode()
            ).hexdigest()

    # ------------------------------------------------------------------
    # Recording
    # ------------------------------------------------------------------

    def record(self, transaction: QuantumTransaction) -> LedgerEntry:
        """
        Append a **confirmed** transaction to the ledger.

        Parameters
        ----------
        transaction:
            A settled, confirmed :class:`~quantum_economics.transaction.QuantumTransaction`.

        Returns
        -------
        LedgerEntry
            The newly created ledger entry.

        Raises
        ------
        ValueError
            If the transaction is not in the CONFIRMED state.
        RuntimeError
            If a transaction with the same ID has already been recorded.
        """
        if transaction.state != TransactionState.CONFIRMED:
            raise ValueError(
                f"Only CONFIRMED transactions may be recorded. "
                f"Got state={transaction.state.value}."
            )

        existing_ids = {e.transaction.transaction_id for e in self._entries}
        if transaction.transaction_id in existing_ids:
            raise RuntimeError(
                f"Transaction {transaction.transaction_id} is already in the ledger."
            )

        new_hash = self._compute_chain_hash(
            self._chain_hash, transaction.fingerprint()
        )
        entry = LedgerEntry(
            sequence=len(self._entries),
            transaction=transaction,
            chain_hash=new_hash,
        )
        self._entries.append(entry)
        self._chain_hash = new_hash
        return entry

    # ------------------------------------------------------------------
    # Querying
    # ------------------------------------------------------------------

    @property
    def chain_hash(self) -> str:
        """The current head chain hash (SHA-256)."""
        return self._chain_hash

    @property
    def total_credits_issued(self) -> float:
        """Sum of all credits issued across confirmed transactions."""
        return sum(e.transaction.credit_issued for e in self._entries)

    @property
    def entry_count(self) -> int:
        """Number of entries recorded so far."""
        return len(self._entries)

    def verify_integrity(self) -> bool:
        """
        Re-derive the chain hash from scratch and compare to the stored value.

        Returns
        -------
        bool
            ``True`` if the ledger has not been tampered with.
        """
        running_hash = hashlib.sha256(self._GENESIS_INPUT.encode()).hexdigest()
        for entry in self._entries:
            running_hash = self._compute_chain_hash(
                running_hash, entry.transaction.fingerprint()
            )
            if running_hash != entry.chain_hash:
                return False
        return running_hash == self._chain_hash

    def __iter__(self) -> Iterator[LedgerEntry]:
        return iter(self._entries)

    def __len__(self) -> int:
        return len(self._entries)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _compute_chain_hash(previous_hash: str, tx_fingerprint: str) -> str:
        combined = f"{previous_hash}:{tx_fingerprint}"
        return hashlib.sha256(combined.encode()).hexdigest()

    def __repr__(self) -> str:
        return (
            f"QuantumLedger(entries={self.entry_count}, "
            f"total_credits={self.total_credits_issued:.2f} BSC, "
            f"chain_hash={self._chain_hash[:12]}…)"
        )
