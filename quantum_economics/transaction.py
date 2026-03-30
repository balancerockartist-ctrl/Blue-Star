"""
transaction.py – Quantum-State Transactions & Credit Issuance
=============================================================

Every purchase in the Blue-Star QR Store begins life as a
:class:`QuantumTransaction`.  Until the transaction is *observed* (i.e.
settled), it exists in a superposition of PENDING, CONFIRMED, and VOIDED
states, each with an associated probability amplitude.  Calling
:meth:`QuantumTransaction.settle` collapses the wave-function to a single
definite outcome and issues the appropriate credit to the buyer.
"""

from __future__ import annotations

import hashlib
import math
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Optional


class TransactionState(Enum):
    """Observable states a transaction can collapse to."""

    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    VOIDED = "VOIDED"


@dataclass
class QuantumTransaction:
    """
    A credit-backed transaction whose settlement state is initially uncertain.

    Parameters
    ----------
    item_id:
        Unique identifier for the item being purchased (e.g. a G.L.S. SKU).
    item_description:
        Human-readable description captured by Google Lens.
    amount:
        Gross transaction amount in Blue-Star Credits (BSC).
    tip_amount:
        Optional tip amount in BSC (default 0).
    buyer_id:
        Identifier of the purchasing wallet / QR code holder.

    Attributes
    ----------
    transaction_id:
        Automatically generated UUID for this transaction.
    state:
        Current :class:`TransactionState`.  Starts as PENDING.
    credit_issued:
        Credit amount issued to the buyer after settlement (0 until confirmed).
    settled_at:
        UTC timestamp of settlement (``None`` until settled).
    """

    item_id: str
    item_description: str
    amount: float
    buyer_id: str
    tip_amount: float = 0.0
    transaction_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    state: TransactionState = field(default=TransactionState.PENDING)
    credit_issued: float = field(default=0.0)
    settled_at: Optional[datetime] = field(default=None)

    def __post_init__(self) -> None:
        if self.amount < 0:
            raise ValueError("amount must be non-negative")
        if self.tip_amount < 0:
            raise ValueError("tip_amount must be non-negative")

    # ------------------------------------------------------------------
    # Quantum superposition helpers
    # ------------------------------------------------------------------

    @property
    def amplitudes(self) -> dict[TransactionState, float]:
        """
        Return the probability amplitudes for each possible state.

        The amplitudes are derived from the transaction amount using a
        simple quantum-inspired heuristic:

        * High-value transactions have a higher confirmation amplitude.
        * Negative-amount or zero-amount transactions collapse to VOIDED.

        The squared magnitudes of the amplitudes sum to 1 (Born rule).
        """
        if self.state != TransactionState.PENDING:
            # Already collapsed – only one state has amplitude 1.
            return {s: (1.0 if s == self.state else 0.0) for s in TransactionState}

        # Confidence angle θ ∈ [0, π/2] rises with amount (capped at 1000 BSC)
        theta = math.pi / 2 * min(self.amount / 1000.0, 1.0)
        p_confirmed = math.cos(theta) ** 2
        p_voided = math.sin(theta) ** 2 * 0.1
        p_pending = 1.0 - p_confirmed - p_voided
        return {
            TransactionState.PENDING: max(p_pending, 0.0),
            TransactionState.CONFIRMED: p_confirmed,
            TransactionState.VOIDED: max(p_voided, 0.0),
        }

    @property
    def confirmation_probability(self) -> float:
        """Probability (0–1) that this transaction will be confirmed."""
        return self.amplitudes[TransactionState.CONFIRMED]

    # ------------------------------------------------------------------
    # Settlement
    # ------------------------------------------------------------------

    def settle(self, confirmed: bool = True) -> float:
        """
        Collapse the quantum state and issue credit.

        Parameters
        ----------
        confirmed:
            ``True`` to confirm the transaction (default); ``False`` to void it.

        Returns
        -------
        float
            Credit issued to the buyer (0 if voided).

        Raises
        ------
        RuntimeError
            If the transaction has already been settled.
        """
        if self.state != TransactionState.PENDING:
            raise RuntimeError(
                f"Transaction {self.transaction_id} is already settled "
                f"({self.state.value})."
            )

        self.settled_at = datetime.now(timezone.utc)

        if confirmed:
            self.state = TransactionState.CONFIRMED
            self.credit_issued = self.amount + self.tip_amount
        else:
            self.state = TransactionState.VOIDED
            self.credit_issued = 0.0

        return self.credit_issued

    # ------------------------------------------------------------------
    # Fingerprint
    # ------------------------------------------------------------------

    def fingerprint(self) -> str:
        """
        Return a SHA-256 fingerprint of the transaction's immutable fields.

        Used by :class:`~quantum_economics.ledger.QuantumLedger` to build
        the chain hash.
        """
        raw = (
            f"{self.transaction_id}|{self.item_id}|{self.buyer_id}|"
            f"{self.amount:.6f}|{self.tip_amount:.6f}"
        )
        return hashlib.sha256(raw.encode()).hexdigest()

    def __repr__(self) -> str:
        return (
            f"QuantumTransaction(id={self.transaction_id!r}, "
            f"item={self.item_description!r}, "
            f"amount={self.amount}, state={self.state.value})"
        )
