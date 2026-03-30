"""
tests/test_quantum_economics.py
================================
Unit tests for the Blue-Star quantum economics engine.
"""

import hashlib
import math
import pytest

from quantum_economics import (
    QuantumTransaction,
    TransactionState,
    QuantumMarket,
    QuantumLedger,
    optimize_supply_demand,
)
from quantum_economics.optimizer import SupplyLot, DemandRequest


# ============================================================
# QuantumTransaction tests
# ============================================================

class TestQuantumTransaction:
    def _make_tx(self, amount=100.0, tip=0.0):
        return QuantumTransaction(
            item_id="SKU-001",
            item_description="Organic Apples",
            amount=amount,
            buyer_id="buyer-42",
            tip_amount=tip,
        )

    def test_initial_state_is_pending(self):
        tx = self._make_tx()
        assert tx.state == TransactionState.PENDING

    def test_settle_confirm_issues_credit(self):
        tx = self._make_tx(amount=50.0, tip=5.0)
        credit = tx.settle(confirmed=True)
        assert credit == pytest.approx(55.0)
        assert tx.state == TransactionState.CONFIRMED
        assert tx.credit_issued == pytest.approx(55.0)
        assert tx.settled_at is not None

    def test_settle_void_issues_zero_credit(self):
        tx = self._make_tx(amount=50.0)
        credit = tx.settle(confirmed=False)
        assert credit == 0.0
        assert tx.state == TransactionState.VOIDED
        assert tx.credit_issued == 0.0

    def test_double_settle_raises(self):
        tx = self._make_tx()
        tx.settle(confirmed=True)
        with pytest.raises(RuntimeError):
            tx.settle(confirmed=True)

    def test_negative_amount_raises(self):
        with pytest.raises(ValueError):
            QuantumTransaction("SKU-X", "bad", -1.0, "buyer-1")

    def test_negative_tip_raises(self):
        with pytest.raises(ValueError):
            QuantumTransaction("SKU-X", "bad", 10.0, "buyer-1", tip_amount=-1.0)

    def test_amplitudes_sum_to_one_for_pending(self):
        tx = self._make_tx(amount=200.0)
        amps = tx.amplitudes
        total = sum(amps.values())
        assert total == pytest.approx(1.0, abs=1e-9)

    def test_amplitudes_collapsed_after_settle(self):
        tx = self._make_tx()
        tx.settle(confirmed=True)
        amps = tx.amplitudes
        assert amps[TransactionState.CONFIRMED] == pytest.approx(1.0)
        assert amps[TransactionState.PENDING] == pytest.approx(0.0)
        assert amps[TransactionState.VOIDED] == pytest.approx(0.0)

    def test_confirmation_probability_between_0_and_1(self):
        tx = self._make_tx(amount=500.0)
        p = tx.confirmation_probability
        assert 0.0 <= p <= 1.0

    def test_fingerprint_is_deterministic(self):
        tx = self._make_tx()
        assert tx.fingerprint() == tx.fingerprint()

    def test_fingerprint_is_sha256_hex(self):
        tx = self._make_tx()
        fp = tx.fingerprint()
        assert len(fp) == 64
        int(fp, 16)  # must be valid hex

    def test_unique_transaction_ids(self):
        txs = [self._make_tx() for _ in range(10)]
        ids = {tx.transaction_id for tx in txs}
        assert len(ids) == 10


# ============================================================
# QuantumMarket tests
# ============================================================

