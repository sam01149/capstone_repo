import json
import tempfile
import unittest
from pathlib import Path

from prepare_history import prepare


class PrepareHistoryTest(unittest.TestCase):
    def test_filters_unknown_periods_and_produces_only_aggregate_payload(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            csv = root / 'data.csv'
            csv.write_text('kode_produk,minggu_mulai,status_periode,y,ada_bazaar,ada_mini_bazaar\n'
                           'P1,2026-01-05,operasional,2.5,1,0\n'
                           'P1,2026-01-12,tidak_tercatat,,0,0\n', encoding='utf8')
            mapping = root / 'mapping.json'
            product = '00000000-0000-4000-8000-000000000001'
            mapping.write_text(json.dumps({'P1': product}), encoding='utf8')
            output = root / 'out'
            prepare(csv, mapping, output, True)
            payload = json.loads((output / (product + '.json')).read_text(encoding='utf8'))
            self.assertTrue(payload['confirmedComplete'])
            self.assertEqual(payload['weeks'], [{'week': '2026-01-05', 'quantity': '2.500', 'bazaar': True, 'miniBazaar': False}])
            with self.assertRaises(ValueError):
                prepare(csv, mapping, output, True)

    def test_rejects_missing_mapping(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            csv = root / 'data.csv'
            csv.write_text('kode_produk,minggu_mulai,status_periode,y,ada_bazaar,ada_mini_bazaar\n'
                           'OTHER,2026-01-05,operasional,2,0,0\n', encoding='utf8')
            mapping = root / 'mapping.json'
            mapping.write_text(json.dumps({'P1': '00000000-0000-4000-8000-000000000001'}), encoding='utf8')
            with self.assertRaises(ValueError):
                prepare(csv, mapping, root / 'out', True)


if __name__ == '__main__':
    unittest.main()
