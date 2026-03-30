"""
quantum_economics – Blue-Star Quantum Economics Engine
======================================================

Provides the core primitives for the Blue-Star / G.O.S. economic layer:

* :class:`~quantum_economics.transaction.QuantumTransaction` – credit-backed
  transactions whose state (PENDING / CONFIRMED / VOIDED) exists in quantum
  superposition until observed (settled).
* :class:`~quantum_economics.market.QuantumMarket` – a market that holds a
  probability distribution over possible price states, collapsing to a single
  price on demand.
* :class:`~quantum_economics.ledger.QuantumLedger` – append-only ledger that
  records all confirmed transactions and emits a tamper-evident chain hash.
* :func:`~quantum_economics.optimizer.optimize_supply_demand` – quantum-inspired
  amplitude-amplification optimiser that matches supply lots to demand requests
  to minimise total unmet demand.
"""

from quantum_economics.transaction import QuantumTransaction, TransactionState
from quantum_economics.market import QuantumMarket
from quantum_economics.ledger import QuantumLedger
from quantum_economics.optimizer import optimize_supply_demand

__all__ = [
    "QuantumTransaction",
    "TransactionState",
    "QuantumMarket",
    "QuantumLedger",
    "optimize_supply_demand",
]

__version__ = "0.1.0"
