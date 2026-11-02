# Functions copied from Rania notebook f7debae; globals are supplied by the adapter.
import numpy as np

def f_naive(history, **kw):
    return float(history[-1]) if len(history) else 0.0

def f_croston_sba(history, alpha=0.2, **kw):
    """Croston's method dengan koreksi bias Syntetos-Boylan (SBA) ? standar untuk intermittent demand.
    Melacak level permintaan (saat terjadi) dan interval antar kejadian secara terpisah."""
    history = np.asarray(history, dtype=float)
    idx_taknol = np.flatnonzero(history > 0)
    if len(idx_taknol) == 0:
        return 0.0
    if len(idx_taknol) == 1:
        return float(history[idx_taknol[0]] / 2)   # sedikit konservatif, hindari over-forecast dari 1 titik
    z = history[idx_taknol[0]]                       # level permintaan
    p = idx_taknol[0] + 1                            # interval awal
    interval_terakhir = idx_taknol[0] + 1
    for i in idx_taknol[1:]:
        interval = i - interval_terakhir + 1
        z = alpha * history[i] + (1 - alpha) * z
        p = alpha * interval + (1 - alpha) * p
        interval_terakhir = i + 1
    return float((1 - alpha / 2) * z / p)

def f_arima(history, order=(1, 1, 1), exog_hist=None, exog_future=None, use_log=True, **kw):
    """ARIMA/SARIMAX (statsmodels). BARU: opsi fit di skala log1p (data lumpy, miring kanan) dan
    opsi regresor eksogen (exog) mis. jadwal bazaar -> otomatis pakai SARIMAX kalau exog diberikan.
    Perlu >= 8 observasi; jatuh ke naive kalau fitting gagal (data terlalu jarang)."""
    try:
        if len(history) < 8:
            raise ValueError('data terlalu sedikit untuk ARIMA')
        h = np.asarray(history, dtype=float)
        y_fit = np.log1p(h) if use_log else h
        if exog_hist is not None:
            from statsmodels.tsa.statespace.sarimax import SARIMAX
            model = SARIMAX(y_fit, order=order, exog=np.asarray(exog_hist, dtype=float),
                             enforce_stationarity=False, enforce_invertibility=False)
            hasil = model.fit(disp=False)
            ef = np.asarray(exog_future, dtype=float).reshape(1, -1)
            fc = hasil.forecast(steps=1, exog=ef)
            pred = float(np.asarray(fc)[0])
        else:
            from statsmodels.tsa.arima.model import ARIMA
            model = ARIMA(y_fit, order=order)
            hasil = model.fit()
            pred = float(hasil.forecast()[0])
        pred = np.expm1(pred) if use_log else pred
        return float(max(pred, 0))
    except Exception:
        return f_naive(history)

def prediksi_satu_metode(nama_metode, history, tanggal_history, kode, exog_hist=None, exog_future=None):
    hp = HP.get(kode, {})
    if nama_metode == 'croston_sba':
        return f_croston_sba(history, alpha=hp.get('croston_alpha', 0.2))
    if nama_metode == 'arima':
        if not METODE_ARIMA_TERSEDIA:
            return f_naive(history)
        eh = exog_hist if (PAKAI_REGRESOR_EVENT and exog_hist is not None) else None
        ef = exog_future if (PAKAI_REGRESOR_EVENT and exog_future is not None) else None
        return f_arima(history, order=hp.get('arima_order', (1, 1, 1)), exog_hist=eh, exog_future=ef, use_log=GUNAKAN_LOG1P)
    raise ValueError(f'metode tidak dikenal: {nama_metode}')

def tuning_kode(kode):
    """BARU (v3): cari hyperparameter terbaik per produk lewat rolling-origin backtest DI DALAM train
    (bukan validation split terpisah -- data historisnya sedikit, jadi tidak ada split ketiga).
    Titik-titik train dari indeks MIN_HISTORY_TUNING dan seterusnya dipakai sbg titik uji; riwayat SEBELUM
    titik itu jadi "history"-nya -- logikanya identik dengan rolling forecast di test, cuma dijalankan di
    dalam train. Test set tetap sama sekali tidak disentuh. Selain hyperparameter terbaik, dikembalikan juga
    RMSE backtest tiap metode dasar (dipakai lagi nanti utk MEMILIH metode terbaik per produk)."""
    g = ambil_deret(kode)
    y_penuh = g['y_model'].values
    y_aktual_penuh = g['y'].values
    split_arr = g['split'].values
    exog_penuh = g[['ada_bazaar', 'ada_mini_bazaar']].astype(float).values
    idx_train = np.flatnonzero(split_arr == 'train')
    idx_tune = idx_train[idx_train >= MIN_HISTORY_TUNING]

    default = dict(arima_order=(1, 1, 1), croston_alpha=0.2)
    if len(idx_tune) == 0:
        return default, {'arima': np.inf, 'croston_sba': np.inf}

    def skor(fn_kw):
        nama_metode, kw = fn_kw
        preds, actual = [], []
        for i in idx_tune:
            history = y_penuh[:i]
            if len(history) == 0:
                continue
            if nama_metode == 'arima':
                p = f_arima(history, exog_hist=(exog_penuh[:i] if PAKAI_REGRESOR_EVENT else None),
                            exog_future=(exog_penuh[i] if PAKAI_REGRESOR_EVENT else None), use_log=GUNAKAN_LOG1P, **kw)
            elif nama_metode == 'croston_sba':
                p = f_croston_sba(history, **kw)
            else:
                raise ValueError(nama_metode)
            preds.append(p); actual.append(y_aktual_penuh[i])
        if not preds:
            return np.inf
        return float(np.sqrt(np.mean((np.array(actual) - np.array(preds)) ** 2)))

    hp = dict(default)
    skor_terbaik = {}
    if METODE_ARIMA_TERSEDIA:
        hasil_skor = {o: skor(('arima', dict(order=o))) for o in GRID_ARIMA_ORDER}
        hp['arima_order'] = min(hasil_skor, key=hasil_skor.get)
        skor_terbaik['arima'] = hasil_skor[hp['arima_order']]
    else:
        skor_terbaik['arima'] = np.inf
    hasil_skor = {a: skor(('croston_sba', dict(alpha=a))) for a in GRID_ALPHA_CROSTON}
    hp['croston_alpha'] = min(hasil_skor, key=hasil_skor.get)
    skor_terbaik['croston_sba'] = hasil_skor[hp['croston_alpha']]
    return hp, skor_terbaik

