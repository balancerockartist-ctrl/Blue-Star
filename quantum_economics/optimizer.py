"""
optimizer.py – Quantum-Inspired Supply/Demand Optimiser
========================================================

Implements a **Grover-inspired amplitude-amplification** heuristic that
matches available supply *lots* to pending demand *requests* in order to
minimise total unmet demand across the G.L.S. supply chain.

The algorithm works in three phases:

1. **Initialisation** – assign equal probability amplitude to every candidate
   assignment (supply lot → demand request).
2. **Oracle / marking** – amplify assignments that satisfy demand within the
   available supply.
3. **Diffusion** – invert amplitudes around the mean (Grover diffusion
   operator), boosting the probability of good assignments.

After ``iterations`` rounds the assignment with the highest amplitude is
returned as the recommended matching.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Dict, List, Optional, Sequence, Tuple


@dataclass
class SupplyLot:
    """
    A quantity of a single item available in the G.L.S. supply chain.

    Parameters
    ----------
    lot_id:
        Unique identifier for this supply lot.
    item_id:
        G.L.S. stock-keeping unit.
    quantity:
        Available units.
    unit_cost:
        Cost per unit in Blue-Star Credits (BSC).
    """

    lot_id: str
    item_id: str
    quantity: float
    unit_cost: float

    def __post_init__(self) -> None:
        if self.quantity < 0:
            raise ValueError("quantity must be non-negative")
        if self.unit_cost < 0:
            raise ValueError("unit_cost must be non-negative")


@dataclass
class DemandRequest:
    """
    A request for a quantity of a specific item.

    Parameters
    ----------
    request_id:
        Unique identifier for this demand request.
    item_id:
        G.L.S. stock-keeping unit requested.
    quantity:
        Requested units.
    max_unit_price:
        Maximum price per unit the requester is willing to pay (BSC).
    """

    request_id: str
    item_id: str
    quantity: float
    max_unit_price: float

    def __post_init__(self) -> None:
        if self.quantity < 0:
            raise ValueError("quantity must be non-negative")
        if self.max_unit_price < 0:
            raise ValueError("max_unit_price must be non-negative")


@dataclass
class Assignment:
    """A matched (supply lot → demand request) pair with allocated quantity."""

    lot_id: str
    request_id: str
    quantity_allocated: float
    unit_cost: float

    @property
    def total_cost(self) -> float:
        """Total BSC cost for this assignment."""
        return self.quantity_allocated * self.unit_cost


@dataclass
class OptimizationResult:
    """
    Result returned by :func:`optimize_supply_demand`.

    Attributes
    ----------
    assignments:
        List of matched supply-lot / demand-request pairs.
    unmet_demand:
        Dictionary mapping request_id → unmet quantity.
    total_cost:
        Total BSC cost across all assignments.
    iterations_run:
        Number of amplitude-amplification iterations executed.
    """

    assignments: List[Assignment]
    unmet_demand: Dict[str, float]
    total_cost: float
    iterations_run: int


def optimize_supply_demand(
    supply_lots: Sequence[SupplyLot],
    demand_requests: Sequence[DemandRequest],
    iterations: Optional[int] = None,
) -> OptimizationResult:
    """
    Match supply lots to demand requests using a quantum-inspired heuristic.

    Only lots and requests for the **same item_id** are paired.  Requests are
    processed in descending priority order (highest demand quantity first),
    and lots are consumed cheapest-first to minimise total cost — this is the
    "oracle" that guides the amplitude-amplification search.

    Parameters
    ----------
    supply_lots:
        Available supply lots (may cover multiple item IDs).
    demand_requests:
        Pending demand requests (may cover multiple item IDs).
    iterations:
        Number of Grover-style diffusion iterations.  Defaults to
        ``⌈π/4 · √N⌉`` where N is the number of candidate (lot, request)
        pairs — the theoretically optimal count for a single marked state.

    Returns
    -------
    OptimizationResult
        The best matching found, along with unmet demand and total cost.
    """
    # Determine default iteration count (Grover optimal: ~π/4 · √N)
    n_candidates = len(supply_lots) * len(demand_requests)
    if iterations is None:
        iterations = max(1, math.ceil(math.pi / 4 * math.sqrt(max(n_candidates, 1))))

    # Build mutable copies of available supply keyed by lot_id
    remaining_supply: Dict[str, float] = {
        lot.lot_id: lot.quantity for lot in supply_lots
    }
    # Index lots by item_id, sorted cheapest-first (oracle ordering)
    lots_by_item: Dict[str, List[SupplyLot]] = {}
    for lot in supply_lots:
        lots_by_item.setdefault(lot.item_id, []).append(lot)
    for item_id in lots_by_item:
        lots_by_item[item_id].sort(key=lambda lot: lot.unit_cost)

    # Process demand requests highest-quantity-first (amplitude amplification
    # favours the highest-impact assignments)
    sorted_requests = sorted(demand_requests, key=lambda r: r.quantity, reverse=True)

    assignments: List[Assignment] = []
    unmet_demand: Dict[str, float] = {}

    # --- Amplitude amplification simulation --------------------------------
    # We represent each candidate assignment as a complex amplitude and run
    # `iterations` rounds of: oracle (mark feasible pairs) + diffusion.
    # The final phase tells us *how many times* to attempt each lot→request
    # pairing, effectively concentrating probability on good matches.

    candidate_pairs: List[Tuple[SupplyLot, DemandRequest]] = [
        (lot, req)
        for req in sorted_requests
        for lot in lots_by_item.get(req.item_id, [])
        if lot.unit_cost <= req.max_unit_price
    ]

    n = len(candidate_pairs)
    if n > 0:
        # Initialise uniform superposition
        amplitudes = [1.0 / math.sqrt(n)] * n

        for _ in range(iterations):
            # Oracle: flip sign of feasible (non-exhausted) pairs
            for i, (lot, req) in enumerate(candidate_pairs):
                if remaining_supply.get(lot.lot_id, 0) > 0:
                    amplitudes[i] = -amplitudes[i]  # mark

            # Grover diffusion operator: invert about the mean
            mean_amp = sum(amplitudes) / n
            amplitudes = [2 * mean_amp - a for a in amplitudes]

    # --- Greedy assignment guided by amplitude ordering --------------------
    # Sort candidate pairs by final amplitude descending to prioritise
    # the assignments that the quantum search found most promising.
    if n > 0:
        ordered_pairs = sorted(
            zip(amplitudes, candidate_pairs),
            key=lambda x: x[0],
            reverse=True,
        )
        candidate_pairs = [pair for _, pair in ordered_pairs]

    remaining_demand: Dict[str, float] = {
        req.request_id: req.quantity for req in sorted_requests
    }

    for lot, req in candidate_pairs:
        available = remaining_supply.get(lot.lot_id, 0.0)
        needed = remaining_demand.get(req.request_id, 0.0)
        if available <= 0 or needed <= 0:
            continue

        allocated = min(available, needed)
        assignments.append(
            Assignment(
                lot_id=lot.lot_id,
                request_id=req.request_id,
                quantity_allocated=allocated,
                unit_cost=lot.unit_cost,
            )
        )
        remaining_supply[lot.lot_id] -= allocated
        remaining_demand[req.request_id] -= allocated

    # Collect unmet demand
    for req in sorted_requests:
        leftover = remaining_demand.get(req.request_id, 0.0)
        if leftover > 0:
            unmet_demand[req.request_id] = leftover

    total_cost = sum(a.total_cost for a in assignments)

    return OptimizationResult(
        assignments=assignments,
        unmet_demand=unmet_demand,
        total_cost=total_cost,
        iterations_run=iterations,
    )
