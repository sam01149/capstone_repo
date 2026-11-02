"""Adapter around functions copied unchanged from Rania's notebook f7debae."""
import math
from datetime import date, timedelta

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error

import notebook_model as nb


def analyse(weeks, lead_time_days, future_events, pooled_outlier_multiplier, train_end_week,
            tune_order=None, tuning_results=None, known_missing_weeks=None):
    if not isinstance(weeks, list) or len(weeks) > 1000:
        raise ValueError('invalid observations')
    if isinstance(lead_time_days, bool) or not isinstance(lead_time_days, int) or lead_time_days <= 0:
        raise ValueError('lead time missing')

    def valid_event(event):
        return isinstance(event, list) and len(event) == 2 and all(type(x) is int and x in (0, 1) for x in event)

    if not isinstance(future_events, list) or len(future_events) != 4 or not all(valid_event(x) for x in future_events):
        raise ValueError('future event calendar required')
    if not weeks:
        return {'status': 'INSUFFICIENT_DATA'}
    if not isinstance(known_missing_weeks, list) or len(known_missing_weeks) > 1000:
        raise ValueError('missing coverage metadata')
    known_missing = set()
    for value in known_missing_weeks:
        d = date.fromisoformat(value)
        if d.weekday() != 0 or d in known_missing:
            raise ValueError('invalid missing week')
        known_missing.add(d)
    if not isinstance(train_end_week, str):
        return {'status': 'INSUFFICIENT_DATA'}
    cutoff = date.fromisoformat(train_end_week)
    if cutoff.weekday() != 0:
        raise ValueError('invalid split date')
    dates, values, events = [], [], []
    for row in weeks:
        if not isinstance(row, dict) or not valid_event(row.get('event')):
            raise ValueError('invalid observation')
        d = date.fromisoformat(row['week'])
        if d.weekday() != 0 or d in known_missing or (dates and d <= dates[-1]):
            raise ValueError('missing or invalid week')
        if dates:
            missing = dates[-1] + timedelta(days=7)
            while missing < d:
                if missing not in known_missing:
                    raise ValueError('unverified missing week')
                missing += timedelta(days=7)
        value = row.get('quantity')
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0:
            raise ValueError('invalid quantity')
        dates.append(d)
        values.append(float(value))
        events.append(row['event'])
    split = ['train' if d <= cutoff else 'test' for d in dates]
    n_train = split.count('train')
    train = np.asarray(values[:n_train], dtype=float)
    test = values[n_train:]
    train_pos = train[train > 0]
    if len(train_pos) < 5 or sum(v > 0 for v in test) < 1 or n_train <= 8 or len(test) < 2:
        return {'status': 'INSUFFICIENT_DATA'}
    y_model = np.asarray(values, dtype=float).copy()
    if len(train_pos) >= 8:
        q1, q3 = np.quantile(np.log1p(train_pos), [0.25, 0.75])
        cap = float(np.expm1(q3 + 1.5 * (q3 - q1)))
    else:
        if (isinstance(pooled_outlier_multiplier, bool) or not isinstance(pooled_outlier_multiplier, (int, float))
                or not math.isfinite(pooled_outlier_multiplier) or pooled_outlier_multiplier <= 0):
            return {'status': 'INSUFFICIENT_DATA'}
        cap = float(np.median(train_pos) * pooled_outlier_multiplier)
    y_model[:n_train] = np.minimum(y_model[:n_train], cap)
    frame = pd.DataFrame({'kode_produk': 'target', 'minggu_mulai': pd.to_datetime(dates),
                          'y': values, 'y_model': y_model, 'split': split,
                          'ada_bazaar': [e[0] for e in events],
                          'ada_mini_bazaar': [e[1] for e in events], 'status_periode': 'operasional'})

    # Supply the notebook functions' globals explicitly. Python process is isolated per run.
    nb.np, nb.pd = np, pd
    nb.mean_absolute_error, nb.mean_squared_error = mean_absolute_error, mean_squared_error
    nb.mingguan = frame
    nb.ambil_deret = lambda code: nb.mingguan[(nb.mingguan['kode_produk'] == code) &
        (nb.mingguan['status_periode'] == 'operasional')].sort_values('minggu_mulai').set_index('minggu_mulai')
    nb.HP, nb.SKOR_TUNING = {}, {}
    nb.MIN_HISTORY_TUNING = 8
    nb.GRID_ARIMA_ORDER = [(0, 1, 1), (1, 1, 0), (1, 1, 1), (2, 1, 1), (1, 1, 2)]
    nb.GRID_ALPHA_CROSTON = [0.1, 0.15, 0.2, 0.3]
    nb.METODE_ARIMA_TERSEDIA = True
    nb.PAKAI_REGRESOR_EVENT = True
    nb.GUNAKAN_LOG1P = True
    nb.METODE_DASAR = ['arima', 'croston_sba']
    nb.MIN_TEST_UNTUK_EVAL = 2
    nb.Z_SERVICE = 1.6448536269514722
    nb.param_lt = pd.DataFrame([{'kode_produk': 'target', 'lead_time_minggu': lead_time_days / 7,
                                 'sumber_lead_time': 'product_lead_time_days'}])
    nb.JADWAL_EVENT_KEDEPAN = {(dates[-1] + timedelta(days=7 * (i + 1))).isoformat(): tuple(e)
                                for i, e in enumerate(future_events)}
    original_naive = nb.f_naive
    fallback = False

    def tracked_naive(history, **kwargs):
        nonlocal fallback
        fallback = True
        return original_naive(history, **kwargs)

    nb.f_naive = tracked_naive
    orders = list(nb.GRID_ARIMA_ORDER)
    tuning_fallback = False
    if tune_order is not None:
        if not isinstance(tune_order, list) or len(tune_order) != 3 or any(type(x) is not int for x in tune_order) or tuple(tune_order) not in orders:
            raise ValueError('invalid tuning order')
        nb.GRID_ARIMA_ORDER = [tuple(tune_order)]
        params, one_score = nb.tuning_kode('target')
        if not math.isfinite(float(one_score['croston_sba'])):
            raise ValueError('invalid tuning')
        arima_score = float(one_score['arima'])
        score_status = 'OK' if math.isfinite(arima_score) else 'NAN' if math.isnan(arima_score) else 'INFINITE'
        return {'status': 'TUNED', 'order': tune_order, 'arimaScore': arima_score if score_status == 'OK' else None,
                'arimaScoreStatus': score_status,
                'crostonScore': float(one_score['croston_sba']), 'crostonAlpha': params['croston_alpha'],
                'fallbackUsed': fallback}
    if tuning_results is None:
        nb.HP['target'], nb.SKOR_TUNING['target'] = nb.tuning_kode('target')
        tuning_fallback = fallback
        fallback = False
    else:
        if not isinstance(tuning_results, list) or len(tuning_results) != len(orders):
            raise ValueError('incomplete tuning')
        for i, entry in enumerate(tuning_results):
            if (not isinstance(entry, dict) or entry.get('status') != 'TUNED' or entry.get('order') != list(orders[i]) or
                    not isinstance(entry.get('crostonScore'), (float, int)) or isinstance(entry.get('crostonScore'), bool) or
                    not math.isfinite(entry['crostonScore']) or entry['crostonScore'] < 0 or
                    entry.get('arimaScoreStatus') not in ('OK', 'NAN', 'INFINITE') or
                    (entry['arimaScoreStatus'] == 'OK' and (isinstance(entry.get('arimaScore'), bool) or
                     not isinstance(entry.get('arimaScore'), (float, int)) or not math.isfinite(entry['arimaScore']) or entry['arimaScore'] < 0)) or
                    (entry['arimaScoreStatus'] != 'OK' and entry.get('arimaScore') is not None) or
                    entry.get('crostonAlpha') not in nb.GRID_ALPHA_CROSTON or type(entry.get('fallbackUsed')) is not bool):
                raise ValueError('invalid tuning result')
            if i and (entry['crostonScore'] != tuning_results[0]['crostonScore'] or
                      entry['crostonAlpha'] != tuning_results[0]['crostonAlpha']):
                raise ValueError('inconsistent tuning results')
        def score(entry):
            return entry['arimaScore'] if entry['arimaScoreStatus'] == 'OK' else float('nan') if entry['arimaScoreStatus'] == 'NAN' else float('inf')
        best = min(tuning_results, key=score)
        if not math.isfinite(score(best)):
            raise ValueError('selected tuning result is invalid')
        tuning_fallback = any(entry['fallbackUsed'] for entry in tuning_results)
        nb.HP['target'] = {'arima_order': tuple(best['order']), 'croston_alpha': best['crostonAlpha']}
        nb.SKOR_TUNING['target'] = {'arima': score(best), 'croston_sba': best['crostonScore']}
    scores = nb.SKOR_TUNING['target']
    if not all(math.isfinite(float(scores[m])) for m in ('arima', 'croston_sba')):
        raise ValueError('invalid tuning')
    method = min(scores, key=scores.get)
    nb.hasil_test = {'target': nb.rolling_forecast('target', 'test')}
    evaluation_fallback = fallback
    fallback = False
    nb.model_terbaik = pd.DataFrame([{'kode_produk': 'target', 'model_terbaik': method}])
    held_out = nb.hasil_test['target']
    naive_mae = float(np.mean(np.abs(np.diff(train)))) if len(train) > 1 else np.nan
    metric = nb.hitung_metrik(held_out, method, naive_mae)
    forecasts = nb.forecast_ke_depan('target', 4)
    forecast_fallback = fallback
    stock = nb.ss_rop_dari_model('target')
    naive_errors = np.asarray([values[i] - y_model[i - 1] for i in range(n_train, len(values))])
    results = {'status': 'SUCCESS', 'method': method,
               'parameter': nb.HP['target']['arima_order'] if method == 'arima' else nb.HP['target']['croston_alpha'],
               'trainRmse': float(scores[method]),
               'evaluation': {'mae': float(metric['mae']), 'rmse': float(metric['rmse']),
                              'mase': float(metric['mase']) if np.isfinite(metric['mase']) else None,
                              'mape': float(metric['mape']), 'mapeMeaningful': bool(metric['mape_bermakna']),
                              'periodCount': int(metric['n_minggu']), 'positivePeriods': int(metric['n_pos']),
                              'baselineMae': float(np.mean(np.abs(naive_errors))),
                              'baselineRmse': float(np.sqrt(np.mean(naive_errors ** 2)))},
               'actualVsForecast': [{'week': pd.Timestamp(r['minggu_mulai']).date().isoformat(),
                                     'actual': float(r['y_aktual']), 'prediction': float(r[method])}
                                    for _, r in held_out.iterrows()],
               'forecast': [{'week': pd.Timestamp(r['minggu_mulai']).date().isoformat(), 'prediction': float(r['prediksi'])}
                            for _, r in forecasts.iterrows()],
               'safetyStock': float(stock['safety_stock']), 'reorderPoint': float(stock['reorder_point']),
               'leadTimeDays': lead_time_days, 'serviceLevel': 0.95,
               'fallbackDuringTuning': tuning_fallback, 'fallbackDuringEvaluation': evaluation_fallback,
               'fallbackDuringForecast': forecast_fallback}
    if not all(math.isfinite(v) and v >= 0 for v in (results['safetyStock'], results['reorderPoint'])):
        raise ValueError('invalid result')
    return results