def rolling_forecast(kode, split_target):
    """Kembalikan DataFrame minggu x (y_aktual, prediksi tiap metode dasar) untuk satu split.
    BARU (v3): sekarang cuma dipanggil dgn split_target='test' (tidak ada 'val' lagi)."""
    g = ambil_deret(kode)
    y_penuh = g['y_model'].values           # dipakai sebagai riwayat (sudah di-cap outlier pada train)
    y_aktual_penuh = g['y'].values          # dipakai sebagai kebenaran evaluasi (mentah)
    tanggal_penuh = g.index
    split_arr = g['split'].values
    exog_penuh = g[['ada_bazaar', 'ada_mini_bazaar']].astype(float).values

    baris = []
    idx_target = np.flatnonzero(split_arr == split_target)
    for i in idx_target:
        history = y_penuh[:i]
        if len(history) == 0:
            continue
        pred = {'minggu_mulai': tanggal_penuh[i], 'y_aktual': y_aktual_penuh[i]}
        for nama in METODE_DASAR:
            pred[nama] = prediksi_satu_metode(nama, history, tanggal_penuh[:i], kode,
                                               exog_hist=exog_penuh[:i], exog_future=exog_penuh[i])
        baris.append(pred)
    return pd.DataFrame(baris)

def hitung_metrik(df_hasil, nama_metode, mae_naive_train=np.nan):
    y = df_hasil['y_aktual'].values
    yhat = df_hasil[nama_metode].values
    mae = mean_absolute_error(y, yhat)
    rmse = np.sqrt(mean_squared_error(y, yhat))
    penyebut = np.where(y == 0, 1, y)          # hindari pembagian nol; standar dipakai di notebook awal
    mape = np.mean(np.abs((y - yhat) / penyebut)) * 100
    mase = mae / mae_naive_train if (mae_naive_train and not np.isnan(mae_naive_train) and mae_naive_train > 0) else np.nan
    n_pos = int((y > 0).sum())
    return dict(mae=mae, rmse=rmse, mape=mape, mase=mase, n_minggu=len(y), n_pos=n_pos,
                mape_bermakna=n_pos >= MIN_TEST_UNTUK_EVAL)

def forecast_ke_depan(kode, n_minggu):
    g = ambil_deret(kode)
    history = list(g['y_model'].values)
    tanggal = list(g.index)
    exog_hist = [row for row in g[['ada_bazaar', 'ada_mini_bazaar']].astype(float).values]
    metode_nama = model_terbaik.loc[model_terbaik['kode_produk'] == kode, 'model_terbaik'].iloc[0]
    hasil = []
    for _ in range(n_minggu):
        tgl_baru = tanggal[-1] + pd.Timedelta(days=7)
        ev = JADWAL_EVENT_KEDEPAN.get(str(tgl_baru.date()), (0, 0))   # BARU: default tidak ada event terjadwal
        exog_future = np.array(ev, dtype=float)
        pred = prediksi_satu_metode(metode_nama, np.array(history), pd.DatetimeIndex(tanggal), kode,
                                     exog_hist=np.array(exog_hist), exog_future=exog_future)
        pred = max(pred, 0)
        hasil.append({'kode_produk': kode, 'minggu_mulai': tgl_baru, 'prediksi': pred, 'metode': metode_nama})
        history.append(pred); tanggal.append(tgl_baru); exog_hist.append(exog_future)
    return pd.DataFrame(hasil)

def ss_rop_dari_model(kode):
    d = hasil_test[kode]
    terbaik = model_terbaik.loc[model_terbaik['kode_produk'] == kode, 'model_terbaik'].iloc[0]
    if not d.empty:
        residual = d['y_aktual'].values - d[terbaik].values
        sigma_resid = float(np.std(residual, ddof=1)) if len(residual) > 1 else float(d['y_aktual'].std(ddof=1) or 0)
    else:
        sigma_resid = float(ambil_deret(kode)['y'].std(ddof=1) or 0)
    d_rata = float(ambil_deret(kode)['y'].mean())
    lt = param_lt.loc[param_lt['kode_produk'] == kode].iloc[0]
    lt_minggu = float(lt['lead_time_minggu'])
    ss = Z_SERVICE * sigma_resid * np.sqrt(max(lt_minggu, 1e-9))
    rop = d_rata * lt_minggu + ss
    return dict(kode_produk=kode, metode_dasar=f'model ({terbaik}), sigma dari residual test',
                d_rata_minggu=d_rata, sigma_dipakai=sigma_resid, lead_time_minggu=round(lt_minggu, 3),
                sumber_lead_time=lt['sumber_lead_time'], safety_stock=max(ss, 0), reorder_point=max(rop, 0))
