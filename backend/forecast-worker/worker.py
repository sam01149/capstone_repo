"""JSON process boundary for the notebook-based forecasting adapter."""
import json
import sys
import warnings

from statsmodels.tools.sm_exceptions import ConvergenceWarning

from pipeline import analyse


def main():
    request = json.load(sys.stdin)
    if (not isinstance(request, dict) or type(request.get('version')) is not int or
            request['version'] != 1 or request.get('method') not in ('pipeline', 'tune', 'finalize')):
        raise ValueError('invalid protocol')
    method = request['method']
    if method == 'tune' and request.get('tuneOrder') is None:
        raise ValueError('missing tuning order')
    if method == 'finalize' and request.get('tuningResults') is None:
        raise ValueError('missing tuning results')
    with warnings.catch_warnings(record=True) as captured:
        warnings.simplefilter('always', ConvergenceWarning)
        result = analyse(request.get('weeks'), request.get('leadTimeDays'), request.get('futureEvents'),
                         request.get('pooledOutlierMultiplier'), request.get('trainEndWeek'),
                     request.get('tuneOrder') if method == 'tune' else None,
                     request.get('tuningResults') if method == 'finalize' else None,
                     request.get('knownMissingWeeks'))
    if result['status'] in ('TUNED', 'SUCCESS'):
        result['convergenceWarning'] = (any(issubclass(w.category, ConvergenceWarning) for w in captured) or
                                        (method == 'finalize' and any(x.get('convergenceWarning') is True
                                         for x in request['tuningResults'])))
    if result['status'] == 'SUCCESS':
        result['invalidTuningCandidates'] = (sum(x.get('arimaScoreStatus') != 'OK' for x in request['tuningResults'])
                                             if method == 'finalize' else None)
    json.dump({'version': 1, **result}, sys.stdout, allow_nan=False)


if __name__ == '__main__':
    try:
        main()
    except Exception:
        sys.exit(1)
