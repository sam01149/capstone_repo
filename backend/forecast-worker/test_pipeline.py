import unittest
from datetime import date, timedelta

import notebook_model as notebook
from pipeline import analyse


def observations(count=15):
    return [{'week': (date(2026, 1, 5) + timedelta(days=7 * i)).isoformat(),
             'quantity': 2 if i % 2 == 0 else 0, 'event': [0, 0]} for i in range(count)]


class PipelineTest(unittest.TestCase):
    def test_missing_history_and_missing_events_do_not_make_a_forecast(self):
        weeks = observations(4)
        self.assertEqual(analyse(weeks, 7, [[0, 0]] * 4, None, weeks[2]['week'], known_missing_weeks=[]), {'status': 'INSUFFICIENT_DATA'})
        with self.assertRaises(ValueError):
            analyse(weeks, 7, None, None, weeks[2]['week'], known_missing_weeks=[])
        weeks[1]['week'] = '2026-02-02'
        with self.assertRaises(ValueError):
            analyse(weeks, 7, [[0, 0]] * 4, None, weeks[2]['week'], known_missing_weeks=[])

    def test_known_missing_week_is_excluded_without_inserting_zero(self):
        weeks = observations(5)
        missing = weeks.pop(1)['week']
        self.assertEqual(analyse(weeks, 7, [[0, 0]] * 4, None, weeks[1]['week'],
                                 known_missing_weeks=[missing]), {'status': 'INSUFFICIENT_DATA'})

    def test_notebook_naive_fallback_is_reported(self):
        weeks = observations()
        old_arima, old_naive = notebook.f_arima, notebook.f_naive
        notebook.f_arima = lambda history, **kwargs: notebook.f_naive(history)
        try:
            result = analyse(weeks, 7, [[0, 0]] * 4, 4, weeks[11]['week'], known_missing_weeks=[])
            self.assertTrue(result['fallbackDuringTuning'])
            self.assertTrue(result['fallbackDuringEvaluation'])
        finally:
            notebook.f_arima, notebook.f_naive = old_arima, old_naive


if __name__ == '__main__':
    unittest.main()
