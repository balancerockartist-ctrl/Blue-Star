"""
market.py – Quantum Market Model
=================================

A :class:`QuantumMarket` maintains a **probability distribution over possible
price states** for a given item — analogous to a quantum particle existing in
a superposition of energy levels.  The price "collapses" to a single value
when :meth:`QuantumMarket.observe_price` is called (a measurement), but the
underlying distribution updates continuously as new supply/demand signals
arrive.

This mirrors the Blue-Star vision: prices are not fixed; they emerge from the
collective information encoded in the G.L.S. supply-chain repository.
"""

from __future__ import annotations

import math
from typing import Sequence


class QuantumMarket:
    """
    A market for a single item whose price exists in quantum superposition.

    Parameters
    ----------
    item_id:
        G.L.S. stock-keeping unit or item identifier.
    price_levels:
        Ordered sequence of candidate prices in Blue-Star Credits (BSC).
    initial_amplitudes:
        Optional probability amplitudes for each price level.  If omitted,
        a uniform superposition is used.  Values will be L²-normalised
        automatically.

    Raises
    ------
    ValueError
        If ``price_levels`` is empty, or if ``initial_amplitudes`` length does
        not match ``price_levels``.
    """

    def __init__(
        self,
        item_id: str,
        price_levels: Sequence[float],
        initial_amplitudes: Sequence[float] | None = None,
    ) -> None:
        if not price_levels:
            raise ValueError("price_levels must not be empty")

        self.item_id = item_id
        self._prices = list(price_levels)

        if initial_amplitudes is None:
            n = len(self._prices)
            raw = [1.0] * n
        else:
            if len(initial_amplitudes) != len(self._prices):
                raise ValueError(
                    "initial_amplitudes length must equal price_levels length"
                )
            raw = list(initial_amplitudes)

        self._amplitudes = self._normalise(raw)
        self._observation_count = 0

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _normalise(amplitudes: list[float]) -> list[float]:
        """L²-normalise a list of amplitudes (Born rule)."""
        norm = math.sqrt(sum(a ** 2 for a in amplitudes))
        if norm == 0:
            raise ValueError("Amplitude vector must not be the zero vector")
        return [a / norm for a in amplitudes]

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    @property
    def probabilities(self) -> dict[float, float]:
        """
        Return the probability (|amplitude|²) for each price level.

        The returned mapping is ``{price: probability, ...}`` and the
        values sum to 1.
        """
        return {p: a ** 2 for p, a in zip(self._prices, self._amplitudes)}

    @property
    def expected_price(self) -> float:
        """Expected price = Σ pᵢ |αᵢ|² (quantum expectation value)."""
        probs = self.probabilities
        return sum(p * prob for p, prob in probs.items())

    def observe_price(self) -> float:
        """
        Collapse the price superposition and return the observed price.

        The price is sampled proportionally to |amplitude|².  After
        observation the distribution is updated via **quantum Zeno-like
        feedback**: the observed price level's amplitude is boosted by
        √2 and the distribution is re-normalised, reflecting that recent
        market prices anchor future expectations.

        Returns
        -------
        float
            The observed (collapsed) price in BSC.
        """
        import random

        probs = self.probabilities
        prices = list(probs.keys())
        weights = list(probs.values())

        # Weighted random selection (Born rule measurement)
        observed = random.choices(prices, weights=weights, k=1)[0]
        self._observation_count += 1

        # Zeno-like feedback: boost the observed level
        idx = self._prices.index(observed)
        boosted = list(self._amplitudes)
        boosted[idx] *= math.sqrt(2)
        self._amplitudes = self._normalise(boosted)

        return observed

    def apply_supply_signal(self, supply_delta: float) -> None:
        """
        Shift the amplitude distribution in response to a supply change.

        Increased supply (positive *supply_delta*) shifts probability mass
        toward lower price levels; decreased supply shifts it toward higher
        prices.

        Parameters
        ----------
        supply_delta:
            Change in supply units (positive = more supply).
        """
        if not self._prices:
            return

        n = len(self._prices)
        # Damping factor: larger deltas shift the distribution more
        shift = math.tanh(supply_delta / 100.0)

        new_amps = []
        for i, amp in enumerate(self._amplitudes):
            # Price index as a fraction [0, 1]; 0 = cheapest, 1 = most expensive
            price_fraction = i / max(n - 1, 1)
            # If supply rises (shift > 0), favour lower prices (lower fraction)
            adjustment = 1.0 + shift * (0.5 - price_fraction)
            new_amps.append(amp * max(adjustment, 1e-9))

        self._amplitudes = self._normalise(new_amps)

    def apply_demand_signal(self, demand_delta: float) -> None:
        """
        Shift the amplitude distribution in response to a demand change.

        Increased demand pushes prices higher; decreased demand lowers them.

        Parameters
        ----------
        demand_delta:
            Change in demand units (positive = more demand).
        """
        self.apply_supply_signal(-demand_delta)

    @property
    def observation_count(self) -> int:
        """Number of price observations (collapses) so far."""
        return self._observation_count

    def __repr__(self) -> str:
        return (
            f"QuantumMarket(item_id={self.item_id!r}, "
            f"expected_price={self.expected_price:.2f} BSC, "
            f"observations={self._observation_count})"
        )