class TestQuantumMarket:
    def _make_market(self, n_levels=5):
        prices = [float(i + 1) * 10 for i in range(n_levels)]
        return QuantumMarket("SKU-001", prices)

    def test_probabilities_sum_to_one(self):
        market = self._make_market()
        total = sum(market.probabilities.values())
        assert total == pytest.approx(1.0, abs=1e-9)

    def test_expected_price_within_range(self):
        market = self._make_market()
        ep = market.expected_price
        prices = list(market.probabilities.keys())
        assert min(prices) <= ep <= max(prices)

    def test_observe_price_returns_valid_price(self):
        market = self._make_market()
        prices = list(market.probabilities.keys())
        observed = market.observe_price()
        assert observed in prices

    def test_observation_count_increments(self):
        market = self._make_market()
        assert market.observation_count == 0
        market.observe_price()
        assert market.observation_count == 1
        market.observe_price()
        assert market.observation_count == 2

    def test_supply_signal_shifts_probability_down(self):
        prices = [10.0, 20.0, 30.0, 40.0, 50.0]
        market = QuantumMarket("SKU-002", prices)
        before = market.expected_price
        market.apply_supply_signal(500.0)  # large supply increase
        after = market.expected_price
        assert after < before

    def test_demand_signal_shifts_probability_up(self):
        prices = [10.0, 20.0, 30.0, 40.0, 50.0]
        market = QuantumMarket("SKU-003", prices)
        before = market.expected_price
        market.apply_demand_signal(500.0)
        after = market.expected_price
        assert after > before

    def test_custom_amplitudes_normalised(self):
        market = QuantumMarket("SKU-004", [1.0, 2.0, 3.0], [3.0, 4.0, 0.0])
        total = sum(market.probabilities.values())
        assert total == pytest.approx(1.0, abs=1e-9)

    def test_empty_price_levels_raises(self):
        with pytest.raises(ValueError):
            QuantumMarket("SKU-X", [])

    def test_mismatched_amplitudes_raises(self):
        with pytest.raises(ValueError):
            QuantumMarket("SKU-X", [1.0, 2.0], [1.0])

    def test_single_price_level_always_observed(self):
        market = QuantumMarket("SKU-005", [42.0])
        for _ in range(5):
            assert market.observe_price() == 42.0


# ============================================================
# QuantumLedger tests
# ============================================================

class TestQuantumLedger:
    def _confirmed_tx(self, amount=10.0, tip=1.0):
        tx = QuantumTransaction(
            item_id="SKU-001",
            item_description="Test Item",
            amount=amount,
            buyer_id="buyer-1",
            tip_amount=tip,
        )
        tx.settle(confirmed=True)
        return tx

    def test_empty_ledger_has_zero_credits(self):
        ledger = QuantumLedger()
        assert ledger.total_credits_issued == 0.0
        assert ledger.entry_count == 0

    def test_record_confirmed_tx(self):
        ledger = QuantumLedger()
        tx = self._confirmed_tx(amount=10.0, tip=1.0)
        entry = ledger.record(tx)
        assert ledger.entry_count == 1
        assert ledger.total_credits_issued == pytest.approx(11.0)
        assert entry.sequence == 0

    def test_record_multiple_txs_accumulates_credits(self):
        ledger = QuantumLedger()
        for amount in [10.0, 20.0, 30.0]:
            ledger.record(self._confirmed_tx(amount=amount, tip=0.0))
        assert ledger.total_credits_issued == pytest.approx(60.0)

    def test_record_unconfirmed_raises(self):
        ledger = QuantumLedger()
        tx = QuantumTransaction("SKU-X", "item", 10.0, "buyer-1")
        with pytest.raises(ValueError):
            ledger.record(tx)

    def test_record_duplicate_raises(self):
        ledger = QuantumLedger()
        tx = self._confirmed_tx()
        ledger.record(tx)
        with pytest.raises(RuntimeError):
            ledger.record(tx)

    def test_integrity_check_passes(self):
        ledger = QuantumLedger()
        for _ in range(5):
            ledger.record(self._confirmed_tx())
        assert ledger.verify_integrity() is True

    def test_integrity_check_fails_on_tampering(self):
        ledger = QuantumLedger()
        tx = self._confirmed_tx(amount=100.0)
        ledger.record(tx)
        # Tamper with the amount after recording
        tx.credit_issued = 9999.0
        # Fingerprint is based on immutable fields (amount), so integrity
        # of the hash chain itself is unaffected, but the credit total is wrong.
        # Directly corrupt the chain hash to simulate tampering:
        ledger._entries[0] = ledger._entries[0].__class__(
            sequence=ledger._entries[0].sequence,
            transaction=ledger._entries[0].transaction,
            chain_hash="corrupted_hash",
            recorded_at=ledger._entries[0].recorded_at,
        )
        assert ledger.verify_integrity() is False

    def test_chain_hash_changes_with_each_entry(self):
        ledger = QuantumLedger()
        hashes = [ledger.chain_hash]
        for _ in range(3):
            ledger.record(self._confirmed_tx())
            hashes.append(ledger.chain_hash)
        assert len(set(hashes)) == len(hashes)  # all unique

    def test_iteration_over_entries(self):
        ledger = QuantumLedger()
        for _ in range(3):
            ledger.record(self._confirmed_tx())
        entries = list(ledger)
        assert len(entries) == 3

    def test_custom_genesis_hash(self):
        genesis = "my-custom-genesis"
        ledger = QuantumLedger(genesis_hash=genesis)
        assert ledger.chain_hash == genesis


