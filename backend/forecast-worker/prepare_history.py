"""Prepare reviewed weekly notebook output for the authenticated history API.

The mapping JSON must contain every operational notebook product code as a key
and the corresponding FarmSight product UUID as its value. This script does
not modify the database or publish input files.
"""
import argparse
import csv
import hashlib
import json
import uuid
from collections import defaultdict
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path


def prepare(csv_path, mapping_path, output_path, confirmed_complete=False):
    if not confirmed_complete:
        raise ValueError('completeness must be confirmed by the operator')
    raw = csv_path.read_bytes()
    source_hash = hashlib.sha256(raw).hexdigest()
    mapping = json.loads(mapping_path.read_text(encoding='utf8'))
    if not isinstance(mapping, dict) or not mapping:
        raise ValueError('mapping must be a non-empty object')
    mapped = {}
    for code, value in mapping.items():
        if not isinstance(code, str) or not code or not isinstance(value, str):
            raise ValueError('invalid mapping')
        mapped[code] = str(uuid.UUID(value))
    if len(set(mapped.values())) != len(mapped):
        raise ValueError('more than one source product maps to one product')
    groups = defaultdict(list)
    seen = set()
    grid = set()
    statuses = defaultdict(set)
    with csv_path.open(encoding='utf-8-sig', newline='') as file:
        reader = csv.DictReader(file)
        required = {'kode_produk', 'minggu_mulai', 'status_periode', 'y', 'ada_bazaar', 'ada_mini_bazaar'}
        if not required.issubset(reader.fieldnames or []):
            raise ValueError('required columns missing')
        for row in reader:
            code = row['kode_produk']
            week = date.fromisoformat(row['minggu_mulai'])
            if week.weekday() != 0 or (code, week) in grid:
                raise ValueError('invalid or duplicate source calendar row')
            grid.add((code, week))
            status = row['status_periode']
            if status not in ('operasional', 'tidak_tercatat', 'di_luar_rentang', 'sebelum_produk_dijual'):
                raise ValueError('invalid period status')
            statuses[week].add(status)
            if row['status_periode'] != 'operasional':
                continue
            if code not in mapped:
                raise ValueError('source has unmapped products')
            try:
                amount = Decimal(row['y'])
            except InvalidOperation as exc:
                raise ValueError('invalid quantity') from exc
            if not amount.is_finite() or amount < 0 or amount > Decimal('999999999999.999') or amount != amount.quantize(Decimal('0.001')):
                raise ValueError('invalid quantity')
            flags = [row['ada_bazaar'], row['ada_mini_bazaar']]
            if any(flag not in ('0', '1') for flag in flags):
                raise ValueError('invalid event flag')
            key = (code, week)
            if key in seen:
                raise ValueError('duplicate product/week')
            seen.add(key)
            groups[code].append({'week': week.isoformat(), 'quantity': format(amount, '.3f'),
                                 'bazaar': flags[0] == '1', 'miniBazaar': flags[1] == '1'})
    if set(groups) != set(mapped) or any(len(rows) > 1000 for rows in groups.values()):
        raise ValueError('mapping and operational products do not match or exceed the limit')
    calendar = sorted(statuses)
    if not calendar or len(calendar) > 1000 or any((calendar[i] - calendar[i-1]).days != 7 for i in range(1, len(calendar))):
        raise ValueError('source calendar incomplete')
    if {code for code, _ in grid} != set(mapped) or len(grid) != len(mapped) * len(calendar):
        raise ValueError('source product calendar incomplete')
    missing = []
    for week in calendar:
        kinds = statuses[week]
        if 'tidak_tercatat' in kinds or 'di_luar_rentang' in kinds:
            if len(kinds) != 1:
                raise ValueError('inconsistent source calendar')
            missing.append(week.isoformat())
    output_path.mkdir(parents=True, exist_ok=True)
    paths = [output_path / (mapped[code] + '.json') for code in groups]
    if any(path.exists() for path in paths):
        raise ValueError('output files already exist')
    for code, rows in groups.items():
        payload = {'productId': mapped[code], 'sourceHash': source_hash, 'sourceProductCount': len(groups), 'confirmedComplete': True,
                   'sourceStartWeek': calendar[0].isoformat(), 'sourceEndWeek': calendar[-1].isoformat(), 'unrecordedWeeks': missing,
                   'weeks': sorted(rows, key=lambda row: row['week'])}
        with (output_path / (mapped[code] + '.json')).open('x', encoding='utf8') as file:
            json.dump(payload, file, ensure_ascii=False, separators=(',', ':'))
    print(f'{len(groups)} product payloads prepared; review before import.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--csv', required=True, type=Path)
    parser.add_argument('--mapping', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--confirm-complete', action='store_true', help='Confirm the operational periods have been reviewed as complete')
    args = parser.parse_args()
    try:
        prepare(args.csv, args.mapping, args.output, args.confirm_complete)
    except (ValueError, OSError, json.JSONDecodeError):
        parser.exit(1, 'Unable to prepare history: verify input files and mapping.\n')