# ============================================================
# optimize_supply_demand tests
# ============================================================

class TestOptimizer:
    def test_simple_match(self):
        supply = [SupplyLot("LOT-1", "APPLE", 100.0, 1.0)]
        demand = [DemandRequest("REQ-1", "APPLE", 50.0, 2.0)]
        result = optimize_supply_demand(supply, demand)
        assert len(result.assignments) == 1
        assert result.assignments[0].quantity_allocated == pytest.approx(50.0)
        assert result.unmet_demand == {}
        assert result.total_cost == pytest.approx(50.0)

    def test_partial_fulfillment(self):
        supply = [SupplyLot("LOT-1", "APPLE", 30.0, 1.0)]
        demand = [DemandRequest("REQ-1", "APPLE", 50.0, 2.0)]
        result = optimize_supply_demand(supply, demand)
        assert result.unmet_demand.get("REQ-1", 0.0) == pytest.approx(20.0)
        assert result.assignments[0].quantity_allocated == pytest.approx(30.0)

    def test_price_ceiling_respected(self):
        supply = [SupplyLot("LOT-1", "APPLE", 100.0, 5.0)]
        demand = [DemandRequest("REQ-1", "APPLE", 50.0, 2.0)]  # max price 2 < cost 5
        result = optimize_supply_demand(supply, demand)
        assert len(result.assignments) == 0
        assert result.unmet_demand.get("REQ-1") == pytest.approx(50.0)

    def test_multiple_items_handled_independently(self):
        supply = [
            SupplyLot("LOT-A", "APPLE", 100.0, 1.0),
            SupplyLot("LOT-B", "BANANA", 200.0, 0.5),
        ]
        demand = [
            DemandRequest("REQ-A", "APPLE", 40.0, 2.0),
            DemandRequest("REQ-B", "BANANA", 80.0, 1.0),
        ]
        result = optimize_supply_demand(supply, demand)
        assert result.unmet_demand == {}
        assigned_items = {a.lot_id for a in result.assignments}
        assert "LOT-A" in assigned_items
        assert "LOT-B" in assigned_items

    def test_cheapest_lot_selected_first(self):
        supply = [
            SupplyLot("LOT-CHEAP", "APPLE", 100.0, 1.0),
            SupplyLot("LOT-EXPENSIVE", "APPLE", 100.0, 3.0),
        ]
        demand = [DemandRequest("REQ-1", "APPLE", 50.0, 5.0)]
        result = optimize_supply_demand(supply, demand)
        assert result.assignments[0].lot_id == "LOT-CHEAP"
        assert result.assignments[0].unit_cost == pytest.approx(1.0)

    def test_empty_inputs(self):
        result = optimize_supply_demand([], [])
        assert result.assignments == []
        assert result.unmet_demand == {}
        assert result.total_cost == 0.0

    def test_no_supply_all_demand_unmet(self):
        demand = [DemandRequest("REQ-1", "APPLE", 10.0, 5.0)]
        result = optimize_supply_demand([], demand)
        assert result.unmet_demand.get("REQ-1") == pytest.approx(10.0)

    def test_custom_iterations(self):
        supply = [SupplyLot("LOT-1", "APPLE", 100.0, 1.0)]
        demand = [DemandRequest("REQ-1", "APPLE", 50.0, 2.0)]
        result = optimize_supply_demand(supply, demand, iterations=3)
        assert result.iterations_run == 3

    def test_result_total_cost_matches_assignments(self):
        supply = [SupplyLot("LOT-1", "APPLE", 100.0, 2.0)]
        demand = [DemandRequest("REQ-1", "APPLE", 30.0, 5.0)]
        result = optimize_supply_demand(supply, demand)
        expected_cost = sum(a.total_cost for a in result.assignments)
        assert result.total_cost == pytest.approx(expected_cost)

    def test_invalid_supply_quantity_raises(self):
        with pytest.raises(ValueError):
            SupplyLot("LOT-X", "APPLE", -1.0, 1.0)

    def test_invalid_demand_quantity_raises(self):
        with pytest.raises(ValueError):
            DemandRequest("REQ-X", "APPLE", -1.0, 1.0)
